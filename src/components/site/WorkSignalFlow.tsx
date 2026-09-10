"use client";
import type { WorkItem } from "@/content/work";

/**
 * Per-project signal-flow diagram (brief §23/§30): shows how *this* show was
 * built — content → media server → processing → the screen — with the output
 * stage and spec taken from the project's real data. The signal visibly flows
 * along the chain (reduced-motion safe). Cyan is the signal language; nothing
 * invented beyond the generic, true production chain every show uses.
 */

function outputStage(p: WorkItem): { label: string; sub: string } {
  if (p.categories.includes("Anamorphic")) return { label: "ANAMORPHIC LED", sub: p.led };
  if (p.categories.includes("Projection")) return { label: "PROJECTION", sub: p.led };
  return { label: "LED WALL", sub: p.led };
}

const NODE_W = 128;
const NODE_H = 58;

function Node({ x, title, sub }: { x: number; title: string; sub: string }) {
  return (
    <g>
      <rect x={x} y={52} width={NODE_W} height={NODE_H} rx="8" fill="#0e1513" stroke="#243430" />
      <text x={x + NODE_W / 2} y={78} textAnchor="middle" fontSize="12" fill="#eafffb"
        fontFamily="var(--font-mono)" letterSpacing="0.5">{title}</text>
      <text x={x + NODE_W / 2} y={94} textAnchor="middle" fontSize="9" fill="#6c7a76"
        fontFamily="var(--font-mono)">{sub}</text>
    </g>
  );
}

export default function WorkSignalFlow({ project }: { project: WorkItem }) {
  const out = outputStage(project);
  const xs = [16, 176, 336, 496];
  const midY = 52 + NODE_H / 2;

  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 640 150" className="w-full min-w-[560px]" role="img"
           aria-label={`Signal path for ${project.name}: content to media server to processor to ${out.label.toLowerCase()}`}>
        {/* flow line through the chain */}
        <line x1={xs[0] + NODE_W} y1={midY} x2={xs[3]} y2={midY}
          stroke="rgba(63,214,200,0.7)" strokeWidth="1.6" strokeDasharray="4 5" className="lg-flow" />
        {/* connector arrowheads */}
        {[1, 2, 3].map((i) => (
          <polygon key={i} points={`${xs[i] - 6},${midY - 4} ${xs[i]},${midY} ${xs[i] - 6},${midY + 4}`}
            fill="#3fd6c8" />
        ))}

        <Node x={xs[0]} title="CONTENT" sub="render · playback" />
        <Node x={xs[1]} title="MEDIA SERVER" sub="timeline · cues" />
        <Node x={xs[2]} title="PROCESSOR" sub="scale · map" />
        {/* output node — brand-accented */}
        <g>
          <rect x={xs[3]} y={52} width={NODE_W} height={NODE_H} rx="8" fill="#0b1a17" stroke="#3fd6c8" strokeWidth="1.4" />
          <text x={xs[3] + NODE_W / 2} y={76} textAnchor="middle" fontSize="11" fill="#3fd6c8"
            fontFamily="var(--font-mono)" letterSpacing="0.5">{out.label}</text>
          <text x={xs[3] + NODE_W / 2} y={92} textAnchor="middle" fontSize="8.5" fill="#9fb4af"
            fontFamily="var(--font-mono)">{out.sub}</text>
        </g>

        <text x="16" y="28" fontSize="11" fill="#3fd6c8" fontFamily="var(--font-mono)" letterSpacing="2">
          SIGNAL PATH
        </text>
        <text x="624" y="28" textAnchor="end" fontSize="10" fill="#6c7a76" fontFamily="var(--font-mono)" letterSpacing="1">
          {project.year} · {project.location.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
