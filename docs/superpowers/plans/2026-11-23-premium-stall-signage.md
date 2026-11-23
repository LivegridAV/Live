# Premium Stall Signage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every stall, the reception brand wall and the pillar gallery carry the correct LivegridAV grid logo and `livegrid`+`AV` wordmark, built as premium 3D signage; every screen-drawn brand mark is corrected in 2D; stage 1 speed is kept.

**Architecture:** One shared Blender module, `scripts/blender/premium_signage.py`, builds the wordmark and the grid logo and converts each stall's existing lettering into deep, lit-face, champagne-sided letters, keeping each stall's own fonts and letter placement. Each stall builder routes its lettering helpers through it and is rebuilt by its own script, so the scripts stay the source of truth. Each builder records the signs it made in its layout JSON. A node brand check reads those records and the GLB material names. On screen, one TypeScript helper draws the grid and wordmark on canvases.

**Tech Stack:** Blender 5.2 Python (`"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python <script>`), Node 24 `node:test`, TypeScript run directly by Node, three r185, Playwright (`playwright-core`, channel chrome).

**Spec:** `docs/superpowers/specs/2026-11-23-premium-stall-signage-design.md` (approved 2026-11-23). Executors read the spec first.

## Global Constraints

- Branch `feat/premium-signage`. Commit per task. **Never push, open a PR or merge without the owner's explicit OK.** Never commit `public/build-info.json`.
- Logo: 5×5 grid, columns lit bottom-up with heights `[2,4,3,5,4]` left to right; a cell at row `r` (0 = top), column `c` is lit when `(5-r) <= heights[c]`.
- Wordmark: `livegrid` + `AV`, one word, no space; `AV` aqua `#1FA093`, linear `(.0137,.3528,.2918)`; `livegrid` ivory. Font Space Grotesk 600: `assets/blender/entrance-refinement/Official-SpaceGrotesk-600.ttf`.
- Wrong marks that must disappear: `LivegridAV` (capital L), `livegrid AV` (space), `LIVEGRID AV`, the teal folded-triangle emblem, the blue diamond emblem.
- Sign materials (exact names, never containing "glass"): `Premium Sign | ivory lit face` (.86,.84,.79) metal 0 rough .42 emission .6; `Premium Sign | aqua lit face` aqua, 0, .38, emission .75; `Premium Sign | brushed champagne return` (.40,.32,.22), .9, .30; `Premium Sign | polished champagne edge` (.62,.52,.38), 1.0, .10; `Premium Sign | frosted aqua cell` aqua, 0, .30, emission .95; `Premium Sign | dim signal cell` (.055,.095,.088), .2, .2, emission .55; `Premium Sign | aqua halo` (spike's packed 512×160 image, alpha `exp(-(d/.12)^2)*.22`, BLENDED).
- Depth = `clamp(0.075 × letter height, 0.018, 0.065)` m. Front bevel only for letters ≥ 0.3 m: `min(.004, depth*.09)`.
- Logo: 0.80 × the emblem height it replaces, lifted 0.10 × height; pitch `size*57/276`, cell `size*48/276`, depth `clamp(size*.045, .02, .05)`, cell bevel `min(.010, cell*.07)`.
- Halo: exactly one per stall, behind the main fascia logo + wordmark only (Rental main fascia, Content Studio portal, Technical crown, Projection main fascia). None on reception, pillars, desks, blades, plaques.
- Names and slogans keep their current font, wording, position and face colour family (white/porcelain/ivory → ivory; mint/teal/cyan → aqua). Arial Narrow captions → Segoe UI Semibold fitted to the same width.
- Speed: start group ≤ 24 MiB (today 22.69), every light pack ≤ 8 MiB; fast 4G open time and bytes within +3% of the Task 1 baseline; 0 gap frames; nav jumps 0 gaps. The budget is never raised.
- Nothing outside the signs changes: visitor GLBs stay byte-identical; architecture, screens, lights and cameras unchanged.

## Review Focus

1. **A rebuilt stall's non-sign files change** (visitor GLB re-export, hall files): a visitor-file sha256 that differs from git HEAD is a failure, not noise. Each stall task checks it (Step "Confirm only sign files changed").
2. **A stall's runtime material pass restyles the new sign materials** (e.g. a `/glass/`, `/white/` or `/metal/` rule catching `Premium Sign | …`): signs look different from the approved test on that stall. Pinned by Task 3's tests.
3. **Projection's derive chain silently uses stale edit files:** `sync-blender-gallery-positions.mjs` compares byte offsets between `projection-finish-v2-gallery-*.glb` and `projection-finish-v2-*.glb`; if the gallery edit is not re-derived first, gallery vertices land in the wrong place. Task 9 runs the full chain and checks the gallery positions.
4. **Lettering that faces the other way or sits at an angle** (gallery walls, tower blades, yawed plaques): deepening must extrude away from the viewer, behind the existing face. Pinned by Task 2's self-test on a yawed label and checked in each stall's angle picture.
5. **A brand mark hiding in a place the inventory missed** (a GLB, a canvas or an image nobody opened): the brand check scans every load-group GLB's layout and every `src/` file, not only the inventoried lines (Tasks 1 and 4).

---

### Task 1: Baseline and brand check

**Files:**
- Delete: `public/models/expo/spike-premium-rental-shell.glb` (untracked spike output)
- Create: `scripts/brand-check.mjs`
- Modify: `scripts/release.test.mjs` (append tests)
- Create: `reports/perf/premium-baseline/` (measure output, `git add -f`)

**Interfaces:**
- Produces:
  - `wordmarkProblems(text: string) => string[]`: one message per wrong mark in `text`. Flags `/Livegrid/`, `/livegrid\s+AV/i`, `/LIVEGRID/` (except inside the correct `livegridAV`); returns `[]` for `livegridAV`.
  - `glbMaterialNames(buf: Buffer) => string[]`: reads a GLB's JSON chunk.
  - `OLD_EMBLEM_MATERIALS: string[]`: the exact material names the old emblems use, read from `emblem()` in `rebuild_led_rental_2026_shell.py:78`, `emblem26()` in `rebuild_led_rental_2026_interior.py:121` and `emblem()` in `rebuild_technical_showcase.py:178`. Include only names that no non-emblem surface also uses.
  - `SIGNED_ASSETS: {layout: string, glbs: string[], halo: 0|1}[]`: starts empty. Each stall task appends its entry.
  - `checkSignedAsset(entry) => string[]`: problems for one entry. Checks:
    - its layout JSON has a non-empty `signage` array;
    - no `signage[].body` has `wordmarkProblems`;
    - at least one `kind:"wordmark"` and one `kind:"emblem"`;
    - the `kind:"halo"` count equals `entry.halo`;
    - no listed GLB uses an `OLD_EMBLEM_MATERIALS` name;
    - every listed GLB has `Premium Sign | brushed champagne return`.
  - CLI `node scripts/brand-check.mjs` prints problems for every `SIGNED_ASSETS` entry and exits 1 if there are any.

- [ ] **Step 1: Record the baseline before anything changes.** Delete the spike GLB. Run `npm run build`, start `node scripts/serve-export.mjs` in the background (port 4310), then run `node scripts/measure-venue.mjs --label premium-baseline --throttle fast4g`. Expected: a report under `reports/perf/premium-baseline/` with open time, start bytes ≈ 22.69 MiB and 0 gap frames. Note the open time and bytes in the commit message.
- [ ] **Step 2: Write the failing tests** in `scripts/release.test.mjs`:
  - `test("brand check flags every wrong spelling and passes the real wordmark")`:
    - `wordmarkProblems("livegridAV")` deep-equals `[]`;
    - `"LivegridAV"`, `"livegrid AV"` and `"LIVEGRID AV"` each return a non-empty array;
    - `"PEOPLE TECHNOLOGY"` returns `[]`.
  - `test("every signed asset passes the brand check")`: for each `SIGNED_ASSETS` entry, `checkSignedAsset(entry)` deep-equals `[]`.
- [ ] **Step 3: Run** `node --test scripts/release.test.mjs`. Expected: the brand-check tests fail with "Cannot find module … brand-check.mjs".
- [ ] **Step 4: Implement `scripts/brand-check.mjs`** with the exports above.
- [ ] **Step 5: Run** `node --test scripts/release.test.mjs`. Expected: both new tests pass (`SIGNED_ASSETS` is empty).
- [ ] **Step 6: Commit** `scripts/brand-check.mjs`, `scripts/release.test.mjs` and `reports/perf/premium-baseline` (with `-f`), message `test: brand check and premium signage baseline`.

### Task 2: Shared premium signage module

**Files:**
- Create: `scripts/blender/premium_signage.py`
- Create: `scripts/blender/test_premium_signage.py` (a Blender self-test, run headless)
- Reference: `git show 8c5499c:scripts/blender/spike_premium_sign_helpers.py` (approved spike; carries `_deepen`, the materials, the halo image and `premium_emblem`)

**Interfaces:**
- Consumes: `material(name, rgb, metal, rough, emission)` and `box(...)` from `exhibition_base_helpers.py`. Every function takes a `place(objs, p, yaw)` callable: the calling stall's own transform. The default is rental's `transform` from `rebuild_led_rental_2026_shell.py:40`.
- Produces:
  - `is_wordmark(body: str) -> bool`: true when `body.replace(' ','').lower() == 'livegridav'`.
  - `sign_depth(height: float) -> float`: the depth clamp from Global Constraints.
  - `premium_wordmark(p, height, width=None, *, centered=False, yaw=0, place=transform) -> list[Object]`:
    - Space Grotesk 600 `livegrid` (ivory) + `AV` (aqua), gap .045 font units;
    - both scaled to one ink height, then fitted to `width` if given;
    - same anchor rules as rental's `label()`.
  - `premium_emblem(p, height, yaw=0, place=transform) -> list[Object]`: the 25-cell logo.
  - `premium_halo(p, width, height, yaw=0, place=transform) -> Object`: one plane 3 cm behind the face, carrying `Premium Sign | aqua halo`.
  - `premiumize_lettering(obs: list[Object], body: str, *, accent=False) -> list[Object]`:
    - converts letter meshes already made by a stall's own text helper, in place;
    - keeps each front face where it is and extrudes it backwards by `sign_depth(ink height)`;
    - assigns the face (ivory, or aqua when `accent`), return and edge materials before `bm.to_mesh`.
    - Requires object-local +Z to be the letter's facing direction (true for rental's `label()`). A stall whose helper bakes its transform into vertices calls this before the bake.
  - `set_budget_step(step: int) -> None`: step 0 is the full spec. Steps 1–3 are the spec's start-group step-down ladder:
    1. captions under 0.3 m get 1.2 cm depth and no bevel;
    2. also curve `resolution_u` 2;
    3. also non-wordmark, non-name slogans stay at today's depth, with the new materials.
  - `SIGN_LOG: list[dict]`: every call appends `{"body", "kind", "position"}`. `kind` is `"wordmark" | "name" | "emblem" | "halo"`; `position` is the world-metre `[x,y,z]` anchor. Builders write it to their layout JSON as `signage`.
  - `sign_kind(body: str) -> str`: `"wordmark"` when `is_wordmark`, else `"name"`.

