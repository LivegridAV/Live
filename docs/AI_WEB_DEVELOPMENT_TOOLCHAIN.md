# AI Web-Development Toolchain

This repository is developed with an integrated, AI-assisted browser + documentation + 3D
toolchain. Claude Code drives these MCP servers directly during development sessions to
build, inspect, debug, test and visually verify the LivegridAV site.

> **Scope note:** The MCP servers below are configured at **user scope** on the developer's
> machine (in `~/.claude.json`), *not* committed to this repo. This document describes the
> setup so it can be reproduced on any machine. Only two files in the repo relate to this
> toolchain: `.claude/launch.json` (browser-preview dev-server config) and the
> `/.playwright-mcp/` entry in `.gitignore`.

---

## 1. Overview

| Tool                | Purpose                                              | Status |
| ------------------- | ---------------------------------------------------- | ------ |
| Playwright MCP      | Navigation, interaction, responsive & E2E testing    | ✅ Ready |
| Chrome DevTools MCP | DOM/CSS, console, network, performance diagnostics   | ✅ Ready |
| In-app Browser      | Rapid visual dev loop / dev-server preview            | ✅ Ready |
| Context7 MCP        | Current, version-accurate library/framework docs      | ✅ Ready |
| shadcn MCP          | Component-registry search / UI acceleration (free)    | ✅ Ready |
| 21st / Magic MCP    | Premium UI component generation (21st.dev)             | ⏳ Needs API key |
| Blender MCP         | Bespoke 3D asset creation → GLB/GLTF pipeline          | ⏳ Needs in-Blender addon |

---

## 2. MCP servers

Each server is registered in Claude Code's user config. Reproduce with the `claude mcp add`
commands shown.

### Playwright MCP
- **Implementation:** `@playwright/mcp` (official, Microsoft) — `npx -y @playwright/mcp@latest`
- **Install:** `claude mcp add --scope user playwright -- npx -y @playwright/mcp@latest`
- **Use for:** navigation, clicking/typing, form flows, `browser_snapshot` (a11y tree),
  `browser_take_screenshot`, `browser_resize` (responsive breakpoints), `browser_console_messages`.
- **Verified:** navigated `example.com` + local site, captured snapshot, read console
  (0 errors / 2 benign `THREE.Clock` deprecation warnings), resized to 375×812 and 1440×900,
  captured a full-page screenshot.
- **Notes:** Launches its own Chromium. Firefox/WebKit binaries are *not* installed to save
  disk; add them only if cross-browser testing is needed (`npx playwright install firefox webkit`).

### Chrome DevTools MCP
- **Implementation:** `chrome-devtools-mcp` (official, Google Chrome team) — `npx -y chrome-devtools-mcp@latest`
- **Install:** `claude mcp add --scope user chrome-devtools -- npx -y chrome-devtools-mcp@latest`
- **Use for:** `list_pages` / `new_page`, `navigate_page`, `take_snapshot` (DOM a11y tree),
  `list_console_messages`, `list_network_requests`, `performance_start_trace`, `lighthouse_audit`,
  `emulate` (CPU/network throttling, device).
- **Verified:** opened the site in its own Chrome, captured 30 network requests (200/304),
  read console, produced a full DOM snapshot (hero → 9 services → contact form → footer).
- **Security:** launches a locally-controlled Chrome over CDP on `127.0.0.1` only. Do **not**
  expose the debugging port to a network interface.
- **Gotcha:** `pageId` is the number shown by `list_pages` (1-based in output). The first
  tab is usually `about:blank`; target the site's tab id explicitly.

### In-app Browser (Browser Preview)
- **Implementation:** Claude Code's built-in Browser pane + `.claude/launch.json`.
- **Config:** `.claude/launch.json` defines a `dev` server (`next dev`, port 3000, `autoPort`)
  and a `static-export` server (serves `out/` on 4321).
- **Use for:** starting the dev server (`preview_start {name:"dev"}`) and the fast
  implement → reload → inspect loop during UI work.
- **Verified:** started `next dev` (auto-fell-back to a free port when 3000 was busy) and
  opened the site tab.
- **Note:** In-app screenshots require the Browser pane to be *visible* in the client; when it
  isn't, use Playwright/Chrome DevTools MCP for headless screenshots.

### Context7 MCP
- **Implementation:** `@upstash/context7-mcp` (official, Upstash) v4.x — `npx -y @upstash/context7-mcp`
- **Install:** `claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp`
- **API key:** optional. Works on the free tier without one; for higher limits set
  `CONTEXT7_API_KEY` (from context7.com) via `-e CONTEXT7_API_KEY=...`.
- **Use for:** `resolve-library-id` then `query-docs` — current, version-accurate docs for
  React 19, Next.js 16, Three.js, R3F, drei, GSAP, motion, Tailwind v4, TypeScript, etc.
- **Verified:** resolved "React Three Fiber" → `/pmndrs/react-three-fiber` and retrieved live
  `useFrame` documentation.

