import type { Metadata } from "next";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import ContactBrief from "@/components/site/ContactBrief";
import HeroVisual from "@/components/site/HeroVisual";
import { CONTACT, contactLinks } from "@/experience/contact";

export const metadata: Metadata = {
  title: "Contact — Start a Project | LiveGridAV",
  description:
    "Tell LiveGridAV what you're building — event type, what you need, date, venue and audience — and start a project. Reach us by brief, email, phone or WhatsApp.",
  alternates: { canonical: "https://livegridav.com/contact" },
  openGraph: {
    title: "Start a project with LiveGridAV",
    description: "Send a project brief, or reach us on WhatsApp, email or phone.",
    url: "https://livegridav.com/contact",
    siteName: "livegridAV",
    type: "website",
  },
};

export default function Contact() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact LiveGridAV",
    url: "https://livegridav.com/contact",
    mainEntity: {
      "@type": "Organization",
      name: "LiveGridAV",
      email: CONTACT.email,
      telephone: CONTACT.phone,
      address: { "@type": "PostalAddress", streetAddress: CONTACT.address },
    },
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="bg-paper pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Contact</p>
            <h1 className="mt-4 max-w-[22ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              What are we building?
            </h1>
            <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-muted">
              Tell us about the event and we&rsquo;ll come back with how we&rsquo;d
              design, engineer and run it. The more you share, the sharper our first
              response.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <HeroVisual variant="contact" />
          </Reveal>
        </div>
      </section>

      <section className="bg-white pb-24 md:pb-32">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-[1.4fr_0.6fr] md:px-12">
          <Reveal>
            <ContactBrief />
          </Reveal>

          <Reveal delay={0.1}>
            <aside className="rounded-[24px] bg-ink p-8 text-text-inv">
              <SignalGrid cell={12} gap={3} palette="dark" animate glow />
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-glow">
                Or reach us directly
              </p>
              <ul className="mt-5 space-y-4 text-sm">
                <li>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Email</span>
                  <a href={contactLinks.email()} className="mt-1 block text-text-inv/85 transition-colors hover:text-glow">
                    {CONTACT.email}
                  </a>
                </li>
                <li>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Phone</span>
                  <a href={contactLinks.call()} className="mt-1 block text-text-inv/85 transition-colors hover:text-glow">
                    {CONTACT.phoneDisplay}
                  </a>
                </li>
                <li>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">WhatsApp</span>
                  <a
                    href={contactLinks.whatsapp()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-text-inv/85 transition-colors hover:text-glow"
                  >
                    Message us
                  </a>
                </li>
                <li>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Studio</span>
                  <span className="mt-1 block text-text-inv/70">{CONTACT.address}</span>
                </li>
              </ul>
            </aside>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
