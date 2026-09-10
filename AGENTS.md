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