- [ ] **Step 1: Write the failing self-test** `scripts/blender/test_premium_signage.py`. It loads the module by path in a factory-startup scene and asserts:
  - `is_wordmark("livegrid AV")` and `is_wordmark("LivegridAV")` are true; `is_wordmark("CONTENT STUDIO")` is false;
  - `sign_depth(.1) == .018`, `sign_depth(.5) == .0375`, `sign_depth(2) == .065`;
  - `premium_emblem((0,2,0), 1.0)`:
    - makes 25 cells, 18 of them on `frosted aqua cell` (sum of `[2,4,3,5,4]`) and 7 on `dim signal cell`;
    - its overall width is within 1 mm of `.80*(4*57/276+48/276)`;
  - `premium_wordmark((0,2,0), .6)`:
    - uses both `ivory lit face` and `aqua lit face`;
    - the `AV` part sits right of `livegrid`;
    - the Y depth extent equals `sign_depth(.6)` within 1 mm;
  - `premiumize_lettering` on a text object made with yaw π/2, height .4:
    - its front-face bounds are unchanged within 1 mm;
    - its depth equals `sign_depth(.4)`;
    - it extrudes away from its facing direction;
    - side faces carry `brushed champagne return`;
  - no material name contains `glass`;
  - `SIGN_LOG` kinds are `["emblem","wordmark","name"]` in call order;
  - after `set_budget_step(1)`, a .2 m caption has depth .012 and no bevel.

  The script ends with `print("PREMIUM_SIGNAGE_SELFTEST PASS")`; any failed assert exits non-zero (`sys.exit(1)`).
