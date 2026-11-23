# Premium stall signage: design

Date: 2026-11-23. Owner request: "Correct our Brand Logo on all our stalls & Make the stalls names & Brandings 3D", then "I want it premium look". Owner approved the look from a test render of the LED Rental stall's main sign (spike branch `spike/premium-sign`, commit 8c5499c, pictures in `qa/premium-sign-test/`) and said "Yes, all stalls".

## Intent

Every stall in the 3D venue should carry the real LivegridAV brand, built like the signage on a high-end exhibition stand: deep built-up letters with lit faces and metal sides, and the 5×5 signal-grid logo as a small LED panel. Today the stalls use three wrong emblems and two misspellings, and the lettering is about 2 mm deep, so it reads as printed.

## Goals

1. **Correct brand everywhere a visitor can see it.** Logo = 5×5 grid, columns lit bottom-up with heights `[2,4,3,5,4]` left to right; lit cells aqua, unlit cells dim. Wordmark = lowercase `livegrid` + aqua `AV`, one word, no space. This replaces the blue faceted diamond (Technical), the teal folded triangle / play arrow (Rental, Projection) and every "LivegridAV" (capital L) and "livegrid AV" (space).
2. **Premium 3D build** for all 3D signage in the stall models: the wordmark, stall names, slogans and captions.
3. **Keep stage 1's speed:** start group stays within its 24 MiB budget, light packs within 8 MiB, no new hitches, no empty areas.

## Non-goals

- No change to stall architecture, furniture, people, screens, lighting or camera paths.
- No change to the wording of names and slogans (only the brand spelling is corrected).
- The entrance sign is already correct (Space Grotesk 600 `livegridAV` + correct grid, `refine_entrance.py`); it is not rebuilt.
- WebGPU / stage 2 smoothness work is separate and paused.

## Anti-goals

- Neon or "AI template" glow: glow appears **once per stall**, on its main fascia sign only.
- Any visible change outside the signs (checked by screenshot comparison).
- Renaming or removing materials that runtime code restyles by name, in a way that silently changes how non-sign surfaces look.

## The premium sign spec (approved in the test)

