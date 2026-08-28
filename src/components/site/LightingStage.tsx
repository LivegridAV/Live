"use client";
import { useState } from "react";

/**
 * Interactive lighting demonstrator (brief §21/§30): the visitor picks a fixture
 * type and the stage visibly transforms — beam, wash, profile, strobe, blinder,
 * follow spot. Stage/truss are neutral steel; the light itself is a genuine
 * emissive source, so it may glow (brief §34). No manufacturer brands.
 */

type FixId = "beam" | "wash" | "profile" | "strobe" | "blinder" | "spot";

const FIXTURES: { id: FixId; label: string; desc: string }[] = [
  { id: "beam", label: "Beam", desc: "A narrow, sharp shaft of light — aerial looks and hard-edged impact." },
  { id: "wash", label: "Wash", desc: "A broad, soft field of colour that covers the whole stage." },
  { id: "profile", label: "Profile", desc: "A shaped, focused beam — clean pools and projected gobo patterns." },
  { id: "strobe", label: "Strobe", desc: "Rapid flashes of light for high-energy moments." },
  { id: "blinder", label: "Blinder", desc: "A bright wall of light aimed out at the audience." },
  { id: "spot", label: "Follow Spot", desc: "A tracked circle of light that follows a performer." },
];

function Light({ id }: { id: FixId }) {
  switch (id) {
    case "beam":
      return <polygon points="164,34 176,34 150,206 190,206" fill="url(#lgBeamGrad)" className="lg-lite" />;
    case "wash":
      return <polygon points="120,34 220,34 44,206 296,206" fill="url(#lgWashGrad)" className="lg-lite" />;
    case "profile":
      return (
        <g className="lg-lite">
          <polygon points="150,34 190,34 138,206 202,206" fill="url(#lgBeamGrad)" />
          <ellipse cx="170" cy="206" rx="42" ry="11" fill="rgba(63,214,200,0.28)" />
          <line x1="150" y1="206" x2="190" y2="206" stroke="rgba(63,214,200,0.5)" strokeWidth="1" />
        </g>
      );
    case "strobe":
      return <polygon points="130,34 210,34 60,206 280,206" fill="url(#lgWashGrad)" className="lg-lite lg-strobe" />;
    case "blinder":
      return <rect x="20" y="120" width="300" height="112" fill="url(#lgBlindGrad)" className="lg-lite lg-strobe" />;
    case "spot":
      return (
        <g className="lg-spot">
          <polygon points="166,34 174,34 150,200 190,200" fill="url(#lgBeamGrad)" />
          <ellipse cx="170" cy="204" rx="22" ry="8" fill="rgba(63,214,200,0.35)" />
        </g>
      );
  }
}

export default function LightingStage() {
  const [active, setActive] = useState<FixId>("beam");
  const current = FIXTURES.find((f) => f.id === active)!;

  return (
    <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div className="overflow-hidden rounded-[20px] border border-line bg-white p-4 md:order-1">
        <svg viewBox="0 0 340 240" className="w-full" role="img" aria-label={`Stage lit by ${current.label}`}>
          <defs>
            <linearGradient id="lgBeamGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(200,255,248,0.6)" />
              <stop offset="1" stopColor="rgba(63,214,200,0.02)" />
            </linearGradient>
            <linearGradient id="lgWashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(63,214,200,0.4)" />
              <stop offset="1" stopColor="rgba(63,214,200,0.02)" />
            </linearGradient>
            <linearGradient id="lgBlindGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="rgba(220,255,250,0.55)" />
              <stop offset="1" stopColor="rgba(63,214,200,0.02)" />
            </linearGradient>
          </defs>

          {/* back void */}
          <rect x="0" y="0" width="340" height="240" fill="#070f0d" />
          {/* truss + fixtures (neutral steel) */}
          <rect x="24" y="20" width="292" height="9" rx="2" fill="#1c2624" stroke="#2a3532" />
          {[60, 115, 170, 225, 280].map((x) => (
            <rect key={x} x={x - 6} y="29" width="12" height="8" rx="1.5" fill="#0e1513" stroke="#2a3532" />
          ))}
          {/* the selected light */}
          <Light id={active} />
          {/* stage floor + performer silhouette (neutral) */}
          <rect x="0" y="206" width="340" height="34" fill="#0c1211" />
          <ellipse cx="170" cy="207" rx="60" ry="6" fill="#0a0f0e" />
          <g fill="#05100e">
            <ellipse cx="170" cy="196" rx="6" ry="7" />
            <rect x="164" y="200" width="12" height="8" rx="3" />
          </g>
        </svg>
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Change the fixture</p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-text">
          See the stage transform
        </h3>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {FIXTURES.map((f) => (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              aria-pressed={active === f.id}
              className={`rounded-lg px-3.5 py-2 text-sm transition-colors ${
                active === f.id ? "bg-aqua text-white" : "border border-line text-muted hover:border-aqua hover:text-aqua"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-6 max-w-[42ch] leading-relaxed text-muted">{current.desc}</p>
      </div>
    </div>
  );
}
