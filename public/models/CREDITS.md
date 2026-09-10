# 3D asset credits

Third-party 3D assets used on the LiveGridAV site, with their licenses.

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

## lion.glb — anamorphic hero (visual-final World 01, staging)
- **Title:** "Realistic Lion 3D model"
- **Author:** mohamed.salaah880
- **Source:** https://sketchfab.com/3d-models/1826fce5708d42388f6a750e6e7e3d06
- **License:** CC Attribution (CC-BY 4.0) — https://creativecommons.org/licenses/by/4.0/
- **Use:** maned male lion as the anamorphic subject emerging from the LED corner on
  the /visual-final staging route. Re-scaled/normalized and re-exported as GLB for R3F.
- **Note:** the user's preferred subject is a *photoreal lioness* ("Lion walk cycle",
  creatureanimator, Sketchfab **Free Standard** license). That model must be
  license-cleared (Free Standard restricts redistribution of the raw asset) or
  replaced before it ships to production; this CC-BY maned lion is the safe interim.

## led-panel.glb / led-panel.webp — LED cabinet (equipment page)
- Original asset created in-house (Blender) for LiveGridAV. No third-party license.

## av-rack.webp — AV equipment rack (AV Lab page)
- Original asset modelled + rendered in-house (Blender) for LiveGridAV. No third-party license.
