# Venue speed: fast loading and smooth walkthrough (stage 1 of the WebGPU move)

Date: 2026-11-21 · Status: approved by owner 2026-11-22 · Branch: `perf/venue-speed`

## Intent

The owner wants the website's 3D venue (the home page walkthrough) to be
**very smooth and fast to load**, and wants it eventually running on
**WebGPU with a WebGL fallback**.

Agreed order: **speed first, then WebGPU.** WebGPU lowers the cost of each
draw call, so it can help smoothness. It does nothing for download size, so
it cannot deliver fast loading. This document covers stage 1, the speed work,
which helps every visitor on every browser. Stage 2, the WebGPU move, gets
its own design after stage 1 lands, because stage 1 changes the same
materials and meshes that stage 2 must rewrite.

## Where it stands today (measured 2026-11-21 on livegridav.com, `?perf`)

Measured on an RTX 3060 desktop with a fast connection, i.e. a best case.

| Measure | Today |
|---|---|
| Bytes downloaded before the visitor can enter | ~70 MB (42 MB GLB, 27.5 MB images, 0.6 MB JS) across 124 requests |
| Download finished | ~6.8 s here; estimated 30–60 s on typical 4G |
| Draw calls per frame at the entrance | ~1,240 |
| Triangles per frame at the entrance | ~5.2 M |
| Textures / geometries resident | 168 / 1,680 |
| Frame rate | 60 fps (capped) on this machine |

How it works today:

- `src/venue/Scene.tsx` mounts **every** zone at once. Every GLB suspends,
  and the `Warmup` gate waits for `useProgress` to go idle (all assets) and
  then runs `warmScene` over the **whole** scene before `setLoaded(true)`.
  So the visitor waits for all ~70 MB plus every shader compile, although
  they start at the entrance.
- `ZoneGroup` hides zones far from the camera (z-range culling). That saves
  draw calls but not downloads or compiles.
- `scripts/optimize-export.mjs` runs on `out/` after `next build`: it re-encodes
  GLB textures to WebP, applies meshopt FILTER compression, dedupes shared
  textures into `/textures/`, and prunes unreferenced assets. Source GLBs in
  `public/` are never modified; they are fingerprinted (sha256 in layout
  data) and some are protected by placement checks.
- `src/venue/systems/Quality.tsx` chooses a `low/medium/high` tier up front,
  and `QualityGovernor` adapts only the pixel ratio at runtime.
- The largest downloads: `projection-finish-v2-blender-interior.glb` (9.8 MB),
  `entrance-refined.glb` (6.9 MB), `grand-rental-finish-v2-interior.glb`
  (4.8 MB), `grand-anamorphic-shape-v3-interior.glb` (3.4 MB), then the
  `*-visitors.glb` crowd files (0.6–1.8 MB each) and PBR texture sets
  (`wool-*`, `cast-*`) of 0.7–1.6 MB each.

## Goals

1. **Fast first entry.** The visitor can enter the walkthrough after
   downloading only what the entrance and its immediate surroundings need.
2. **The rest streams in while they walk**, ahead of the camera, without
   visible pop-in. The existing fog and the distances between zones hide it.
3. **Fewer draw calls and triangles**, so the walk stays smooth on mid laptops
   and phones, not only on strong desktops.
4. **No hitches while walking.** Assets that arrive late must not freeze a
   frame while textures upload or shaders compile.
5. **Lay the ground for stage 2.** Choices here must also suit three.js's
   WebGPU renderer, e.g. KTX2 textures and merged geometry are fine there.

## Targets (proposed; to be confirmed)

| Measure | Target |
|---|---|
| Bytes before the venue opens, fast connection | ≈ 20 MB or less (from ~70 MB), opening view unchanged |
| Time until the venue opens, Chrome DevTools "Fast 4G" throttling, cold cache | ≤ 12 s |
| Draw calls at the entrance, `high` tier | ≤ 500 (from ~1,240) |
| Draw calls anywhere on the walk, `high` tier | ≤ 700 |
| Triangles anywhere on the walk, `medium` tier | ≤ 2 M |
| Long tasks over 50 ms while walking, after entry | none on the reference desktop; logged via `?perf` |
| Visual change at the baseline cameras | none noticeable (see Verification) |

## Non-goals

- WebGPU itself (stage 2).
- Redesigning the venue, its layout, its content, or its look.
- The AV Lab room and the internal entrance-review page. Both are small; they
  are revisited in stage 2.
- The old `src/experience/*` 3D scenes; no page loads them.

## Anti-goals (a failure even if the numbers improve)

- The hall **looks worse**: blurry textures, visible banding, popping objects,
  or missing reflections at normal viewing distance.
- A visitor **walks into an area that hasn't loaded**: empty space, grey
  placeholders, or a mid-walk spinner.
- Editing or re-exporting the protected source GLBs in `public/`, or breaking
  their fingerprint and placement checks.
- Dropping the existing guarantees: the reduced-motion behaviour, the stall
  visit cameras, the review and placement-inspection modes, and the `?perf`
  metrics.

## Constraints

