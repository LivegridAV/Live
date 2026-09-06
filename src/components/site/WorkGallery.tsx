"use client";
import { useState } from "react";
import Link from "next/link";
import { WORK, WORK_CATEGORIES, vibeBg, type WorkCategory, type WorkItem } from "@/content/work";

/**
 * The /work gallery — a filterable wall of project tiles. Each tile carries a
 * distinct ambient motion chosen from its own project category and tinted to its
 * vibe (LED shimmer / event beams / show-control scan / anamorphic depth) — a
 * real per-project sign of life, not a fake video reel. All motion is disabled
 * under prefers-reduced-motion (CSS). Each tile links into its case study.
 */

/**
 * Distinct ambient-motion variant per project, chosen from the set that genuinely
 * fits its real categories, then spread deterministically by a slug hash so the
 * grid shows variety (LED shimmer / event beams / show-control scan / depth)
 * instead of one repeated animation.
 */
type FxVariant = "led" | "beam" | "scan" | "depth";
function motionVariant(p: WorkItem): FxVariant {
  const applicable: FxVariant[] = [];
  if (p.categories.includes("Anamorphic")) applicable.push("depth");
  if (p.categories.includes("Live Events")) applicable.push("beam");
  if (p.categories.includes("Show Control") || p.categories.includes("Hybrid")) applicable.push("scan");
  applicable.push("led"); // every project is an LED project
  const hash = [...p.slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return applicable[hash % applicable.length];
}

export default function WorkGallery() {
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
            {/* project-specific ambient motion — the tile's quiet sign of life */}
            <span
              aria-hidden
              className={`lg-cardfx lg-cardfx-${motionVariant(p)}`}
              style={{ ["--vibe" as string]: p.vibe }}
            />

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
                See the system →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
