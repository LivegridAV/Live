# Task 8: animated screen budget -- not needed

not needed: no long task after opening is attributable to MediaEngine's per-frame work (`update` budget, `paintCanvas`
animation repaints, `renderShader`, CanvasTexture uploads). The only long tasks that touch `paintCanvas` are one-shot
first-draw artwork decodes inside two projection painters (the Task 6b residual), which the tier budget or a
low-tier painter resolution cap cannot reduce.

## Run conditions

- Build at HEAD c1ce602 (`out/`), served by `scripts/serve-export.mjs`, `?perf`, Chrome via playwright-core, 1600x900 dpr 1,
  Fast 4G (9 Mbit/s down, 60 ms), cache disabled.
- One CDP trace (`devtools.timeline`, `cpu_profiler`, `v8.execute`, `blink.user_timing`, `toplevel`, `gpu`) started at
  80% loading, covering every post-opening phase: fill-in walk at 6 m/s, wait until every group is warm, 2 s settle,
  fly-back to p = 0, stats walk (p 0..1, step 0.02, 250 ms, as measure-venue.mjs), then 5 s standing at each of
  seven media-heavy stops (p 0.34 / 0.456 pillar gallery, 0.566 / 0.596 reception, 0.692 / 0.718, 0.932 arena).
  Phases are delimited with `performance.mark`. Trace was about 1 GB; parsed with a streaming parser.
- Attribution: CPU-profile samples on CrRendererMain, ancestry searched for the (unminified) method names
  `paintCanvas`, `renderShader`, `prime`, `costOf` of MediaEngine, plus the main-thread event children of each RunTask.
- The in-page longtask observer saw 21 long tasks; the trace shows 23 main-thread RunTasks over 50 ms after
  `venue-open` (out of 117,700 tasks). All 23 were examined.

## Attribution of the 23 tasks (> 50 ms)

| Phase | Tasks (ms) | Cause | Engine self-time inside |
|---|---|---|---|
| fill-in walk | 51 | `texSubImage2D` upload of a decoded image (microtask, loader, not engine) | 0 |
| fill-in walk | 51 | 26 ms JS (15 ms of it `fillText` in a canvas painter's first paint) + raster of a decoded image | 15.3 ms |
| fill-in walk | 61, 59, 59, 52, 56, 55, 55, 52 | three.js render of the newly shown group (setValue/getParameters/updateMatrixWorld) | 0 |
| fill-in walk | 65 | `compressedTexSubImage2D` KTX2 upload, shader program query | 0 |
| fill-in walk | 78, 63 | 10-11 ms JS, rest is raster/decode of images | 2.7, 1.6 ms |
| until allReady | 195 | `createImageBitmap` sync decode inside `projectionCrystal` first paint | 83.2 ms |
| until allReady | 68 | raster/decode, 8 ms engine (`fillText`) | 7.6 ms |
| until allReady | 68 | `createImageBitmap` sync decode inside `projectionBackdrop` first paint | 44.1 ms |
| until allReady | 51 | `bufferData` geometry upload | 0 |
| fly-back | 94, 208, 71 | GPU-bound (`WaitForGetOffset`, uniform/draw stalls), known | 1.6, 0, 0 |
| stats walk | 78 | GPU wait + `texSubImage2D` | 0.5 |
| standing, p 0.34 | 55, 55 | GPU wait (`WaitForGetOffset`) | 0 |
| standing, other six stops | none | | |

## Engine cost overall

- Total time under `paintCanvas` / `renderShader` across the whole post-open trace (about 95 s): 648 ms, of which
  135 ms until allReady, 112 ms fill-in walk, 61 ms stats walk, and 16-70 ms per 5 s standing stop (reception 70,
  67; p 0.718 66; p 0.692 48; p 0.456 37; p 0.34 17; arena 4).
- Excluding the two projection first-draw decodes, no single task contains more than 15.3 ms of engine work
  (766 tasks contained any engine work). Steady-state standing at the media-heavy stops produced zero engine-caused
  long tasks, so no frame comes near the 50 ms threshold from `paintCanvas` or CanvasTexture uploads.

## Classification of the two projection tasks

Those two (195 ms and 68 ms, 127 ms of engine self-time in the profile) sit under `update > paintCanvas > projectionCrystal /
projectionBackdrop > gradedSurface > createImageBitmap`. I classified them as a painter first-draw artwork decode
(the known Task 6b residual), not as MediaEngine frame cost: each happens once per artwork, the time is Chrome's
synchronous decode of a 1-2K image handed to `createImageBitmap`, and it is independent of the per-frame pixel
budget and of painter canvas size (the decode is of the source image, and the tier budget always admits the most important entry anyway). Scaling the budget by tier or
capping low-tier painter resolution would not shorten them, so Task 8 Step 2 would not fix them. Any follow-up
would be pre-decoding the artwork (`img.decode()` before the first paint, or earlier during warm-up), a painter change
outside this task.
