# livegridav.com

The website of **livegridAV**, an event AV company based in Delhi and working across India: LED screens, naked-eye 3D /
anamorphic content, projection mapping, show control, live production, broadcast and virtual events.

The homepage is a scroll-driven **3D walkthrough of an event venue** (React Three Fiber). Every page also ships as real,
crawlable HTML, so search engines, screen readers and devices without WebGL get the full content.

- Coding agents: read [AGENTS.md](AGENTS.md) first (owner rules, commands, release checklist).
- Workspace map (site, social automation, business listings): `../README.md`.
- Social posting pipeline (n8n + Telegram → Facebook/Instagram): `../social-automation`.

## Stack
Next 16.2.9 (App Router, `output: "export"`) · React 19.2.4 · three 0.185 · @react-three/fiber 9 · drei 10 · zustand 5 ·
Tailwind CSS 4 · GSAP, Lenis, motion · TypeScript 5. Node ≥ 22.18 (`.nvmrc`: 24.22.1).
Hosting: **Cloudflare Pages** (project "live", custom domain livegridav.com), built from `main` in the Cloudflare dashboard.
Repo: https://github.com/LivegridAV/Live

## Commands
| Command | Does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | `next build` (static export to `out/`, stamps `public/build-info.json`) → `prepare-export.mjs` → `optimize-export.mjs` |
| `npm test` | 125 Node tests: `scripts/release.test.mjs` (56, reads `out/`, so build first) + `scripts/venue-loading.test.mjs` (69) |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / eslint |
| `node scripts/serve-export.mjs` | Serve `out/` at http://127.0.0.1:4310 (no-store) |
| `node scripts/indexnow.mjs` | After a release is live: ping IndexNow with the live sitemap |
| `npm run measure`, `npm run compare-shots` | Venue performance and screenshot comparison tools |

`.claude/launch.json` defines `dev` (3000), `export-preview` (4310) and `static-export` (4321) for preview tools.

## Build pipeline
1. **`next build`**: static export to `out/`. `next.config.ts` runs `scripts/gen-build-info.mjs` in production, writing
   `public/build-info.json` (`commit`, `shortCommit`, `branch`, `builtAt`, from `CF_PAGES_*` or git). Never commit it.
2. **`scripts/prepare-export.mjs`**: Windows-only fix-up of nested `__next.*` segment files (no-op on Linux).
3. **`scripts/optimize-export.mjs`** (only touches `out/`): prunes unreferenced heavy assets, swaps in KTX2 textures from
   `assets-cache/ktx2/` (filled locally by `npm run encode:ktx2`), WebP for the rest, meshopt on every GLB, shared textures
   in `out/textures/`, `.lite.glb` / `.lod1.glb` / phone variants and `.phone.webp`, writes `out/models/load-manifest.json`.
   Fails if any file > 25 MiB or > 20,000 files (Cloudflare Pages limits).

Cache headers for Pages live in `public/_headers`. `public/0033b5394fd2b9a05838137372c0a8f2.txt` is the IndexNow key.

## Repo map
| Path | What |
|---|---|
| `src/app/` | Routes (below), `layout.tsx`, `globals.css`, `liquid-glass.css`, `venue.css` (venue overlays), OG/Twitter images, `robots.txt` |
| `src/content/` | Typed content: `services.ts`, `work.ts` (from `site.ts` PROJECTS), `led.ts`, `insights.ts`, `cities.ts`, `equipment.ts`, `site.ts` (COMPANY, STATS), `seo.ts` (business record) |
| `src/experience/contact.ts` | CONTACT (email, phone, WhatsApp, address; source of truth `Contact.txt`), `SOCIAL`, lead-webhook flags. The rest of `src/experience/` is an older unused scroll experience. |
| `src/components/site/` | Page building blocks: `PageShell.tsx` (nav + `ShellFooter`), detail views, `ContactBrief`, AV Lab, interactive demos |
| `src/components/` | Shared bits: `SocialLinks.tsx`, `Reveal`, `SignalGrid`, `LiquidGlassLight` (several others are unused leftovers) |
| `src/venue/` | The 3D homepage: `VenueMount` → `Venue` → `Scene`; `data/` (zones, pavilions, path, placements, media), `loading/` (groups, streamer, planner, lite mode), `systems/` (zustand store, scroll/camera rigs, quality), `three/` (materials, shaders, texture loading), `ui/` (loader, nav, HUD, pavilion panel, contact panel, diagnostics), `zones/` |
| `public/` | `models/` (GLBs), `media/` (versioned textures/video), `basis/` (KTX2 transcoder), `brand/`, `_headers` |
| `scripts/` | Build (`prepare-export`, `optimize-export`, `gen-build-info`, KTX2), tests, verification and measurement (`verify-*`, `measure-*`, `walk-mobile`, `smoke-http`), `blender/` asset scripts, `indexnow.mjs` |
| `docs/` | History and specs: production readiness (24 Sep), walkthrough performance, tunnel/expo rebuild notes, `superpowers/specs` + `plans` (venue speed, premium stall signage, search across India), MCP toolchain |
| `.claude/skills/livegridav-ui/` | Brand design-system notes |

