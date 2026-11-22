# The 3D venue: speed work, final report (November 2026)

Branch `perf/venue-speed`. Nothing here is live yet. The live site (`main`) is untouched until you say "ship".
This is the **speed stage** of your request for a venue that is "very smooth, fast loading". The WebGPU stage
comes later and gets its own plan.

## What a visitor experiences now

**Opening.** The entrance view looks exactly as it does today (your decision 2). On a typical phone connection
("Fast 4G") the venue opens after about **36 seconds**, down from about **74 seconds**. The download before the
door opens is **35 MB**, down from **77 MB**. On a weak connection ("Slow 4G") it opens after about
**2 minutes 25 seconds** (145 s; before the work about 5 minutes, estimated from the download size, not measured).

**After the door opens: no stops, no loading text, no spinner** (your decision 1). In every test run the
visitor could scroll freely from the first moment and the loading bar never came back; in the walk tests, which
also search the screen for the word, "loading" never appeared.

**Open early, fill in** (your decision 3). The venue opens as soon as the entrance and a *light version* of every
other stall are ready. While the visitor walks, the full-detail stalls keep downloading in the background and
replace the light versions one by one. On Fast 4G the last stall (Projection Mapping) is in full detail about
42 seconds after opening; everything is in full detail about 79 seconds after the page was first requested.

What the light version looks like: the stall's building, furniture, plants and people are all there, in the right
place. **The stall's LED screens and artwork are dark** until full detail arrives. Picture pair below.

**Never empty space.** We checked every frame of a walk at a normal pace, every one of the 11 menu jumps right
after opening, and every stall visit: not one frame showed an area without at least its light version.

**Jumping ahead.** If a visitor uses the menu to jump straight to a far stall right after opening, they land in
the light version of that stall, and the loader now fetches *that stall's* full version first, then the next area
along. On Fast 4G the stall sharpens 15 to 24 seconds after opening (Content Studio, LED Rental, Technical
Showcase), 17 seconds for the Arena, and about 42 seconds for Projection Mapping. Projection Mapping cannot come
sooner on this connection: when the venue opens, two other stalls are already downloading (about 23 MB), we never
cancel a download that has started, and Projection Mapping is itself the biggest stall (about 24 MB).
(This final check first found the loader fetching the *next* area first; that is fixed, see the table further down.)

**Smoothness.** No stops, but there are still a handful of short hitches (frames that take longer than they should).
The longest happens when someone jumps from the very end of the venue straight back to the entrance: the picture
freezes for up to about a fifth of a second (0.1 to 0.23 s). A menu jump to Technical Showcase right after opening
reliably causes one hitch of about 0.13 to 0.17 s (seen in both test runs), and one jump to the LED Tunnel showed
one of 0.11 s. During a normal walk the hitches are about a tenth of a second or less (0.05 to 0.1 s). Details
under "Open points".

**Looks.** The venue looks the same as before: we compared screenshots from eight fixed camera positions before
and after, pixel by pixel. The largest difference is on the LED Rental stall (moving light beams that are never in
exactly the same position from run to run). None of the objects we can still track moved. 650 objects kept their
names; 259 of them move by design (walking guests, rotating display screens) and were left out, and the other 391
were checked to the millimetre. The remaining 613 objects were combined into larger pieces to speed up drawing, so
they can no longer be tracked one by one; for those, the screenshots above are the check.

## Before and after (numbers)

Measured on this computer with Chrome, cold cache (as a first-time visitor), screen 1600×900.
"Fast 4G" = 9 Mbit/s, "Slow 4G" = 2 Mbit/s, as set in the plan.

