"use client";
import { useState } from "react";
import SignalFlow from "./SignalFlow";

/**
 * Interactive AV Lab (brief §31). Pick a source and watch its signal travel the
 * chain — a plain-language way to prove the full signal path without a manual.
 * The flow animation is handled by SignalFlow (reduced-motion aware).
 */

const PATHS = [
  {
    key: "Camera",
    flow: ["Camera", "Switcher", "Program", "LED / Stream"],
    what: "A camera feed is cut live at the switcher into the program, then sent to the LED and the stream at the same time.",
  },
  {
    key: "Media Server",
    flow: ["Content", "Media Server", "Processing", "LED"],
    what: "Content plays from the media server, is scaled and mapped by processing, and lands pixel-accurate on the LED wall.",
  },
  {
    key: "LED Processor",
    flow: ["Media", "Processor", "Mapped Canvas", "LED"],
    what: "The LED processor takes the image and maps it to the exact pixel layout of the wall — the mapped canvas the panels display.",
  },
  {
    key: "Watchout / Playback",
    flow: ["Content", "Timeline", "Outputs", "Screens / Projectors"],
    what: "Watchout runs a timeline of cues across multiple outputs, driving several screens and projectors in perfect sync.",
  },
  {
    key: "Streaming",
    flow: ["Program", "Encoder", "Platform", "Remote Audience"],
    what: "The clean program output is encoded and delivered to a streaming platform, reaching the remote audience anywhere.",
  },
];

export default function AvLabExplorer() {
  const [active, setActive] = useState(0);
  const path = PATHS[active];

  return (
    <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
      {/* sources */}
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-glow">Pick a source</p>
        <div className="mt-5 flex flex-col gap-2.5">
          {PATHS.map((p, i) => {
            const on = i === active;
            return (
              <button
                key={p.key}
                onClick={() => setActive(i)}
                aria-pressed={on}
                className={`flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-colors ${
                  on
                    ? "border-glow bg-glow/10 text-text-inv"
                    : "border-ink-soft text-text-inv/70 hover:border-glow/50 hover:text-text-inv"
                }`}
              >
                <span className="font-medium">{p.key}</span>
                <span className="font-mono text-[11px] tracking-[0.2em] text-glow">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* active path */}
      <div className="flex flex-col rounded-[24px] border border-ink-soft bg-ink p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-glow">Signal path</p>
        <div className="mt-5">
          <SignalFlow key={path.key} nodes={path.flow} />
        </div>
        <p className="mt-7 max-w-[52ch] leading-relaxed text-text-inv/70">{path.what}</p>
        <p className="mt-6 border-t border-ink-soft pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
          One clean path, planned and tested before the show.
        </p>
      </div>
    </div>
  );
}
