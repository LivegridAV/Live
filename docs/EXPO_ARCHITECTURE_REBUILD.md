# LivegridAV architectural rebuild — 23 September 2026

Local branch: `codex/expo-architecture-rebuild`, base `4300622`.
Changes are uncommitted; nothing has been pushed or deployed. Next.js routes,
service data, static SEO pages, scroll framework, contact destinations and the
React Three Fiber foundation are retained.

## 1. Booth geometries replaced

The former service structures are replaced by authored Blender GLBs.
`screen-layouts.json` registers live displays to their physical housings.

| Service | Replacement architecture |
| --- | --- |
| AV Engineering | Recessed technical displays, planning workstation and operator stools |
| Show Control | Cue wall, preview/program displays and command position |
| Live Production | Multiview/program walls, consoles and camera tripods |
| Content Studio | Monumental hero display, deep travertine-lined portal, halo with pendant fringe, reception, furnished salon, reflecting basin, scenic rocks and six-screen portfolio wing |
| LED Display Solutions | Offset canopy, two wrapped display columns, technical display and fluted reception |
| Spatial Experiences | Successive illuminated portals and recessed immersive display |
| Connected Events | Suspended circular canopy, paired audience displays and furnished meeting area |
| Digital Experiences | Metallic fins, asymmetric cantilever, digital display and reception |
| Sound & Lighting partner bay | Production towers, line arrays, truss and control position |

AV, Show Control and Live Production now share **one approximately 30.5 m
technical stand**: continuous graphite/glass crown, warm cove, end piers,
central nine-metre counter, lounges and glass information screens. The three
services remain individually explorable.

## 2. Architectural zones rebuilt

Entrance portal/fascia; rectangular four-sided tunnel; six-column pillar forum;
creative LED gallery with cylinder, rings, bar, curved screen and furnished
salon; all nine service/partner architectures; exhibition-hall bays and floor;
and the flagship stage/arena.

The refinement adds bevels, soffit fins, recessed downlights, fluted counters,
workstation details, furniture with metal legs, books/vases and branch-and-leaf
planting. Baked vertex occlusion grounds the architecture. Restrained
world-space grain varies stone, metal and upholstery. The floor has mineral
variation, joints, reflections, illuminated footprints and distinct platforms.

## 3. References guiding each zone

| Supplied reference | Design translated into the site |
| --- | --- |
| 1 — tunnel | Four-sided cosmic world, reflective deck, warm portal and integrated branding |
| 2 — pillars | Tall staggered columns, gold/silver imagery, reception/lounge context |
| 3 — creative expo | Blue/glass/gold cylinder and ring artwork, LED hospitality and salon |
| 4 — Content Studio | Dominant sculpture display, deep black portal, warm halo, reception, scenic basin and portfolio wall |
| 5 — technical booth | Unified AV / Show Control / Live Production elevation, graphite/glass crown, technical screens and central counter |
| 6 — conference stage | Balanced wide LED composition, warm house lighting, stairs and occupied seating |
| 7 — social stage | Portal artwork, animated beams/colour and empty seating between shows |

These are real-time architectural interpretations, not pixel-identical offline
renders. The gallery remains a walk-through sequence rather than the exact
single-room reference composition.

## 4. Visual/media upgrades

High-resolution image plates use cover-fitting on flat screens and shared
crops on four-sided pillars. Technical canvases have larger resolutions and an
adaptive-quality resolution floor; cues, status and timecode update.

A new **2172 × 724** blue-glass/champagne-gold strip serves the ring, cylinder
and bar. Integer ring repeats and shader edge blending remove the hard wrap
boundary. Closed wraps translate without seam-breaking zoom. The tunnel now
maps its forward-facing plate to the appropriate field of view, avoiding the
soft centre crop caused by treating it as a 360-degree panorama. Reduced-motion
mode freezes image drift.

The imagegen skill and **built-in image-generation tool** produced the strip:
`D:/SFT/LiveGrid_AV/livegridav-site/public/media/final/gallery-blue-wrap-v2.png`
(2,246,918 bytes). The original generated PNG was retained.

Final generation prompt:

> Use case: stylized-concept. Asset type: ultra-wide unwrapped LED screen artwork texture for a cylindrical column, suspended LED ring and curved bar in a premium LivegridAV exhibition. Generate ONLY the flat artwork, no photograph of an exhibition, no screen hardware or room. A long continuous, richly detailed sculptural stream of optically clear cobalt-blue glass, fine silver filaments and luminous champagne-gold particles twists horizontally across a deep midnight-navy background. Large sweeping ribbons with realistic refraction, polished metallic edges, exquisite fine highlights and dimensional shadow. Cinematic premium motion-design still, crystal clear, sophisticated colour grading, physically realistic materials. Composition: ultra-wide 3:1 panorama, horizontal rhythmic flowing design with open dark areas, not a central logo or a vertical sculpture. Intended to repeat seamlessly around a ring: left and right edges should match in brightness, flow position and direction, with no vertical divider or abrupt boundary. No text, no logos, no people, no watermarks. Produce high-resolution artwork suitable for a large LED surface. This is original screen content, not a mockup.

