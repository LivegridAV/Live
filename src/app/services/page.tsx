import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import { contactLinks } from "@/experience/contact";
import { SERVICES, SERVICE_GROUPS } from "@/content/services";

export const metadata: Metadata = {
  title: "Services — AV Engineering, Content, LED & Show Control | LiveGridAV",
  description:
    "LiveGridAV's services: AV engineering, content and visual production, LED display solutions, 3D anamorphic content and show-control / media-server operations — one visual production team.",
  alternates: { canonical: "https://livegridav.com/services" },
  openGraph: {
    title: "LiveGridAV Services — one visual production team",
    description:
      "Engineering, content, LED and live operation — the complete visual system, designed, built and run by one team.",
    url: "https://livegridav.com/services",
    siteName: "livegridAV",
    type: "website",
  },
};

export default function ServicesHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "LiveGridAV Services",
    itemListElement: SERVICES.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.title,
      url: `https://livegridav.com/services/${s.slug}`,
    })),
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-paper pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Services</p>
            <h1 className="mt-4 max-w-[20ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              One team for the whole visual show.
            </h1>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-muted">
              From the signal path to the content on screen to the operator firing
              cues live — LiveGridAV designs, builds and runs the parts of your
              event the audience actually sees.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Grouped service cards */}
      {SERVICE_GROUPS.map((group) => {
        const items = SERVICES.filter((s) => s.group === group.id);
        if (items.length === 0) return null;
        return (
          <section key={group.id} className="border-t border-line bg-white py-16 md:py-20">
            <div className="mx-auto max-w-[1180px] px-6 md:px-12">
              <Reveal>
                <div className="flex items-center gap-4">
                  <SignalGrid cell={10} gap={2.5} palette="dark" animate={false} glow={false} />
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.01em] text-text md:text-2xl">
                      {group.label}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{group.blurb}</p>
                  </div>
                </div>
              </Reveal>

              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s, i) => (
                  <Reveal key={s.slug} delay={(i % 3) * 0.06}>
                    <Link
                      href={`/services/${s.slug}`}
                      className="group flex h-full flex-col rounded-[20px] border border-line bg-paper p-7 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/40 hover:shadow-[0_18px_40px_-24px_rgba(31,160,147,0.5)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] tracking-[0.2em] text-faint">
                          {s.order}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-aqua opacity-0 transition-opacity group-hover:opacity-100">
                          Explore →
                        </span>
                      </div>
                      <h3 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-text group-hover:text-aqua">
                        {s.title}
                      </h3>
                      <p className="mt-2 leading-relaxed text-muted">{s.tagline}</p>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <section className="bg-ink py-24 text-text-inv md:py-32">
        <div className="mx-auto max-w-[720px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={16} gap={4} palette="dark" animate glow />
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            Not sure which you need?
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-text-inv/60">
            Tell us about the event and we&rsquo;ll map the right combination — from
            one screen to a full production.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href={contactLinks.whatsapp()}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-glow px-7 py-3.5 text-sm font-medium text-ink transition-[filter] hover:brightness-110"
            >
              Start on WhatsApp
            </a>
            <a
              href={contactLinks.email()}
              className="rounded-xl border border-ink-soft px-7 py-3.5 text-sm font-medium text-text-inv transition-colors hover:border-glow hover:text-glow"
            >
              Email the brief
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
