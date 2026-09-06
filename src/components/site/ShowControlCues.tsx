"use client";
import { useState } from "react";

/**
 * Interactive show-control cue stack (brief §30): the visitor fires cues with GO
 * and the program output changes on cut — the media-server / show-control loop
 * that runs a live event. Content on the LED is digital (cyan); the award reveal
 * is a genuine warm content moment. No manufacturer brands.
 */

type Cue = { id: string; name: string; note: string };

const CUES: Cue[] = [
  { id: "intro", name: "Intro Build", note: "Logo forms on the wall" },
  { id: "keynote", name: "Keynote", note: "Speaker + lower third" },
  { id: "video", name: "Video Roll", note: "Full-bleed film" },
  { id: "award", name: "Award Reveal", note: "Warm reveal moment" },
  { id: "close", name: "Close", note: "Thank-you, fade" },
];

function Output({ i }: { i: number }) {
  const cue = i >= 0 ? CUES[i] : null;
  return (
    <svg viewBox="0 0 300 176" className="w-full" role="img"
         aria-label={cue ? `Program output: ${cue.name}` : "Program output: standby"}>
      <rect width="300" height="176" fill="#070f0d" />
      {/* LED wall bezel */}
      <rect x="14" y="12" width="272" height="132" rx="4" fill="#0b1210" stroke="#243430" />
      {/* content per cue */}
      {i < 0 && (
        <text x="150" y="82" textAnchor="middle" fontSize="13" fill="#3a4744"
          fontFamily="var(--font-mono)" letterSpacing="3">STANDBY</text>
      )}
      {cue?.id === "intro" && (
        <g>
          {[2, 4, 3, 5, 4].map((h, c) =>
            [0, 1, 2, 3, 4].map((r) => {
              const lit = 5 - r <= h;
              return <rect key={`${c}-${r}`} x={116 + c * 15} y={40 + r * 15} width="12" height="12" rx="2"
                fill={lit ? "#3fd6c8" : "#12201d"} />;
            }),
          )}
        </g>
      )}
      {cue?.id === "keynote" && (
        <g>
          <circle cx="110" cy="66" r="20" fill="#2a3532" />
          <rect x="86" y="82" width="48" height="46" rx="6" fill="#232d2a" />
          <rect x="150" y="92" width="120" height="10" rx="2" fill="#1fa093" />
          <rect x="150" y="106" width="86" height="6" rx="2" fill="#22403b" />
        </g>
      )}
      {cue?.id === "video" && (
        <g>
          <defs>
            <linearGradient id="lgVid" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#123f3a" /><stop offset="1" stopColor="#0c1c19" />
            </linearGradient>
          </defs>
          <rect x="20" y="18" width="260" height="120" fill="url(#lgVid)" />
          <polygon points="140,60 140,96 170,78" fill="#eafffb" opacity="0.85" />
        </g>
      )}
      {cue?.id === "award" && (
        <g>
          <defs>
            <radialGradient id="lgAward" cx="0.5" cy="0.5" r="0.6">
              <stop offset="0" stopColor="#ffd98a" /><stop offset="0.6" stopColor="#c98a3a" />
              <stop offset="1" stopColor="#3a2a12" />
            </radialGradient>
          </defs>
          <rect x="20" y="18" width="260" height="120" fill="url(#lgAward)" opacity="0.92" />
          <text x="150" y="84" textAnchor="middle" fontSize="16" fill="#3a2a12"
            fontFamily="var(--font-sans)" fontWeight="700" letterSpacing="2">WINNER</text>
        </g>
      )}
      {cue?.id === "close" && (
        <g>
          <rect x="20" y="18" width="260" height="120" fill="#0c1512" />
          <text x="150" y="84" textAnchor="middle" fontSize="13" fill="#7fb8af"
            fontFamily="var(--font-sans)" letterSpacing="1">Thank you</text>
        </g>
      )}
      {/* PGM tally */}
      <circle cx="26" cy="158" r="4" fill={i >= 0 ? "#ef4444" : "#3a4744"} />
      <text x="38" y="161" fontSize="10" fill={i >= 0 ? "#ef4444" : "#3a4744"}
        fontFamily="var(--font-mono)" letterSpacing="1.5">{i >= 0 ? "ON AIR" : "OFF"}</text>
      <text x="286" y="161" textAnchor="end" fontSize="10" fill="#6c7a76"
        fontFamily="var(--font-mono)" letterSpacing="1">
        {cue ? cue.name.toUpperCase() : "—"}
      </text>
    </svg>
  );
}

export default function ShowControlCues() {
  const [i, setI] = useState(-1); // -1 = standby, else current cue index
  const next = i + 1 < CUES.length ? CUES[i + 1] : null;

  const go = () => setI((v) => Math.min(v + 1, CUES.length - 1));

  return (
    <div className="grid gap-8 md:grid-cols-[1.05fr_0.95fr] md:items-center">
      <div className="overflow-hidden rounded-[20px] border border-line bg-white p-4">
        <Output i={i} />
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Run the show</p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-text">
          Fire the cue stack
        </h3>
        <p className="mt-4 max-w-[42ch] leading-relaxed text-muted">
          One operator, one clean output. Hit GO and the next cue cuts to air —
          content, timing and routing already programmed.
        </p>

        <ol className="mt-6 space-y-1.5">
          {CUES.map((c, idx) => {
            const state = idx < i ? "done" : idx === i ? "live" : idx === i + 1 ? "next" : "idle";
            return (
              <li key={c.id}>
                <button
                  onClick={() => setI(idx)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                    state === "live"
                      ? "border-red-500/70 bg-red-500/5"
                      : state === "next"
                        ? "border-aqua/60"
                        : "border-line hover:border-aqua/40"
                  }`}
                >
                  <span className="font-mono text-[11px] text-faint">{String(idx + 1).padStart(2, "0")}</span>
                  <span className={`flex-1 text-sm ${state === "done" ? "text-faint line-through" : "text-text"}`}>
                    {c.name}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                    {state === "live" ? <span className="text-red-500">On air</span>
                      : state === "next" ? <span className="text-aqua">Next</span>
                        : state === "done" ? <span className="text-faint">Done</span>
                          : <span className="text-faint">{c.note}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex gap-3">
          <button
            onClick={go}
            disabled={!next}
            className="flex-1 rounded-xl bg-aqua px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition-[filter] hover:brightness-110 disabled:opacity-40"
          >
            {next ? `GO · ${next.name}` : "Show complete"}
          </button>
          <button
            onClick={() => setI(-1)}
            className="rounded-xl border border-line px-4 py-3 text-sm text-muted transition-colors hover:border-aqua hover:text-aqua"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