- [ ] **Step 2: Run** `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python scripts/blender/test_premium_signage.py`. Expected: fails on loading `premium_signage.py`.
- [ ] **Step 3: Implement `scripts/blender/premium_signage.py`** by promoting the spike helpers into the interface above. Spike lessons that must survive:
  - set materials before `bm.to_mesh`;
  - unlit cells are never named "glass";
  - `ARIALN.TTF` is absent, so captions resolve to `seguisb.ttf`.
- [ ] **Step 4: Run** the self-test again. Expected: `PREMIUM_SIGNAGE_SELFTEST PASS`.
- [ ] **Step 5: Commit** both files, message `feat(blender): shared premium signage module`.

### Task 3: Runtime material rules for sign materials

**Files:**
- Create: `src/venue/three/premiumSignMaterials.ts`
- Modify: `src/venue/three/rental2026Materials.ts`, `src/venue/three/architecturalFinish.ts`, `src/venue/three/projectionMaterials.ts`, `src/venue/three/technicalMaterials.ts`, plus any other stall material pass found by `grep -rn "traverse" src/venue/three src/venue/zones`
- Test: `scripts/release.test.mjs`

**Interfaces:**
- Produces:
  - `isPremiumSignMaterial(name: string) => boolean`: true when `name` starts with `"Premium Sign | "`.
  - `stylePremiumSign(material: MeshStandardMaterial) => void`. It applies exactly what `rental2026Materials.ts` did to these names in the approved test render:
    - champagne names get metalness .82;
    - lit faces and cells keep their GLB emissive;
    - the halo gets `transparent=true`, `depthWrite=false`.
  - Every stall's material pass calls it first and skips its own rules for these materials.

