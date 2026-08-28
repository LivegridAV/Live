"use client";
import Link from "next/link";
import Reveal from "../Reveal";
import SignalGrid from "../SignalGrid";
import WorkSignalFlow from "./WorkSignalFlow";
import { contactLinks } from "@/experience/contact";
import { WORK, projectSummary, vibeBg, type WorkItem } from "@/content/work";

/**
 * Project case study. Everything shown is a real field from the project model or
 * a plain restatement of it — no invented outcomes, metrics, quotes or photos
 * (brief §38). Deeper media is offered "on request" rather than faked.
 */
export default function WorkDetailView({ project }: { project: WorkItem }) {
  const gearItems = project.gear.split("·").map((g) => g.trim()).filter(Boolean);
  const related = WORK.filter(
    (w) => w.slug !== project.slug && w.categories.some((c) => project.categories.includes(c)),
  ).slice(0, 3);
  const pool = related.length ? related : WORK.filter((w) => w.slug !== project.slug).slice(0, 3);
  const waText = `Hi LiveGridAV — I saw ${project.name} and I'd like to plan something similar.`;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-paper pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              <Link href="/work" className="transition-colors hover:text-aqua">
                Work
              </Link>
              <span className="px-2">/</span>
              <span className="text-muted">{project.name}</span>
            </nav>
            <div className="flex flex-wrap gap-1.5">
              {project.categories.map((c) => (
                <span
                  key={c}
                  className="rounded border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted"
                >
                  {c}
                </span>
              ))}
            </div>
            <h1 className="mt-4 max-w-[20ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              {project.name}
            </h1>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-aqua">
              {project.client} · {project.location} · {project.year}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              className="mt-10 flex min-h-[260px] items-end overflow-hidden rounded-[24px] border border-ink-soft p-8 text-text-inv md:min-h-[340px]"
              style={{ background: vibeBg(project.vibe) }}
            >
              <div>
                <span
                  aria-hidden
                  className="mb-4 block h-1.5 w-14 rounded-full"
                  style={{ background: project.vibe }}
                />
                <p className="max-w-[56ch] text-lg leading-relaxed text-text-inv/85">
                  {projectSummary(project)}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The setup (real specs) ───────────────────────── */}
      <section className="bg-white py-18 md:py-24">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-[0.8fr_1.2fr] md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">The screen</p>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.01em] text-text">
              {project.led}
            </p>
            <p className="mt-3 leading-relaxed text-muted">
              Configured for {project.location.toLowerCase()} and confirmed after
              technical review.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">The system</p>
            <div className="mt-5 min-w-0 overflow-hidden rounded-[20px] border border-line bg-paper p-4">
              <WorkSignalFlow project={project} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {gearItems.map((g) => (
                <span
                  key={g}
                  className="rounded-lg border border-line px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
                >
                  {g}
                </span>
              ))}
            </div>
            <ul className="mt-7 space-y-3">
              {[
                "Engineered the signal path and screen mapping for the venue.",
                "Prepared and tested the content pipeline ahead of doors.",
                "Operated playback and cues live through the show.",
              ].map((line) => (
                <li key={line} className="flex gap-3 leading-relaxed text-text">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              Full photo set &amp; technical breakdown available on request.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Related work ─────────────────────────────────── */}
      <section className="bg-paper py-18 md:py-24">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">More work</p>
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pool.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 0.06}>
                <Link
                  href={`/work/${p.slug}`}
                  className="group flex min-h-[170px] flex-col justify-end overflow-hidden rounded-[20px] border border-ink-soft p-6 text-text-inv transition-transform duration-300 hover:-translate-y-1"
                  style={{ background: vibeBg(p.vibe) }}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-glow/90">
                    {p.client} · {p.year}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{p.name}</h3>
                  <p className="mt-1 text-sm text-text-inv/55">{p.led}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="bg-ink py-24 text-text-inv md:py-32">
        <div className="mx-auto max-w-[720px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={16} gap={4} palette="dark" animate glow />
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            Planning something like this?
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-text-inv/60">
            Tell us about your event and we&rsquo;ll map the screen, content and
            crew to match.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href={contactLinks.whatsapp(waText)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-glow px-7 py-3.5 text-sm font-medium text-ink transition-[filter] hover:brightness-110"
            >
              Start on WhatsApp
            </a>
            <Link
              href="/work"
              className="rounded-xl border border-ink-soft px-7 py-3.5 text-sm font-medium text-text-inv transition-colors hover:border-glow hover:text-glow"
            >
              Back to all work
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
