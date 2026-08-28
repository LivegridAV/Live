# LiveGridAV — Masterpiece Scorecard

Honest, self-assessed state of each surface against the masterpiece directive.
Scale 0–10. Anything **< 8** is a revision target; major pages target **9+**;
homepage target **9.5+**. Updated as passes land — not aspirational scores.

Legend for the compact table: **FI** first impression · **Ref** reference
fidelity · **Nat** natural visual realism · **ID** LiveGridAV identity ·
**3D** depth · **Mo** motion · **Ix** interaction · **AV** AV credibility ·
**Info** clarity · **Perf** performance · **Mob** mobile · **A11y** accessibility ·
**SEO** · **Pol** polish.

## Surfaces

| Page | Overall | Top gaps to close |
|---|---|---|
| Home (3D venue) | 7.5 | Tiger is a procedural particle stand-in (needs a real rigged GLB); 3D headline is DOM-parallax, not extruded in-scene; no mobile swipe-to-look. |
| Services hub | 8.5 | Strong: icons + living hero visual + dark system. Could add per-card motion. |
| Service detail (×15) | 8 | Live per-service demos landed; some demos (network, web) can be richer; hero could go full-bleed. |
| Work hub | 7.5 | Vibe-tinted tiles + living hero. Cards need real muted-video/motion previews (currently gradient + drift). |
| Work / project detail | 6.5 | Honest case-study data only; needs hero motion + animated system diagram + BTS. |
| LED hub + types | 8 | Pixel-pitch tool + living hero + type pages. Floor LED needs a walk-on demo. |
| 3D / Anamorphic | 8.5 | Viewpoint slider landed (real bake→reproject geometry): solid object at the sweet spot, shears to flat LED off-axis. Could add a real rigged subject. |
| Projection | 8.5 | Look-selector landed: one neutral facade, four screen-blended projected looks (architectural edge-map / brand / geometric / cinematic scene). Natural colour on cinematic. |
| Show Control | 8 | Console demo (PVW/PGM + cues) reads well; could let the visitor fire a cue. |
| Live Production | 7.5 | Console demo; wants camera→switcher→program follow-through. |
| Virtual / Hybrid | 7 | Network demo; wants the venue↔remote↔online connect interaction. |
| Sound | 6.5 | Meters demo; needs the hover-coverage interactive stage (PA/sub/monitor zones). |
| Lighting | 6.5 | Beam demo; needs the fixture-swap interactive stage (beam/wash/profile transform). |
| Equipment | 8 | Icon directory + living hero; solid and clear. |
| AV Lab | 7.5 | Interactive signal-path explorer works; wants a 3D control-room + camera moves. |
| Contact | 8.5 | Guided brief, real submit + WhatsApp, dark, clear. Effortless. |
| Insights (+articles) | 8 | Clean, crawlable, internally linked. |
| 404 | 8 | Branded, on-system. |

## Locked business rules (must never regress)
- Show Control = one combined service (VJ + Watchout + Resolume + media-server + AV-console).
- Video tech named only where relevant: PixelHue, NovaStar, Magnimaze, Blackmagic. **No Barco.**
- Unreal Engine = content creation / real-time visual production only, never rental gear.
- Sound & Lighting: **no manufacturer brands**; positioned as coordinated partners.
- LED: no unsupported fine-pitch indoor rental claim; specs "confirmed after review".
- No misleading ownership/inventory language.

## Natural-colour QA (immutable — brief §11/§12/§57)
- [x] Anamorphic subject is orange/black/white **fur palette**, normal-blended (not additive/neon).
- [x] Only a faint cyan **rim** on the subject represents LED environment spill.
- [ ] Physical materials elsewhere (stage steel, consoles, stone) reviewed for natural PBR — pending.
- [ ] Bloom restricted to genuine light sources (LED, lasers, lamps, emissive UI) — audit pending.

## Toolchain status (this environment)
- **Live & verified:** in-app Browser, Playwright MCP, Chrome DevTools MCP, Context7 MCP
  (doc lookups working), shadcn MCP, 21st MCP (API key set, connected), `ui-ux-pro-max` +
  `livegridav-ui` skills. Full setup in `docs/AI_WEB_DEVELOPMENT_TOOLCHAIN.md`.
- **Configured, needs the app open:** Blender MCP connects, but 3D-asset work needs Blender
  running with the addon (port 9876) — and rigged/animated assets still need a real pipeline,
  not text-to-3D. Addon at `C:\Users\<user>\blender-mcp-addon.py`.
- **Present but unused here:** unrealMCP.

## Biggest levers to reach 9+
1. Real rigged **tiger GLB** (Blender/asset pipeline) → replaces the procedural stand-in on Home + Anamorphic.
2. Interactive **Sound coverage** + **Lighting fixture-swap** stages (the two lowest scores).
3. **Work** cards as motion portals + project-detail hero motion.
4. True in-scene **3D extruded headline**.
5. Mobile swipe-to-look + dedicated mobile scene; perf profiling pass.