- [ ] **Step 1: Write the failing tests:**
  - `test("premium sign materials are styled the same in every stall")`: build a `MeshStandardMaterial` for each of the 7 names and run `stylePremiumSign` on it. Assert:
    - `brushed champagne return` and `polished champagne edge` end with metalness .82;
    - `aqua halo` has `depthWrite === false`;
    - `dim signal cell` has `depthWrite === true` and `transparent === false`.
  - `test("every stall material pass hands sign materials to stylePremiumSign")`: each of the four modified files contains `isPremiumSignMaterial(` (source scan, same style as the existing source-scan tests).
- [ ] **Step 2: Run** `node --test scripts/release.test.mjs`. Expected: both fail.
- [ ] **Step 3: Implement** the module and the early-return call in each material pass.
- [ ] **Step 4: Run** `node --test scripts/release.test.mjs` and `npm run typecheck`. Expected: pass, 0 type errors.
- [ ] **Step 5: Commit** with message `feat(venue): one runtime style for premium sign materials`.

### Task 4: Screen and canvas brand marks (2D)

**Files:**
- Create: `src/venue/media/brandMarks.ts`
- Modify:
  - `src/venue/media/ledRental2026Painters.ts:76-104` (replace `logo()` and `"livegrid AV"`)
  - `src/venue/zones/Arena.tsx:252`
  - `src/venue/zones/ReferencePillars.tsx:42`
  - `src/venue/zones/ReferenceReception.tsx:31,41-43`
  - `src/venue/zones/HallDressing.tsx:57`
  - `src/venue/media/projectionPainters.ts:273`
  - `src/venue/media/fallback.ts:13`
- Test: `scripts/release.test.mjs`

**Interfaces:**
- Produces:
  - `SIGNAL_GRID_HEIGHTS = [2,4,3,5,4] as const`.
  - `signalGridCells() => {col:number,row:number,lit:boolean}[]`: 25 cells, row 0 at the top.
  - `drawSignalGrid(ctx, x, y, size)`: lit cells `#1FA093`, unlit `#0e1a18`. Cell size and pitch come from the 48/57/276 ratios.
  - `drawWordmark(ctx, x, y, fontPx, opts?: {align?: CanvasTextAlign, ink?: string}) => number`:
    - draws `livegrid` in `ink` (default `#f8fcff`), then `AV` in `#1FA093`;
    - uses `600 {fontPx}px` with the `--font-space-grotesk` family (same lookup as `family()` in `ledRental2026Painters.ts`);
    - returns the total width.

