import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import HeroVisual from "@/components/site/HeroVisual";
import { ARTICLES } from "@/content/insights";

export const metadata: Metadata = {
  title: "Insights — LED, Content, Show Control & Event AV Explained | LiveGridAV",
  description:
    "Plain-language guides to event AV — pixel pitch, indoor vs outdoor LED, floor LED, anamorphic content, media server operators, projection mapping and hybrid events.",
  alternates: { canonical: "https://livegridav.com/insights" },
  openGraph: {
    title: "LiveGridAV Insights — event AV, explained simply",
    description: "Useful guides to LED, content, show control and live production.",
    url: "https://livegridav.com/insights",
    siteName: "livegridAV",
    type: "website",
  },
};

export default function InsightsHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "LiveGridAV Insights",
    url: "https://livegridav.com/insights",
    blogPost: ARTICLES.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      datePublished: a.datePublished,
      url: `https://livegridav.com/insights/${a.slug}`,
    })),
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-paper pt-32 pb-14 md:pt-40 md:pb-16">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Insights</p>
            <h1 className="mt-4 max-w-[22ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              Event AV, explained simply.
            </h1>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-muted">
              Short, useful answers to the questions we hear most — so you can plan
              with confidence before you even call us.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <HeroVisual variant="insights" />
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-14 md:py-20">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ARTICLES.map((a, i) => (
              <Reveal key={a.slug} delay={(i % 3) * 0.05}>
                <Link
                  href={`/insights/${a.slug}`}
                  className="group flex h-full flex-col rounded-[20px] border border-line bg-paper p-7 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/40 hover:shadow-[0_18px_40px_-24px_rgba(31,160,147,0.5)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-aqua">
                      {a.category}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                      {a.readMins} min
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold leading-snug tracking-[-0.01em] text-text group-hover:text-aqua">
                    {a.title}
                  </h2>
                  <p className="mt-2 leading-relaxed text-muted">{a.excerpt}</p>
                  <span className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-aqua opacity-0 transition-opacity group-hover:opacity-100">
                    Read →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-20 text-text-inv md:py-24">
        <div className="mx-auto max-w-[720px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={14} gap={4} palette="dark" animate glow />
          </div>
          <h2 className="mt-7 text-2xl font-semibold tracking-[-0.02em] md:text-4xl">
            Got a question we haven&rsquo;t answered?
          </h2>
          <p className="mx-auto mt-4 max-w-[44ch] leading-relaxed text-text-inv/60">
            Ask us directly — we&rsquo;re happy to talk through your event.
          </p>
          <Link
            href="/contact"
            className="mt-7 inline-block rounded-xl bg-glow px-7 py-3.5 text-sm font-medium text-ink transition-[filter] hover:brightness-110"
          >
            Start a project
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
