# V7 actual crystal and restrained rear content

`crystals-hero.png` is a Blender render of the actual `projection-crystals-v7.glb`, not an AI picture of the sculpture or an attached booth photograph. Its source is `scripts/blender/rebuild_projection_crystals_v7.py`. The model contains closed fractured blades, short oblique caps on the major shards, slanted lamellae, small side clusters, metallic facets and genuine dark clefts. The mapped render uses the separately documented V6 optical caustic field, with seven compatible runtime finish roles.

The new rear content derives from the original V6 isolated blue particulate artwork, whose exact built-in generation prompt is preserved in that version's `prompts.json`. `prepare-media.cjs` separates broad cloud energy from fine detail: broad light is attenuated to0.66, detail is retained at0.86, and bright fine particles retain extra local contrast. This calms the large white wave/cloud bands while keeping tiny blue stars. It adds no architecture, model, typography or reference pixels.

The roof content uses the original V6 isolated cyan particulate tile. Broad light is attenuated to0.70 and fine detail retained at0.84, followed by RGB multipliers0.75/1.0/0.85. This creates a quieter teal canopy with dark gaps instead of broad icy-white bands. The small native animated stars remain separate vector light points.

Run `node public/media/projection-mapping-v7/prepare-media.cjs` after the Blender model/render export. The resulting WebPs, source model hash and projection domain are recorded in `asset-manifest.json`. Vector copy and the closed24-second drift remain native in `projectionPainters.ts`.
