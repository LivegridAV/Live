# Entrance and tunnel visual update

- Removed the separate WELCOME LIVEGRIDAV board, its canvas painter, and its critical preload. The primary LIVEGRID AV entrance fascia is unchanged.
- Enhanced the existing panorama with built-in Imagegen; kept the eclipse, waterfalls, floating monoliths, mountains, and lake.
- Native enhanced source: `assets/media/cinematic-world-v2-source.png`, 1774 × 887. Delivery assets are **upscaled**, not native 4K:
  - `public/media/final/cinematic-world-v2-4k.webp`: 3840 × 1920, 1,693,072 bytes.
  - `public/media/final/cinematic-world-v2-mobile.webp`: 1920 × 960, 511,868 bytes.
- Reproduce delivery variants with `node scripts/prepare-tunnel-media.mjs`.
- Increased tunnel brightness from 0.92 to 1.03. Shared world-space projection and continuous animation are unchanged; no extra draw calls or shader effects were added.
- The existing Graphify map identified Tunnel → ImmersiveVolume and the separate Arrival component. Direct source inspection verified the newer cinematic material, which was not yet represented in the older map. Graphify CLI was inaccessible, so its JSON edges were inspected read-only.

## Validation

- Build, typecheck, lint, and six release tests pass.
- Local HTTP smoke: 109/109 targets pass.
- Desktop browser: welcome board absent, primary fascia intact, tunnel wrap continuous, idle sculpture motion preserved, 57 fps at the sampled tunnel view, no console errors.
- Mobile browser at 390 × 844: entrance fascia clear, no welcome board, mobile panorama confirmed in the request telemetry, 57 fps at the sampled tunnel view, no console errors. This is viewport emulation, not a physical-device benchmark.
- Rollback: commit `305a74ae31db1a5871db29cc3ce349bdfc6d668f`, Cloudflare production `dd855d93-0b31-4a3a-b759-a50a54784ad0`.

## Imagegen prompt

Use case: precise-object-edit. Asset type: high-resolution 2:1 equirectangular panorama texture for a five-surface immersive LED tunnel. Input image 1 is the EDIT TARGET. Upscale and enhance this same world, requesting a 3840 x 1920 pixel result or the highest native resolution supported. Keep the composition, central eclipsed sun on the horizon, floating monoliths, dramatic basalt mountains, monumental waterfalls, star-filled sky and perfectly reflective dark lake. Recover crisp natural rock strata, water detail, stars and metallic reflections, with greater cinematic depth and clarity. Increase the visual impact through clean luminous champagne highlights and rich midnight blue shadows, not over-saturation. Maintain the horizon at exactly 50% height and the existing 2:1 panorama framing so it can wrap walls, ceiling and floor continuously. Preserve an uncluttered center. Seamless matching left/right edges. No text, no logo, no people, no ribbons, no painted room architecture, no frames, no bloom haze or sharpening halos. The purpose is more detailed source artwork, not a tunnel mockup.