This is **not a newly rendered photorealistic video-loop package**. Plates use
bounded shader motion; procedural layers add depth. Broadcast multiview uses
the supplied stage reference as an illustrative feed with reframing, tally
and timecode—not live footage or evidence of completed client work.

## 5. Stage changes

An 80 m authored stage has layered framing, centre steps, portrait fillers,
stacked side-screen arrays, flown equipment and off-axis FOH. Required labels:
**Meetings & Conferences** and **Celebrations & Social**. Switching changes
artwork, beam/colour behaviour and audience occupancy.

Chairs have individual legs; instanced people have tapered torsos, head/hair,
varied clothing/skin, slight pose differences and occasional empty seats.
They remain optimized stylized figures, not scanned human assets.

## 6. Branding/text/UI

Entrance wording is `WELCOME LIVEGRIDAV` and `LIVEGRID AV`, with no venue
ownership claim. Architectural branding sits on fascias, walls and counters.
Desktop narrative/service panels sit around vertical centre, opposite the
featured booth; phone service prompts move above the main display. Semibold
type has no glow. Subtle glass treatments also extend to classic-page chrome.
Routes, service copy and contact destinations are preserved.

Portrait camera correction is bounded inside the hall walls. Development-only
shot selection and render metrics support repeatable review and are absent
from production.

Cold-load testing also exposed a shared glass rule overriding the jump rail's
fixed positioning. The rail is fixed again, compact, and its buttons retain
accessible names on phones; right-side service prompts leave it clear. Arena
approach pillars were moved beyond the Sound & Lighting stand's sightline.

## 7. Build/preview/deployment status

- `npm run lint`: passed.
- `npm run build`: passed, including TypeScript and **52/52 static pages**.
  Code build timestamp: `2026-09-23T08:28:01.242Z`.
- GLBs: **14 files, 18.04 MiB**, valid container lengths, embedded buffers and
  4–12 material primitives per asset. Twelve models include baked `COLOR_0`
  occlusion; hall/stage are not AO-baked.
- Local dev preview: `http://localhost:3000/`; static export: `out/`.
- Production export cold-loaded through a temporary loopback static server:
  loader completed, entrance rendered, fixed jump control reached Main Stage,
  and the production stage-mode switch changed state. No console errors were
  reported during that check. The temporary server is not a deployment.
  Its HTTP log did contain Next route-prefetch 404s for flat segment URLs
  such as `/services/__next.services.__PAGE__.txt`; this Windows export places
  that payload under `services/__next.services/__PAGE__.txt`. Full clean-URL
  routing on the target host therefore remains a deployment validation item.
  No hosting configuration was changed. The temporary QA server was stopped.
- `git diff --check`: passed (only repository LF/CRLF conversion notices).
- The computer-use skill guided actual rendered in-app browser inspection,
  service-panel interactions, console checks and desktop/phone/tablet review.
  Sizes checked: 1440×900, 390×844 and 768×1024. Fresh captures are in ignored
  `qa/expo-review/*-v2-*.png`.
- Classic-page eight-breakpoint checks from the preceding pass remain valid.
  Its tablet nav/footer corrections are retained.
- Local development readings varied roughly **35–60 fps**: services generally
  settled near 60; the stage was heavier. These are observations, not real-phone
  thermal tests or Firefox/Safari benchmarks.
- No deployment, commit or push. Existing Google Fonts fetching still requires
  network permission during a production build.

## 8. Blender verification and remaining quality limits

Verified Blender 5.2.1 LTS executable:
`C:/Program Files/Blender Foundation/Blender 5.2/blender.exe`.
Headless generation, GLB export and Cycles/OptiX rendering on RTX 2060 worked.
The latest asset run exited 0 and saved three Cycles previews under
`qa/blender/expo/`; those show architecture/materials, not runtime LED media.

The available live Blender MCP status call reported it could not connect:
the addon/server was not running. No socket workaround was used. Headless
creation does not depend on the GUI/addon connection.

Reproduce:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/blender/rebuild_expo.py
```

Append `-- --no-preview` to omit the three QA renders. The script creates
fresh scenes and does not open or overwrite a user's existing `.blend`.

**100% reference-level photorealism has not been achieved or certified.**
Runtime lighting/reflections, optimized people and animated still plates
remain visibly different from the references. Further production work needs
authored motion loops, more realistic human assets and device-level
optimization. Those unfinished quality goals are not labelled complete.
