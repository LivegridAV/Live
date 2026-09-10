"use client";
import { useState } from "react";

/**
 * Interactive sound-coverage demonstrator (brief §20/§30): the visitor picks a
 * system type and sees where it covers on a simple venue plan, taught visually.
 * The venue (stage + audience) is drawn in neutral tones; only the coverage
 * overlay and UI use the LiveGrid cyan. No manufacturer brands — this teaches
 * the concept, matching the "coordinated with trusted partners" positioning.
 */

type SystemId = "pa" | "sub" | "monitor" | "front" | "delay";

const SYSTEMS: { id: SystemId; label: string; desc: string }[] = [
  { id: "pa", label: "Line Array (PA)", desc: "Even coverage for the whole audience, front to back — the main system." },
  { id: "sub", label: "Subwoofers", desc: "The low end — felt broadly across the floor, strongest toward the front." },
  { id: "monitor", label: "Stage Monitors", desc: "Aimed back at the stage so performers hear exactly what they need." },
  { id: "front", label: "Front Fills", desc: "Small speakers for the very front rows the main PA flies over." },
  { id: "delay", label: "Delay Fills", desc: "Extra speakers for the far audience, time-aligned so it still sounds like one system." },
];

function Zone({ id }: { id: SystemId }) {
  const fill = "rgba(63,214,200,0.16)";
  const stroke = "rgba(63,214,200,0.7)";
  const common = { fill, stroke, strokeWidth: 1, className: "lg-cov-zone" } as const;
  switch (id) {
    case "pa":
      return <polygon points="46,52 26,228 314,228 294,52" {...common} />;
    case "sub":
      return <ellipse cx="170" cy="150" rx="128" ry="72" {...common} />;
    case "monitor":
      return (
        <g {...common}>
          <polygon points="70,52 90,52 84,30 76,30" />
          <polygon points="250,52 270,52 264,30 256,30" />
        </g>
      );
    case "front":
      return <rect x="24" y="66" width="292" height="30" rx="4" {...common} />;
    case "delay":
      return (
        <g {...common}>
          <rect x="24" y="196" width="292" height="32" rx="4" />
          <circle cx="70" cy="150" r="5" />
          <circle cx="270" cy="150" r="5" />
        </g>
      );
  }
}

export default function SoundCoverage() {
  const [active, setActive] = useState<SystemId>("pa");
  const current = SYSTEMS.find((s) => s.id === active)!;

  return (
    <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">See the coverage</p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-text">
          Where each system reaches
        </h3>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {SYSTEMS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              aria-pressed={active === s.id}
              className={`rounded-lg px-3.5 py-2 text-sm transition-colors ${
                active === s.id ? "bg-aqua text-white" : "border border-line text-muted hover:border-aqua hover:text-aqua"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="mt-6 max-w-[42ch] leading-relaxed text-muted">{current.desc}</p>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-line bg-white p-4">
        <svg viewBox="0 0 340 240" className="w-full" role="img" aria-label={`Coverage for ${current.label}`}>
          {/* audience floor */}
          <rect x="16" y="58" width="308" height="174" rx="8" fill="#0a1512" stroke="#17322d" />
          {/* audience rows (neutral) */}
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 16 }, (_, c) => (
              <circle key={`${r}-${c}`} cx={30 + c * 19} cy={74 + r * 20} r="2.4" fill="#33413d" />
            )),
          )}
          {/* stage (neutral steel) */}
          <rect x="20" y="14" width="300" height="34" rx="5" fill="#141b19" stroke="#2a3532" />
          <text x="170" y="35" textAnchor="middle" fontSize="11" fill="#6c7a76" fontFamily="var(--font-mono)" letterSpacing="2">STAGE</text>
          {/* PA hangs */}
          <rect x="40" y="48" width="10" height="16" rx="2" fill="#0e1513" stroke="#2a3532" />
          <rect x="290" y="48" width="10" height="16" rx="2" fill="#0e1513" stroke="#2a3532" />
          {/* coverage overlay */}
          <Zone id={active} />
        </svg>
      </div>
    </div>
  );
}
