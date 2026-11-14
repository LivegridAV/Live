# White architectural light-sculpture media

References: `C:/Users/VJNir/Downloads/ChatGPT Image Oct 16, 2026, 02_38_35 PM-1.png` and `C:/Users/VJNir/Downloads/ChatGPT Image Oct 16, 2026, 02_38_40 PM-2.png`.

The references guide the actual 3D pavilion and sculpture. No attachment photograph is cropped, edited or displayed as a reference-booth overlay.

## Native projected light

`prepare-native-artwork.cjs` deterministically creates a porcelain-white and icy-blue light field with 246 irregular, recursively branching electrical vein paths and fine capillary strands. Strand widths receive a 1.8× viewing-distance gain and a brighter icy-white core so they remain readable when the entire sculpture is about 400 pixels wide. Multiscale noise shapes the broad, restrained blue patches; no Voronoi cell outlines remain. It supplies **light content only**: no stair, arch, tower, silhouette or building is painted into it. The actual sculpture GLB supplies every physical surface and opening.

- `sculpture-caustics-native.png`: saved native original, 2048 × 1536.
- `sculpture-caustics.webp`: quality-97 runtime light field; runtime and isolated renderer register it to the current sculpture layout's exact `projectionDomain`.
- `cosmic-tile-native.png`: saved periodic teal/gold cosmic mottling original, 768 × 768.
- `cosmic-tile.webp`: lossless runtime ceiling light tile.

`src/venue/media/projectionPainters.ts` paints these cached assets with a bounded 24-second drift. The overhead content combines the previously generated isolated forest artwork with native teal/gold cosmic mottling and star points, preserving plainly visible foliage and gold branch highlights. There is no heavy procedural pixel generation during a visible frame. The sculpture texture runs at 8 fps; the cosmic ceiling at 4 fps. The warm ivory substrate and architecture retain actual three-dimensional lighting.

`native-asset-manifest.json` records dimensions, byte counts and SHA-256 hashes. Run `render-painter-qa.cjs` to save native previews and exact t0/t24 comparisons in `qa/projection-mapping-v3/`.

## Monitor and kiosk

The right monitor and kiosk use `sculpture-hero.webp`, converted from a Blender rendering of the **same genuine three-dimensional sculpture model** used in the pavilion, on a procedural navy cosmic background with faint stars and teal cloud variation. Principal mapped faces use icy blue and white branching veins, warm ivory returns and a porcelain moon. The complete model remains uncropped in the 1600 × 900 frame.

The final source is `sculpture-hero-render-final.png`, reproducible with `qa/projection-mapping-v3/render_reference_sculpture_hero.py`; run `convert-final-hero.cjs` after the model-only Blender renderer finishes to write the quality-95 monitor WebP and record both source-geometry and light-field hashes. Genuine sculpture geometry is authored in `scripts/blender/rebuild_projection_sculpture.py`. The earlier pale `sculpture-hero-render.png` and stronger-blue `sculpture-hero-render-blue.png` are preserved as previous versions. This is a screen demonstration image, not geometry or a room background.

The four gallery screens retain distinct application artwork from `public/media/projection-mapping/applications.webp`. In particular, the top architectural-mapping screen shows a blue/gold arched palace example, distinct from the new white abstract sculpture on the right monitor, as in the latest reference. The earlier built-in image-generation prompts and provenance are preserved in that folder. No new image-generation service or raster reference editing was used for the native light-field assets or the model-rendered hero.
