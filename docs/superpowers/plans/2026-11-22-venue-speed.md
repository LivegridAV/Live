# Venue Speed (Stage 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The home-page venue opens after ~20 MB instead of ~70 MB, streams the rest ahead of the visitor with no mid-walk stops or loading cues, and draws far fewer objects per frame, with no visible change to the look.

**Architecture:** A data manifest splits venue assets into journey-ordered load groups. A pure planner decides which groups must be ready before opening, from measured bandwidth. A runtime streamer fetches and shader-warms later groups in the background, and a light pack stands in only if a visitor outruns it. The post-export step adds KTX2 textures (from a locally built cache), simplified "lite" and "lod1" models, and a byte manifest. Static meshes are merged at load time to cut draw calls.

**Tech Stack:** Next 16.2.9 static export, React 19, three r185, @react-three/fiber 9, @react-three/drei 10, @gltf-transform 4 + meshoptimizer + sharp (post-export), `ktx2-encoder@0.6.0` (local cache builder), `playwright-core` driving the installed Chrome (measurement), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-21-venue-speed-design.md`

## Global Constraints

- Branch `perf/venue-speed`. Never push `main` (it deploys livegridav.com). Shipping is the owner's call after seeing numbers and screenshots.
- Never modify source GLBs in `public/models/**`, or their sha256 fingerprints in layout data or `public/models/expo/signage-revisions.json`. All asset transforms run on `out/` in `scripts/optimize-export.mjs`.
- Cloudflare Pages limits: 25 MiB per file, 20,000 files. The existing check in `optimize-export.mjs` stays.
- The Cloudflare build must never run the KTX2 encoder (2–10 s per texture). It only reads `assets-cache/ktx2/`.
- Read `node_modules/next/dist/docs/` before Next-specific code, and use Context7 for drei/R3F/three APIs (repo rule, `AGENTS.md`).
- After the venue opens: no blocked scrolling and no loading text or spinner, ever (owner decision 1).
- Opening view at z=21 unchanged; first download target ≈ 20 MB or less on a cold cache (owner decision 2).
- Targets: entrance ≤ 500 draw calls on `high`; ≤ 700 anywhere on the walk on `high`; ≤ 2 M triangles anywhere on `medium`; no long tasks > 50 ms after opening on the reference desktop; ≤ 12 s to open on "Fast 4G" (9,000 kbps down, 1,500 kbps up, 60 ms latency), cold cache.
- Keep working: reduced motion, stall visits, nav jumps, `?perf`, `?inspect`, `?camera=baseline&shot=…`, `?capture=1`, review recorder.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A nav jump or stall visit to the far end right after opening** shows the hall (lite pack, then full detail), never empty space or a spinner. Test in Task 4.
2. **A slow connection** ("Slow 4G": 2,000 kbps, 150 ms latency) opens later, then walks the full journey at the test pace with zero frames where a zone inside its switch-on distance is unready. Test in Task 9.
3. **A later-group asset that fails to load** (404 or network drop) retries with backoff (1 s, 3 s, 9 s). The lite pack stays and nothing throws to the overlay. Test in Task 4.
4. **The tab is hidden mid-stream and shown again**, and streaming continues to completion. Test in Task 4.
5. **Inspection and baseline modes** (`?inspect`, `?camera=baseline&shot=*`, `?capture=1`) wait for all groups before declaring loaded, so captures are complete. Test in Task 4.

---

### Task 1: Measurement harness and baseline

**Files:**
- Create: `scripts/measure-venue.mjs`, `scripts/compare-shots.mjs`
- Modify: `src/venue/systems/RenderMetrics.tsx` (expose a `?perf`-only hook), `package.json` (devDependency `playwright-core`, scripts `measure`, `compare-shots`)
- Output: `reports/perf/baseline/metrics.json`, `reports/perf/baseline/shots/*.png`

**Interfaces:**
- Produces: `window.__venuePerf` (only when `?perf` is present):
  `{ loaded(): boolean; groupsReady(): string[]; allReady(): boolean; stats(): { calls: number; triangles: number; textures: number; geometries: number }; longTasks(): { ms: number; progress: number }[]; snapshot(): Record<string, { position: [number,number,number]; quaternion: [number,number,number,number]; size: [number,number,number] }> }`.
  Until Task 4, `groupsReady()` returns `[]` and `allReady()` equals `loaded()`.
- Produces: `node scripts/measure-venue.mjs --label <name> [--throttle fast4g|slow4g|none]` writes `reports/perf/<name>/metrics.json`:
  `{ bytesBeforeOpen, msToOpen, requestsBeforeOpen, walk: [{ progress, calls, triangles }], longTasksAfterOpen: [...], gapFrames: number }` plus `shots/<shot>.png` for `entrance` and every `BaselineShot`. `snapshot.json` holds the `snapshot()` output after `allReady()`.
- Produces: `node scripts/compare-shots.mjs <a> <b>` prints per shot the mean absolute RGB difference (0–255) and the share of pixels with a difference above 24. It exits 1 if any shot's mean is above 1.5.

- [ ] **Step 1:** Add `playwright-core` as a devDependency. Launch with `chromium.launch({ channel: "chrome" })`, so no browser download is needed. Start `scripts/serve-export.mjs` (port 4310) as a child process. Throttle via the CDP `Network.emulateNetworkConditions` command with the values in Global Constraints, and clear the cache with `Network.clearBrowserCache`.
- [ ] **Step 2:** Implement the hook in `RenderMetrics.tsx`. `snapshot()` walks the scene and keys every **named** `Mesh`/`Group` by its ancestor-name path (not index path), giving world position, quaternion and bounding-box size rounded to 1 mm.
- [ ] **Step 3:** In `measure-venue.mjs`: open `/?perf`. `msToOpen` is the time from navigation to `loaded()` becoming true; `bytesBeforeOpen` sums `transferSize` of resources finished by then. Then scroll with `window.scrollTo(progressToScroll(p))`-equivalent steps of 0.02 progress every 250 ms (the "test pace") from 0 to 1, sampling `stats()` at each step. `gapFrames` counts steps where `groupsReady()` lacks a group whose switch-on z the camera has passed (from Task 2's manifest; 0 before Task 4). Then load each `?perf&camera=baseline&shot=<shot>`, wait for `allReady()` plus 60 frames, and screenshot at 1600×900.
- [ ] **Step 4:** Run `npm run build`, then `node scripts/measure-venue.mjs --label baseline --throttle fast4g`. Expected: `bytesBeforeOpen` ≈ 70 MB, `calls` at progress 0 ≈ 1,240. Record the numbers in `reports/perf/baseline/README.md`.
- [ ] **Step 5:** Run `node scripts/compare-shots.mjs reports/perf/baseline reports/perf/baseline`. Expected: all means 0.0, exit 0.
- [ ] **Step 6:** Commit (`reports/perf/baseline/` included).

### Task 2: Load-group manifest and opening planner

**Files:**
- Create: `src/venue/loading/groups.json`, `src/venue/loading/groups.ts`, `src/venue/loading/plan.ts`, `scripts/venue-loading.test.mjs`
- Modify: `package.json` `test` script → `node --test scripts/release.test.mjs scripts/venue-loading.test.mjs`

**Interfaces:**
- `groups.json`: `[{ "id": string, "switchOnZ": number, "assets": string[] }]` in journey order. `assets` are public paths without query strings (`/models/expo/grand-reception-visitors.glb`, `/media/...`). Plain JSON, so `optimize-export.mjs` can read it without TypeScript.
- `groups.ts`: `export type LoadGroup = { id: string; switchOnZ: number; assets: readonly string[] }`, `export const LOAD_GROUPS: readonly LoadGroup[]`, `export const START_GROUP = "start"`, `export function groupForZ(z: number): LoadGroup` (the group whose zone contains z, falling back to the nearest ahead).
- `plan.ts`:
  `export const WALK_PACE_MPS = 6; export const SAFETY_MARGIN_S = 4;`
  `export function groupsBeforeOpening(input: { bytesPerSecond: number; groups: readonly { id: string; switchOnZ: number; bytes: number }[]; startZ: number; paceMps?: number; marginS?: number }): string[]`. It returns `groups[0].id` plus each following group, in order, until the first group k where a sequential download starting at opening finishes at least `marginS` before a visitor walking at `paceMps` from `startZ` reaches `switchOnZ` of k. Every group after k must also meet that condition; if one does not, extend the list to cover it.
  `export function nextToFetch(groups: readonly { id: string }[], ready: ReadonlySet<string>, inFlight: ReadonlySet<string>, priority?: string): string | undefined`. It returns `priority` when that group is neither ready nor in flight, and otherwise the first group in order that is neither.

- [ ] **Step 1: Write failing tests** in `scripts/venue-loading.test.mjs`:
  - `groupsBeforeOpening` with bandwidth 1,125,000 B/s (9 Mbps), groups `[{start,21,20e6},{a,-60,5e6},{b,-140,10e6}]`, startZ 21 → `["start"]`. Group a arrives 4.4 s after opening and is reached at (21+60)/6 = 13.5 s, which clears the 4 s margin. Group b arrives at 13.3 s and is reached at 26.8 s.
  - The same groups at 250,000 B/s (2 Mbps) → `["start","a"]`.
  - When the only failing group is the last one, the list extends to include it.
  - `nextToFetch` with priority `"b"` while `"a"` is not ready → `"b"`; with no priority → `"a"`; with everything ready → `undefined`.
  - `groupForZ(21).id === "start"`; every asset in `groups.json` exists under `public/` (path check); no asset appears in two groups.
- [ ] **Step 2:** Run `npm test`. Expected: the new tests FAIL (modules missing).
- [ ] **Step 3:** Write `groups.json` from the mapping in the code (`Scene.tsx`, `Gallery.tsx`, `ServicePavilion.tsx`, `Arena.tsx`, `Architecture.tsx`, `HallDressing.tsx`, the `Reference*.tsx` zones, the contact-shadow components, and the media ids each zone's `Screen`s use via `data/media.ts`). `start` holds everything visible from z=21: the entrance, `hall-bay`, the reception and pillar sets, `grand-rental-finish-v2-visitors` (loaded ungated by `HallDressing`), the environment and floor textures, and the media on screens in those zones. `switchOnZ` = the zone's `ZoneGroup` `from + ahead`. Then implement `groups.ts` and `plan.ts`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit.

### Task 3: Build-time byte manifest

**Files:**
- Modify: `scripts/optimize-export.mjs` (new final step, after compression and dedupe)
- Test: `scripts/release.test.mjs`

**Interfaces:**
- Produces `out/models/load-manifest.json`: `{ "groups": [{ "id": string, "bytes": number, "lite": string[] }], "ktx2Media": string[] }`. `bytes` is the sum of each asset's final size in `out/` plus the `/textures/*.webp|ktx2` it references (by URI inside the GLB). `lite` stays `[]` until Task 5; `ktx2Media` stays `[]` until Task 6.
- Consumes: `src/venue/loading/groups.json` (Task 2).

- [ ] **Step 1:** Add a test to `release.test.mjs`: the manifest exists, has one entry per `groups.json` id in the same order, `bytes > 0` for each, and the `start` bytes ≤ 24 × 2²⁰ before Task 6 (≈ 20 MB goal, with slack until KTX2).
- [ ] **Step 2:** `npm run build && npm test`. Expected: FAIL (no manifest).
- [ ] **Step 3:** Implement the step. Count each shared `/textures/` file once per group.
- [ ] **Step 4:** `npm run build && npm test`. Expected: PASS. Note the `start` byte count in the commit message.
- [ ] **Step 5:** Commit.

### Task 4: Streamer, group gates and the new opening rule

**Files:**
- Create: `src/venue/loading/streamer.ts`, `src/venue/loading/LoadGroupGate.tsx`
- Modify: `src/venue/systems/store.ts`, `src/venue/Scene.tsx` (`Warmup`), `src/venue/zones/Gallery.tsx`, `src/venue/zones/ServicePavilion.tsx`, `src/venue/zones/Arena.tsx`, `src/venue/zones/Architecture.tsx` (only for non-start bays), the nav-jump and stall-visit entry points (`src/venue/ui/Nav.tsx`, `src/venue/ui/StallVisit.tsx`, `src/venue/systems/ScrollRig.tsx` `scrollToProgress`), `src/venue/systems/RenderMetrics.tsx` (`groupsReady`, `allReady`)
- Test: `scripts/venue-loading.test.mjs`, plus browser checks with `measure-venue.mjs`

**Interfaces:**
- Consumes: `LOAD_GROUPS`, `groupForZ`, `groupsBeforeOpening`, `nextToFetch` (Task 2); `/models/load-manifest.json` (Task 3); `warmScene` (`src/venue/three/warmScene.ts`).
- Store additions: `readyGroups: string[]`, `warmGroups: string[]`, `markGroupReady(id: string): void`, `markGroupWarm(id: string): void`.
- `streamer.ts`: `export function startStreaming(opts: { manifestUrl: string; fetchGroup: (id: string) => Promise<void>; now?: () => number }): { prioritize(id: string): void; bandwidth(): number; stop(): void }`. It runs at most 2 groups in flight; failures retry after 1 s, 3 s and 9 s, then keep the group on lite. Bandwidth is the bytes-per-second of finished fetches (Resource Timing). `fetchGroup` resolves when every GLB in the group is parsed into drei's `useGLTF` cache and every media image is decoded. Check with Context7 how drei 10 / R3F 9 expose preload completion; if `useGLTF.preload` gives no promise, load through the same loader instance and seed the cache.
- `LoadGroupGate.tsx`: `export function LoadGroupGate(props: { id: string; children: ReactNode; lite?: ReactNode }): JSX.Element`. It renders `lite` (or nothing, for `start`) until the group is ready. Once ready, it mounts `children` inside a group whose meshes are compiled with `warmScene` over that subtree during the next idle frames, before the zone's `ZoneGroup` makes it visible. Then it calls `markGroupWarm`.
- `Warmup` (Scene.tsx) now opens when every id from `groupsBeforeOpening(bandwidth measured while `start` downloads)` is warm, instead of waiting for `useProgress` to go idle. With `?inspect`, `?camera=baseline`, `?capture=1` or `?record`, it waits for all groups.

- [ ] **Step 1: Failing tests** (`venue-loading.test.mjs`, with a fake `fetchGroup` and fake clock): at most 2 in flight; `prioritize("b")` makes b the next started; a group that rejects twice then resolves is retried at +1 s and +3 s and ends ready; a group that rejects 4 times is reported failed and not retried again.
- [ ] **Step 2:** `npm test` → FAIL. Implement `streamer.ts`. `npm test` → PASS.
- [ ] **Step 3:** Wrap each non-start zone's children in `LoadGroupGate` (lite prop wired in Task 5). Nav jumps and stall visits call `prioritize(groupForZ(targetZ).id)` before moving.
- [ ] **Step 4:** Replace `Warmup`'s `useProgress` gate with the new rule. Keep the progress bar fed (0–0.85 for bytes of the required groups, 0.85–1 for warm-up), as today.
- [ ] **Step 5:** Browser check: `npm run build`, `node scripts/measure-venue.mjs --label t4 --throttle fast4g`. Expected: `bytesBeforeOpen` ≤ 24 MB, `gapFrames` 0, and every shot identical to baseline (`compare-shots baseline t4` exit 0).
- [ ] **Step 6:** Review Focus checks in the in-app browser at `?perf`. Immediately after opening, use the nav to jump to the arena: the hall is never empty, and no text or spinner appears (lite or full arrives). Block one later GLB with the DevTools request-blocking panel: the console shows the retries, the lite stays, and there's no error overlay. Hide the tab for 20 s mid-stream: `allReady()` eventually becomes true. `?camera=baseline&shot=projection`: loaded only after `allReady()`.
- [ ] **Step 7:** Commit.

### Task 5: Light pack and lod1 models

**Files:**
- Modify: `scripts/optimize-export.mjs` (derived models step), `src/venue/loading/LoadGroupGate.tsx` (default lite renderer), `src/venue/three/ExpoAsset.tsx` (lod1 choice by tier)
- Create: `src/venue/loading/LiteGroup.tsx`
- Test: `scripts/release.test.mjs`

**Interfaces:**
- Post-export writes, for every GLB in a non-start group, `<name>.lite.glb`: meshoptimizer `simplify` to 15% of triangles (error 0.02), every texture resized to ≤ 128 px, and morph and skin data dropped. For every `*-visitors.glb` and `projection-finish-v2-blender-interior.glb`, it writes `<name>.lod1.glb`: simplified to 40% (error 0.01), with textures unchanged. It records `lite` URLs per group in `load-manifest.json`. All lite files together stay ≤ 3 × 2²⁰ bytes.
- `LiteGroup.tsx`: `export function LiteGroup({ id }: { id: string }): JSX.Element` renders that group's lite GLBs at the same transforms as the full assets (same node hierarchy, since simplify keeps nodes). The lite pack is fetched as part of the `start` group.
- `ExpoAsset` loads `<name>.lod1.glb` instead of the full file when `quality !== "high"` and a lod1 exists in the manifest.

- [ ] **Step 1:** Add tests to `release.test.mjs`: every non-start GLB has a `.lite.glb` sibling in `out/`; the lite total is ≤ 3 MiB; each lite and lod1 file has the same named nodes as its source (parse with `NodeIO`, compare names); each lod1 has ≤ 45% of its source's triangles.
- [ ] **Step 2:** Build and test → FAIL. Implement. Build and test → PASS.
- [ ] **Step 3:** Browser check at `?perf` with `medium` forced (the existing quality override; if none exists, add `?quality=medium` read in `detectQuality`). Walk the journey: triangles ≤ 2 M at every sample. Jump to the arena immediately after opening on "Slow 4G": lite shapes appear in the right places, then full detail replaces them.
- [ ] **Step 4:** Commit.

### Task 6: KTX2 textures from a local cache

**Files:**
- Create: `scripts/encode-ktx2.mjs`, `assets-cache/ktx2/index.json` (+ `.ktx2` files), `src/venue/three/textureLoading.ts`
- Modify: `scripts/optimize-export.mjs` (swap step before meshopt), `public/_headers` (`/basis/*` and `/media/*.ktx2` rules), `package.json` (devDependency `ktx2-encoder@0.6.0`, script `encode:ktx2`), every `useGLTF` call site (ExpoAsset, EntranceP01, HallDressing, ReferenceProjection, the two contact-shadow components), `src/venue/three/venueFloor.ts`, `src/venue/three/technicalMaterials.ts`, `src/venue/three/ImmersiveVolume.tsx` (or wherever `ImmersiveVolume` lives)
- Copy: `node_modules/three/examples/jsm/libs/basis/basis_transcoder.{js,wasm}` → `public/basis/`
- Test: `scripts/release.test.mjs`

**Interfaces:**
- `encode-ktx2.mjs` (run locally only): for every texture embedded in the GLBs that `groups.json` lists, and every `/media` file loaded by a plain `TextureLoader` (the three files above), it computes the sha256 of the source image bytes and encodes it to `assets-cache/ktx2/<sha>.ktx2` with mipmaps. It uses UASTC (RDO on, Zstandard supercompression if `ktx2-encoder` supports it; check its options) for normal maps and for slots/names on the opt-out-to-UASTC list, and ETC1S quality 128 otherwise. It writes `index.json`: `{ [sha]: { mode: "etc1s" | "uastc", bytes: number } }` and skips existing hashes.
- `KEEP_WEBP` in `encode-ktx2.mjs`: an array of texture names or media paths never converted (logos, lettering, any texture failing the look check). It starts with the brand-wall lettering and signage textures (names matching `/logo|letter|sign|brand/i`).
- Post-export swap: for each texture whose sha is in the cache, use KTX2 (set the image and mimeType `image/ktx2`, add `KHR_texture_basisu`) when it's in the `start` group **and** smaller than the WebP; or when it's in a later group **and** ≤ 1.25 × the WebP size. Plain-loader media get `out/media/<path>.ktx2` written next to the WebP, and the path is listed in `load-manifest.json` `ktx2Media`.
- `textureLoading.ts`: `export function configureGltfLoader(loader: GLTFLoader, gl: WebGLRenderer): void` (attaches one shared `KTX2Loader` with transcoder path `/basis/`), and `export function loadVenueTexture(url: string, gl: WebGLRenderer): Promise<Texture>` (uses `.ktx2` when listed in `ktx2Media`, otherwise `TextureLoader`). All `useGLTF` calls pass `configureGltfLoader` via its `extendLoader` argument. Check the exact signature with Context7.

Two design items are deliberately not built here. **Per-tier texture caps:** KTX2 already cuts video memory 4–8×, so caps are added only if Task 9's mobile-emulation walk shows memory pressure. **Resizing `/media` images to drawn size:** the largest measured is 2048×2304, and none is far above its drawn canvas, so this is skipped unless Task 3's manifest shows a `/media` file over 1 MiB in `start`.

- [ ] **Step 1:** Add tests: every texture in `out/` GLBs is either WebP, KTX2 or on `KEEP_WEBP`; `start` bytes ≤ 20 × 2²⁰ (the real target from now on); `/basis/basis_transcoder.wasm` exists in `out/`; the Cloudflare build path never imports `ktx2-encoder` (grep `optimize-export.mjs`).
- [ ] **Step 2:** Run `npm run encode:ktx2` (expect several minutes), then build and test → PASS after implementing. Commit the cache.
- [ ] **Step 3:** Look check: `measure-venue.mjs --label t6`, `compare-shots baseline t6`. Any shot over the threshold: inspect it in the in-app browser, add the offending textures to `KEEP_WEBP` or switch them to UASTC, re-encode, and repeat until exit 0. List every texture added to `KEEP_WEBP` in the commit message.
- [ ] **Step 4:** Check `longTasksAfterOpen` in `t6/metrics.json` against `t4`. Expected: fewer or equal long tasks (KTX2 removes image decode on upload).
- [ ] **Step 5:** Commit.

### Task 7: Merge static meshes

**Files:**
- Create: `src/venue/three/mergeStatic.ts`
- Modify: `src/venue/three/ExpoAsset.tsx` (after existing material preparation), `src/venue/zones/EntranceP01.tsx`, `src/venue/zones/HallDressing.tsx`
- Test: `scripts/venue-loading.test.mjs` (pure three in Node)

**Interfaces:**
- `export function mergeStaticMeshes(root: Object3D, opts?: { keep?: (object: Object3D) => boolean; instanceMin?: number }): { before: number; after: number }`.
  - Merge key: same material instance, same attribute set and item sizes, same index presence, `castShadow`, `receiveShadow`, `layers.mask`, `renderOrder`, `frustumCulled`, and the same parent `ZoneGroup` ancestor. Merged geometry is baked to the root's local space and placed under `root`.
  - Never merged: `SkinnedMesh`, meshes with morph targets, objects with any `onBeforeRender`, objects under an animated node (tracks from the asset's clips), and anything `keep` returns true for.
  - Meshes sharing the same `geometry` and material `instanceMin` (default 4) or more times become one `InstancedMesh` instead.
- Default `keep` per call site: names that code reads after load. Grep every `getObjectByName`, `name ===`, `name.startsWith` and `/regex/.test(*.name)` in `src/venue` and pass a predicate keeping those.

- [ ] **Step 1: Failing tests:** 10 boxes sharing one material → 1 draw object (`before: 10, after: 1`) with identical world-space bounding box (±1e-6); 2 materials → 2; a `SkinnedMesh` is untouched; a kept name survives as its own mesh; 6 meshes sharing geometry and material → one `InstancedMesh` with `count === 6`, and instance matrices equal the originals' world matrices.
- [ ] **Step 2:** `npm test` → FAIL. Implement. `npm test` → PASS.
- [ ] **Step 3:** Before wiring: capture `snapshot.json` (already in `reports/perf/t6`). Wire the call sites, rebuild, run `measure-venue.mjs --label t7`. Expected: draw calls ≤ 500 at progress 0 and ≤ 700 at every walk sample. Every named node in `t6/snapshot.json` that still exists in `t7` has the same position, quaternion and size, within 1 mm; write a 10-line comparison into `compare-shots.mjs` as a `--snapshots` mode. `compare-shots baseline t7` exits 0.
- [ ] **Step 4:** Re-run the path-keyed `verify-*` scripts that read the mounted scene (start with `scripts/verify-rearrangement-mounted.mjs`). Where they fail only on changed index paths, re-capture their baselines as their own usage notes describe, and say so in the commit message. Any failure that reflects a moved object is a bug: fix it.
- [ ] **Step 5:** Commit.

### Task 8: Animated screen budget (only if measured)

**Files:**
- Modify (conditional): `src/venue/media/engine.ts`

The media engine already sleeps hidden screens and spends a per-frame pixel budget. This task runs only if `t7/metrics.json` shows long tasks after opening that a Performance trace attributes to `paintCanvas` or `CanvasTexture` uploads.

- [ ] **Step 1:** Record a Chrome Performance trace of the walk at `?perf` and check whether long tasks come from `MediaEngine` frames. If not, write "not needed: <evidence>" in `reports/perf/t7/README.md`, commit and skip the rest.
- [ ] **Step 2:** If needed: scale the per-frame budget by tier (`high` 1×, `medium` 0.6×, `low` 0.35×) and cap canvas painters' resolution on `low` to 0.5× per side. Re-measure: no long task attributable to the engine.
- [ ] **Step 3:** Commit.

### Task 9: Final verification and report

**Files:**
- Create: `reports/perf/2026-11-final/README.md`

- [ ] **Step 1:** `npm run build`, `npm test`, `npm run typecheck`, and `npx eslint` on the changed files. Expected: all pass. The full-repo lint baseline of 184 errors must not grow.
- [ ] **Step 2:** `measure-venue.mjs --label final --throttle fast4g`, and also `--label final-slow --throttle slow4g`. Expected: every Global Constraints target is met; `gapFrames` is 0 on both; `compare-shots baseline final` exits 0.
- [ ] **Step 3:** In the in-app browser, walk the whole journey at `?perf` with mobile emulation (375×812, CPU 4× slowdown). Exercise every stall visit, every nav jump, reduced motion (DevTools rendering emulation), `?inspect` and `?capture=1`. Note anything off.
- [ ] **Step 4:** Write the report: before/after table (bytes, time to open on Fast and Slow 4G, draw calls, triangles, long tasks), screenshot pairs, the `KEEP_WEBP` list, any baselines re-captured, and what wasn't tested (physical phones, other browsers).
- [ ] **Step 5:** Commit. Push `perf/venue-speed` to `origin` (not `main`) only with the owner's OK, and hand the report to the owner for the ship decision.
