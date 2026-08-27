"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * The "live visual" that every service page carries: a signal chain that comes
 * to life. A glowing pulse walks the nodes left→right, lighting each as it
 * passes — the brand idea (a signal powering on) applied to a real signal path.
 *
 * Node labels are real text in the DOM (good for SEO / screen readers). Motion
 * is decorative only: with `prefers-reduced-motion` every node simply sits lit
 * and the pulse stops, so nothing is trapped in animation.
 */
export default function SignalFlow({
  nodes,
  className = "",
}: {
  nodes: string[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % nodes.length);
    }, 900);
    return () => clearInterval(id);
  }, [reduce, nodes.length]);

  return (
    <div
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-3 ${className}`}
      role="img"
      aria-label={`Signal path: ${nodes.join(" to ")}`}
    >
      {nodes.map((node, i) => {
        const lit = reduce || i <= active;
        const isPulse = !reduce && i === active;
        return (
          <div key={node} className="flex items-center gap-x-1.5">
            <span
              aria-hidden
              className="font-mono text-[10px] uppercase tracking-[0.16em] transition-all duration-500 md:text-[11px]"
              style={{
                color: lit ? "var(--glow)" : "var(--faint)",
                borderColor: lit ? "var(--glow)" : "var(--ink-soft)",
                boxShadow: isPulse ? "0 0 18px -2px var(--glow)" : "none",
                borderWidth: 1,
                borderStyle: "solid",
                borderRadius: 10,
                padding: "8px 12px",
                background: isPulse ? "rgba(63,214,200,0.08)" : "transparent",
              }}
            >
              {node}
            </span>
            {i < nodes.length - 1 && (
              <span
                aria-hidden
                className="h-px w-4 shrink-0 transition-colors duration-500 md:w-6"
                style={{ background: i < active || reduce ? "var(--glow)" : "var(--ink-soft)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