- Static export on Cloudflare Pages: 25 MiB per file, 20,000 files. No server
  code. Pushing `main` deploys to production.
- Next 16.2.9, React 19, three r185, R3F 9, drei 10. Read the Next docs in
  `node_modules/next/dist/docs/` and use Context7 for version-sensitive APIs
  (repo rule in `AGENTS.md`).
- Asset transforms belong in the post-export step on `out/`, as today, so
  `public/` stays untouched.
- Code that reads GLB node names, transforms or bounding boxes (placements,
  stall visits, contact-shadow bakes, `prepareArchitecture`, material
  matching by name) must keep working. Any merge must run after those reads,
  or keep the nodes they read.

## Approaches considered

1. **Speed first on WebGL, then WebGPU (chosen by the owner).** Stage 1 cuts
   download, draw calls and hitches for everyone. Stage 2 moves to WebGPU
   with three's built-in WebGL2 fallback, measured side by side.
2. **WebGPU only.** Rewrite about 30 GLSL shader pieces in TSL straight away.
   It might be smoother on capable devices, but loading stays at ~70 MB, and
   it's the riskiest work for the look. Rejected: it doesn't meet "fast
   loading".
3. **Speed only.** Stage 1 without WebGPU. Rejected: the owner wants WebGPU.

## Design

Four workstreams, in this order. Each ships separately behind measurement.

### A. Load in stages (biggest load-time win)

- Split the venue's assets into **load groups** that follow the journey: the
  entrance and the hall shell first, then each zone in walking order
  (gallery, reception, the pavilions, the arena).
- There is no "Enter" button: per `src/venue/ui/Loader.tsx` the venue opens
  by itself when loaded, behind a hairline progress bar. That stays. The
  loader now waits only for **group 0** (the entrance, the hall shell and
  environment, plus everything visible from the start camera at z=21: today
  that includes the reception, at `ahead=110`, the pillars, and the
  ungated `grand-rental-finish-v2-visitors.glb` in `HallDressing`) and its
  shader warm-up.
- After the venue opens, later groups are fetched in the background in
  journey order, at low priority, one or two at a time. Each group is mounted
  and shader-warmed **before** the camera comes within its `ZoneGroup`
  "ahead" distance.
- Pop-in is hidden by walls and distance, **not fog**: the hall's
  `FogExp2` density of 0.0038 gives only ~5–16% fog at the 58–110 m switch-on
  distances. So a group must be fully ready before its switch-on distance;
  it can never appear inside it.
- The scroll position drives the camera (`ScrollRig`), and scrolling is
  unlocked after the venue opens. Scrolling is never blocked and no loading
  cue is ever shown after opening. See "Owner's decisions" for how the
  stream stays ahead of the visitor.
- Grouping is driven from data (one manifest keyed by zone), not scattered
  through components, so stage 2 can reuse it.

### B. Lighter textures

- In `optimize-export.mjs`, re-encode GLB and venue textures to **KTX2**
  (Basis: ETC1S for colour and roughness/AO maps, UASTC for normal maps and
  anything with fine detail or text). Textures stay compressed on the GPU,
  use 4–8× less video memory, and upload without a main-thread decode. That
  removes the hitches when a late group arrives.
- Wire `KTX2Loader` into `useGLTF` and into the plain `TextureLoader` uses
  (`venueFloor.ts`, `technicalMaterials.ts`, `ImmersiveVolume.tsx`). It needs
  the Basis transcoder files hosted under `public/`.
- **Not** the `/media/...` images that the media engine's painters
  (`projectionPainters.ts`, `ledRental2026Painters.ts`, `technicalPainters.ts`)
  draw into 2D canvases: KTX2 can't be drawn into a 2D canvas. They stay
  WebP, resized to the size they're drawn at, and loaded with their zone's
  group. *(Builder-check call: moving the painters onto the GPU is a large,
  look-sensitive job; it is out of scope.)*
- **Bytes rule** *(my call)*: group 0 uses whichever encoding is smaller per
  texture, so KTX2 never makes the first download bigger. Later groups may
  use KTX2 even when it's up to ~25% larger than the WebP, because those
  bytes arrive in the background and KTX2 removes the decode-and-upload
  hitches.
- Cap texture sizes per tier: e.g. `medium`/`low` get half-resolution
  mipmap levels where a texture is above 2K. The builder chooses the
  mechanism (separate files vs dropping top mips at load).
- Keep a per-texture opt-out list for anything that degrades visibly
  (logos, lettering, LED content with text). Any texture that loses visible
  quality at the baseline cameras goes on that list.
- Animated LED content exists: in `data/media.ts`, canvas painters redraw at
  8–12 fps, and several sources use `motion: "waterfall"`. Each redraw
  re-uploads a `CanvasTexture`, which is itself a hitch source. Budget it:
  only zones within range update, and canvas sizes and update rates follow
  the quality tier. *(Builder-check correction; my call on the remedy.)*

### C. Fewer draw calls and triangles

