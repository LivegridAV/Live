import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import Icon, { EQUIPMENT_ICON } from "@/components/site/Icon";
import HeroVisual from "@/components/site/HeroVisual";
import { contactLinks } from "@/experience/contact";
import { EQUIPMENT_DIRECTORY } from "@/content/equipment";
import { getService } from "@/content/services";

export const metadata: Metadata = {
  title: "Equipment — AV Technology Directory | LiveGridAV",
  description:
    "An educational guide to event AV technology — LED, video processing, media servers, switching, projection, camera, streaming, sound and lighting — and what each part does.",
  alternates: { canonical: "https://livegridav.com/equipment" },
  openGraph: {
    title: "LiveGridAV Equipment — AV technology, explained",
    description:
      "What each part of an event AV system does, and the technology we use where it's relevant.",
    url: "https://livegridav.com/equipment",
    siteName: "livegridAV",
    type: "website",
  },
};

export default function Equipment() {
  return (
    <PageShell>
      <section className="bg-paper pt-32 pb-14 md:pt-40 md:pb-16">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Equipment</p>
            <h1 className="mt-4 max-w-[22ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              The kit, explained.
            </h1>
            <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted">
              This isn&rsquo;t a shop. It&rsquo;s a plain-language guide to the parts
              of an event AV system — what each one does, and the technology we use
              where it&rsquo;s relevant. The right configuration is always confirmed
              after a technical review of your event.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <HeroVisual variant="equipment" />
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {EQUIPMENT_DIRECTORY.map((cat, i) => {
              const svc = cat.service ? getService(cat.service) : undefined;
              return (
                <Reveal key={cat.name} delay={(i % 3) * 0.05}>
                  <article className="flex h-full flex-col rounded-[20px] border border-line bg-paper p-7">
                    <div className="flex items-center justify-between">
                      <span className="lg-icon-badge">
                        <Icon name={EQUIPMENT_ICON[cat.name] ?? "spark"} />
                      </span>
                      <span className="font-mono text-[11px] tracking-[0.2em] text-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h2 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-text">
                      {cat.name}
                    </h2>
                    <p className="mt-2 leading-relaxed text-muted">{cat.what}</p>
                    {cat.tech.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {cat.tech.map((t) => (
                          <span
                            key={t}
                            className="rounded border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {svc && (
                      <Link
                        href={`/services/${svc.slug}`}
                        className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-aqua transition-colors hover:text-text"
                      >
                        {svc.title} →
                      </Link>
                    )}
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-ink py-24 text-text-inv md:py-32">
        <div className="mx-auto max-w-[720px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={16} gap={4} palette="dark" animate glow />
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            Tell us the event, we&rsquo;ll spec the system.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-text-inv/60">
            We configure and source to the requirement of each event — one point of
            technical responsibility, the right specialists for the job.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="rounded-xl bg-glow px-7 py-3.5 text-sm font-medium text-ink transition-[filter] hover:brightness-110"
            >
              Start a project
            </Link>
            <a
              href={contactLinks.whatsapp()}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-ink-soft px-7 py-3.5 text-sm font-medium text-text-inv transition-colors hover:border-glow hover:text-glow"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
