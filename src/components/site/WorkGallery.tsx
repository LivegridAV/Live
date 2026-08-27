"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { WORK, WORK_CATEGORIES, vibeBg, type WorkCategory } from "@/content/work";

/**
 * The /work gallery — a filterable wall of project tiles. Tiles carry a gentle
 * drifting sheen (decorative, disabled under prefers-reduced-motion) rather than
 * a fake video reel, and each links into its case study.
 */
export default function WorkGallery() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<"All" | WorkCategory>("All");

  const items = active === "All" ? WORK : WORK.filter((w) => w.categories.includes(active));

  return (
    <div>
      {/* filter rail */}
      <div className="flex flex-wrap gap-2.5" role="tablist" aria-label="Filter work by category">
        {WORK_CATEGORIES.map((cat) => {
          const on = cat === active;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(cat)}
              className={`rounded-lg px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                on
                  ? "bg-aqua text-white"
                  : "border border-line text-muted hover:border-aqua hover:text-aqua"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* gallery grid */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Link
            key={p.slug}
            href={`/work/${p.slug}`}
            className="group relative flex min-h-[240px] flex-col justify-end overflow-hidden rounded-[20px] border border-ink-soft p-6 text-text-inv transition-transform duration-300 hover:-translate-y-1"
            style={{ background: vibeBg(p.vibe) }}
          >
            {/* drifting sheen — the tile's quiet sign of life */}
            {!reduce && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(40% 40% at 30% 25%, ${p.vibe}22, transparent 70%)`,
                }}
                animate={{
                  x: ["-8%", "10%", "-8%"],
                  y: ["-6%", "8%", "-6%"],
                  opacity: [0.5, 0.9, 0.5],
                }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            <div className="relative">
              <div className="flex flex-wrap gap-1.5">
                {p.categories.slice(0, 2).map((c) => (
                  <span
                    key={c}
                    className="rounded border border-text-inv/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-inv/70"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-glow/90">
                {p.client} · {p.year}
              </p>
              <h3 className="mt-1.5 text-xl font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-text-inv/60">
                {p.location} · {p.led}
              </p>
              <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.16em] text-glow opacity-0 transition-opacity group-hover:opacity-100">
                View case study →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
