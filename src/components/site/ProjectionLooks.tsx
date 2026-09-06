"use client";
import { useState } from "react";

/**
 * Interactive projection-mapping demonstrator (brief §24/§30): one real building
 * facade, four projected "looks". The building is neutral concrete; the projected
 * content is genuine light, so the overlay is screen-blended over the surface —
 * architectural edge-map, brand takeover, geometric content, or a cinematic scene.
 * Teaches that mapping is content shaped to a fixed surface, not a flat video.
 */

type LookId = "architectural" | "brand" | "geometric" | "cinematic";

const LOOKS: { id: LookId; label: string; desc: string }[] = [
  { id: "architectural", label: "Architectural", desc: "Light traces the building's own edges and windows — the structure becomes the artwork." },
  { id: "brand", label: "Brand Takeover", desc: "The whole facade becomes a brand surface — colour, logo and message at architectural scale." },
  { id: "geometric", label: "Geometric", desc: "Abstract shapes move across the mapped surface, locked to its real geometry." },
  { id: "cinematic", label: "Cinematic", desc: "A scene wraps the building — depth and atmosphere, aligned to every ledge and reveal." },
];

/* window grid coordinates on the facade */
const WINDOWS = [0, 1, 2, 3].flatMap((r) =>
  [0, 1, 2, 3, 4].map((c) => ({ x: 62 + c * 46, y: 60 + r * 40, key: `${r}-${c}` })),
);

function Overlay({ id }: { id: LookId }) {
  switch (id) {
    case "architectural":
      return (
        <g stroke="rgba(63,214,200,0.9)" fill="none" strokeWidth="1.4" className="lg-proj">
          <rect x="40" y="30" width="260" height="188" />
          {WINDOWS.map((w) => (
            <rect key={w.key} x={w.x} y={w.y} width="30" height="26" rx="1" />
          ))}
          <line x1="40" y1="46" x2="300" y2="46" strokeWidth="2" />
        </g>
      );
    case "brand":
      return (
        <g className="lg-proj">
          <rect x="40" y="30" width="260" height="188" fill="rgba(31,160,147,0.5)" />
          {/* signal-grid mark, scaled onto the facade */}
          {[2, 4, 3, 5, 4].map((h, c) =>
            [0, 1, 2, 3, 4].map((r) => {
              const lit = 5 - r <= h;
              return (
                <rect key={`${c}-${r}`} x={132 + c * 16} y={78 + r * 16} width="12" height="12" rx="2"
                  fill={lit ? "#eafffb" : "rgba(234,255,251,0.12)"} />
              );
            }),
          )}
          <text x="170" y="200" textAnchor="middle" fontSize="15" fill="#eafffb"
                fontFamily="var(--font-sans)" fontWeight="600" letterSpacing="0.5">livegridAV</text>
        </g>
      );
    case "geometric":
      return (
        <g className="lg-proj" style={{ mixBlendMode: "screen" }}>
          <polygon points="40,218 130,30 150,218" fill="rgba(63,214,200,0.4)" />
          <polygon points="300,218 210,30 190,218" fill="rgba(63,214,200,0.28)" />
          <polygon points="120,120 220,90 200,218 100,200" fill="rgba(126,184,255,0.28)" />
          <circle cx="170" cy="110" r="34" fill="none" stroke="#eafffb" strokeWidth="1.5" opacity="0.8" />
        </g>
      );
    case "cinematic":
      return (
        <g className="lg-proj" style={{ mixBlendMode: "screen" }}>
          <defs>
            <linearGradient id="lgCine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a3a2a" />
              <stop offset="0.55" stopColor="#8a5a2e" />
              <stop offset="0.56" stopColor="#173028" />
              <stop offset="1" stopColor="#0b1c18" />
            </linearGradient>
          </defs>
          <rect x="40" y="30" width="260" height="188" fill="url(#lgCine)" opacity="0.9" />
          <circle cx="228" cy="80" r="18" fill="#f6dcac" opacity="0.85" />
          <rect x="40" y="132" width="260" height="2" fill="rgba(246,220,172,0.5)" />
        </g>
      );
  }
}

export default function ProjectionLooks() {
  const [active, setActive] = useState<LookId>("architectural");
  const current = LOOKS.find((l) => l.id === active)!;

  return (
    <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div className="overflow-hidden rounded-[20px] border border-line bg-white p-4">
        <svg viewBox="0 0 340 240" className="w-full" role="img" aria-label={`Facade with ${current.label} projection`}>
          {/* night void */}
          <rect x="0" y="0" width="340" height="240" fill="#070f0d" />
          {/* neutral concrete facade */}
          <rect x="40" y="30" width="260" height="188" fill="#1a2320" stroke="#2a3532" />
          <rect x="40" y="30" width="260" height="16" fill="#212c29" />
          {[86, 132, 178, 224].map((x) => (
            <rect key={x} x={x} y="46" width="2" height="172" fill="#151d1b" />
          ))}
          {WINDOWS.map((w) => (
            <rect key={w.key} x={w.x} y={w.y} width="30" height="26" rx="1" fill="#101715" stroke="#242f2c" />
          ))}
          {/* ground */}
          <rect x="0" y="218" width="340" height="22" fill="#0c1211" />
          <ellipse cx="170" cy="220" rx="150" ry="7" fill="rgba(0,0,0,0.4)" />
          {/* projected light */}
          <Overlay id={active} />
          {/* projector origin + beam hint */}
          <circle cx="170" cy="236" r="3" fill="#3fd6c8" />
        </svg>
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Change the look</p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-text">
          One facade, mapped many ways
        </h3>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {LOOKS.map((l) => (
            <button
              key={l.id}
              onClick={() => setActive(l.id)}
              aria-pressed={active === l.id}
              className={`rounded-lg px-3.5 py-2 text-sm transition-colors ${
                active === l.id ? "bg-aqua text-white" : "border border-line text-muted hover:border-aqua hover:text-aqua"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="mt-6 max-w-[42ch] leading-relaxed text-muted">{current.desc}</p>
      </div>
    </div>
  );
}
