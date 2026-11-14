# Projection Mapping — crystal pavilion media

Reference: `C:/Users/VJNir/Downloads/ChatGPT Image Oct 16, 2026, 09_32_18 PM-1.png`.

Every bitmap is isolated screen content or projected light. No complete reference-booth photograph is displayed as architecture, a room background or an overlay.

## Native projected light and cosmic content

`prepare-native-artwork.cjs` creates the 2048 × 1536 `crystal-light-native.png` and quality-97 `crystal-light.webp`: ivory-white and icy-blue light patches, sparse pale-champagne highlights, small irregular projected facets and 246 bright branching veins. It contains no crystal silhouette, tower, building, floor, ceiling or kiosk. The genuine GLB supplies all three-dimensional geometry. Native domain: X −2.15…2.15 m, Y 0…3.30 m. The runtime paints a bounded 24-second drift at 8 fps.

`cosmic-swirl-native.png` / `cosmic-swirl.webp` (1024 × 1024) and `cosmic-panorama-native.png` / `cosmic-panorama.webp` (2560 × 1024) derive from the existing isolated generated nebula in `../led-rental-showcase/nebula.webp`. Deterministic native Canvas2D performs a polar twist, deep teal/navy channel grade and sparse champagne star points. No reference pixels are used. The ceiling and curved backdrop run at 4 fps with an exact 24-second period. Backdrop words are sharp native Canvas2D text in two clear side bands; no lettering is baked into the background raster.

## Eight gallery screens

`prepare-gallery.cjs` packs eight distinct 1024 × 576 views into the 2048 × 2304 `applications.webp` atlas. Individual WebPs are retained. `gallery-sources.json` records exact source paths, hashes and crop coordinates.

| Variant | Subject | Source |
| --- | --- | --- |
| 0 | Architectural palace mapping | Existing `../projection-mapping/applications.webp`, quadrant 0 |
| 1 | Blue/purple live concert | Existing `../led-rental-pavilion-v3/applications.webp`, quadrant 0 |
| 2 | Blue projected car | New isolated built-in imagegen photograph, `product-car-original.png` |
| 3 | Interactive people | Existing `../projection-mapping/applications.webp`, quadrant 3 |
| 4 | Landmark arch detail | Existing isolated `../projection-mapping/hero.webp`, close crop |
| 5 | Brand palace view | Existing isolated `../projection-mapping/hero.webp`, complete view |
| 6 | Contemporary event interior | New isolated built-in imagegen photograph, `interior-event-original.png` |
| 7 | Event audience and stage | Existing `../led-rental-pavilion-v2/applications.webp`, quadrant 1 |

The original prompts for the two new photographs are saved in `prompts.json`. The built-in `image_gen.imagegen` tool was used, with no CLI/API fallback and no reference-image editing. Source originals remain under `C:/Users/VJNir/.codex/generated_images/01a142b8-d80a-73d0-8225-5ef7b571dfa4/`: `exec-81da1974-b92d-4009-af31-6d6414deedb9.png` (car) and `exec-da8a7032-065e-4082-ba28-46bba4f881ab.png` (interior). The selected originals are copied into this workspace. Earlier reused assets retain their prompts/provenance in their original folders. Generated scenes are illustrative capability imagery, not records of a named real commission.

## Crystal kiosk hero and validation

`crystals-hero.png` is an isolated Blender render of the actual final crystal model, never a fake crystal on a plane in the website. `convert-crystal-hero.cjs` writes quality-95 `crystals-hero.webp` and records both the real geometry hash and light-field hash in `asset-manifest.json`. The kiosk demonstrates exactly three projector outputs, matching the actual overhead geometry.

`render-painter-qa.cjs` writes native previews and tests exact t0/t24 equality for the current crystal, ceiling, curved backdrop, eight gallery variants, hero and kiosk. It also checks that the left backdrop wording fits the designated clear band. Root verifies the physical rendered booth separately in the browser.
