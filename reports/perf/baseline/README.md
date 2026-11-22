# Venue speed baseline

Captured with `node scripts/measure-venue.mjs --label baseline --throttle fast4g` against the unmodified export
(Chrome, 1600x900, cold cache, "Fast 4G": 9,000 kbps down / 1,500 kbps up / 60 ms).

| Metric | Value |
| --- | --- |
| bytesBeforeOpen | 77.1 MB (77,079,771 B) |
| requestsBeforeOpen | 141 |
| msToOpen | 74,134 ms |
| calls at progress 0 | 1,239 min / 1,849 max |
| triangles at progress 0 | 5.14 M min / 7.68 M max |
| max calls on the walk | 3,194 (progress 0.30) |
| max triangles on the walk | 10.48 M (progress 0.20) |
| long tasks after open | 12 (longest 151 ms) |
| gapFrames | 0 (no groups.json yet) |

Notes:
- `stats()` gives min and max over the last 6 frames (some frames add an extra pass). Later targets are judged on the max.
- The walk steps 0.02 progress every 250 ms; camera damping lags the scroll slightly.
- Shots are deterministic: reduced motion, a fake page clock stepped one 16 ms frame at a time, media time pinned
  with `__venuePerf.freeze(1)`, fps readout hidden. Two independent runs compare at mean <= 0.13 per shot (0.00 for most).
- `snapshot.json` is the scene transform snapshot (named Mesh/Group, 1 mm rounding) after `allReady()`.
