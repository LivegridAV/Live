# Projection Mapping V6 screen media

The rear galaxy/particulate field, the mapped neoclassical landmark, the indoor interactive visitor gallery and the exhibition reception are original isolated raster artworks made with the built-in `image_gen` tool. The exact prompts and reference role are recorded in `prompts.json`. They contain no pixels from the booth reference and are used only on actual modelled screen apertures.

The other four gallery photographs retain their isolated V4 source artwork. `gallery-sources.json` records every source and hash, and each gallery cell is also saved individually. The new landmark is a genuine distinct subject rather than another crop of the brand palace.

Run `node public/media/projection-mapping-v6/prepare-screens.cjs` from the repository root to reproduce all consumed WebP assets. This resamples the original blue particulate field for the rear LED, creates a brighter cyan overhead derivative with restrained fine champagne dust, and packs the eight application photographs. `asset-manifest.json` records final dimensions and SHA256 hashes.

Vector text, the exact24-second bounded drift and subtle star shimmer remain native Canvas2D in `src/venue/media/projectionPainters.ts`. No typography is baked into the bitmap field, no full-reference overlay is used, and the actual crystal mesh retains its independent white/blue/champagne projection pattern.

The final crystal light field is a separate original built-in image generation, described exactly in `crystal-prompt.json`. It replaces the earlier procedural cloud/lightning field with natural dense refracted-water caustics and restrained champagne light. `prepare-crystal.cjs` resamples it to2048×1536 and gently compresses highlights to≈238/255; it paints no crystal geometry. The cached native painter applies a modest blue-only grade and a closed24-second drift.
