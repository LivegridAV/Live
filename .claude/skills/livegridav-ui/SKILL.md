---
name: livegridav-ui
description: >
  The LivegridAV brand + UI/UX design system for this Next.js site (Tailwind v4,
  Framer Motion). Use this whenever building, editing, or reviewing ANY page,
  section, or component of the livegridav-site — landing pages, hero sections,
  cards, buttons, navigation, forms, animations, or layout work. It defines the
  colors, typography, spacing, motion language, and component patterns that keep
  everything on-brand. Consult it even when the request doesn't say "brand" or
  "design" — e.g. "add a contact section", "make a pricing page", "animate the
  hero", "build the footer" all need it. The signature element is the 5×5 signal
  grid; reach for it before inventing new visual motifs.
---

# LivegridAV UI/UX System

LivegridAV designs and installs **interactive LED displays and video walls**. The
brand idea is a *signal coming to life* — a dark room, then a grid of light rising
like a video wall powering on. Every design decision should feel like precise,
glowing, engineered light on a calm dark (or quiet light) canvas. Restraint +
one moment of glow beats visual noise.

## The core motif: the 5×5 signal grid

The logo is a 5×5 LED matrix where columns rise like signal bars. This is the
single most important visual asset — use it, don't replace it.

- Column heights (bottom-up), left→right: `[2, 4, 3, 5, 4]`. A cell at `row` (0=top)
  is **lit** when `(5 - row) <= heights[col]`.
- Lit cells glow (`box-shadow`); unlit cells are a dim version of the surface.
- When it animates, cells "pop" in a diagonal sweep from the bottom-left.

Ready-to-paste React/Framer-Motion component lives in
`references/signal-grid.md` — read it before hand-rolling a grid. Prefer that
component for logos, loaders, section accents, and empty states.

## Color

Tokens are already wired into Tailwind v4 (`globals.css` `@theme`). Use the token
classes (`bg-ink`, `text-aqua`, `border-line`…), not raw hex, so themes stay
consistent.

| Token | Hex | Role |
|---|---|---|
| `paper` | `#ECEEED` | Light surface / default background |
| `ink` | `#13201E` | Dark surface, footers, hero panels |
| `ink-soft` | `#22332F` | Unlit grid cells / dividers on dark |
| `aqua` | `#1FA093` | **Primary accent** — CTAs, links, the "AV" |
| `glow` | `#3FD6C8` | Brighter accent for glow/hover/on-dark accents |
| `text` | `#161B1A` | Body text on light |
| `text-inv` | `#F4F6F5` | Body text on dark |
| `muted` | `#525A58` | Secondary text |
| `faint` | `#8A918F` | Eyebrows, captions, mono labels |
| `line` | `#DCDFDE` | Hairline borders on light |

Rules of thumb:
- **Accent is precious.** `aqua`/`glow` carry meaning (action, "on", brand). Don't
  flood surfaces with it — one glowing element per viewport reads as premium.
- On **dark** surfaces the accent shifts to `glow` (`#3FD6C8`); on **light** it's
  `aqua` (`#1FA093`). The wordmark's "AV" always takes the surface's accent.
- Glow = `box-shadow: 0 0 <blur>px <accent>`, blur ≈ 20–26% of the element size.
  It's a lighting effect, never a drop shadow for depth.

## Typography

- **Sans / everything:** Space Grotesk (`font-sans`), already loaded via `next/font`.
  Headings use weight **600**, tight tracking (`-0.02em` to `-0.03em`).
- **Mono / labels:** Space Mono (`font-mono`) for eyebrows, captions, code-like
  tags, spec numbers — uppercase, wide tracking (`0.12em`–`0.3em`), small (11–13px),
  color `faint`. This "instrumentation" voice is a signature; use it for section
  eyebrows like `SIGNAL GRID` or `INTERACTIVE LED`.
