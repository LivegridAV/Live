import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import HeroVisual from "@/components/site/HeroVisual";
import { contactLinks, CONTACT } from "@/experience/contact";
import { COMPANY, STATS } from "@/content/site";

export const metadata: Metadata = {
  title: "About — Engineers, Creators, Operators, Storytellers | LiveGridAV",
  description:
    "LiveGridAV combines AV engineering, content creation and live show operation. We design the visuals, engineer the system, create the content and operate it live — as one team.",
  alternates: { canonical: "https://livegridav.com/about" },
  openGraph: {
    title: "About LiveGridAV — the team that connects creativity and technology",
    description:
      "Engineers, creators, operators and storytellers — one team for the whole visual show.",
    url: "https://livegridav.com/about",
    siteName: "livegridAV",
    type: "website",
  },
};

const ROLES = ["Engineers.", "Creators.", "Operators.", "Storytellers."];

// The journey from brief §62 — the whole job, in plain language.
const JOURNEY = [
  { k: "Your idea", v: "It starts with what you want your audience to feel and remember." },
  { k: "We design the visuals", v: "The look of the show — stage graphics, content and motion." },
  { k: "We engineer the AV system", v: "The signal path, screens and processing, planned to stay reliable." },
  { k: "We create the content", v: "Built pixel-perfect for your exact screen, including 3D and anamorphic." },
  { k: "We program the show", v: "Timelines and cues, so the right content hits at the right moment." },
  { k: "We operate it live", v: "Our team runs playback, screens and cues through the whole show." },
  { k: "Your audience experiences it", v: "One production that feels effortless from the seats." },
];

// The working process from brief §36.
const WORKFLOW = [
  { n: "01", t: "Idea", b: "We map the story, venue, audience and run of show." },
  { n: "02", t: "Design", b: "The visual language and stage look are set." },
  { n: "03", t: "Content", b: "Motion, 3D and presentation content is built to screen." },
  { n: "04", t: "System", b: "Screens, signal path and playback are engineered." },
  { n: "05", t: "Programming", b: "Cues and timelines are built and refined." },
  { n: "06", t: "Installation", b: "Clean build, cabling and calibration on site." },
  { n: "07", t: "Operation", b: "The show is rehearsed and run live by our team." },
  { n: "08", t: "Show", b: "Your audience experiences it as one seamless production." },
];

export default function About() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LiveGridAV",
    url: "https://livegridav.com",
    email: CONTACT.email,
    telephone: CONTACT.phone,
    description: COMPANY.intro,
    address: { "@type": "PostalAddress", streetAddress: CONTACT.address },
    areaServed: "IN",
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-paper pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">About</p>
            <h1 className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-4xl font-semibold tracking-[-0.02em] text-text md:text-6xl">
              {ROLES.map((r, i) => (
                <span key={r} className={i === 3 ? "text-aqua" : undefined}>
                  {r}
                </span>
              ))}
            </h1>
            <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-muted">
              {COMPANY.intro}
            </p>
            <p className="mt-4 max-w-[60ch] leading-relaxed text-muted">
              Not simply equipment. Not simply content. Not simply operators. The
              combination is the difference — one team that connects the creative
              side and the technical side of your event.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <HeroVisual variant="about" />
          </Reveal>
        </div>
      </section>

      {/* The journey (brief §62) */}
      <section className="bg-ink py-20 text-text-inv md:py-28">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <div className="flex items-center gap-4">
              <SignalGrid cell={12} gap={3} palette="dark" animate glow />
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-glow">
                  The whole job
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.01em] md:text-3xl">
                  From your idea to your audience.
                </h2>
              </div>
            </div>
          </Reveal>
          <ol className="mt-12 space-y-0">
            {JOURNEY.map((s, i) => (
              <Reveal as="li" key={s.k} delay={(i % 4) * 0.05}>
                <div className="flex gap-5 border-t border-ink-soft py-5">
                  <span className="mt-1 font-mono text-[11px] tracking-[0.2em] text-glow">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-text-inv">{s.k}</h3>
                    <p className="mt-1 max-w-[60ch] leading-relaxed text-text-inv/60">{s.v}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Technical capabilities — capability parameters, confirmed per project.
          Not a track record of verified counts (none are claimed). */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Technical capabilities</p>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">
              Capability parameters — the range of what we design and operate,
              scoped and confirmed per project.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={(i % 4) * 0.06}>
                <div className="rounded-[20px] border border-line bg-paper p-7">
                  <p className="text-4xl font-semibold tracking-[-0.02em] text-text">
                    {s.value}
                    <span className="text-aqua">{s.suffix}</span>
                  </p>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                    {s.label}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{s.story}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How we work (brief §36) */}
      <section className="bg-paper py-20 md:py-28">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">How we work</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-text md:text-4xl">
              Idea to show, one team throughout.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((w, i) => (
              <Reveal key={w.n} delay={(i % 4) * 0.06}>
                <div className="flex h-full flex-col rounded-[20px] border border-line bg-white p-6">
                  <span className="font-mono text-[11px] tracking-[0.2em] text-faint">{w.n}</span>
                  <h3 className="mt-3 text-base font-semibold tracking-[-0.01em] text-text">
                    {w.t}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{w.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/services"
                className="rounded-xl bg-aqua px-6 py-3 text-sm font-medium text-white transition-[filter] hover:brightness-110"
              >
                See what we do
              </Link>
              <Link
                href="/work"
                className="rounded-xl border border-line px-6 py-3 text-sm font-medium text-text transition-colors hover:border-aqua hover:text-aqua"
              >
                See our work
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-24 text-text-inv md:py-32">
        <div className="mx-auto max-w-[720px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={16} gap={4} palette="dark" animate glow />
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            Trust us with your show.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-text-inv/60">
            Tell us about your event and we&rsquo;ll show you how we&rsquo;d design,
            build and run it.
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
