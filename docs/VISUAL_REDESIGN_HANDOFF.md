# Visual Redesign — Handoff / Continuation

_Last updated: 2026-09-06. Reflects repository truth at packaging time._

## Repository truth
- Branch: `feat/multipage-site` (the accepted line of development; Cloudflare
  Pages auto-builds it to the acceptance preview on every push).
- HEAD: `9cd45cc` — `feat(hero): slow the tiger to a calmer, heavier prowl`.
- `main` is the production branch and is **stale** (~35 commits behind); the
  redesign has NOT been merged to it yet (held — see Known issues).
- Checkpoint tag `v1-rejected-checkpoint` = `68bb134` (the rejected v1 state,
  before the V2 rebuild).
- Acceptance preview: <https://feat-multipage-site.live-2st.pages.dev/>
- Production root: <https://live-2st.pages.dev/> (serves `main` — still the old
  site until the branch is merged).
- Deployed-commit proof: `/build-info.json` (commit/branch/builtAt).

## What the site is now (V2)
- `/` renders `V2Home` (`src/components/v2/V2Home.tsx`) inside `.v2root`
  (`src/app/v2.css`). Editorial 2D foundation + a physical anamorphic LED-corner
  hero (`src/components/v2/hero/*`) with a grounded tiger. Reads premium with or
  without WebGL. No power-on gate, no starfield, no rotating cards, no cyan wash.
- `/design-v2` is a noindex preview of the same `V2Home`.
- The previous immersive scroll venue was REMOVED as a route (was `/experience`)
  so no old nine-service homepage is reachable. Its components still exist under
  `src/experience/*` and `src/components/*` (classic) as unrendered code, kept
  for reference/reuse; recover the old home from tag `v1-rejected-checkpoint`.
- Authoritative service architecture lives in `src/content/services.ts`
  (AV & Visual / Live Production / Collaborative / Digital). Homepage grouping in
  `src/components/v2/data.ts`. `src/content/site.ts` holds STATS/PROCESS/PROJECTS
  (truthful; the old flat SERVICES list there is unused now).

## Hero mechanism (src/components/v2/hero/)
- `HeroStage` — WebGL guard + CSS-stage first paint / no-WebGL fallback.
- `HeroScene` — room, reflective floor, warm lighting, fixed sweet-spot camera.
- `AnamorphicCorner` — renders a virtual content scene from the sweet-spot camera
  into a texture, projective-maps it onto the two LED panels. TRUE anamorphic
  (proven at `/design-v2?atest=1` vs `&view=off`).
- `content.tsx` — forest backdrop + ground + grounded tiger; `forest.ts` /
  `anamorphic.ts` shaders; `motifs.tsx` per-service diagrams; `data.ts` services.

## Done (verified)
Unify (one architecture, old nine-service removed, no fabricated content/metrics,
`/experience` 404); global de-cyan; reduced-motion; responsive 390–2560 no
overflow; lint + build green; route crawl 21/21; anamorphic proof; contact shadow.

## Known issues / not done
1. **Tiger walk/stalk** — the model ships only a "Run" clip; current motion is a
   slowed foot-matched prowl, NOT a bespoke Blender walk with real root motion.
2. **Forest photoreal** — still the shader; a Blender-rendered loop is the target.
   Both (1) and (2) need Blender MCP reconnected (see AGENTS.md / toolchain doc;
   NB `read_factory_settings` inside Blender kills the MCP socket).
3. **`main` → production merge** — held until (1) and (2) pass the pre-merge QA.

## Guardrails (do not regress)
Natural material palette; cyan = signal/active/preview only; red = program/tally.
No rotating service cards; grouped architecture only. No fabricated
clients/metrics/venues. Grounded animal with contact shadow (no air-running).
2D must work without WebGL. Verify visual work in the rendered page, not source.