## Routes
| Route | Data |
|---|---|
| `/` | 3D venue + crawlable sections (services, LED types, zones, contact) + JSON-LD `@graph` (Organization, WebSite, services ItemList) |
| `/services`, `/services/[slug]` | `content/services.ts` |
| `/work`, `/work/[project]` | `content/work.ts` |
| `/led`, `/led/[type]` | `content/led.ts` |
| `/insights`, `/insights/[article]` | `content/insights.ts` |
| `/locations/[city]` | `content/cities.ts`: Delhi, Mumbai, Hyderabad, Bengaluru, Kolkata (no index page) |
| `/about`, `/contact`, `/equipment`, `/av-lab` | Static pages |
| `/entrance-review` | Internal 3D inspection page, noindex, not in sitemap |
| `/llms.txt`, `/sitemap.xml`, `/robots.txt` | Generated (force-static) / static |

Dynamic routes use `generateStaticParams` with `dynamicParams = false`.

## Business data, SEO and social
- `src/content/seo.ts`: `SITE`, `ORGANIZATION` (Organization + ProfessionalService, `@id` `https://livegridav.com/#org`,
  one Delhi address, `areaServed` India + 5 cities with Wikidata IDs, `sameAs` from `SOCIAL`), `PROVIDER`, `AREA_SERVED`.
- JSON-LD appears on home, about, contact, services, work, LED, insights and city pages.
- **Social accounts** (`SOCIAL` in `src/experience/contact.ts`): Instagram @livegridav, Facebook /livegridav. Rendered by
  `src/components/SocialLinks.tsx` (links use `rel="noopener noreferrer me"`) in the footer of every page, the contact
  page "Follow" row and the venue contact panel; listed on the home page, in `sameAs` and in `/llms.txt`. Release tests
  check all of these. Add YouTube to `SOCIAL` (one line) once the channel exists.
- `robots.txt` allows all crawlers (Content-Signal search/ai-input/ai-train yes). IndexNow runs after each release.

## The 3D venue
- `VenueMount` loads `Venue` client-side only (placeholder while loading). `Venue` checks WebGL, sets up the Canvas (ACES,
  exposure 1.15, no shadows on phones) and overlays; `Scene` mounts zones and streaming.
- State: `useVenue` (zustand, `src/venue/systems/store.ts`): scroll progress, zone, loaded/warm/lite groups, open pavilion,
  stage mode (corporate/festival), quality tier, phone flags.
- Zones (`data/zones.ts`): arrival, tunnel, hall, gallery, reception, led-rental, gallery-finish, technical, boulevard,
  approach, arena, stage, finale, contact.
- Loading: journey-ordered groups (`loading/groups.json`) streamed with retries; a bandwidth-based opening planner; light
  packs shown until full groups are warm; phone/lod1 variants from the load manifest; one shared KTX2 loader with WebP fallback.
- URL flags: `?diag` on-screen phone report · `?perf` render metrics · `?phone=1|0` force phone mode · review/capture flags
  (`?opening=`, `?inspect=placement`, `?capture=1`, `?record=1`, `?shot=`, `?view=`, `?camera=`).

## Current state (27 Nov 2026)
- Live build: merge of PR #14 (Instagram and Facebook links), `286f15e`.
- Recent work (PRs #8–#14): Delhi LED-rental SEO (and removal of a false LED-floor claim), phone performance (lighter
  phone pack, rotate gate, no reflections/shadow maps, pixel-ratio cap), the `?diag` report, social links.
- Open: the owner's phone slowness. Waiting for a `livegridav.com/?diag` screenshot and phone model from the owner.
- Contact form: the n8n lead webhook (`n8n.livegridav.com`) is offline (Cloudflare 530) and disabled
  (`NEXT_PUBLIC_LEAD_WEBHOOK_ENABLED` unset), so the form prepares an email/WhatsApp draft instead. Re-enabling needs a
  working endpoint with CORS for livegridav.com, and is a separate task.

## Environment variables (build time)
`NEXT_PUBLIC_LEAD_WEBHOOK_URL`, `NEXT_PUBLIC_LEAD_WEBHOOK_ENABLED` (only `"true"` enables), `CF_PAGES_COMMIT_SHA`,
`CF_PAGES_BRANCH` (set by Cloudflare). No secrets belong in this repo.
