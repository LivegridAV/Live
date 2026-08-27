"use client";
import Link from "next/link";
import Reveal from "../Reveal";
import SignalGrid from "../SignalGrid";
import ServiceDemo, { SERVICE_DEMO } from "./ServiceDemo";
import Icon, { SERVICE_ICON } from "./Icon";
import { contactLinks } from "@/experience/contact";
import { PROJECTS } from "@/content/site";
import { getService, type ServiceDetail } from "@/content/services";

/**
 * The one template every /services/[slug] page renders. Server route passes the
 * plain-data ServiceDetail; this client view adds the scroll reveals and the
 * live signal-flow visual. Every section from the brief's service-page spec is
 * here — no dead links, no empty blocks.
 */

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">{children}</p>
  );
}

/** Non-clickable reference cards — real content from the project model, not buttons. */
function relatedWork(order: string) {
  const start = (parseInt(order, 10) - 1) % PROJECTS.length;
  return [0, 1, 2].map((i) => PROJECTS[(start + i) % PROJECTS.length]);
}

export default function ServiceDetailView({ service }: { service: ServiceDetail }) {
  const related = service.related
    .map(getService)
    .filter((s): s is ServiceDetail => Boolean(s));
  const work = relatedWork(service.order);
  const waText = `Hi LiveGridAV — I'd like to talk about ${service.title} for an event.`;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-paper pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="mx-auto grid max-w-[1180px] gap-14 px-6 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-12">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              <Link href="/services" className="transition-colors hover:text-aqua">
                Services
              </Link>
              <span className="px-2">/</span>
              <span className="text-muted">{service.eyebrow}</span>
            </nav>
            <span className="lg-icon-badge mb-5" style={{ width: 52, height: 52 }}>
              <Icon name={SERVICE_ICON[service.slug] ?? "spark"} size={26} />
            </span>
            <SectionEyebrow>{`${service.order} · ${service.eyebrow}`}</SectionEyebrow>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              {service.title}
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
              {service.tagline}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={contactLinks.whatsapp(waText)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-aqua px-6 py-3 text-sm font-medium text-white transition-[filter] hover:brightness-110"
              >
                Start on WhatsApp
              </a>
              <a
                href={contactLinks.email(`${service.title} — enquiry`)}
                className="rounded-xl border border-line px-6 py-3 text-sm font-medium text-text transition-colors hover:border-aqua hover:text-aqua"
              >
                Email the brief
              </a>
            </div>
          </Reveal>

          {/* the unforgettable moment: a live, animated demo of this service */}
          <Reveal delay={0.1}>
            <ServiceDemo demo={SERVICE_DEMO[service.slug] ?? "signal"} />
            <p className="mt-5 max-w-[48ch] text-sm leading-relaxed text-muted">
              {service.plain}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── What we do · Where it's used ─────────────────── */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-[1180px] gap-14 px-6 md:grid-cols-2 md:px-12">
          <Reveal>
            <SectionEyebrow>What we do</SectionEyebrow>
            <ul className="mt-6 space-y-4">
              {service.whatWeDo.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed text-text">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.08}>
            <SectionEyebrow>Where it&rsquo;s used</SectionEyebrow>
            <ul className="mt-6 space-y-4">
              {service.whereUsed.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed text-muted">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-line" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── How it works (workflow) ──────────────────────── */}
      <section className="bg-paper py-20 md:py-28">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <SectionEyebrow>How it works</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-text md:text-4xl">
              From brief to screen
            </h2>
          </Reveal>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {service.workflow.map((w, i) => (
              <Reveal as="li" key={w.step} delay={(i % 3) * 0.06}>
                <div className="flex h-full flex-col rounded-[20px] border border-line bg-white p-7">
                  <span className="font-mono text-[11px] tracking-[0.2em] text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-text">
                    {w.step}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted">{w.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Technical capability · Related systems ───────── */}
      <section className="bg-ink py-20 text-text-inv md:py-28">
        <div className="mx-auto grid max-w-[1180px] gap-14 px-6 md:grid-cols-[1.2fr_0.8fr] md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-glow">
              Technical capability
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {service.capability.map((c) => (
                <li key={c} className="flex gap-3 leading-relaxed text-text-inv/85">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-glow" />
                  {c}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-glow">
              Related systems
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {service.systems.map((s) => (
                <span
                  key={s}
                  className="rounded-lg border border-ink-soft px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-inv/70"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-5 max-w-[40ch] text-sm leading-relaxed text-text-inv/45">
              Technology shown where it&rsquo;s relevant to the work — configured and
              sourced to the requirement of each event.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Recent work (reference content, not links) ───── */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <SectionEyebrow>Recent work</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-text md:text-4xl">
              Where we&rsquo;ve done this
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {work.map((p, i) => (
              <Reveal key={p.name} delay={(i % 3) * 0.06}>
                <article className="flex h-full flex-col rounded-[20px] border border-line bg-paper p-7">
                  <span
                    aria-hidden
                    className="h-1.5 w-10 rounded-full"
                    style={{ background: p.vibe }}
                  />
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-text">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {p.client} · {p.location} · {p.year}
                  </p>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-faint">
                    {p.led}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="bg-paper py-20 md:py-28">
        <div className="mx-auto max-w-[760px] px-6 md:px-12">
          <Reveal>
            <SectionEyebrow>Questions</SectionEyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-text md:text-4xl">
              Good to know
            </h2>
          </Reveal>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {service.faq.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-text [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="font-mono text-lg text-aqua transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[62ch] leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related services ─────────────────────────────── */}
      {related.length > 0 && (
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-[1180px] px-6 md:px-12">
            <Reveal>
              <SectionEyebrow>Related services</SectionEyebrow>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal key={r.slug} delay={(i % 3) * 0.06}>
                  <Link
                    href={`/services/${r.slug}`}
                    className="group flex h-full flex-col rounded-[20px] border border-line bg-paper p-7 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/40 hover:shadow-[0_18px_40px_-24px_rgba(31,160,147,0.5)]"
                  >
                    <span className="font-mono text-[11px] tracking-[0.2em] text-faint">
                      {r.order}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-text group-hover:text-aqua">
                      {r.title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-muted">{r.tagline}</p>
                    <span className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-aqua">
                      Explore →
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA band ─────────────────────────────────────── */}
      <section className="bg-ink py-24 text-text-inv md:py-32">
        <div className="mx-auto max-w-[760px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={16} gap={4} palette="dark" animate glow />
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            Let&rsquo;s plan your {service.title.toLowerCase()}.
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] leading-relaxed text-text-inv/60">
            Tell us about the event — venue, date and what you want on screen — and
            we&rsquo;ll take it from there.
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
            <a
              href={contactLinks.email(`${service.title} — enquiry`)}
              className="rounded-xl border border-ink-soft px-7 py-3.5 text-sm font-medium text-text-inv transition-colors hover:border-glow hover:text-glow"
            >
              Email the brief
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
