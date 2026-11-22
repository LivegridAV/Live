# Venue speed baseline

Captured with `node scripts/measure-venue.mjs --label baseline --throttle fast4g` against the unmodified export
(Chrome, 1600x900, cold cache, "Fast 4G": 9,000 kbps down / 1,500 kbps up / 60 ms).

| Metric | Value |
| --- | --- |
| bytesBeforeOpen | 77.1 MB (77,079,160 B) |
| requestsBeforeOpen | 141 |
| msToOpen | 73,665 ms |
| calls at progress 0 | 1,239 |
| triangles at progress 0 | 5.14 M |
| max calls on the walk | 3,085 (progress 0.20) |
| max triangles on the walk | 10.48 M |
| long tasks after open | 15 (longest 203 ms) |
| gapFrames | 0 (no groups.json yet) |

Notes:
- `stats()` reports the lowest-calls frame of the last 6 frames, because some frames add an extra pass and would alias the numbers.
- The walk steps 0.02 progress every 250 ms; the camera damping lags the scroll slightly.
- Shots are live renders. Animated content (LED screens, water) makes repeat captures differ: a second run
  measured entrance ~3.3, arena ~2.2, pillars ~1.4 mean difference against this set, versus 0.0-0.8 for the rest.
  Expect those three to need a manual look when compared against later runs.
- `snapshot.json` (1,263 named Mesh/Group entries) is the scene transform snapshot after `allReady()`.
