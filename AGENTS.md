<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI web-development toolchain

This repo is developed with an integrated browser + docs + 3D MCP toolchain. See
[`docs/AI_WEB_DEVELOPMENT_TOOLCHAIN.md`](docs/AI_WEB_DEVELOPMENT_TOOLCHAIN.md) for the full setup.

- **Verify visual work in the rendered page — never from source alone.** After any substantial
  UI change, run the dev server, open the site, and inspect it with the in-app Browser,
  Playwright MCP, and Chrome DevTools MCP (console, network, DOM/CSS, responsive breakpoints).
  `npm run build` succeeding is **not** proof a UI change is correct.
- **Use Context7 before guessing version-sensitive APIs** (Next 16, React 19, Three.js, R3F,
  drei, GSAP, motion, Tailwind v4). Prefer it over recalling from memory.
- **Use shadcn / 21st (Magic) MCP as implementation accelerators, not the design authority.**
  Treat generated components as raw material and redesign them to the LivegridAV identity —
  never let them turn the site into a generic shadcn / SaaS / neon template.
- **Use Blender MCP for bespoke 3D assets** (stage/LED/truss/equipment objects, environments)
  exported as GLB/GLTF for React Three Fiber — instead of faking complex geometry with CSS.
- **Design direction:** sophisticated natural colour grading, rich blacks, cinematic (not
  constant-cyan) glow, believable materials and depth. Avoid oversaturated gradients, random
  bloom, generic glassmorphism, and AI-template looks.

# Start here
[README.md](README.md) has the repo map, routes, build pipeline, release steps and current state.
The workspace map (site + social automation + business listings) is `../README.md`; the social posting
pipeline is a separate project in `../social-automation` with its own AGENTS.md.

# Owner rules (non-negotiable)
- **Push, merge and deploy only with the owner's explicit OK** for that action. Never push `main` directly; work on a
  branch and open a PR. Merging to `main` deploys to livegridav.com (Cloudflare Pages).
- **Never commit `public/build-info.json`.** Every build rewrites it; it always shows as modified. Leave it out of commits.
- **No invented facts** in copy, JSON-LD or `llms.txt`: no made-up clients, events, years, office addresses, pixel pitches,
  inventory, screen sizes or prices. One address only (Delhi, from `Contact.txt` → `src/experience/contact.ts`).
  `src/content/seo.ts` says never to add other addresses; tests enforce some of this.
- **No hidden text or keyword stuffing.** Crawlable content must be real, visible (or properly accessible) HTML.
- **Free accounts only** for any service; nothing that brings sales calls.
- Don't send live test leads through the contact form, and don't claim enquiries are delivered (the lead webhook is off).
- Brand spelling is **livegridAV** (tests check it).

# Commands
```bash
npm ci                      # Node >= 22.18 (.nvmrc pins 24.22.1)
npm run dev                 # http://localhost:3000
npm run build               # next build → out/, then prepare-export + optimize-export (needed before tests)
npm test                    # 125 tests (release.test.mjs needs a fresh out/ from npm run build)
npm run typecheck && npm run lint
node scripts/serve-export.mjs   # serve out/ at http://127.0.0.1:4310 (launch config "export-preview")
```
`gh` works from Git Bash (not PowerShell). Merge PRs with `gh pr merge <n> --merge`.

# Release checklist (after the owner approves)
1. Branch → changes → `npm run build` → `npm test` (all pass) → check the rendered pages in a browser (desktop + phone width).
2. Commit without `public/build-info.json`, push the branch, open a PR, wait for the Cloudflare Pages check.
3. Merge only on the owner's OK. Poll `https://livegridav.com/build-info.json` until `shortCommit` is the merge commit.
4. Spot-check the live pages you changed, then `node scripts/indexnow.mjs` (pings IndexNow with the live sitemap).

# Gotchas
- Static export (`output: "export"`): no server code, no runtime env. `NEXT_PUBLIC_*` values are baked in at build time.
- `optimize-export.mjs` rewrites only `out/` (KTX2/WebP textures, meshopt GLBs, lite/lod1/phone variants, load manifest)
  and fails on Cloudflare limits (file > 25 MiB, > 20,000 files). Never edit source assets in `public/` to "optimise" them.
- The real footer is `ShellFooter` in `src/components/site/PageShell.tsx`. `src/components/SiteFooter.tsx` and most of
  `src/experience/` (old scroll experience) are unused. Only `src/experience/contact.ts` is live.
- Social accounts are one list, `SOCIAL` in `src/experience/contact.ts`; it feeds the footer, contact page, venue contact
  panel, home page, JSON-LD `sameAs` and `/llms.txt`. Only add verified profiles (YouTube when it exists).
- Venue debug flags: `?diag` (phone report), `?perf`, `?phone=1|0`. See README.