| | Before (baseline) | After (final) | Target in the plan | Met? |
|---|---|---|---|---|
| Download before the door opens | 77.1 MB (141 files) | 34.7 MB (106 files) | about 20 MB | No (see note 1) |
| Time to open, Fast 4G | 74.1 s | 36.2 s | 12 s | No (see note 1) |
| Time to open, Slow 4G | about 310 s (estimated, not measured) | 145.1 s | opens later, then no gaps | Yes |
| Everything in full detail, Fast 4G | 74.1 s (all before opening) | 78.7 s (after opening, in the background) | | |
| Frames with empty space, walk after opening | not applicable (all loaded first) | 0 of 2,427 (Fast), 0 of 10,548 (Slow) | 0 | Yes |
| Frames with empty space, 11 menu jumps right after opening | | 0 of 27,003 | 0 | Yes |
| Loading text or spinner after opening | none | none | none | Yes |
| Draw calls at the entrance (desktop, "high") | 1,239 to 1,849 | 1,203 to 1,801 | 500 or fewer | No (note 2) |
| Draw calls, worst point on the walk | 3,194 | 2,419 | 700 or fewer | No (note 2) |
| Triangles at the entrance (desktop) | 5.1 to 7.7 million | 5.2 to 7.8 million | | |
| Triangles, worst point on the walk, phone tier ("medium") | 8.67 million (measured in Task 5, not at the baseline) | 7.5 million (phone emulation, 375×812; measured differently, not directly comparable) | 2 million | No (note 3) |
| Hitches over 50 ms after opening (Fast 4G run) | 12 (longest 151 ms) | 10 (longest 229 ms) | none | No (note 4) |
| ...of which over 100 ms | 5 | 1 (in the end-to-entrance jump) | | |
| Looks: largest screenshot difference (0 to 255 scale, limit 1.5) | | 1.13 (LED Rental) | 1.5 or less | Yes |
| Objects moved (391 still-standing objects trackable by name; 259 that move by design left out; 613 combined, covered by the screenshots) | | 0 | 0 | Yes |

Notes:

1. **Opening size and time.** You chose to keep the entrance exactly as it is (about 24 MB for the entrance on
   its own) and to have the light version of every stall ready before opening, so the visitor never sees empty
   space (about 8 MB more; the remaining 3 MB are the page code, fonts and the like). Those two decisions set the floor at about 35 MB and about 36 seconds on Fast 4G.
   The entrance alone is ready at about 25 seconds. The plan's "12 seconds" target was never consistent with a
   20 MB opening (20 MB at 9 Mbit/s already takes about 18 seconds), and is not reachable with these decisions.
   Getting closer means making the light versions smaller (or showing the entrance before the light versions
   arrive, which would allow empty space after a fast jump).
2. **Draw calls** (how many separate drawing jobs the graphics chip gets per frame) fell 24% at the worst point,
   but are still about 3.5 times the target (1,801 against 500 at the entrance, 2,419 against 700 on the walk).
   Each object is drawn about four times per frame (the screen, the
   floor reflection, the shadows and one more pass), so merging objects alone cannot reach 500. The next step
   is to skip objects in the passes where they cannot be seen and to combine materials; that fits best into the
   WebGPU stage.
3. **Phone triangle count.** Simplified versions of some of the largest stall models were added for phones in
   this stage, but the phone setting still draws up to about 7.5 million triangles at the busiest point. Reaching
   2 million would need much lighter models on phones; this stage did not go further, so it remains open.
4. **Hitches.** The plan's "no hitch over 50 ms" target is not met. What is left: about five 50 to 65 ms hitches
   while the Projection Mapping stall's full version is being set up during a walk; one or two of 50 to 60 ms
   mid-walk; the end-to-entrance jump (one frame of 100 to 230 ms, see "Open points"); and after a menu jump right
   after opening, 2 to 10 hitches of 55 to 81 ms per jump, plus one of 130 to 168 ms after the jump to Technical
   Showcase (both runs) and one of 108 ms in one LED Tunnel jump.

## Pictures

### Before and after (same camera, desktop)