- [ ] **Step 1: Write the failing tests:**
  - `test("the canvas signal grid lights 18 cells in the brand pattern")`: `signalGridCells()` has 25 cells and 18 lit. Column 3 is lit for rows 0–4; column 0 only for rows 3–4.
  - `test("no screen or source file spells the brand wrong")`: for every `.ts`/`.tsx` file under `src/`, `wordmarkProblems()` on its string literals is empty. Import it from `scripts/brand-check.mjs`; extract string literals with the regex `/(["'`])((?:\\.|(?!\1).)*)\1/g` so comments don't count.
- [ ] **Step 2: Run** `node --test scripts/release.test.mjs`. Expected: the first fails (module missing); the second fails, listing the 7 inventoried files.
- [ ] **Step 3: Implement** `brandMarks.ts` and replace each wrong mark. Where a mark sits alone at a fixed centre (Arena, pillars, reception, fallback), centre `drawWordmark` on the same point and font height. Rental backdrop: the grid replaces `logo()` at the same `emblemSize`. Uppercase "LIVEGRID AV" footers become `drawWordmark` at the same font size.
- [ ] **Step 4: Run** `node --test scripts/release.test.mjs`, `npm run typecheck` and `npx eslint <changed files>`. Expected: all pass.
- [ ] **Step 5: Check it in the page.** Start `preview_start {name:"site-dev"}` (port 3100). Open `/?camera=qa&pos=1,1.75,-86.65&look=14.2,8.8,-88.15&fov=55` (rental backdrop) and the Arena, pillar and reception views, then take screenshots. Expected: grid logo plus `livegrid`+aqua `AV` on each screen; no console errors.
- [ ] **Step 6: Commit** with message `fix(venue): correct the brand mark on every screen`.

### Task 5: Reception brand wall and pillar gallery (start group, first)

**Files:**
- Modify:
  - `scripts/blender/exhibition_base_helpers.py:136` and `scripts/blender/rebuild_pillar_gallery.py:136`: route `lettering()` through the premium module;
  - `scripts/blender/rebuild_reception_gallery.py:472`;
  - `scripts/blender/rebuild_pillar_gallery.py:347`;
  - `scripts/blender/rebuild_grand_reception.py` and `rebuild_grand_pillar_gallery.py`: write `layout["signage"] = SIGN_LOG`.
- Regenerate:
  - `public/models/expo/grand-reception.glb`, `grand-reception-layout.json`;
  - `grand-reception-brand-wall-v2.glb` and its `-layout.json`, via `node scripts/reposition-reception-brand-wall-v2.mjs`;
  - `grand-pillar-gallery.glb`, `grand-pillar-layout.json`.
- Modify: `scripts/brand-check.mjs` (`SIGNED_ASSETS` += reception `{layout:"grand-reception-brand-wall-v2-layout.json", glbs:["grand-reception-brand-wall-v2.glb"], halo:0}` and pillars `{layout:"grand-pillar-layout.json", glbs:["grand-pillar-gallery.glb"], halo:0}`)

**Interfaces:**
- Consumes: `premium_wordmark`, `premium_emblem`, `premiumize_lettering`, `sign_kind`, `SIGN_LOG`, `set_budget_step` (Task 2).

- [ ] **Step 1: Add both `SIGNED_ASSETS` entries. Run** `node scripts/brand-check.mjs`. Expected: exit 1, "no signage" for both.
- [ ] **Step 2: Route the lettering.**
  - `lettering()` builds as today, then calls `premiumize_lettering` (no accent: these faces are white).
  - The `"LivegridAV"` calls become a `premium_emblem` + `premium_wordmark` pair. Fit the pair to the old wordmark's width, logo left, gap 0.25 × height. No halo.
  - If `reposition-reception-brand-wall-v2.mjs` needs `layout.signage` carried through, carry it.
- [ ] **Step 3: Rebuild.** Run Blender on `rebuild_grand_reception.py`, then `node scripts/reposition-reception-brand-wall-v2.mjs`. Then run Blender on `rebuild_grand_pillar_gallery.py`. Expected: each prints its `GRAND_…` line, and `reposition-…` writes `geometry-check.json` with no failure.
- [ ] **Step 4: Confirm only sign files changed.** `git status --short public/models/expo` lists only the files under "Regenerate". `grand-reception-visitors.glb` and `grand-pillar-visitors.glb` match HEAD byte for byte. If one differs, restore it with `git checkout`, then set its sha256 in the layout JSON back to HEAD's value.
- [ ] **Step 5: Check the start budget.** Run `npm run build`, then `node --test scripts/release.test.mjs`. Expected: "start fits 24 MiB" passes and `node scripts/brand-check.mjs` exits 0.
  - If the start group is over 24 MiB: call `set_budget_step(1)` in these two builders, rebuild, measure; repeat with 2, then 3.
  - If step 3 is still over budget, stop and report to the owner with the numbers. Never raise the budget.
- [ ] **Step 6: Take the owner's pictures.** Extend `qa/premium-sign-test/shoot.mjs` with a `--stall <id>` option. It shoots front (`?shot=<id>&view=front`) and angle (a `camera=qa` view about 35° off the sign normal at sign height) for HEAD~ and the working build. Save to `qa/premium-sign-test/<id>/`. Shoot `reception` and `pillars`.
- [ ] **Step 7: Commit** the builders, regenerated assets, `brand-check.mjs` and pictures, message `feat(expo): premium signage on reception wall and pillar gallery`. The message includes the start-group bytes and any budget step used.

### Task 6: LED Rental

**Files:**
- Modify:
  - `scripts/blender/rental_finish_v2_shell.py:128-129` (main fascia: emblem + wordmark + the stall's one halo) and `:150` (outside-return emblem → `premium_emblem`);
  - `scripts/blender/rental_finish_v2_interior.py:174-175` (desk: emblem + wordmark, no halo);
  - `scripts/blender/rebuild_led_rental_2026_shell.py:54` (`label()` → `premiumize_lettering`; Arial Narrow → `seguisb.ttf` fitted to the same width);
  - `rebuild_led_rental_2026_interior.py:107` (`label26()`, accent when its `finish` is a teal/mint material);
  - `rebuild_grand_rental_finish_v2.py:157-166` (`layout["signage"]`).
- Regenerate: `grand-rental-finish-v2-shell.glb`, `-interior.glb`, `-layout.json`.
- Modify: `scripts/brand-check.mjs` (`SIGNED_ASSETS` += `{layout:"grand-rental-finish-v2-layout.json", glbs:["grand-rental-finish-v2-shell.glb","grand-rental-finish-v2-interior.glb"], halo:1}`)

**Interfaces:**
- Consumes: Task 2 functions; `premium_halo` sized as in the approved test: from −1.25 h to the wordmark end + .30 h, y from −.30 h to 1.30 h.

- [ ] **Step 1: Add the entry. Run** `node scripts/brand-check.mjs`. Expected: exit 1 for rental.
- [ ] **Step 2: Route** the helpers and sign calls listed under Files.
- [ ] **Step 3: Rebuild** with Blender on `rebuild_grand_rental_finish_v2.py`. Expected: the `RENTAL_FINISH_V2` line.
- [ ] **Step 4: Confirm only sign files changed** (same rule as Task 5). `grand-rental-finish-v2-visitors.glb` and `-hall.glb` stay byte-identical.
- [ ] **Step 5: Run** `node scripts/brand-check.mjs` (exit 0), `npm run build` and `node --test scripts/release.test.mjs` (all pass; the rental light pack is ≤ 8 MiB).
- [ ] **Step 6: Pictures** with `shoot.mjs --stall rental`. The main fascia must match the approved test except for the font (Space Grotesk).
- [ ] **Step 7: Commit** with message `feat(expo): premium signage on the LED Rental stall`.

### Task 7: Content Studio (anamorphic)

**Files:**
- Modify:
  - `scripts/blender/rebuild_grand_anamorphic_shape_v3.py:83`: `label()` builds, then `premiumize_lettering`.
  - `:183` portal fascia: grid logo left of the wordmark, together fitted to `PORTAL_WIDTH-.86`, plus the stall's one halo.
  - `:227` gallery fascia: logo + wordmark, same fit rule, no halo.
  - `:313`, `:329`, `:337`: wordmark only, no logo, no halo.
  - Near `:446`: `layout["signage"]`.
  - `scripts/blender/rebuild_anamorphic_stall.py:86` (`text()`), if the v3 build still reaches it.
- Regenerate: `grand-anamorphic-shape-v3-shell.glb`, `-interior.glb`, `-layout.json`.
- Modify: `scripts/brand-check.mjs` (`SIGNED_ASSETS` += `{layout:"grand-anamorphic-shape-v3-layout.json", glbs:["grand-anamorphic-shape-v3-shell.glb","grand-anamorphic-shape-v3-interior.glb"], halo:1}`)

- [ ] **Step 1: Add the entry. Run** `node scripts/brand-check.mjs`. Expected: exit 1 for anamorphic.
- [ ] **Step 2: Route** the calls above.
- [ ] **Step 3: Rebuild** with Blender on `rebuild_grand_anamorphic_shape_v3.py`. Expected: the `GRAND_ANAMORPHIC` line.
- [ ] **Step 4: Confirm only sign files changed.** `grand-anamorphic-shape-v3-visitors.glb` stays byte-identical. The layout's `assets[…visitors].sha256` is unchanged.
- [ ] **Step 5: Run** the brand check (exit 0), `npm run build` and the release tests (pass).
- [ ] **Step 6: Pictures** with `shoot.mjs --stall content`.
- [ ] **Step 7: Commit** with message `feat(expo): premium signage and grid logo on the Content Studio`.

### Task 8: AV Engineering / Show Control

**Files:**
- Modify:
  - `scripts/blender/rebuild_technical_showcase.py`: `:74` `text()` → `premiumize_lettering`; `:178` `emblem()` → `premium_emblem` (diamond gone); `:195` `wordmark()` → `premium_emblem` (when `with_emblem`) + `premium_wordmark`, same layout and gap.
  - `scripts/blender/technical_shape_v3_shell.py`: `:106` crown gets the stall's one halo; `:211`, `:218` blades get no halo.
  - `technical_shape_v3_interior.py:254,300`: no halo.
  - `rebuild_grand_technical_shape_v3.py:24` (its `wordmark` wrapper) and near `:93` (`layout["signage"]`).
- Regenerate: `grand-technical-shape-v3-shell.glb`, `-interior.glb`, `-layout.json`.
- Modify: `scripts/brand-check.mjs` (`SIGNED_ASSETS` += `{layout:"grand-technical-shape-v3-layout.json", glbs:["grand-technical-shape-v3-shell.glb","grand-technical-shape-v3-interior.glb"], halo:1}`)

- [ ] **Step 1: Add the entry. Run** the brand check. Expected: exit 1, including the diamond's material from `OLD_EMBLEM_MATERIALS`.
- [ ] **Step 2: Route** the calls above.
- [ ] **Step 3: Rebuild** with Blender on `rebuild_grand_technical_shape_v3.py`. Expected: the `GRAND_TECHNICAL_V3` line.
- [ ] **Step 4: Confirm only sign files changed.** Visitors and `technical-reference-hall-rig-v3.glb` stay byte-identical.
- [ ] **Step 5: Run** the brand check (exit 0), the build and the release tests (pass).
- [ ] **Step 6: Pictures** with `shoot.mjs --stall technical`.
- [ ] **Step 7: Commit** with message `feat(expo): premium signage on the AV Engineering stall`.

### Task 9: Projection Mapping

**Files:**
- Modify:
  - `scripts/blender/projection_finish_v2_shell.py:208-209` (main fascia emblem + wordmark + the stall's one halo);
  - `projection_finish_v2_interior.py:134` (`lettering()`, accent for mint/teal finishes such as "TRANSFORM SPACES INTO STORIES") and `:248-249` (desk, no halo);
  - `projection_base_helpers.py:73,105` (`text()`, `wordmark()`);
  - `rebuild_projection_finish_v2.py:225-234` (`layout["signage"]`).
- Regenerate, in order:
  1. Blender `rebuild_projection_finish_v2.py` → `projection-finish-v2-{shell,interior}.glb`, `-layout.json`;
  2. `node scripts/reposition-projection-galleries.mjs` → `projection-finish-v2-gallery-*`;
  3. `node scripts/sync-blender-gallery-positions.mjs` → `projection-finish-v2-blender-{shell,interior}.glb` and `projection-finish-v2-blender-layout.json`.
- Modify:
  - `scripts/sync-blender-gallery-positions.mjs`: move `layout.signage` positions in the gallery region the same way it moves `layout.typography`;
  - `scripts/brand-check.mjs` (`SIGNED_ASSETS` += `{layout:"projection-finish-v2-blender-layout.json", glbs:["projection-finish-v2-blender-shell.glb","projection-finish-v2-blender-interior.glb"], halo:1}`).

- [ ] **Step 1: Add the entry. Run** the brand check. Expected: exit 1 for projection.
- [ ] **Step 2: Route** the calls above.
- [ ] **Step 3: Run the three regenerate steps in order.** Expected:
  - the `PROJECTION_FINISH_V2_READY` line;
  - `reports/projection-gallery-edit/geometry-check.json` with no failure;
  - the sync script reports `verticesMoved` > 0 for both kinds.
- [ ] **Step 4: Confirm only sign files changed.** Visitors, hall and crystals GLBs stay byte-identical. In the venue, the gallery walls stand where they stood at HEAD: compare `shoot.mjs --stall projection` gallery shots HEAD vs new; walls and screens must line up.
- [ ] **Step 5: Run** the brand check (exit 0), the build and the release tests (pass).
- [ ] **Step 6: Pictures** with `shoot.mjs --stall projection`.
- [ ] **Step 7: Commit** with message `feat(expo): premium signage on the Projection Mapping stall`.

### Task 10: Whole-venue checks and owner review

**Files:**
- Modify: `scripts/release.test.mjs` (coverage test), `public/models/expo/signage-revisions.json` (only if `stamp-signage-revisions.mjs`'s listed GLBs changed)
- Create: `reports/perf/premium-final/` (`git add -f`)

- [ ] **Step 1: Write the coverage test** `test("all six signed areas are in the brand check")`. It asserts `SIGNED_ASSETS` has 6 entries, and that the sum of `halo` is 4.
- [ ] **Step 2: Run** `node --test scripts/release.test.mjs`. Expected: pass. If it fails, a stall task was skipped; go back to it.
- [ ] **Step 3: Revisions.** If `git diff --name-only main -- public/models/expo` lists any GLB named in `scripts/stamp-signage-revisions.mjs`, run `node scripts/stamp-signage-revisions.mjs`. Otherwise leave it untouched.
- [ ] **Step 4: Full suite.** Run `npm test`, `npm run typecheck`, `npx eslint` on changed files, and `npm run build`. Expected: all pass. Start group ≤ 24 MiB and every light pack ≤ 8 MiB, from the build's manifest.
- [ ] **Step 5: Speed.** With `serve-export` running:
  - `node scripts/measure-venue.mjs --label premium-final --throttle fast4g`;
  - `node scripts/check-nav-jumps.mjs --label premium-final --throttle fast4g`.

  Expected:
  - open time and start bytes within +3% of `premium-baseline`;
  - 0 gap frames;
  - nav jumps 0 gaps;
  - no console errors.
- [ ] **Step 6: Look outside the signs.** Run `node scripts/compare-shots.mjs reports/perf/premium-baseline reports/perf/premium-final`. Expected: every shot that differs differs only inside a sign or screen-logo region; list each differing shot and the region.
- [ ] **Step 7: Check the artwork.** Open (view) every `.webp` under `public/media/` that a load group lists and the inventory did not open. Report each image showing a brand mark, with its path; the owner decides whether it is redrawn. This is a report, not a fix.
- [ ] **Step 8: Commit** with message `test: premium signage covers all six areas; final speed report`.
- [ ] **Step 9: Hand the pictures to the owner.** Send every stall's before/after front and angle pictures from `qa/premium-sign-test/<id>/`, with the speed numbers, and ask for approval before any push. The spike branch `spike/premium-sign` is deleted only after this goes live.

### Task 6b: Light pack keeps sign faces only (inserted by controller, Ruling 11)

**Files:**
- Modify: `scripts/derived-models.mjs` (`makeLite`)
- Test: `scripts/release.test.mjs`

**Interfaces:**
- Produces: `export const LITE_DROPPED_MATERIALS = ["Premium Sign | brushed champagne return", "Premium Sign | polished champagne edge"]` and `export function dropSignReturns(document) => number` (count of primitives removed). `makeLite` calls it before simplifying. A mesh left with no primitives is detached from its node; the node itself (name, transform, hierarchy) stays.

- [ ] **Step 1: Write the failing test** `test("lite models keep sign faces and drop the deep sign sides")`. Build a gltf-transform `Document` in memory with one node → mesh holding three primitives (materials `Premium Sign | ivory lit face`, `Premium Sign | brushed champagne return`, `Premium Sign | polished champagne edge`) and a second node → mesh with one `Premium Sign | brushed champagne return` primitive. Assert that `dropSignReturns` returns 3, that the first mesh keeps exactly the ivory primitive, that the second node still exists with its name but has no mesh, and that a primitive on any other material is untouched.
- [ ] **Step 2: Run** `node --test --test-name-pattern "deep sign sides" scripts/release.test.mjs`. Expected: FAIL (export missing).
- [ ] **Step 3: Implement** `dropSignReturns` and call it at the top of `makeLite`. Dispose of orphaned accessors with the existing `prune` pass.
- [ ] **Step 4: Run** the focused test, then `npm run build` and the full `node --test scripts/release.test.mjs`. Expected: all pass. The total light pack is reported below today's 8,172,120 bytes, and the rental shell lite is back near its pre-premium 248 KB.
- [ ] **Step 5: Commit** `perf(build): light pack shows sign faces without their deep sides`.
