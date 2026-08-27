import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import PixelPitchTool from "@/components/site/PixelPitchTool";
import Icon, { type IconName } from "@/components/site/Icon";
import { contactLinks } from "@/experience/contact";
import { LED_TYPES } from "@/content/led";

export const metadata: Metadata = {
  title: "LED Screens — Indoor, Outdoor, Floor, Stage & Creative | LiveGridAV",
  description:
    "Understand event LED — indoor, outdoor, floor, stage and creative screens — and use our pixel-pitch planner to rough out the right screen for your venue and audience.",
  alternates: { canonical: "https://livegridav.com/led" },
  openGraph: {
    title: "Event LED, explained — with a pixel-pitch planner",
    description:
      "Indoor, outdoor, floor, stage and creative LED, plus a planning tool to rough out your screen.",
    url: "https://livegridav.com/led",
    siteName: "livegridAV",
    type: "website",
  },
};

const FACTORS: { t: string; b: string; icon: IconName }[] = [
  { t: "Viewing distance", b: "How close the nearest audience sits drives how fine the panel needs to be.", icon: "eye" },
  { t: "Screen size", b: "Width and height set the resolution and the rigging or ground support.", icon: "expand" },
  { t: "Indoor or outdoor", b: "Outdoor needs more brightness and weather rating; indoor prioritises image quality.", icon: "building" },
  { t: "Camera use", b: "Filmed or streamed screens usually need a finer pitch to look clean on camera.", icon: "camera" },
  { t: "Brightness", b: "Ambient light in the room or outdoors sets how bright the screen must be.", icon: "sun" },
  { t: "Budget", b: "We balance pitch, size and quality against what the event needs to spend.", icon: "tag" },
];

export default function LedHub() {
  return (
    <PageShell>
      <section className="bg-paper pt-32 pb-14 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">LED</p>
            <h1 className="mt-4 max-w-[20ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              LED, planned around your event.
            </h1>
            <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted">
              LED is a wall of light made from small panels that join into one big
              screen. The right one depends on your audience, venue and content — so
              start by understanding the types, then rough out a screen below.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Factors */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">What decides the screen</p>
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FACTORS.map((f, i) => (
              <Reveal key={f.t} delay={(i % 3) * 0.05}>
                <div className="rounded-[20px] border border-line bg-paper p-6">
                  <span className="lg-icon-badge lg-icon-badge-sm">
                    <Icon name={f.icon} size={20} />
                  </span>
                  <h2 className="mt-4 text-base font-semibold tracking-[-0.01em] text-text">{f.t}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pixel pitch tool */}
      <section className="bg-paper py-16 md:py-20">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <PixelPitchTool />
          </Reveal>
        </div>
      </section>

      {/* LED types */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text md:text-4xl">
              Types of event LED
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {LED_TYPES.map((t, i) => (
              <Reveal key={t.slug} delay={(i % 3) * 0.05}>
                <Link
                  href={`/led/${t.slug}`}
                  className="group flex h-full flex-col rounded-[20px] border border-line bg-paper p-7 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/40 hover:shadow-[0_18px_40px_-24px_rgba(31,160,147,0.5)]"
                >
                  <SignalGrid cell={9} gap={2.5} palette="dark" animate={false} glow={false} />
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.01em] text-text group-hover:text-aqua">
                    {t.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted">{t.tagline}</p>
                  <span className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-aqua opacity-0 transition-opacity group-hover:opacity-100">
                    Explore →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-24 text-text-inv md:py-32">
        <div className="mx-auto max-w-[720px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={16} gap={4} palette="dark" animate glow />
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            Let&rsquo;s spec your screen.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-text-inv/60">
            Send the venue and audience and we&rsquo;ll confirm the right LED after a
            quick technical review.
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