| Part | Build |
|---|---|
| Letter face | ivory, softly self-lit (`Premium Sign \| ivory lit face`) |
| `AV` face | aqua #1FA093, softly self-lit (`Premium Sign \| aqua lit face`) |
| Letter sides | brushed champagne metal (`Premium Sign \| brushed champagne return`) |
| Front edge | thin polished champagne bevel, letters ≥ 0.3 m tall only (`Premium Sign \| polished champagne edge`) |
| Depth | `clamp(0.075 × letter height, 1.8 cm, 6.5 cm)`; stand-off as today |
| Logo | 25 raised rounded squares, square overall, 0.80 × the emblem height it replaces; lit = `frosted aqua cell`, unlit = `dim signal cell` (never "glass": runtime treats glass as see-through) |
| Halo | one soft aqua wash on the panel behind the main fascia logo + wordmark, per stall |
| Wordmark font | Space Grotesk 600 (brand font, matches the entrance and the website) |
| Other face colours | lettering keeps its current face colour family: white/porcelain/ivory → ivory lit face; mint/teal/cyan accents (e.g. Projection's "TRANSFORM SPACES INTO STORIES") → aqua lit face. `premium_label` honours an accent option instead of turning everything ivory |

The test used Segoe UI for the wordmark. Switching to Space Grotesk 600 is my call to match the entrance and the website (see "Calls I made").

## Inventory (what changes, by area)

Wrong items are marked ✗. Line numbers are from the inventory of 2026-11-23.

- **LED Rental** (`rebuild_grand_rental_finish_v2.py` → `rental_finish_v2_shell.py`, `rental_finish_v2_interior.py`): ✗ main fascia triangle emblem + "livegrid AV" (:128–129), ✗ outside-return emblem (:150), ✗ reception desk emblem26 + "livegrid AV" (interior :174–175). Names and slogans: LED RENTAL SOLUTIONS / FOR EVERY VISION, service list, IDEAS IN MOTION, application captions (Arial Narrow, missing on this machine), product captions, garden plinth line.
- **Content Studio / anamorphic** (`rebuild_grand_anamorphic_shape_v3.py` → `rebuild_anamorphic_stall.py`): ✗ "LivegridAV" on portal fascia (:183), gallery (:227), rear counter (:313), consultation (:329), front reception (:337). No emblem today; the main fascia gains the grid logo. Names and slogans: CONTENT STUDIO, entry blade, gallery copy, basin line.
- **AV Engineering / Show Control** (`rebuild_grand_technical_shape_v3.py` → v2 → `rebuild_technical_showcase.py`, `technical_shape_v3_shell.py`, `technical_shape_v3_interior.py`): ✗ diamond emblem + "Livegrid"+"AV" crown (:106), ✗ tower blades wordmark + emblems (:211, :218), ✗ reception wordmark (:254), ✗ lounge plaques (:300). Names: AV ENGINEERING / SHOW CONTROL / LIVE PRODUCTION + subtitles, PEOPLE TECHNOLOGY EXTRAORDINARY EVENTS, tower copy, reception lines.
- **Projection Mapping** (`rebuild_projection_finish_v2.py` → `projection_finish_v2_shell.py`, `projection_finish_v2_interior.py`): ✗ triangle emblem + "livegrid AV" (:208–209), ✗ desk emblem26 + "livegrid AV" (interior :248–249). The live `projection-finish-v2-blender-*` files are derived from the rebuilt `projection-finish-v2-*` files by `scripts/sync-blender-gallery-positions.mjs` with `reports/projection-gallery-edit/blender-saved-transforms.json`; that step must run after the rebuild.
- **Reception brand wall** (`rebuild_reception_gallery.py` → `rebuild_grand_reception.py` → `reposition-reception-brand-wall-v2.mjs`): ✗ "LivegridAV" (:472) + wall copy. Start group.
- **Pillar gallery** (`rebuild_pillar_gallery.py` → `rebuild_grand_pillar_gallery.py`): ✗ "LivegridAV" (:347) + copy. Start group.
- **Drawn on screens in code (2D, spelling and logo only, not 3D):** `media/ledRental2026Painters.ts` (✗ triangle + "livegrid AV" on the rental backdrop), `zones/Arena.tsx:252`, `zones/ReferencePillars.tsx:42`, `zones/ReferenceReception.tsx:31,41–43`, `zones/HallDressing.tsx:57` and `media/projectionPainters.ts:273` ("LIVEGRID AV" footers), `media/fallback.ts:13`. Screens get the grid logo (canvas-drawn) and `livegrid` + `AV` in the brand colours.
- **Already correct:** entrance sign, `hallFeatures.ts` signal grids, site navigation.
- **Images:** the inventory found no brand marks baked into the artwork it opened; the unopened artwork is checked during the build.

## Approaches considered

1. **One shared premium sign module, called by every stall builder (chosen).** Promote the spike's `premium_label` / `premium_emblem` into `scripts/blender/premium_signage.py`; each builder's `label`/`emblem`/`text`/`wordmark` helpers route to it. One look, one place to tune, every stall rebuilt by its own script, so the source of truth stays the scripts.
2. **Patch the exported GLBs** (delete old sign meshes, merge new sign GLBs). Faster to run, but the scripts would no longer produce what ships, and sign meshes are already merged with other lettering by material, so they can't be cut out cleanly.
3. **Separate sign GLBs mounted on top of the stalls.** Leaves the old 2 mm letters underneath (z-fighting or hidden-geometry hacks) and adds a request per stall.

## How it is built

- `premium_signage.py`: materials above, `premium_label(body, …)` (wordmark detection: `body.replace(' ','').lower() == 'livegridav'` → `livegrid` + `AV`), `premium_emblem(p, height, yaw)`, and `premium_halo(...)` called explicitly for each stall's single main fascia sign (not automatically by height).
- Each stall builder imports it and swaps its helpers. Technical's `wordmark()` (capital L, separate AV) and `emblem()` (diamond) route to the same functions.
- Fonts: wordmark Space Grotesk 600 (`assets/blender/entrance-refinement/Official-SpaceGrotesk-600.ttf`); names and slogans keep their current Segoe UI / Segoe UI Semibold; the four rental captions that used Arial Narrow use Segoe UI Semibold fitted to the same width.
- Runtime material rules: add matching rules for `Premium Sign | …` where a stall's material code needs them (champagne metal, emissive faces not tone-mapped into white, halo `depthWrite=false`), and remove only the rules for the old emblem/lettering materials that no longer exist.
- Rebuild each stall's GLBs with Blender 5.2, run the projection derive step, update revisions (`signage-revisions.json`, layout `stats` sha256), then `npm run build` regenerates light and lod1 files.
- Canvas painters: one shared `drawSignalGrid(ctx, x, y, size)` + `drawWordmark(...)` helper in `src/venue/media/`.

## Start-group budget

Reception brand wall and pillar gallery are in the start group (22.69 of 24 MiB; the test made the rental shell 6.3% bigger). They are rebuilt **first**, and the start-group size is measured before any other stall is touched. If it goes over 24 MiB, the start-group signs step down in this order until it fits: (1) captions under 0.3 m get 1.2 cm depth and no bevel; (2) fewer curve segments on all start-group lettering (`resolution_u` 2); (3) slogans in the start group stay at today's depth with the new materials, and only the wordmark and names are built deep. The budget itself is not raised.

## Checks

- **Brand check script:** parse each rebuilt GLB and the layout JSONs; fail if any signage body contains `Livegrid` (capital L) or `livegrid AV` (space), or any old emblem material remains. Unit test in `scripts/release.test.mjs`.
- **Look outside the signs unchanged:** `compare-shots.mjs` on the baseline views, with sign regions expected to differ; owner reviews before/after pictures of every stall's main sign, from the front and at an angle.
- **Speed:** start group ≤ 24 MiB (today 22.69), light pack ≤ 8 MiB; `measure-venue.mjs` fast 4G: open time and bytes within +3% of today, 0 gap frames; `check-nav-jumps.mjs` 0 gaps.
- `npm test`, typecheck, lint on changed files.

## Calls I made (owner can overrule)

1. Wordmark font Space Grotesk 600 (brand font) instead of the test's Segoe UI.
2. Names and slogans keep their current fonts; only depth and materials change.
3. Arial Narrow captions → Segoe UI Semibold (the font isn't installed here).
4. Content Studio gains a grid logo on its main (portal) fascia, to the left of the wordmark as on the rental stall; the logo plus wordmark are fitted together to today's wordmark width (`PORTAL_WIDTH-.86`), so the wordmark becomes about 20% smaller. Same rule for the gallery fascia wordmark (:227). Desk and counter wordmarks get no logo.
5. Halo only on each stall's main fascia sign: Rental main fascia, Content Studio portal, Technical crown, Projection main fascia. The reception brand wall and the pillar gallery get **no halo** (they are not stalls, and they are in the start group); desk, blade and plaque wordmarks get no halo.
7. Lettering keeps its current face colour family (ivory or aqua); nothing that is an accent colour today turns ivory.
8. Start-group budget is protected by building those two areas first and stepping their signs down if needed (see "Start-group budget").
6. Screen and canvas wordmarks are corrected in 2D only.

## Left to the builder

Exact halo size per stall; edge-bevel cut-off for small text; whether each stall's lit faces need a per-stall emissive tweak after seeing it in the venue; order of stalls (start-group ones first, since they carry budget risk).