- **Wordmark:** always lowercase `livegrid` + accent-colored `AV`, no space:
  `livegrid<span class="text-aqua">AV</span>`. Never capitalize "Livegrid" in the
  logo lockup.
- Body copy: `text`/`muted`, 15–17px, line-height ~1.6, measure ≤ 65ch.

Type scale (fluid is fine): hero 48–72, h2 32–40, h3 22–28, body 16, small 13,
mono-label 11–12.

## Layout & spacing

- Content max-width **1180px**, centered, generous side padding (48px desktop,
  24px mobile). Let sections breathe — vertical rhythm 80–120px between sections.
- **Radius:** cards/panels `20px`, inputs/buttons `12–14px`, grid cells scale with
  size (`~12%` of cell). Corners are soft but not pill unless it's a small chip.
- Cards: `bg-paper`/white on light with `border border-line`; on dark use `bg-ink`
  with no border (let the surface separate). 8-pt spacing grid.
- Prefer CSS grid/flex; keep gaps consistent (multiples of 4).

## Motion (Framer Motion — `motion`)

Motion should feel like signal/light: quick attack, calm settle, purposeful. Import
from `motion/react` (this project uses the `motion` package, not `framer-motion`).

Defaults:
- **Reveal on scroll:** fade + 16px rise, `duration: 0.5`, `ease: [0.22, 1, 0.36, 1]`
  (a soft ease-out), trigger once at ~20% in view. Stagger children by `0.06–0.13s`.
- **The signal sweep:** the grid's own `lgPop` keyframe (in `globals.css`) or the
  Framer variant in the reference — diagonal delay `order * 0.13s`, `order = col + (4-row)`.
- **Hover:** subtle — scale `1.02`, or intensify glow. `duration: 0.2`.
- **Respect `prefers-reduced-motion`:** gate non-essential motion; keep content
  visible without it. Never trap meaning in animation alone.

Don't over-animate. One choreographed hero moment + quiet scroll reveals is the
whole vocabulary. Parallax zoos and bouncy springs are off-brand.

## Component patterns

**Buttons**
- Primary: `bg-aqua text-white` (on light) / `bg-glow text-ink` (on dark), radius
  `12–14`, medium weight, comfortable padding (`px-6 py-3`), hover intensifies
  (slightly brighter + faint glow). 
- Secondary: transparent with `border border-line` (light) / `border-ink-soft`
  (dark), text in surface accent.
- One primary action per view; everything else is secondary/ghost.

**Section eyebrow** — mono, uppercase, tracked, `text-faint`, sits above the h2:
```tsx
<p className="font-mono text-xs uppercase tracking-[0.18em] text-aqua">Signal Grid</p>
```

**Cards** — rounded `20px`, hairline border on light, hover lifts with a faint glow
rather than a heavy shadow.

**Dark hero / inverse sections** — `bg-ink`, `text-text-inv`, accent `glow`, the
signal grid glowing beside the headline. This is the strongest brand moment; earn
it, don't repeat it every section.

## Voice & copy

Confident, technical, a little poetic about light. Short. Nouns that evoke signal,
grid, light, live, wall, canvas. Examples that fit: "Video walls that come to life",
"Every wall is a canvas", "Interactive LED, engineered". Avoid generic agency
filler ("we deliver solutions").

## Working checklist (read before shipping a page)

1. Is there exactly one primary CTA and one glow moment in view?
2. Are colors from tokens (no stray hex), accent used sparingly?
3. Headings Space Grotesk 600 tight-tracked; labels Space Mono uppercase?
4. Signal grid used where a brand accent is wanted (not a random icon)?
5. Scroll reveals subtle + `prefers-reduced-motion` handled?
6. Layout within 1180px, consistent radii/spacing, responsive at 375 / 768 / 1280?
7. Contrast AA (esp. `faint`/`muted` on their surfaces)?

## Files in this skill
- `references/signal-grid.md` — the reusable animated `SignalGrid` React component
  and usage notes. Read it whenever you need the mark, a loader, or a grid accent.
