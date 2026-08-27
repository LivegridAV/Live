import type { Metadata } from "next";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import WorkGallery from "@/components/site/WorkGallery";
import HeroVisual from "@/components/site/HeroVisual";
import { contactLinks } from "@/experience/contact";
import { WORK } from "@/content/work";

export const metadata: Metadata = {
  title: "Work — LED, Live Events, Anamorphic & Show Control | LiveGridAV",
  description:
    "Selected LiveGridAV work: LED walls, live events, naked-eye 3D, projection and show-control across corporate launches, concerts, keynotes and hybrid events.",
  alternates: { canonical: "https://livegridav.com/work" },
  openGraph: {
    title: "LiveGridAV — Selected work",
    description:
      "Shows we've engineered, built and operated — LED, content, anamorphic and live production.",
    url: "https://livegridav.com/work",
    siteName: "livegridAV",
    type: "website",
  },
};

export default function WorkHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "LiveGridAV Work",
    itemListElement: WORK.map((w, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: w.name,
      url: `https://livegridav.com/work/${w.slug}`,
    })),
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="bg-paper pt-32 pb-14 md:pt-40 md:pb-16">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Work</p>
            <h1 className="mt-4 max-w-[22ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              Shows we&rsquo;ve brought to life.
            </h1>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-muted">
              A wall of recent projects — LED, content, anamorphic, projection and
              live show control. Filter by what you&rsquo;re planning, then open a
              case study.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <HeroVisual variant="work" />
          </Reveal>
        </div>
      </section>

      <section className="bg-white pb-20 pt-6 md:pb-28">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <WorkGallery />
        </div>
      </section>

      <section className="bg-ink py-24 text-text-inv md:py-32">
        <div className="mx-auto max-w-[720px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={16} gap={4} palette="dark" animate glow />
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            Your show could be next.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-text-inv/60">
            Tell us what you&rsquo;re planning and we&rsquo;ll show you how we&rsquo;d
            build it.
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
