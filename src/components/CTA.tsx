import Reveal from "./Reveal";
import SignalGrid from "./SignalGrid";
import { CONTACT, contactLinks } from "@/experience/contact";

export default function CTA() {
  return (
    <section id="contact" className="relative overflow-hidden bg-ink py-28 text-text-inv md:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(63,214,200,0.45) 0%, transparent 65%)",
        }}
      />
      <div className="relative mx-auto flex max-w-[1180px] flex-col items-center px-6 text-center md:px-12">
        <Reveal>
          <div className="flex justify-center">
            <SignalGrid cell={30} gap={6} palette="dark" />
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 className="mt-10 max-w-[16ch] text-4xl font-semibold tracking-[-0.03em] md:text-6xl">
            Let&apos;s light up your space.
          </h2>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-text-inv/70">
            Tell us about the wall, the room, or the moment you want to create.
            We&apos;ll design the signal that fits.
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href={contactLinks.email()}
              className="rounded-xl bg-glow px-7 py-3.5 font-medium text-ink transition-[filter] hover:brightness-110"
            >
              Start your build
            </a>
            <a
              href={contactLinks.whatsapp()}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-ink-soft px-7 py-3.5 font-medium text-text-inv transition-colors hover:border-glow hover:text-glow"
            >
              WhatsApp
            </a>
            <a
              href={contactLinks.email()}
              className="font-mono text-sm tracking-[0.06em] text-text-inv/70 underline-offset-4 transition-colors hover:text-glow hover:underline"
            >
              {CONTACT.email}
            </a>
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
            {CONTACT.phoneDisplay} · {CONTACT.address}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
