# 3D asset credits

Third-party 3D assets used on the LiveGridAV site, with their licenses.

## Grand stall visitor assets — October 2026

The `grand-*-visitors.glb` and `projection-grand-visitors-v1.glb` files reuse
textured, static business avatars from the Microsoft Rocketbox Avatar Library.
Copyright (c) 2020 Microsoft. Licensed under the MIT License. The full notice is
in [technical-humans-LICENSE.txt](expo/technical-humans-LICENSE.txt), with source
and preparation details in [technical-humans-provenance.json](expo/technical-humans-provenance.json).
New placements preserve native human proportions; no person is scaled with a stall shell.

The grand stall architecture, joinery, furnishings and curved-leaf planting are
bespoke Blender geometry, built using the retained project helpers. Existing
surface atlases and licensed CC0 surface records remain alongside their media.
The rental globe uses the retained NASA Earth Observatory map, whose source is
recorded in `/media/led-rental-2026/asset-manifest.json`. Existing screen artwork
is display content only; reference images are not substituted for 3D stalls.

## tiger.glb — anamorphic hero (homepage 3D experience)
- **Title:** "Running Tiger"
- **Author:** francescolima74
- **Source:** https://sketchfab.com/3d-models/fc2c7fd74dd04e39935803b884c77258
- **License:** CC Attribution (CC-BY 4.0) — https://creativecommons.org/licenses/by/4.0/
- **Use:** natural-coloured anamorphic subject grounded in the LED corner; original
  mesh, rig and materials retained, normalized/optimized and re-exported as GLB
  for React Three Fiber.
- **Animation (modified):** the model's original "Run" clip was **not** suitable for
  the grounded hero (it read as running-in-air when slowed). Using the original
  rig, we authored two bespoke clips in Blender — a slow, heavy **Walk** (4-beat
  lateral-sequence gait with true paw-lock: planted paws do not slide, feet stay
  on the ground) and a calm **Idle** (breathe/look). These replace the exported
  animation; the mesh, skeleton and textures are unchanged from the CC-BY source.
  The original "Run" animation remains available from the Sketchfab source above
  under the same CC-BY licence. Working source file: `Tiger.blend` (tracked in-repo).

## led-panel.glb / led-panel.webp — LED cabinet (equipment page)
- Original asset created in-house (Blender) for LiveGridAV. No third-party license.

## av-rack.webp — AV equipment rack (AV Lab page)
- Original asset modelled + rendered in-house (Blender) for LiveGridAV. No third-party license.