- At load time, after the existing reads of names and transforms, **merge
  static meshes that share a material** within each zone. This is runtime
  merging with `BufferGeometryUtils.mergeGeometries`, keeping any node that
  code looks up by name or animates as its own mesh.
- Convert repeated identical meshes (crowd figures, foliage, truss parts,
  chairs, light fixtures) to `InstancedMesh` where they aren't already.
- Add **simplified versions** of the heaviest meshes (crowd `*-visitors`,
  foliage, the projection interior) for the `medium` and `low` tiers, made
  in the post-export step with meshoptimizer's simplifier, and swap by
  distance on `high`.
- The draw-call and triangle numbers come from the existing `RenderMetrics`
  overlay (`?perf`).

### D. Smaller first download

- Look for downloads the entrance doesn't need yet (e.g. `wool-*`, `cast-*`
  material sets, projection media) and make sure they are in a later group.
- Keep `/media/...` content textures at the size they're displayed at; some
  are larger than their screens need.
- Cache headers already exist in `public/_headers` (`/textures/*` immutable;
  `/models/*` and `/media/*` 1 h plus stale-while-revalidate). Keep them, and
  give any new KTX2 output and Basis transcoder files matching rules.

## Verification

- **Numbers:** a repeatable measurement (the browser tooling already used on
  this repo: the in-app browser and Playwright/Chrome DevTools MCP; Playwright
  is not a project dependency today) that loads the built site cold under "Fast 4G"
  throttling and records bytes before Enter, time to Enter, and then walks
  the journey recording draw calls, triangles and long tasks from `?perf`.
  It runs before the work starts (baseline) and after each workstream.
- **Look:** screenshots at every `BASELINE_CAMERAS` shot
  (`src/venue/data/baselineCameras.ts`) plus the entrance, before and after,
  compared side by side and with a pixel diff. Any visible difference is
  fixed or explicitly accepted by the owner.
- **Placement checks** *(my call)*: scripts such as
  `verify-rearrangement-mounted.mjs` key records by scene-graph index paths,
  which merging and new load-group nodes change by design. Before any merge,
  capture each checked object's world position, rotation and bounds keyed by
  name. After the work, compare those values (positions must not move), then
  re-capture the path-keyed baselines. The protected source GLBs and their
  sha256 fingerprints are untouched throughout.
- **Behaviour:** existing tests (`npm test`, the `verify-*` scripts that
  apply) still pass; stall visits, nav jumps, reduced motion, review and
  inspection modes are walked through in the browser.
- **Devices:** this machine only, plus Chrome's mobile emulation with CPU
  throttling. There is no physical phone testing available; the report says
  so.

## Shipping

Work on `perf/venue-speed`. Each workstream is a separate commit set with
its before/after numbers. Nothing goes to `main` (which deploys live) until
the owner has seen the numbers and the screenshots and says to ship.

## Owner's decisions (2026-11-21)

1. **No stops and no loading cues once the venue is open.** The visitor
   must never be held back, and must never see "loading" after the opening
   bar. The walk has to feel smooth with no lag.
2. **Keep the opening view exactly as today**, and accept a first download
   of about 20 MB (from ~70 MB), possibly less after the texture work. No
   stand-ins in the opening view.

How the design meets decision 1 *(my calls)*:

- **Stay ahead of the visitor.** Background loading starts the moment the
  venue opens and runs continuously in journey order. Nav-menu jumps and
  stall visits move their target group to the front of the queue.
- **Open a little later on slow connections.** The loader measures download
  speed while group 0 arrives. If the rest of the venue couldn't stay ahead
  of a visitor walking at a normal scroll pace, it keeps loading the next
  groups before opening. On a fast connection, this changes nothing. On a
  slow one, the one wait happens at the opening bar, never mid-walk.
- **Safety net for extreme jumps.** A small "light pack" (simplified meshes
  and small textures for every later zone, budget ~3 MB, counted within the
  ~20 MB) loads with group 0. If someone drags straight to the far end
  before the full models arrive, they see the whole hall in lighter detail
  rather than empty space. Full detail replaces it, behind walls or at
  distance where possible. This should only happen on slow connections with
  deliberate jumps. On a normal walk, the full models are always there
  first.

## Left to the builder

- Exact load-group boundaries and the prefetch distance.
- The KTX2 mode per texture and the quality settings, within the "no visible
  change" rule.
- Which meshes get merged, instanced or simplified, and the simplification
  ratios.
- The look of the in-scene "loading ahead" cue, in the existing UI style.
- How the measurement script is structured.

## Stage 2 (WebGPU), for context only

Once stage 1 is in: switch the R3F canvas to `WebGPURenderer` from
`three/webgpu` (it falls back to its own WebGL2 backend), and rewrite the
~20 `onBeforeCompile` patches, ~8 GLSL `ShaderMaterial`s, the render-target
reflections and contact shadows, drei's `MeshReflectorMaterial`,
`PMREMGenerator` uses, `warmScene`'s `gl.compile`, the media engine's render
targets and `RenderMetrics`' GL queries in TSL / renderer-agnostic form. It
ships as the default only if it's measurably smoother and looks the same.
That gets its own design.
