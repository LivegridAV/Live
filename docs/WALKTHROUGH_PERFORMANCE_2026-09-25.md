# Walkthrough freeze fix — 25 September 2026

## Cause and changes

The existing Graphify render/media/quality map led to the scene warm-up, zone
visibility and media scheduler. Installed Three 0.185.1 source confirmed that
shader preparation uses the *currently visible* light layout. Local fixtures
inside distance-gated zones changed the light count repeatedly while travelling;
the service spotlight also switched visibility. Each layout generated more
program variants. Runtime quality promotions/demotions could additionally rebuild
geometry, immersive materials and render targets after warm-up.

- Local fixtures now use six fixed world-space light slots, prioritising nearby
  visible sources with their authored colour, intensity and falloff. Dark slots
  remain registered. The service spotlight dims without changing shader layout.
- Camera, zone visibility and local light selection run in that order before
  reflection/main passes.
- Enter waits for asynchronous shader completion plus an offscreen 32×32 warm-up
  which uploads geometry/textures and exercises reflection/shadow variants.
  Visibility, culling, shadow-update flags and render targets are restored even
  on failure. Cancelled/unmounted scenes are not warmed.
- Device quality is selected before warm-up and stays fixed during the tour.
  Resolution still adapts without exceeding native device pixel ratio or
  recreating scene resources.
- Hidden/out-of-range media is painted once, then sleeps until relevant. Its
  timeline continues so it resumes at the current show time.
- The media engine receives the device profile before creating textures, avoiding
  a desktop request followed by a mobile replacement. Image decoding participates
  in the loading-manager barrier, so slow image responses cannot bypass warm-up.
- Opt-in `?perf=1` provides camera shots and frame/long-task diagnostics. No
  diagnostics are visible on the ordinary site; no telemetry is transmitted.
  Unlike the old FPS display, stalls over 500 ms are not discarded. Frame maximum
  and stall counts cover the full sample; p95 uses the latest 10,000 frames.

Tunnel artwork, its desktop/mobile resolutions, front-180° mapping, camera FOV,
stage layouts and primary entrance branding are unchanged.

## Verification

The baseline development page with timing instrumentation reproduced four
841–1,057 ms tasks at first Pillars entry, then a 2,401 ms task entering the
Creative Gallery. Shader programs grew from 136 to 186 across those visits.
These are diagnostic observations, not a controlled cross-device benchmark.

The optimized static production build was tested through the in-app browser:

- First Pillars entry: 27 ms maximum frame, zero frames over 50 ms.
- Gallery, AV Engineering, Content Studio, Main Stage, both stage modes, Finale
  and return to Tunnel: shader count remained 80; observed maximum frame 85 ms,
  no frames over 100 ms. Typical steady rate 54–57 FPS outside the stage;
  46–47 FPS in the most detailed stage views. Stage switching recorded three
  50–65 ms long tasks, so this is not a claim of zero dropped frames.
- Textures/geometries stayed at 50/1,540 through the desktop route: warmed at
  startup rather than repeatedly allocated while exploring.
- Desktop tunnel and stage visually inspected. No console errors.
- 390×844 mobile-layout checks use the desktop machine's GPU, not a physical
  phone performance certification. The medium tier stays selected rather than
  promoting to high after an easy scene.
  Ordinary scroll through tunnel/gallery/services followed by stage entry recorded
  53 ms maximum frame, zero over 100 ms, steady 57 FPS, 80 programs and no errors.
- Build and TypeScript pass; ESLint passes; 9 release tests pass, including
  warm-up state restoration/error/cancellation and fixed-light/quality guards.
- Static HTTP smoke check: 109/109 routes and assets pass (47 pages).

## Release

Use the existing GitHub → Cloudflare Pages deployment for `livegridav.com`.
Rollback revision: `7e1246c2988f164f5292a4b920fdf7243bee289d`.
Deployment identity and final live checks are recorded under ignored
`qa/production-readiness/walkthrough-performance-deployment.json` after publishing.