| Place | Before | After |
|---|---|---|
| Entrance | ![](../baseline/shots/entrance.png) | ![](../final/shots/entrance.png) |
| LED Pillars | ![](../baseline/shots/pillars.png) | ![](../final/shots/pillars.png) |
| Reception | ![](../baseline/shots/reception.png) | ![](../final/shots/reception.png) |
| LED Rental | ![](../baseline/shots/led-rental.png) | ![](../final/shots/led-rental.png) |
| Content Studio | ![](../baseline/shots/anamorphic.png) | ![](../final/shots/anamorphic.png) |
| Technical Showcase | ![](../baseline/shots/technical.png) | ![](../final/shots/technical.png) |
| Projection Mapping | ![](../baseline/shots/projection.png) | ![](../final/shots/projection.png) |
| Arena | ![](../baseline/shots/arena.png) | ![](../final/shots/arena.png) |

### Light version, then full detail (Fast 4G)

Both pictures show the **LED Rental stall**: first a few seconds after opening (light version, screens dark), then
once full detail had arrived. The files are named `projection-lite` / `projection-full` because the measuring script
places this camera by the Projection Mapping group's switch-on point, which happens to stand in front of the LED
Rental stall; both stalls were still in their light version for the first picture.

| Light version | Full detail |
|---|---|
| ![](../final/fill-in/projection-lite.png) | ![](../final/fill-in/projection-full.png) |

Menu jump to Projection Mapping right after opening: [on arrival](../final/nav-jumps/jump-projection-mapping-arrival.jpg),
[once full detail arrived](../final/nav-jumps/jump-projection-mapping-full.jpg). Every jump has the same pair in
`../final/nav-jumps/`.

### Phone (emulated: 375×812 screen, processor slowed 4×)

| Opening view | Arena, menu jump right after opening (light version) | LED Rental during the walk |
|---|---|---|
| ![](../final/mobile/walk-open.jpg) | ![](../final/mobile/walk-early-arena.jpg) | ![](../final/mobile/walk-p054.jpg) |
| **Projection Mapping (menu)** | **Technical Showcase, stall visit** | **Arena with reduced motion** |
| ![](../final/mobile/menu-projection-mapping.jpg) | ![](../final/mobile/visit-technical.jpg) | ![](../final/mobile/reduced-arena.jpg) |

All phone pictures (walk every few steps, every menu stop, every stall visit and its return, `?inspect`,
`?capture=1`) are in `../final/mobile/`. The text boxes at the top right ("Review · Entrance", the frame counter,
"Walk entrance to reception") are measurement tools that only appear with `?perf`; visitors never see them.

On the emulated slow phone the walk worked end to end with no errors and no empty space, but frames are slow
(the frame counter shows roughly 8 to 30 frames per second, and many frames take longer than 50 ms). That is
expected with the processor slowed 4×; a real phone may be better or worse.

## Things to know

- **An old safety check now reports one difference.** A check written in October compares the source code of the
  Content Studio's water basin with a frozen copy. The light version of the stall now leaves out the basin's
  reflection (it is not needed at a distance), so the check sees a small wrapper around the basin code and reports
  a difference. The full basin code itself is unchanged, and so is what you see once full detail has arrived.
  This check, and several others from October, already reported differences on the live version for unrelated
  reasons; the final review will sort them out.

## What was not tested

- **Real phones.** Only Chrome's phone emulation on this computer (screen size, touch, a 4× slower processor).
  A real mid-range phone has a weaker graphics chip than this computer, so hitches are likely to be larger there.
- **Other browsers.** Only Chrome. Not Safari (iPhone), Firefox or Samsung Internet.
- **Real networks.** The 4G speeds are simulated by Chrome; real mobile networks vary more.
- **Hosting.** Tested from a local copy of the export, not from Cloudflare.

## Open points (for your decision or a later stage)

1. **Opening time** about 36 s on Fast 4G, against the plan's 12 s (note 1 above). The plan's 20 MB first
   download is also not met: 34.7 MB (entrance about 24 MB + light versions about 8 MB + page code about 3 MB).
2. **Projection Mapping after a jump** still takes about 42 seconds to sharpen on Fast 4G (the jump priority
   itself is fixed). Making it sooner would mean pausing a download that has already started when someone jumps,
   which we chose not to do, or making that stall's full version smaller.
