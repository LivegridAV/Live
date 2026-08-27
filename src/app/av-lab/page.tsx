import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import AvLabExplorer from "@/components/site/AvLabExplorer";
import { contactLinks } from "@/experience/contact";

export const metadata: Metadata = {
  title: "AV Lab — Explore the Signal Path | LiveGridAV",
  description:
    "Explore how event AV signals travel — camera, media server, LED processor, Watchout playback and streaming — in an interactive walkthrough of the full signal path.",
  alternates: { canonical: "https://livegridav.com/av-lab" },
  openGraph: {
    title: "LiveGridAV AV Lab — the signal path, explored",
    description: "An interactive walkthrough of how event AV signals travel from source to screen.",
    url: "https://livegridav.com/av-lab",
    siteName: "livegridAV",
    type: "website",
  },
};

export default function AvLab() {
  return (
    <PageShell>
      <section className="bg-paper pt-32 pb-14 md:pt-40 md:pb-16">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">AV Lab</p>
            <h1 className="mt-4 max-w-[20ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              Follow the signal.
            </h1>
            <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted">
              Every screen you see at an event is the end of a signal path. Pick a
              source below and watch how it travels from camera, server or playback
              all the way to the LED, the projectors and the stream.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-ink py-16 text-text-inv md:py-24">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <AvLabExplorer />
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Why it matters</p>
            <h2 className="mt-4 max-w-[24ch] text-3xl font-semibold tracking-[-0.02em] text-text md:text-4xl">
              Understanding the whole path is what keeps a show up.
            </h2>
            <p className="mt-5 max-w-[62ch] leading-relaxed text-muted">
              When you know every step a signal takes, you can plan redundancy, catch
              problems before they reach the screen, and keep the program clean under
              pressure. That&rsquo;s the difference between renting equipment and
              running a production.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/services/av-engineering"
                className="rounded-xl bg-aqua px-6 py-3 text-sm font-medium text-white transition-[filter] hover:brightness-110"
              >
                AV Engineering
              </Link>
              <Link
                href="/services/show-control-media-server"
                className="rounded-xl border border-line px-6 py-3 text-sm font-medium text-text transition-colors hover:border-aqua hover:text-aqua"
              >
                Show Control & Media Servers
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-ink py-24 text-text-inv md:py-32">
        <div className="mx-auto max-w-[720px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={16} gap={4} palette="dark" animate glow />
          </div>
          <h2 className="mt-8 text-3xl font-semibold tracking-[-0.02em] md:text-5xl">
            Put this to work on your show.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-text-inv/60">
            Tell us about the event and we&rsquo;ll design the signal path to match.
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
