"use client";
import { useEffect, useRef, useState, type ReactElement } from "react";

/**
 * Live per-service demo — a small animated scene that *shows* the service rather
 * than describing it (brief §9). Pure CSS/SVG, no media assets: an LED wall with
 * moving content, a travelling signal chain, show-control monitors, motion
 * graphics, an anamorphic break-out, a mapped facade, a feed network, sound
 * meters, sweeping light beams, or a web viewport.
 *
 * Animations pause when the scene scrolls off-screen (IntersectionObserver →
 * `data-live`) and stop entirely under prefers-reduced-motion (globals.css),
 * so the "live" preview costs nothing while it isn't being watched.
 */

export type DemoType =
  | "signal" | "content" | "led" | "anamorphic" | "console"
  | "projection" | "network" | "sound" | "lighting" | "web";

/** Which live demo represents each service (by slug). */
export const SERVICE_DEMO: Record<string, DemoType> = {
  "av-engineering": "signal",
  "content-design": "content",
  "presentation-content": "led",
  "led-display-rental": "led",
  "3d-anamorphic": "anamorphic",
  "show-control-media-server": "console",
  "projection-mapping": "projection",
  "immersive-experiences": "led",
  "live-production": "console",
  "virtual-events": "network",
  "hybrid-events": "network",
  "broadcast-streaming": "console",
  "professional-sound": "sound",
  "professional-lighting": "lighting",
  "web-development": "web",
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/* ── individual scenes ─────────────────────────────────── */

function LedScene() {
  // fixed 12×6 LED wall; a bright content wave sweeps across it left→right
  return (
    <div className="lg-demo-led">
      {range(6).map((r) =>
        range(12).map((c) => (
          <span
            key={`${r}-${c}`}
            className="lg-demo-led-cell"
            style={{ animationDelay: `${(c + r * 0.5) * 0.09}s` }}
          />
        )),
      )}
      <span className="lg-demo-tag">LED CONTENT · LIVE</span>
    </div>
  );
}

function SignalScene() {
  const nodes = ["SOURCE", "SWITCH", "SERVER", "PROC", "LED"];
  return (
    <div className="lg-demo-signal">
      <div className="lg-demo-signal-row">
        {nodes.map((n, i) => (
          <div key={n} className="lg-demo-node" style={{ animationDelay: `${i * 0.4}s` }}>
            {n}
          </div>
        ))}
        <span className="lg-demo-pulse" />
      </div>
      <span className="lg-demo-tag">SIGNAL PATH · ACTIVE</span>
    </div>
  );
}

function ContentScene() {
  return (
    <div className="lg-demo-content">
      <div className="lg-demo-mg">
        <span className="lg-demo-mg-ring" />
        <span className="lg-demo-mg-ring lg-demo-mg-ring2" />
        <span className="lg-demo-mg-bar" />
      </div>
      <div className="lg-demo-timeline">
        {range(5).map((i) => (
          <span key={i} className="lg-demo-track" style={{ animationDelay: `${i * 0.5}s` }} />
        ))}
        <span className="lg-demo-playhead" />
      </div>
      <span className="lg-demo-tag">MOTION · RENDERING</span>
    </div>
  );
}

function AnamorphicScene() {
  return (
    <div className="lg-demo-ana">
      <div className="lg-demo-ana-screen">
        {range(5).map((r) =>
          range(9).map((c) => <span key={`${r}-${c}`} className="lg-demo-ana-px" />),
        )}
      </div>
      <div className="lg-demo-ana-object" />
      <span className="lg-demo-tag">NAKED-EYE 3D</span>
    </div>
  );
}

function ConsoleScene() {
  return (
    <div className="lg-demo-console">
      <div className="lg-demo-mon lg-demo-mon-pvw"><span>PVW</span></div>
      <div className="lg-demo-mon lg-demo-mon-pgm"><span>PGM</span></div>
      <div className="lg-demo-cues">
        {["INTRO", "KEYNOTE", "VIDEO", "AWARD", "CLOSE"].map((q, i) => (
          <span key={q} className="lg-demo-cue" style={{ animationDelay: `${i * 1.1}s` }}>
            {q}
          </span>
        ))}
      </div>
      <span className="lg-demo-tag">SHOW CONTROL · ON AIR</span>
    </div>
  );
}

function ProjectionScene() {
  return (
    <div className="lg-demo-proj">
      <div className="lg-demo-building">
        {range(4).map((r) =>
          range(6).map((c) => <span key={`${r}-${c}`} className="lg-demo-window" />),
        )}
        <span className="lg-demo-map" />
      </div>
      <span className="lg-demo-tag">PROJECTION · MAPPED</span>
    </div>
  );
}

function NetworkScene() {
  return (
    <div className="lg-demo-net">
      <div className="lg-demo-net-hub">VENUE</div>
      {range(3).map((i) => (
        <div key={i} className={`lg-demo-net-node lg-demo-net-node-${i}`}>
          <span className="lg-demo-net-dot" />
        </div>
      ))}
      <svg className="lg-demo-net-links" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[[18, 26], [82, 22], [80, 80]].map(([x, y], i) => (
          <line key={i} x1="50" y1="52" x2={x} y2={y} className="lg-demo-net-link" />
        ))}
      </svg>
      <span className="lg-demo-tag">LIVE FEEDS · SYNCED</span>
    </div>
  );
}

function SoundScene() {
  return (
    <div className="lg-demo-sound">
      <span className="lg-demo-coverage" />
      <div className="lg-demo-meters">
        {range(9).map((i) => (
          <span key={i} className="lg-demo-meter" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <span className="lg-demo-tag">COVERAGE · BALANCED</span>
    </div>
  );
}

function LightingScene() {
  return (
    <div className="lg-demo-light">
      {range(4).map((i) => (
        <span key={i} className={`lg-demo-beam lg-demo-beam-${i}`} />
      ))}
      <span className="lg-demo-stage" />
      <span className="lg-demo-tag">FIXTURES · MOVING</span>
    </div>
  );
}

function WebScene() {
  return (
    <div className="lg-demo-web">
      <div className="lg-demo-web-bar">
        <span /><span /><span />
      </div>
      <div className="lg-demo-web-body">
        <div className="lg-demo-web-grid">
          {range(24).map((i) => (
            <span key={i} style={{ animationDelay: `${(i % 6) * 0.12}s` }} />
          ))}
        </div>
      </div>
      <span className="lg-demo-tag">WEBGL · INTERACTIVE</span>
    </div>
  );
}

const SCENES: Record<DemoType, () => ReactElement> = {
  signal: SignalScene,
  content: ContentScene,
  led: LedScene,
  anamorphic: AnamorphicScene,
  console: ConsoleScene,
  projection: ProjectionScene,
  network: NetworkScene,
  sound: SoundScene,
  lighting: LightingScene,
  web: WebScene,
};

export default function ServiceDemo({
  demo,
  className = "",
}: {
  demo: DemoType;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setLive(e.isIntersecting),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Scene = SCENES[demo];
  return (
    <div ref={ref} className={`lg-demo ${className}`} data-live={live} aria-hidden>
      <Scene />
    </div>
  );
}
