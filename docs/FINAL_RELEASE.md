# LiveGridAV V2 — Final Release

**Release:** LiveGridAV V2 (multipage site + grounded anamorphic tiger hero)
**Date:** 2026-09-10
**Release tag:** `livegridav-v2-production`
**Main commit:** `0f4cc41` — "Merge PR #2: multipage V2 site + grounded anamorphic tiger hero" (`origin/main`)
**Feature commit:** `d2970fd` — "feat(hero): grounded Blender tiger walk + pre-rendered forest LED backdrop" (`feat/multipage-site`); the tagged source commit (its tree is the deployed tree).
**Production URL:** https://live-2st.pages.dev/ (custom domain: https://livegridav.com/ — same Cloudflare Pages project)

## Verified on production

- **Hero:** V2 editorial homepage, dark cinematic grade. Real hardware GL confirmed (ANGLE / NVIDIA RTX 2060, D3D11) — not software GL.
- **Tiger:** grounded Blender tiger in the LED corner; naturally coloured (not neon). Walk → pause → Idle → hidden reset → re-approach observed over multiple cycles; no air-running, paw-sliding, floating, clipping, teleport or backward walk. Paw-lock previously proven numerically; visual verification consistent.
- **Forest:** pre-rendered LED backdrop as a WebGL video texture. Desktop `forest-desktop.webm` (streamed, 206); mobile serves `forest-mobile.mp4`. Loops with no visible reset flash, black frame, or colour-space shift.
- **Anamorphic:** `?atest` renders a coherent primitive at the sweet spot; `?atest&view=off` splits/distorts off-axis. Projection math unchanged.

## Responsive

Zero horizontal overflow at all tested breakpoints: 375×812, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080, 2560×1440. Mobile hero: tiger visible and uncropped, mobile forest variant, readable title, working hamburger, visible CTAs, no scroll lock or canvas overflow.

## Functionality

- **Routes:** 45 sitemap routes + `/design-v2`, `robots.txt`, `sitemap.xml` crawled → **48/48 HTTP 200**, **0 failed**. Unknown paths correctly return 404.
- **Dead buttons: 0 · Dead links: 0 · Fake controls: 0.** Verified interactives respond: projection look-selector, live switcher, anamorphic viewpoint slider, show-control cue stack, AV Lab stations, Sound coverage, Lighting fixtures, Hybrid connect stage. Contact channels resolve (email / tel / WhatsApp). The Work signal path is a passive animation by design.

## Quality gates

- **Lint:** PASS (`npm run lint`, exit 0)
- **Typecheck:** PASS (`npx tsc --noEmit`, exit 0)
- **Build:** PASS (`npm run build`, exit 0; 51 static pages, `output: "export"` → `out/`)
- **Console:** 0 uncaught errors across all key pages. Warnings only: one documented `THREE.Clock` deprecation (third-party) and benign Next.js "font preloaded but not used" advisories.
- **Network:** 0 critical 404s, 0 failed GLB, 0 failed video, 0 failed fonts. RSC prefetch `net::ERR_ABORTED` entries are benign (App Router on static host).
- **Reduced motion:** verified with `prefers-reduced-motion: reduce` — tiger holds a calm grounded Idle, forest paused (canvas byte-identical across a 4s window), content/nav/CTAs visible.

## Content truth

- **Fabricated clients:** 0 in deployed output (no Nova Motors / Pulse Live / National Museum / TechBridge / ProLeague / Meridian Group).
- **Unverified metrics:** 0 (no "500+", "10+ years", "24/7", "100% nationwide"). Stats are truthful (fine-pitch LED, 360° immersive, one team).
- **Old service architecture:** not exposed. The rejected nine-service list and old venue components remain in-repo as unused source (imported by no live route). Watchout/VJ appear only in truthful Show Control / Media Server / AV Lab / equipment contexts.
- **Service architecture (15):** AV & Visual — AV Engineering, Content, Presentation, LED, 3D/Anamorphic, Show Control/Media Server, Projection, Immersive · Live Production — Live Production, Virtual, Hybrid, Broadcast/Streaming · Collaborative — Sound, Lighting · Digital — Web Development.

## Assets

- **Tiger:** `public/models/tiger.glb`.
- **Forest:** `public/videos/forest-desktop.{webm,mp4}`, `forest-mobile.mp4`, `forest-poster.jpg`.
- **Blender sources:** `Tiger.blend` tracked in-repo (editable source for the bespoke Walk/Idle clips). LED cabinet and AV rack ship as in-house exports (`led-panel.glb`, `av-rack.webp`); forest is a pre-rendered video backdrop.
- **Credits:** `public/models/CREDITS.md` — accurate CC-BY 4.0 attribution for the tiger (francescolima74, Sketchfab), modifications documented, original "Run" clip correctly noted as available from the source (not claimed stored locally).

## Infrastructure

- **build-info:** production `/build-info.json` reports `84f08da` (one commit behind the deployed `d2970fd`). Deployment identity is instead verified by content and by `origin/main` (`0f4cc41`) merging `d2970fd`.
- **Cloudflare build command — manual dashboard action required:** set the production build command to `npm run build` (currently `next build` runs directly, so `scripts/gen-build-info.mjs` never executes and `CF_PAGES_COMMIT_SHA` / `CF_PAGES_BRANCH` are not stamped). This is a metadata-only issue; it does not affect the finished site. No repo/CF config is available to Claude to change it non-interactively.

## Known follow-ups (non-blocking, for the next task)

- **Real-GPU FPS acceptance:** ENVIRONMENTAL VALIDATION PENDING for physical target hardware. The automated environment used real hardware GL (RTX 2060) for visual acceptance.
- **Repo hygiene:** `Tiger.blend1` (a Blender auto-backup) is tracked; it is not deployed. Untrack + gitignore it during migration packaging.

---
LIVEGRIDAV V2 — FINAL RELEASE FROZEN AND PRODUCTION VERIFIED
