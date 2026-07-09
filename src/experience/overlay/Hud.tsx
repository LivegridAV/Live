"use client";
import { useEffect, useRef, useState } from "react";
import { audio } from "../audio";
import { journeyScroll } from "../ScrollRig";
import { CHAPTERS, ChapterKey, signals, useExperience } from "../store";

/**
 * Fixed chrome over the 3D world:
 *  - wordmark (5 clicks = developer credits)
 *  - chapter rail on the right (jump-scroll navigation)
 *  - the holographic stage control panel (Scene 1 only)
 *  - audio / music toggles, scroll hint
 */

const RAIL: { key: ChapterKey; label: string }[] = [
  { key: "stage", label: "The Stage" },
  { key: "vault", label: "The Wall" },
  { key: "universe", label: "3D Universe" },
  { key: "services", label: "Services" },
  { key: "stats", label: "Track Record" },
  { key: "lab", label: "Equipment Lab" },
  { key: "projects", label: "Projects" },
  { key: "finale", label: "Contact" },
];

function scrollToChapter(key: ChapterKey) {
  const [a, b] = CHAPTERS[key];
  journeyScroll((a + b) / 2);
}

export default function Hud() {
  const s = useExperience();
  const [active, setActive] = useState<ChapterKey>("stage");
  // collapsed by default on phones — the console would cover half the show
  const [panelOpen, setPanelOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth > 768,
  );
  const logoClicks = useRef<number[]>([]);

  // track active chapter for the rail (rAF-poll of the signal — cheap)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = signals.progress;
      let current: ChapterKey = "stage";
      for (const r of RAIL) {
        if (p >= CHAPTERS[r.key][0] - 0.02) current = r.key;
      }
      setActive((prev) => (prev === current ? prev : current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!s.booted) return null;

  const onLogoClick = () => {
    const now = Date.now();
    logoClicks.current = [...logoClicks.current.filter((t) => now - t < 3000), now];
    if (logoClicks.current.length >= 5) {
      logoClicks.current = [];
      s.setShowCredits(true);
    }
  };

  const inStage = active === "stage";

  return (
    <>
      {/* top bar */}
      <header className="lg-hud-top">
        <button className="lg-wordmark" onClick={onLogoClick} aria-label="LiveGridAV">
          livegrid<span>AV</span>
        </button>
        <div className="lg-hud-actions">
          <button
            className={`lg-chip ${s.audioOn ? "is-on" : ""}`}
            onClick={() => { s.toggle("audioOn"); audio.blip(1); }}
          >
            SOUND {s.audioOn ? "ON" : "OFF"}
          </button>
          <button
            className={`lg-chip ${s.musicOn ? "is-on" : ""}`}
            onClick={() => { s.toggle("musicOn"); audio.blip(1.4); }}
          >
            MUSIC {s.musicOn ? "ON" : "OFF"}
          </button>
          <a className="lg-chip lg-chip-cta" href="#contact-console"
             onClick={(e) => { e.preventDefault(); scrollToChapter("finale"); }}>
            GET A QUOTE
          </a>
        </div>
      </header>

      {/* chapter rail */}
      <nav className="lg-rail" aria-label="Journey chapters">
        {RAIL.map((r) => (
          <button
            key={r.key}
            className={`lg-rail-item ${active === r.key ? "is-active" : ""}`}
            onClick={() => { scrollToChapter(r.key); audio.blip(1.1); }}
          >
            <span className="lg-rail-dot" aria-hidden />
            <span className="lg-rail-label">{r.label}</span>
          </button>
        ))}
      </nav>

      {/* holographic stage control panel — Scene 1 */}
      <aside className={`lg-console ${inStage ? "is-visible" : ""}`} aria-label="Stage controls">
        <button className="lg-console-head" onClick={() => setPanelOpen(!panelOpen)}>
          <span>STAGE CONTROL</span>
          <span aria-hidden>{panelOpen ? "▾" : "▸"}</span>
        </button>
        {panelOpen && (
          <div className="lg-console-body">
            {(
              [
                ["lasers", "LASERS", s.lasers],
                ["smoke", "SMOKE", s.smoke],
                ["stageLights", "STAGE LIGHTS", s.stageLights],
                ["audienceLights", "AUDIENCE", s.audienceLights],
              ] as const
            ).map(([key, label, on]) => (
              <button
                key={key}
                className={`lg-toggle ${on ? "is-on" : ""}`}
                onClick={() => { s.toggle(key); audio.click(undefined, on ? 0.8 : 1.3); }}
                aria-pressed={on}
              >
                <span className="lg-toggle-led" aria-hidden />
                {label}
              </button>
            ))}
            <button className="lg-toggle" onClick={() => { s.cycleLedContent(); audio.blip(1.2); }}>
              <span className="lg-toggle-led is-on" aria-hidden />
              LED CONTENT · {["LOGO", "AUDIO", "WAVES", "WARP"][s.ledContent]}
            </button>
            <div className="lg-console-themes">
              {(["signal", "cyber", "ember"] as const).map((t) => (
                <button
                  key={t}
                  className={`lg-theme-dot lg-theme-${t} ${s.theme === t ? "is-active" : ""}`}
                  onClick={() => { s.setTheme(t); audio.blip(1.5); }}
                  aria-label={`${t} color theme`}
                />
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* scroll hint, stage chapter only */}
      {inStage && (
        <div className="lg-scrollhint" aria-hidden>
          <span className="lg-scrollhint-wheel" />
          scroll to walk in · drag to look around
        </div>
      )}

      {/* developer credits */}
      {s.showCredits && (
        <div className="lg-modal" role="dialog" aria-label="Credits" onClick={() => s.setShowCredits(false)}>
          <div className="lg-modal-card" onClick={(e) => e.stopPropagation()}>
            <p className="lg-modal-eyebrow">DEVELOPER CREDITS</p>
            <h3>Built like a show.</h3>
            <p className="lg-modal-body">
              Real-time WebGL · React Three Fiber · custom GLSL · procedural audio.
              Designed and engineered for LiveGridAV. You found the fifth click —
              try the Konami code next.
            </p>
            <button className="lg-btn" onClick={() => s.setShowCredits(false)}>Back to the show</button>
          </div>
        </div>
      )}
    </>
  );
}
