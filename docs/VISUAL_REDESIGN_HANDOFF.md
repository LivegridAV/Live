# Visual Redesign — Handoff / Continuation

_Last updated: 2026-09-04. Read this first, then continue from "Next actions".
Do not re-audit already-solved content-truth work._

## Repository state

- Branch: `feat/multipage-site`
- HEAD at handoff: `dcdf4aa` (see `git log --oneline`)
  - `dcdf4aa` Truth: replace fabricated stats in classic Hero fallback
  - `d761794` **Hero: de-cyan to a natural cinematic grade + real anamorphic tiger** (the flagship rebuild)
  - `7b23488` Content truth (accepted baseline — do NOT reopen)
- Public acceptance URL: <https://feat-multipage-site.live-2st.pages.dev/>
  (Cloudflare Pages auto-builds on push to this branch.)
- Blender source for the tiger: `Tiger.blend` / `Tiger.blend1` at repo root
  (untracked, ~2.1 MB each). The runtime asset is `public/models/tiger.glb`.

## What the flagship HERO rebuild changed (commit d761794)

The default face of the site is the WebGL `Experience` (src/experience/*), NOT
the classic `Hero.tsx` (that is the no-WebGL fallback only). All hero work is in
the experience.

- **Colour grade — the big one.** `THEMES.signal` in `src/experience/store.ts`
  went from cyan (`#3fd6c8`/`#1fa093`) to a natural warm-graphite grade
  (`glow #f2a63a`, `accent #a9642c`, `deep #0b0a08`, `warm #ffd6a0`). Because
  every emissive material/shader reads `THEMES[theme]`, this recolours the whole
  venue at once — beams, LED, strips, follow spots, fog. Cyan is now a
  **functional accent only** via `SIGNAL_CYAN`/`PROGRAM_RED` constants.
  Scene fill lights in `Experience.tsx` went neutral-warm.
- **Tiger is the hero, visible by default.** `visual3d` now defaults `true`
  (was hidden behind the "3D VISUAL" toggle). Motion in
  `scenes/Anamorphic.tsx`: the old 6.5 s lunge-pulse is replaced by ONE long
  (~26 s) `smootherstep` ping-pong prowl (z -1 → 9 → -1) that eases through the
  LED plane and back with no visible reset. Lighting: warm tungsten key/fill +
  faint cool moonlight rim (no cyan spill).
- **LED shows a living forest.** `scenes/LedWall.tsx` shader program 0 (the
  default) is now a layered forest: depth bands, multi-speed wind (near sways
  more), warm light shaft, drifting ground mist. The tiger emerges from it. HUD
  label updated LOGO → FOREST.
- **Enclosed venue.** `scenes/Space.tsx` cosmic bodies (gas giant, sun,
  satellite, ship traffic) are wrapped in `GatedCosmos` and hidden until
  `signals.progress > 0.19`, so they no longer float over the physical opening.
- **Defaults:** `lasers: false` (no neon fan), `atmosphere: true` (haze depth).

Verified locally at 800px and 1440px; production build passes (`npm run build`,
exit 0); no shader/console errors.

## Next actions (in priority order)

1. **Verify the PUBLIC hero** once Cloudflare finishes building `dcdf4aa`.
   Load the acceptance URL (not localhost), power on, screenshot at 1440/1920/
   2560/390. Compare to brief. (§54/§56/§57)
2. **LED forest legibility from the wide shot** — currently reads as a
   naturally-lit textured wall behind beams; it becomes prominent as the camera
   dives in. Optional: lift program-0 gain or thin the front beam wash.
3. **Star layers in the opening** — the near/deep `StarLayer`s still show faint
   dots over the venue. Consider dimming them for `progress < 0.19` too (only
   the cosmic bodies are gated so far).
4. **AV Lab** (`src/experience/scenes/Lab.tsx`, `app/av-lab`) — commit d7643b2
   already built an interactive control room; verify it reads well under the new
   palette. (§42-45)
5. **Other routes colour pass** — the DOM `--glow`/`--aqua` cyan (globals.css)
   was intentionally kept as the brand UI accent. Audit service/work/equipment
   pages for cyan *over-use* (glowing cards/borders) vs the natural 3D env. (§37)
6. **Mobile hero** (390px) and **ultrawide** (2560px) passes. (§46-48)
7. **Full QA:** typecheck, lint, Playwright route/CTA crawl, reduced-motion,
   keyboard. (§68)

## Guardrails (do not regress)

- No fabricated clients/metrics/testimonials/venues (content-truth is settled).
- Natural colours; cyan is a functional signal accent, not an environmental tint.
- Preserve the signature service interactives (anamorphic viewpoint, projection
  selector, live switcher, show-control cue stack, etc.). (§38)
- Zero dead buttons/links/controls.