3. **Draw calls** about 3.5× the target (note 2). Planned for the WebGPU stage.
4. **Phone triangles** nearly 4× the target (about 7.5 million against 2 million, note 3).
5. **Hitches**: the end-to-entrance jump still causes one heavy frame (100 to 230 ms). We checked that this
   happens even with every stall fully loaded before opening (no background downloading at all), so it is not
   caused by the new loading; it is the graphics chip drawing the whole venue at once. A menu jump to Technical
   Showcase right after opening reliably causes one hitch of 130 to 168 ms, and one LED Tunnel jump showed one of
   108 ms. The other hitches after opening are 50 to 81 ms (note 4).
6. **Entrance download headroom**: the entrance group is 22.7 MiB against the 24 MiB budget the tests enforce,
   so only 1.3 MiB (about 1.4 MB) is left for new entrance content before a test fails. (The earlier "entrance
   20 MiB or less" test was replaced after your decision 3.)

---

## Engineering detail

### Runs and commands

Fast 4G, nav-jump and phone runs against `npm run build` output with fix round 1 (jump priority); Slow 4G and fly-back
against HEAD `2881565` (the fix does not touch normal scrolling or the fly-back). Served by `scripts/serve-export.mjs`,
Chrome via playwright-core, `--ignore-gpu-blocklist`.

| Run | Command | Output |
|---|---|---|
| Fast 4G | `node scripts/measure-venue.mjs --label final --throttle fast4g` | `reports/perf/final/` |
| Slow 4G | `node scripts/measure-venue.mjs --label final-slow --throttle slow4g` | `reports/perf/final-slow/` |
| Look | `node scripts/compare-shots.mjs reports/perf/baseline reports/perf/final` | exit 0, worst mean 1.13 |
| Nav jumps + stall visits (after fix round 1) | `node scripts/check-nav-jumps.mjs` | `final/nav-jumps.json`, `final/nav-jumps/*.jpg` |
| Nav jumps, before the fix | `node scripts/check-nav-jumps.mjs --label final --only jumps --throttle fast4g` | `final/nav-jumps-jumps.json` |
| Stall visits, before the fix | `node scripts/check-nav-jumps.mjs --label final --only visits --throttle none` | `final/nav-jumps-visits.json` |
| Fly-back | `node scripts/measure-flyback.mjs --label final --runs 3` | `final/flyback.json` |
| Phone walk | `node scripts/walk-mobile.mjs --label final` | `final/mobile/walk.json`, `final/mobile/*.jpg` |

### History (Fast 4G unless noted; long tasks = all > 50 ms observed after opening by `measure-venue`)

| Run | MB before open | Open (s) | All warm (s) | calls p=0 | max calls | max tris | long tasks (max ms) | gapFrames |
|---|---|---|---|---|---|---|---|---|
| baseline | 77.1 | 74.1 | (=open) | 1239–1849 | 3194 | 10.48 M | 12 (151) | 0 |
| t4 | 77.4 | 75.7 | | 1239–1849 | 3194 | 10.50 M | 6 (73) | 0 |
| t5 | 75.8 | 74.2 | | 1239–1849 | 3194 | 10.52 M | 5 (97) | 0 |
| t6 | 71.8 | 70.2 | | 1239–1849 | 3191 | 10.52 M | 8 (99) | 0 |
| t6b | 34.7 | 36.3 | 78.8 | 1239–1849 | 3202 | 10.50 M | 14 (254) | 0 |
| t6b-slow (Slow 4G) | 34.7 | 145.1 | 332.5 | 1239–1849 | 3194 | 10.51 M | 8 (99) | 0 |
| t7 | 34.7 | 36.4 | 79.0 | 1203–1801 | 2419 | 10.50 M | 11 (234) | 0 |
| t8 | 34.7 | 36.3 | 78.7 | 1203–1801 | 2419 | 10.50 M | 11 (206) | 0 |
| **final** (fix round 1) | **34.7** | **36.2** | **78.7** | **1203–1801** | **2419** | **10.50 M** | **10 (229)** | **0** |
| **final-slow (Slow 4G)** | **34.7** | **145.1** | **332.4** | **1203–1801** | **2419** | **10.50 M** | **6 (133)** | **0** |

From t6b on, the long-task count includes the fly-back (an instant p = 1 → 0 jump the harness makes before the
stats walk) and the fill-in walk, which earlier runs did not have. Final long tasks after opening:
63, 50, 54, 60, 58 ms at p 0.73–0.76 (fill-in walk, while projection streams and warms), 87, 229, 55 ms at
p 0.23–0.13 (fly-back), 51 ms at p 0.30 and 58 ms at p 0.51 (stats walk). The pre-fix final run had 10 (214 ms):
no regression.

### Group sizes (build output)

start 22.7 MiB (mobile 21.7), rental 9.8 (lite 1.3), anamorphic 12.3 (lite 1.5), technical 10.4 (lite 1.1),
projection 23.0 (lite 3.2), arena 1.2 (lite 0.3). Lite total 7.4 MiB. Export 856 files, 184.9 MiB, largest file under 25 MiB.

### KTX2 and the `KEEP_WEBP` list

`KEEP_WEBP = [/logo|letter|sign|brand/i]` (`scripts/encode-ktx2.mjs`): lettering, logos and signage are never
converted. In this build it matched **0** textures. 15 textures use KTX2 (9 of them `/media` files), 25 stay WebP
because their KTX2 would be larger; no cache misses.

### Fill-in timeline, Fast 4G (ms after opening; walk at 6 m/s from opening)

| group | reached | light shown | full |
|---|---|---|---|
| rental | 3,332 | 21 | 25,196 |
| anamorphic | 4,000 | 21 | 15,695 |
| technical | 9,943 | 21 | 24,866 |
| projection | 10,377 | 21 | 42,377 |
| arena | 16,760 | 21 | 35,044 |

The lite/full picture pair comes from `measure-venue`'s `--pair` camera (projection `switchOnZ` − 46 m), which
stands in front of the LED Rental stall (the pair target is picked by index, a known Task 6b minor); the rental
group was still light there, so the pair shows the rental stall.

Slow 4G (`final-slow`): opened at 145.1 s with every light version; full versions at rental 105.1 s, anamorphic
66.8 s, technical 104.8 s, projection 187.1 s, arena 154.7 s after opening; all warm at 332.4 s from the request.
0 gap frames in 10,548 fill-in frames and 0 in the stats walk; 0 loading-cue frames, no loading text. Long tasks
after opening 6: 50 (p 0), 64 (p 1), 51 (p 0.24), 133 (p 0.085, fly-back), 63 and 51 (p 0.51).
`compare-shots baseline final-slow` exits 0 (worst mean 1.12, LED Rental).

### Nav jumps right after opening (ruling: committed check, every jump)

`scripts/check-nav-jumps.mjs` (`node scripts/check-nav-jumps.mjs`, Fast 4G, writes `final/nav-jumps.json` and
`final/nav-jumps/*.jpg`): per rail stop, a fresh cold page; the moment the page can scroll the stop is clicked; a
per-frame monitor runs until every group is warm. Group columns = seconds from the monitor start (just before the
click) until that group's full version was warm. Then every stall visit (`?shot=<stall>&view=front`).

**Fix round 1** (after the first run of this check): `prioritizeZ` used `groupForZ`, the last group whose
`switchOnZ` (zone start + 58 m look-ahead) the destination had passed, i.e. the group *ahead* of the stall
(LED Rental → projection; Content Studio onward → arena). Now `jumpOrder(z, stall)` in `groups.ts` puts the
destination's own group first (the stall at the destination progress, `stallAtProgress`, or the visit's stall;
otherwise the group whose zone start `zoneZ` the destination has reached), then the next group in journey order.
Side-by-side stalls (rental/anamorphic, technical/projection) share a z range, so z alone cannot name them.
Only the destination is released early; the next group still waits for the light packs; running downloads are
never cancelled; normal scrolling never calls it.

