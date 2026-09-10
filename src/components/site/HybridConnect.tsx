"use client";
import { useState } from "react";

/**
 * Interactive hybrid/virtual-events demonstrator (brief §30): the visitor
 * connects remote locations to the main venue and watches the show stay in sync
 * across all of them. Teaches that a hybrid event is one production reaching
 * physical + virtual audiences at once. Nodes/links use the LiveGrid cyan signal
 * language; the venue plan itself is neutral.
 */

type EndpointId = "studio" | "city2" | "online" | "broadcast";

const HUB = { x: 170, y: 112 };
const ENDPOINTS: { id: EndpointId; label: string; sub: string; x: number; y: number }[] = [
  { id: "studio", label: "Remote Studio", sub: "Presenter feed", x: 58, y: 50 },
  { id: "city2", label: "Second Venue", sub: "Sister event", x: 282, y: 50 },
  { id: "online", label: "Online Audience", sub: "Stream + chat", x: 58, y: 174 },
  { id: "broadcast", label: "Broadcast", sub: "TV / OTT", x: 282, y: 174 },
];

export default function HybridConnect() {
  const [active, setActive] = useState<Set<EndpointId>>(new Set(["studio", "online"]));

  const toggle = (id: EndpointId) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const count = active.size;

  return (
    <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
      <div className="overflow-hidden rounded-[20px] border border-line bg-white p-4">
        <svg viewBox="0 0 340 244" className="w-full" role="img"
             aria-label={`Main venue connected to ${count} remote location${count === 1 ? "" : "s"}`}>
          <rect x="0" y="0" width="340" height="244" fill="#070f0d" />

          {/* links (only for connected endpoints) — flowing signal */}
          {ENDPOINTS.filter((e) => active.has(e.id)).map((e) => (
            <line key={e.id} x1={HUB.x} y1={HUB.y} x2={e.x} y2={e.y}
              stroke="rgba(63,214,200,0.75)" strokeWidth="1.6"
              strokeDasharray="4 5" className="lg-flow" />
          ))}

          {/* endpoint nodes */}
          {ENDPOINTS.map((e) => {
            const on = active.has(e.id);
            return (
              <g key={e.id}>
                <circle cx={e.x} cy={e.y} r="9"
                  fill={on ? "#1fa093" : "#101715"} stroke={on ? "#3fd6c8" : "#2a3532"} strokeWidth="1.5"
                  style={on ? { filter: "drop-shadow(0 0 6px rgba(63,214,200,0.6))" } : undefined} />
                <text x={e.x} y={e.y > 120 ? e.y + 24 : e.y - 16} textAnchor="middle"
                  fontSize="10" fill={on ? "#cfe" : "#6c7a76"} fontFamily="var(--font-mono)" letterSpacing="0.5">
                  {e.label.toUpperCase()}
                </text>
                <text x={e.x} y={e.y > 120 ? e.y + 35 : e.y - 27} textAnchor="middle"
                  fontSize="8" fill="#4b5651" fontFamily="var(--font-mono)">
                  {e.sub}
                </text>
              </g>
            );
          })}

          {/* main venue hub */}
          <rect x={HUB.x - 34} y={HUB.y - 18} width="68" height="36" rx="6"
            fill="#0e1513" stroke="#3fd6c8" strokeWidth="1.5" />
          <text x={HUB.x} y={HUB.y - 2} textAnchor="middle" fontSize="10" fill="#eafffb"
            fontFamily="var(--font-mono)" letterSpacing="1">MAIN</text>
          <text x={HUB.x} y={HUB.y + 10} textAnchor="middle" fontSize="10" fill="#eafffb"
            fontFamily="var(--font-mono)" letterSpacing="1">VENUE</text>

          <text x="16" y="234" fontSize="10" fill="#6c7a76" fontFamily="var(--font-mono)" letterSpacing="1.2">
            {`${count + 1} LOCATIONS · ONE SHOW`}
          </text>
          <text x="324" y="234" textAnchor="end" fontSize="10" fill="#3fd6c8"
            fontFamily="var(--font-mono)" letterSpacing="1.2">IN SYNC</text>
        </svg>
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Connect the audiences</p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-text">
          One show, everywhere at once
        </h3>
        <p className="mt-4 max-w-[42ch] leading-relaxed text-muted">
          Add a location and it joins the same synchronized production — a remote
          presenter, a sister venue, the online audience, a live broadcast. Toggle
          each to see the show reach further.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {ENDPOINTS.map((e) => (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              aria-pressed={active.has(e.id)}
              className={`rounded-lg px-3.5 py-2 text-sm transition-colors ${
                active.has(e.id) ? "bg-aqua text-white" : "border border-line text-muted hover:border-aqua hover:text-aqua"
              }`}
            >
              {active.has(e.id) ? "● " : "○ "}{e.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
