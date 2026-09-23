# Production-readiness pass — 24 September 2026

## Rollback point (recorded before release)

- Production: https://livegridav.com
- GitHub `main`: `4300622343df8f71d553dc5f8eb1d337a6b839b6`.
- Successful Cloudflare Pages project `live` deployment:
  `7e2c7ecb-be39-4972-a463-2c32051e6b16`.
- Immutable rollback URL: https://7e2c7ecb.live-2st.pages.dev
- Live and immutable deployment have identical Next static-asset fingerprints.
  HTML differs because of host-injected markup. Both carry the same stale
  `e0c2601` build-info stamp; that stamp is NOT the rollback source revision.
- Restore through the Cloudflare Pages deployment rollback action, or rebuild
  the recorded source revision. Do not reset unrelated local work.

## Changes

- Official green `#3fd6c8` taken from `public/brand/lockup-inverse.svg`.
  White architectural branding retained; two-tone wordmarks use white/green.
- Clear capabilities intro, corrected title, service CTA wording, visible welcome.
- One shared world-space cinematic tunnel shader: panoramic landscape, reflected
  moving sculptures and sparse particles; no ribbon/wave content path. Normal
  motion is time-based, while reduced-motion preference intentionally freezes it.
- Taller four-sided landscape pillars, continuous perimeter UVs, clearer signs.
- Branded media slates, stable texture identity during image replacement,
  device-selected image loading, video poster/autoplay fallback, gesture cleanup.
- Higher-resolution labels, stronger glass contrast, hidden-control inertness,
  dialog keyboard focus, bounded contact submission timeout.
- Existing n8n endpoint returned HTTP 500 on the production-origin OPTIONS
  preflight. Default forms now explicitly prepare email/WhatsApp drafts, never
  claim delivery and do not send a failing request. Original webhook is retained
  behind `NEXT_PUBLIC_LEAD_WEBHOOK_ENABLED=true`; repair/verify its CORS and actual
  delivery before enabling. No test leads were transmitted.
- Reproducible static export aliases for Windows Next 16 navigation.
- Build revision generated even on hosts invoking `next build` directly.

## Generated image assets

Created with the built-in Imagegen tool, not retrieved stock footage. Both source
masters are 1774 × 887 PNG; mobile variants are 1536px WebP. Do not describe them
as 4K video. The tunnel's animated geometry is rendered in real time.

- `public/media/final/cinematic-world.png`: 360° landscape direction; obsidian
  lake, basalt/marble mountains, giant waterfalls, chrome monoliths, eclipse,
  night-blue/violet sky and sunrise reflections. No text, people, LED-room mockup,
  waves, ribbons, trails or frames. One equirectangular master for all faces.
- `public/media/final/chrome-landscape.png`: continuous four-face panorama of
  alpine gorge, waterfalls, chrome vertical sculpture and suspended ovoids;
  restrained silver, stone and blue. No typography, waves or screen mockup.
- Mobile files use technical downsampling and WebP encoding from these masters.
- `broadcast-stage.png`: precise Imagegen edit of the existing wide stage image;
  preserve stage and lighting, make the entire LivegridAV wordmark white, replace
  FESTIVAL with CELEBRATIONS & SOCIAL. Inspected generated result before use.

## Release gate

Run `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` and rendered
desktop/mobile walkthroughs. `scripts/serve-export.mjs` serves the exact export on
localhost:4310; `ReviewControls` and render metrics remain development-only.
Automated checks validate exported navigation/assets, declared media, homepage
canonical/contact fallback, brand color, stage labels and tunnel mapping contract.
Do not treat automated checks as visual acceptance or claim contact delivery from
an invalid-form test. No live test enquiry should be sent to the lead pipeline.

Deeper reference-perfect booth/stage architecture, furniture and choreography
remain separate work. Preserve the current underlying R3F and authored GLB setup.

## Validation evidence

- Production export: 52 generated routes; lint and TypeScript passed; four Node
  release tests passed. HTTP smoke: 109/109 paths/assets passed, covering 47 HTML
  pages plus static files, runtime media and authored GLBs.
- Rendered desktop review covered entrance, tunnel, tall pillars, blades,
  cylinder, rings, bar, curved LED, mosaic, anamorphic corner, all nine service
  areas, both stage modes and finale/contact. No black media or visible
  anamorphic seam was observed. Welcome/signage placement was corrected from
  screenshots, not inferred solely from source.
- 390×844 browser viewport: menu and map jumps, tunnel, stage switching, contact
  card and classic contact route passed. No horizontal overflow (375px content
  within a 390px viewport including the scrollbar). This is viewport testing,
  not a physical-phone performance certification.
- Service detail FAQ, work category filter, AV Lab source and station selection,
  project-type/needs controls and internal navigation were exercised.
- Both contact forms prepared complete email/WhatsApp drafts using dummy local
  data; no external draft was opened or sent. Call/email/WhatsApp destinations
  match the verified contact constants. Backend lead delivery is NOT certified.
- Exported-site browser logs had no critical errors. A dependency-level
  THREE.Clock deprecation warning remains; it is not a rendering failure.
- Skills used: Graphify for the code relationship map, Imagegen for the media
  masters and stage-image correction, and computer-use for rendered QA.