| Stop | Priority now | rental | anamorphic | technical | projection | arena | Destination stall full: before → after (s) | gap frames | long tasks (max ms) |
|---|---|---|---|---|---|---|---|---|---|
| Entrance | start → rental | 25.4 | 15.8 | 25.0 | 42.5 | 34.8 | – | 0/2519 | 10 (77) |
| LED Tunnel | start → rental | 25.0 | 16.6 | 24.6 | 43.4 | 36.1 | – | 0/2145 | 7 (108) |
| LED Pillars | start → rental | 24.8 | 16.0 | 24.0 | 43.1 | 35.8 | – | 0/2306 | 9 (78) |
| Reception | start → rental | 24.0 | 15.1 | 23.6 | 42.2 | 34.7 | – (entrance group) | 0/2557 | 4 (75) |
| LED Rental Solutions | rental → anamorphic | 24.1 | 15.1 | 23.7 | 42.5 | 34.8 | 27.6 → **24.1** | 0/2439 | 4 (81) |
| Content Studio | anamorphic → technical | 24.1 | 15.2 | 23.7 | 42.4 | 34.8 | 15.2 → **15.2** | 0/2570 | 3 (67) |
| Technical Showcase | technical → projection | 24.4 | 15.2 | 23.7 | 42.7 | 34.9 | 27.4 → **23.7** | 0/2217 | 4 (168) |
| Projection Mapping | projection → arena | 27.6 | 15.3 | 37.9 | 42.5 | 29.4 | 42.5 → **42.5** | 0/2550 | 4 (67) |
| Arena | arena | 23.4 | 15.7 | 27.6 | 42.5 | 17.5 | 17.4 → **17.5** | 0/2562 | 3 (58) |
| Main Stage | arena | 23.3 | 15.3 | 27.6 | 42.5 | 17.1 | 17.1 → **17.1** | 0/2569 | 2 (55) |
| Finale | arena | 23.4 | 15.2 | 27.4 | 42.3 | 17.1 | 17.0 → **17.1** | 0/2569 | 2 (56) |

