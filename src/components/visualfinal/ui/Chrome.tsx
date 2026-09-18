"use client";
import { useState } from "react";
import Link from "next/link";
import { useWorld, WORLDS } from "../store";

const LEFT_NAV = ["Home", "Services", "Work", "About", "Contact"];

// Hotspots for World 01 (brief interaction: CLICK reveal hotspots)
const HOTSPOTS = [
  { label: "Anamorphic Content", text: "Naked-eye 3D that breaks the LED plane.", href: "/services/3d-anamorphic", style: { left: "44%", top: "50%" } },
  { label: "LED Stage Solutions", text: "Large-format LED walls, corners and floors.", href: "/services/led-display-rental", style: { left: "20%", top: "72%" } },
  { label: "Live Production", text: "Show control, media servers and switching.", href: "/services/live-production", style: { left: "70%", top: "44%" } },
  { label: "3D / Immersive Content", text: "360° environments and installations.", href: "/services/immersive-experiences", style: { left: "62%", top: "74%" } },
] as const;

export default function Chrome() {
  const world = useWorld((s) => s.world);
  const setWorld = useWorld((s) => s.setWorld);
  const next = useWorld((s) => s.next);
  const prev = useWorld((s) => s.prev);
  const explore = useWorld((s) => s.explore);
  const setExplore = useWorld((s) => s.setExplore);
  const muted = useWorld((s) => s.muted);
  const setMuted = useWorld((s) => s.setMuted);
  const cycleMood = useWorld((s) => s.cycleMood);
  const hotspot = useWorld((s) => s.hotspot);
  const setHotspot = useWorld((s) => s.setHotspot);
  const w = WORLDS[world];
  const [fs, setFs] = useState(false);

  const toggleFs = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) { el.requestFullscreen?.().then(() => setFs(true)).catch(() => {}); }
    else { document.exitFullscreen?.().then(() => setFs(false)).catch(() => {}); }
  };

  return (
    <div className="vf-ui">
      {/* top bar */}
      <header className="vf-top">
        <Link href="/" className="vf-logo" aria-label="livegridAV home">
          <span>LIVEGRID<span className="vf-accent">AV</span></span>
          <em>IDEAS · CONTENT · EXPERIENCES</em>
        </Link>
        <div className="vf-centertitle">
          <h2>{w.title.toUpperCase()}</h2>
          <p>WE TURN IDEAS INTO UNFORGETTABLE EXPERIENCES</p>
        </div>
        <div className="vf-topright">
          <div className="vf-exp">
            <span>WEBSITE HERO EXPERIENCE <strong>{w.index} / 0{WORLDS.length}</strong></span>
            <em>INTERACTIVE. IMMERSIVE. REAL-TIME.</em>
          </div>
          <Link href="/contact" className="vf-cta-pill">START A PROJECT</Link>
        </div>
      </header>

      {/* hotspots (World 01) */}
      {world === 0 && (
        <div className="vf-hotspots">
          {HOTSPOTS.map((h, i) => (
            <button key={h.label} className={`vf-hotspot ${hotspot === i ? "is-open" : ""}`} style={h.style}
              aria-label={`Hotspot: ${h.label}`} onClick={() => setHotspot(hotspot === i ? null : i)}>
              <span className="vf-hotspot-dot">+</span>
              {hotspot === i && (
                <span className="vf-hotspot-card" role="dialog">
                  <strong>{h.label}</strong><span>{h.text}</span>
                  <Link href={h.href}>Explore →</Link>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* left world index */}
      <nav className="vf-left" aria-label="Worlds">
        {WORLDS.map((wd, i) => (
          <button key={wd.id} className={`vf-left-item ${i === world ? "is-active" : ""}`} onClick={() => setWorld(i)}>
            <span className="vf-num">{wd.index}</span> <span>{LEFT_NAV[i]}</span>
          </button>
        ))}
      </nav>

      {/* right capability rail */}
      <ul className="vf-right" aria-label="Capabilities">
        {w.tags.map((t) => (
          <li key={t}><span className="vf-dot" />{t}</li>
        ))}
      </ul>

      {/* hero copy */}
      <div className="vf-hero" key={w.id}>
        <h1 className="vf-hero-title">
          {w.heroLines.map((l, i) => (
            <span key={i} className={i === w.heroLines.length - 1 ? "vf-accent-text" : ""}>{l}<br /></span>
          ))}
        </h1>
        <Link href="/contact" className="vf-cta"> {w.cta} <span aria-hidden>→</span></Link>
      </div>

      {/* bottom bar */}
      <footer className="vf-bottom">
        <div className="vf-scene-label">
          <strong>{w.index}</strong>
          <span>{w.title.toUpperCase()}<em>{w.kind}</em></span>
        </div>
        <div className="vf-explore">
          <button aria-label="Previous world" onClick={prev} className="vf-arrow">‹</button>
          <div className="vf-track">
            <span className="vf-track-label">DRAG TO EXPLORE STAGE</span>
            <input type="range" min={0} max={1} step={0.001} value={explore}
              onChange={(e) => setExplore(parseFloat(e.target.value))} aria-label="Explore stage" />
          </div>
          <button aria-label="Next world" onClick={next} className="vf-arrow">›</button>
        </div>
        <div className="vf-controls">
          <button aria-label="Light control — change mood" onClick={cycleMood} className="vf-ctrl">☀</button>
          <button aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(!muted)} className="vf-ctrl">
            {muted ? "♪̸" : "♪"}
          </button>
          <button aria-label="Fullscreen" onClick={toggleFs} className="vf-ctrl">{fs ? "⤢" : "⛶"}</button>
          <span className="vf-navhint">SCROLL OR DRAG<br />TO NAVIGATE</span>
        </div>
      </footer>
    </div>
  );
}
