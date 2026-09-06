"use client";
import { useState } from "react";

/**
 * Interactive live-production switcher (brief §30): the visitor loads a camera to
 * preview, then TAKEs it to air — the camera → switcher → program follow-through.
 * Feeds are neutral abstractions (stage/presenter/audience) with a cyan LED-graphics
 * source; the only red is the real on-air tally, an authentic AV signal.
 */

type FeedId = "wide" | "presenter" | "audience" | "graphics";

const FEEDS: { id: FeedId; label: string }[] = [
  { id: "wide", label: "CAM 1 · WIDE" },
  { id: "presenter", label: "CAM 2 · PRESENTER" },
  { id: "audience", label: "CAM 3 · AUDIENCE" },
  { id: "graphics", label: "GFX · LED" },
];

/** A tiny neutral feed drawn in its own 100×64 space (scales into any tile). */
function Feed({ id }: { id: FeedId }) {
  return (
    <svg viewBox="0 0 100 64" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <rect width="100" height="64" fill="#0c1311" />
      {id === "wide" && (
        <g>
          <rect x="6" y="8" width="88" height="34" fill="#111a18" />
          <rect x="10" y="10" width="80" height="6" fill="#1b2523" />
          <rect x="14" y="12" width="16" height="30" fill="#0e1614" stroke="#243430" />
          <rect x="70" y="12" width="16" height="30" fill="#0e1614" stroke="#243430" />
          <rect x="0" y="44" width="100" height="20" fill="#0a100e" />
          <ellipse cx="50" cy="46" rx="10" ry="2" fill="#05100e" />
          <rect x="46" y="34" width="8" height="12" rx="2" fill="#232d2a" />
          <circle cx="50" cy="32" r="4" fill="#2a3532" />
        </g>
      )}
      {id === "presenter" && (
        <g>
          <rect x="0" y="0" width="100" height="64" fill="#0e1513" />
          <circle cx="50" cy="26" r="11" fill="#2a3532" />
          <rect x="36" y="34" width="28" height="24" rx="5" fill="#232d2a" />
          <rect x="40" y="48" width="20" height="10" fill="#1a2320" />
        </g>
      )}
      {id === "audience" && (
        <g>
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
              <circle key={`${r}-${c}`} cx={12 + c * 11} cy={16 + r * 12} r="2.4" fill="#2a3532" />
            )),
          )}
        </g>
      )}
      {id === "graphics" && (
        <g>
          {[2, 4, 3, 5, 4].map((h, c) =>
            [0, 1, 2, 3, 4].map((r) => {
              const lit = 5 - r <= h;
              return (
                <rect key={`${c}-${r}`} x={30 + c * 9} y={8 + r * 9} width="7" height="7" rx="1"
                  fill={lit ? "#3fd6c8" : "#123"} />
              );
            }),
          )}
        </g>
      )}
    </svg>
  );
}

export default function LiveSwitcher() {
  const [pvw, setPvw] = useState<FeedId>("presenter");
  const [pgm, setPgm] = useState<FeedId>("wide");
  const [flash, setFlash] = useState(false);

  const take = () => {
    setPgm(pvw);
    setFlash(true);
    setTimeout(() => setFlash(false), 260);
  };

  return (
    <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Cut the show</p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-text">
          Camera, switcher, program
        </h3>
        <p className="mt-4 max-w-[42ch] leading-relaxed text-muted">
          Load a source to preview, then take it to air. It&rsquo;s the operator&rsquo;s
          loop for every live show — sources in, one clean program out.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          {FEEDS.map((f) => (
            <button
              key={f.id}
              onClick={() => setPvw(f.id)}
              aria-pressed={pvw === f.id}
              className={`overflow-hidden rounded-lg border text-left transition-colors ${
                pvw === f.id ? "border-aqua" : "border-line hover:border-aqua/50"
              }`}
            >
              <span className="block h-12 w-full"><Feed id={f.id} /></span>
              <span className="block px-2 py-1.5 font-mono text-[10px] tracking-[0.08em] text-muted">
                {f.label}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={take}
          className="mt-5 w-full rounded-xl bg-aqua px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition-[filter] hover:brightness-110"
        >
          Take to air →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <figure className="overflow-hidden rounded-[16px] border border-aqua/60 bg-white">
          <div className="aspect-video w-full"><Feed id={pvw} /></div>
          <figcaption className="flex items-center gap-2 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-aqua" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Preview</span>
          </figcaption>
        </figure>
        <figure className="overflow-hidden rounded-[16px] border-2 border-red-500/80 bg-white">
          <div className={`aspect-video w-full transition-opacity ${flash ? "opacity-40" : "opacity-100"}`}>
            <Feed id={pgm} />
          </div>
          <figcaption className="flex items-center gap-2 px-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-red-500">On air</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
