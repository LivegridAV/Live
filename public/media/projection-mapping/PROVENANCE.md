# Projection mapping pavilion artwork

Created for the actual 3D pavilion in response to the user’s reference, `C:/Users/VJNir/Downloads/Livegrid AV Projection Mapping Booth.png`.

The built-in `image_gen` tool generated three isolated screen-content images on 2026-10-16. No reference-booth photograph is displayed as a background or architectural overlay. The full prompts and original generated-image paths are preserved in [prompts.json](prompts.json).

| Saved original | Runtime image | Use |
| --- | --- | --- |
| applications-original.png | applications.webp | Four individual projection-mapping application monitor photographs: architecture, stage, product and interactive spaces. |
| hero-original.png | hero.webp | Palace mapping demonstration on the separate right wall monitor only. |
| forest-original.png | forest.webp | Enchanted forest and gold constellation content for actual rear and overhead LED surfaces. |

The palace sculpture’s illuminated decoration is **native Canvas2D light content**, created by `src/venue/media/projectionPainters.ts`; it is projected over real three-dimensional domes, arches and columns rather than using a palace photograph on a flat quad. The touch-screen interface is also native Canvas2D, with sharp editable text and real monitor thumbnails.

`prepare-artwork.mjs` creates quality-93 WebP copies and records image sizes, byte counts and SHA-256 hashes in `asset-manifest.json`. The saved originals remain in the project. `render-painter-qa.cjs` renders the native media without a browser and verifies identical start/end frames for the 24-second loop.

No external stock imagery, API key or CLI image generation was used.