### shadcn MCP
- **Implementation:** `shadcn` CLI MCP (official) — `npx -y shadcn@latest mcp`
- **Use for:** searching component registries and pulling component source as raw material.
  This is the **free, key-less UI-acceleration path** and already covers most "Magic MCP" needs.

### 21st / Magic MCP  ⏳ *(external blocker: API key)*
- **Current official implementation:** the **21st MCP**, configured by `@21st-dev/cli`
  (`npx @21st-dev/cli@latest init --client claude`). The old `@21st-dev/magic` package is now a
  deprecated compatibility proxy — do not use it for new setups.
- **Transport:** HTTP endpoint `https://21st.dev/api/mcp` with an `x-api-key` header.
- **Registered as** (key supplied via env var, not hard-coded):
  ```
  claude mcp add --scope user --transport http 21st https://21st.dev/api/mcp \
    --header "x-api-key: ${API_KEY_21ST}"
  ```
- **To activate:** create a key at <https://21st.dev/settings/api-keys> (free daily quota
  available after `21st login`), then set the `API_KEY_21ST` environment variable so Claude
  Code expands it at connect time. Until then the server is registered but will not connect.
- **Use for:** premium React component generation as *raw material* — always redesign to the
  LivegridAV identity (see design guardrail in `AGENTS.md`).

### Blender MCP  ⏳ *(external blocker: in-Blender addon activation)*
- **Implementation:** `blender-mcp` (PyPI, by Siddharth Ahuja / `ahujasid`) v1.8.x — `uvx blender-mcp`
- **Install:** `claude mcp add --scope user blender -- uvx blender-mcp`
- **Blender:** v5.2.1.0 is installed (MSIX/Store package; launcher at
  `%LOCALAPPDATA%\Microsoft\WindowsApps\blender-launcher.exe`).
- **Verified:** the MCP server connects and responds to tool calls (`get_scene_info` returned a
  structured "Could not connect to Blender — make sure the addon is running" error, proving the
  MCP layer works). Live 3D operations require the in-Blender socket addon.
- **To activate the addon:**
  1. Open Blender.
  2. `Edit ▸ Preferences ▸ Add-ons ▸ Install from Disk…` and select
     `C:\Users\<you>\blender-mcp-addon.py` (a stable copy of the bundled
     `blender_mcp/bundled/addon.py`).
  3. Enable **Interface: Blender MCP**.
  4. In the 3D viewport press **N** → open the **BlenderMCP** tab → click **Connect to MCP server**.
     The addon opens a socket on `localhost:9876` that `blender-mcp` bridges to.
  5. Re-run any Blender MCP tool to confirm it now reaches the scene.
- **MSIX caveat:** Store-packaged Blender is sandboxed. If the addon cannot bind the socket or
  install cleanly, install the standard (non-MSIX) Blender build from blender.org and repeat.
- **Pipeline:** Blender → export **GLB/GLTF** → load via `@react-three/drei` `useGLTF` in R3F.

---

## 3. How Claude uses them together

```
IMPLEMENT ─▶ RUN SITE (preview_start dev) ─▶ OPEN SITE (in-app browser)
   ▲                                                │
   │                                                ▼
  FIX ◀─ DEVTOOLS INSPECTION (Chrome DevTools MCP)  VISUAL INSPECTION (screenshot)
   ▲            console · network · DOM/CSS          │
   │                                                 ▼
   └──── RETEST ◀─ RESPONSIVE + INTERACTION TEST (Playwright MCP: resize, click, form)
```

- **Context7** — before using any version-sensitive framework/library API (Next 16, React 19,
  R3F 9, Three 0.185, drei 10, GSAP, motion, Tailwind v4).
- **shadcn / 21st** — implementation accelerators for UI, never the design authority.
- **Playwright MCP** — navigation, interaction, responsive & E2E validation, screenshots.
- **Chrome DevTools MCP** — DOM/CSS, console errors, network, performance, Lighthouse.
- **In-app Browser** — the fast inner visual loop.
- **Blender MCP** — bespoke 3D assets exported as GLB/GLTF for the R3F experience.

## 4. Responsive breakpoints to test
`375×812 · 390×844 · 768×1024 · 1024×768 · 1366×768 · 1440×900 · 1920×1080 · 2560×1440`
(via `browser_resize` in Playwright MCP or `resize_page`/`emulate` in Chrome DevTools MCP).

## 5. Verification commands
```bash
claude mcp list          # health-check every registered server
```
A package appearing in `npm list` is **not** verification — an actual MCP tool call must succeed.

## 6. Known limitations / blockers
- **21st/Magic:** needs `API_KEY_21ST` (create at 21st.dev/settings/api-keys). shadcn MCP covers
  UI acceleration in the meantime.
- **Blender MCP:** needs the addon enabled + "Connect" clicked inside a running Blender (GUI step).
  MSIX/Store Blender may require switching to the blender.org build.
- **In-app screenshots:** require the Browser pane to be visible; otherwise use Playwright/Chrome
  DevTools MCP.
- **No secrets in this file or in the repo.** API keys live only in environment variables.
