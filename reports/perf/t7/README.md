# Task 8: animated screen budget

Decision: the tier-scaled frame budget and the low-tier painter resolution cap are **not needed**. No long task after
opening comes from MediaEngine's per-frame budget, `paintCanvas` animation repaints, `renderShader` or CanvasTexture
uploads. One finding was real and has been **fixed** (fix round 1): the projection painters' first-draw artwork decode.

## Run conditions

- Build at HEAD c1ce602 (`out/`), served by `scripts/serve-export.mjs`, `?perf`, Chrome via playwright-core, 1600x900 dpr 1,
  Fast 4G (9 Mbit/s down, 60 ms), cache disabled.
- One CDP trace (`devtools.timeline`, `cpu_profiler`, `v8.execute`, `blink.user_timing`, `toplevel`, `gpu`) started at
  80% loading, covering every post-opening phase: fill-in walk at 6 m/s, wait until every group is warm, 2 s settle,
  fly-back to p = 0, stats walk (p 0..1, step 0.02, 250 ms), then 5 s standing at each of seven media-heavy stops
  (p 0.34 / 0.456 pillar gallery, 0.566 / 0.596 reception, 0.692 / 0.718, 0.932 arena). About 1 GB per trace.
- Attribution: CPU-profile samples on CrRendererMain with the unminified MediaEngine method names (`paintCanvas`,
  `renderShader`, `prime`, `costOf`) in the ancestry, plus each RunTask's main-thread child events.

## Before the fix (23 main-thread tasks over 50 ms after `venue-open`, of 117,700)

21 had no engine work, or at most 15 ms of it (three.js render, GPU waits, texture/KTX2 uploads, raster). Two sat under
`update > paintCanvas > projectionCrystal / projectionBackdrop > createImageBitmap`: 195 ms (83 ms in `createImageBitmap`)
and 68 ms (44 ms), plus about 95 ms of lazy image raster decode in the same frame. Total engine time: 648 ms over about 95 s.

## Fix (round 1): no paint frame decodes or grades

`createImageBitmap(HTMLImageElement)` decodes synchronously on the main thread (measured 40 ms per 2K image), and
`drawImage(HTMLImageElement)` into a 2D canvas decodes lazily at raster (97 ms on one first frame). The streamer now keeps
the encoded bytes of each image it fetches (one request, so "every venue file was requested once" still holds), and
`projectionPainters.ts` makes worker-decoded `ImageBitmap`s from those bytes and prepares the graded backdrop and crystal
surfaces from `preloadProjectionArtwork()` (group mount), one step per MessageChannel task. Painters draw the bitmap when it
exists; with no bytes they draw the decoded image as before. A painter that runs before its surface is ready still draws
without it; nothing throws or can hang a warm-up.

## After the fix (same trace, same build conditions)

| | before | after |
|---|---|---|
| main-thread tasks over 50 ms (trace) | 23 | 18 |
| tasks with `createImageBitmap` / `paintCanvas` decode over 50 ms | 2 (195, 68 ms) | 0 |
| until-all-ready phase long tasks | 195, 68, 68, 51 | none from painters; one 69 ms task has 7.5 ms engine time |
| largest task with engine work | 83.2 ms engine in a 195 ms task | 21.1 ms engine in a 73 ms task |
| total engine time post-open | 648 ms | 518 ms |
| standing at the seven stops | 2 GPU-wait tasks at p 0.34 | only GPU-wait tasks at p 0.34 (engine 0 ms) |

The remaining long tasks are three.js render and GPU waits (fly-back 100/112/208 ms, p 0.34), texture and KTX2 uploads,
and canvas raster; none is over 100 ms because of a painter.

`measure-venue` (Fast 4G): t7 -> t8 long tasks after opening 11 -> 9 (fill-in walk 6 -> 4), gapFrames 0, opened at 36.1 s
(t7 36.4 s), all groups warm at 78.5 s (t7 79.0 s). compare-shots baseline vs t8 exits 0 (projection mean 0.05, was 0.06).