All 11 jumps and 5 visits: 0 gap frames (27,003 jump frames), 0 loading-cue frames, 0 console errors. Without a
jump the fill-in walk has rental 25.3, anamorphic 15.7, technical 25.0, projection 42.3, arena 35.1 s (pre-fix run;
the re-run with the fix: 25.2, 15.7, 24.9, 42.4, 35.0 s, unchanged since normal scrolling never calls the jump priority).
Destination arrival after the fix vs before the fix: rental 27.6 → 24.1 s, technical 27.4 → 23.7 s (both now also
ahead of the no-jump times), anamorphic 15.2 s (already first), arena 17.4 s (was already the target), projection
42.5 → 42.5 s. Projection's floor: at opening rental and anamorphic (22.1 MiB) are already in flight on two slots
and are not cancelled; projection (23.0 MiB) takes the first free slot (anamorphic done at +14.7 s) and shares the
link until rental finishes; its download ends at +41.6 s, after the same bytes as without the jump. Beating it
would need pausing an in-flight group on a jump, which the streamer rule forbids.

The first run of this check (before the fix) is kept as `final/nav-jumps-jumps.json` and
`final/nav-jumps-visits.json`. Stall visits open in full-load mode by design (`?view` is in `fullLoadRequested`),
so they cannot show light versions: all 5 open with every group warm.

### Fly-back (ruling: full-load measurement)

`scripts/measure-flyback.mjs`, unthrottled, 3 runs per mode: walk p 0 → 1 at the stats-walk pace once every group
is warm, then an instant jump to p = 0.

| Mode | Run 1 fly-back tasks (ms@p) | Run 2 | Run 3 |
|---|---|---|---|
| `full` (`?perf&capture=1`, every full group before opening, no streaming, no light packs) | 85@0.35, **206**@0.19 | 55@0.31, 69@0.23, **148**@0.18, 115@0.12 | 86@0.25, **162**@0.20 |
| `stream` (`?perf`, walk once every group is warm) | 87@0.25, **229**@0.20 | 86@0.24, **212**@0.20 | 84@0.17, 101@0.17, **129**@0.12 |

