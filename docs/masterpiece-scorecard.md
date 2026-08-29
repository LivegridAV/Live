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
| Home (3D venue) | 8 | Mobile swipe-to-look landed (horizontal-dominant yaw, scroll-safe). Tiger stays a natural-coloured particle stand-in (locked until a real rigged GLB); 3D headline still DOM-parallax. |
| Services hub | 8.5 | Strong: icons + living hero visual + dark system. Could add per-card motion. |
| Service detail (×15) | 8 | Live per-service demos landed; some demos (network, web) can be richer; hero could go full-bleed. |
| Work hub | 8.5 | Per-project ambient card motion landed (LED shimmer / event beams / show-control scan / anamorphic depth, each tinted to its vibe, reduced-motion safe). Real footage still welcome. |
| Work / project detail | 7.5 | Animated signal-path diagram landed (content→media server→processor→output, adaptive per project's LED/projection/anamorphic + real spec). Still wants hero motion + real BTS media. |
| LED hub + types | 8 | Pixel-pitch tool + living hero + type pages. Floor LED needs a walk-on demo. |
| 3D / Anamorphic | 8.5 | Viewpoint slider landed (real bake→reproject geometry): solid object at the sweet spot, shears to flat LED off-axis. Could add a real rigged subject. |
| Projection | 8.5 | Look-selector landed: one neutral facade, four screen-blended projected looks (architectural edge-map / brand / geometric / cinematic scene). Natural colour on cinematic. |
| Show Control | 9 | Fire-a-cue stack landed: GO cuts each cue to the program output (intro/keynote/video/award/close), red on-air tally, done/next states. |
| Live Production | 8.5 | Switcher landed: load a camera to preview, TAKE to air (camera→switcher→program); neutral feeds + cyan LED graphics, real red on-air tally. Also on broadcast-streaming. |
| Virtual / Hybrid | 8.5 | Connect interaction landed: toggle remote studio / sister venue / online / broadcast onto the main-venue hub, flowing signal, "one show" readout. |
| Sound | 8 | Coverage stage landed: pick PA/sub/monitor/front/delay, see the zone on a neutral venue plan (cyan overlay only). |
| Lighting | 8 | Fixture-swap stage landed: beam/wash/profile/strobe/blinder/spot transform a neutral-steel stage; glow only on the emissive beam. |
| Equipment | 8.5 | Icon directory + living hero + a "down to the pixel" band featuring a custom in-house Blender LED-cabinet render (real pixel pitch, dark metal frame). |
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

## Blender → web pipeline (now live)
Blender MCP is connected and the pipeline is proven: a custom modular **LED cabinet**
was modelled procedurally, exported as `public/models/led-panel.glb` (125 KB, web-ready)
and rendered to `public/models/led-panel.webp` (136 KB), now featured on /equipment.
The **rigged tiger stays blocked** — no animal source (PolyHaven has none, Sketchfab
needs an API key, Hyper3D is disabled) and text-to-3D can't produce a rig-quality mesh.

## Biggest levers to reach 9+
1. Real rigged **tiger GLB** — still needs a licensed/authored model or Sketchfab/Hyper3D key; keeps the natural-coloured particle stand-in until then.
2. Interactive **Sound coverage** + **Lighting fixture-swap** stages (the two lowest scores).
3. **Work** cards as motion portals + project-detail hero motion.
4. True in-scene **3D extruded headline**.
5. Mobile swipe-to-look + dedicated mobile scene; perf profiling pass.
