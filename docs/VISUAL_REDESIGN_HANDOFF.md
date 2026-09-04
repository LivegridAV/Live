# Visual Redesign — Handoff / Continuation

_Last updated: 2026-09-05. Read this first, then continue from "Next actions".
Content-truth work is settled — do NOT reopen it._

## Repository state

- Branch: `feat/multipage-site` (Cloudflare Pages auto-builds on push).
- HEAD at handoff: `3438c76` (see `git log --oneline`). Key redesign commits:
  - `3438c76` Hero legibility scrim + reduced-motion pass
  - `adeab0b` Global de-cyan: natural graphite dark theme + AV Lab material pass
  - `b194668` Mobile hero: recompose camera, fix nav overflow + console collision
  - `75c64f6` Hero art-direction pass: enclose venue, unbury it, calm the beams
  - `33a919b` Dim the opening starfield
  - `d761794` **Hero: de-cyan to a natural cinematic grade + real anamorphic tiger**
  - `7b23488` Content truth (accepted baseline — do NOT reopen)
- Public acceptance URL: <https://feat-multipage-site.live-2st.pages.dev/>
- Tiger Blender source: `Tiger.blend` at repo root (untracked, ~2.1 MB).
  Runtime asset `public/models/tiger.glb`. Credits: `public/models/CREDITS.md`.

## Done this phase (verified in the rendered page, not source)

- **Flagship hero** — public-verified at 1440/1920. Natural warm-graphite grade
  (was cyan cyberpunk); enclosed dark venue (cosmos + starfield gated out of the
  opening); Stage Control panel collapsed by default (was a dashboard slab that
  buried + occluded the tiger); tiger shown by default, emerging across the LED
  plane on one long seamless prowl; LED shows a misty forest (aerial perspective,
  god-rays, wind); warm calmed beams; legibility scrim behind the headline.
- **Mobile hero** (390px) — nav overflow fixed, console no longer overlaps the
  headline, portrait camera dollies in so the wall fills the frame.
- **Global de-cyan** — `.lg-dark` tokens re-pointed to natural graphite; feature
  icons neutral steel (cyan only on hover); teal near-black literals neutralised.
  Verified on /services, /work, /av-lab, /services/live-production.
- **AV Lab 3D room** — already existed (d7643b2) and works; re-lit neutral-warm,
  rack/projector de-cyaned, red program tally preserved, cyan = active station.
- **Reduced-motion** — `signals.reducedMotion` calms tiger + camera motion.
- Build green (`npm run build`), 0 console errors on the routes checked.

## Colour law (keep)

- Environment = natural graphite/warm. **Cyan is semantic only**: signal path,
  LED content, active/selected/focus, the brand 5×5 signal-grid mark. **Red =
  live/program/tally only.** Never re-introduce cyan as an environmental tint.
- `THEMES.signal` (3D) and `.lg-dark` tokens (DOM) are the two levers; changing
  either recolours broadly. `SIGNAL_CYAN`/`PROGRAM_RED` constants in store.ts.

## Next actions (priority order)

1. **LED forest realism** — the shader reads as misty layers but not photoreal.
   If higher realism is wanted, render a seamless forest loop in Blender and map
   it as a video texture onto the LED (hybrid, brief §3/§50). Shader is in
   `LedWall.tsx` program 0.
2. **Card-reduction pass** on service/work pages (brief §20) — several sections
   still use bordered rounded cards; convert to editorial/spatial layouts.
3. **Ultrawide (2560)** fine-tune + full **responsive matrix** screenshots.
4. **Full route console/CTA crawl** (Playwright) across every route + service
   detail; **keyboard** and deeper **reduced-motion** verification.
5. **Home scroll sections** after the hero — confirm each cinematic scene reads
   under the new palette (LED dive, universe, services cylinder, lab, projects).

## Verification notes

- The in-app Browser pane can be hidden (WebGL won't render there). Use
  **Playwright MCP** — headless, renders WebGL regardless. Power on via
  `page.locator('.lg-intro').click()`, wait ~6s, then screenshot.
- Dev-server CSS HMR is unreliable here; after a CSS edit, restart the dev
  server (or check `out/**.css` from a fresh `npm run build`) before trusting a
  local CSS screenshot. JS/HMR is fine.
- `fullPage` screenshots show big empty bands because Reveal uses
  IntersectionObserver (opacity:0 until scrolled in). Scroll the section into
  view and shoot the viewport instead — it is NOT a layout bug.