Settled: the heavy fly-back frame (148–206 ms with no streaming at all, 129–229 ms with streaming finished) is
**streaming-independent**. It is the frame(s) where the camera crosses p ≈ 0.2–0.12 at speed and the GPU draws
zones that were culled a moment before; open target, not chased here. The stats-walk task at p ≈ 0.51
(50–100 ms) also appears in both modes. A first run of this script overlapped other local work and is not used
(its numbers were in the same range: full 100–197 ms, stream 114–228 ms).

### Phone emulation walk (Step 3)

`scripts/walk-mobile.mjs`: 375×812 at dpr 3, touch, Android Chrome UA, `Emulation.setCPUThrottlingRate {rate: 4}`,
unthrottled network, cold cache.

| Pass | Opened | Gap frames | Loading cue | Console errors | Long tasks (max ms) | Checks |
|---|---|---|---|---|---|---|
| walk `?perf` (menu jump to Arena right after opening and back; walk p 0→1 at 0.02/250 ms; all 11 menu stops) | 18.0 s | 0/2852 | 0 | 0 | 641 (337) | all 11 menu stops arrived at their p; Arena jump landed with every group shown (rental, anamorphic, technical full; projection, arena light) |
| reduced motion | 8.9 s | 0/240 | 0 | 0 | 88 (367) | `prefers-reduced-motion: reduce` matched; Arena and Entrance menu jumps arrived |
| 5 stall visits + "Back to Venue" | 11.7–12.0 s | 0/500 | 0 | 0 | 218 (379) | visit bar shown and returned to the venue for all 5 |
| `?inspect=placement` | 22.0 s | 0/51 | 0 | 0 | 57 (907) | inspection status reached "ready" |
| `?capture=1` | 20.1 s | 0/103 | 0 | 0 | 2 (197) | UI hidden (`data-capture=true`) |

Walk on the phone tier (the site picks "medium" for a touch screen on this 20-core machine): draw calls up to
1,615, triangles up to 7.50 M. Long tasks are dominated by the 4× CPU throttle; they are not comparable with the
desktop numbers. Observation (not from this branch): in `?perf&capture=1` the `?perf`-only entrance review panel
keeps its "Loading preview" checkbox and loop text visible (capture mode hides only buttons and selects); visitors
never see that panel.

### Other checks

- `npm test` 81/81 (78 + 3 jump-priority tests from fix round 1), `npm run typecheck` clean, `npm run build` clean.
- ESLint: full repo 184 errors (baseline 184). The branch had added the vendored three.js Basis transcoder
  (`public/basis/basis_transcoder.js`, byte-identical to `three/examples/jsm/libs/basis/`), which brought 2 errors
  (`require()` in Emscripten glue); it is now in `globalIgnores` as vendored code (accepted by the controller). Changed files: 0 errors.
- Snapshots: 1,263 named nodes before; 650 still exist by name after Task 7's merging (613 merged into combined
  meshes, by design). Of the shared nodes, 259 are animated and skipped; of the other 391, 0 moved by more than 1 mm. The only differences are
  walking hall guests and the rotating LED models in the rental pavilion, which also differ between two runs of
  the same build (animation, skipped).
- Baselines re-captured on this branch: only `reports/perf/baseline` itself (Task 1, with a frozen clock for
  deterministic shots, before any speed change). The path-keyed placement baselines under
  `reports/placement-implementation/` were **not** re-captured.
- `verify-*` scripts: `verify-grand-stalls`, `verify-studio-shape-v2`, `verify-rearrangement-fit` pass.
  `verify-placement-protection`, `verify-projection-finish-v2`, `verify-rearranged-arena-path` and
  `verify-rearrangement-arena` fail on `main` already (frozen 2026-10 source baselines); the branch adds no new
  failure to the first three. `verify-rearrangement-arena` has one branch-only failure, "Basin native
  material/reflection/mesh behavior unchanged": a source-text comparison that sees Task 5's lite-mode wrapper
  around `BasinWater` (the full basin code is unchanged; in lite mode no reflection target is made).
  The protected source GLB checks pass.
