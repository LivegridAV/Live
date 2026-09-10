import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import { contactLinks } from "@/experience/contact";
import { LED_TYPES, getLedType } from "@/content/led";

export const dynamicParams = false;

export function generateStaticParams() {
  return LED_TYPES.map((t) => ({ type: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const led = getLedType(type);
  if (!led) return {};
  const url = `https://livegridav.com/led/${led.slug}`;
  return {
    title: led.metaTitle,
    description: led.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: led.metaTitle,
      description: led.metaDescription,
      url,
      siteName: "livegridAV",
      type: "website",
    },
  };
}

export default async function LedTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const led = getLedType(type);
  if (!led) notFound();

  const others = LED_TYPES.filter((t) => t.slug !== led.slug);
  const url = `https://livegridav.com/led/${led.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://livegridav.com" },
      { "@type": "ListItem", position: 2, name: "LED", item: "https://livegridav.com/led" },
      { "@type": "ListItem", position: 3, name: led.title, item: url },
    ],
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-paper pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              <Link href="/led" className="transition-colors hover:text-aqua">LED</Link>
              <span className="px-2">/</span>
              <span className="text-muted">{led.title}</span>
            </nav>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">LED</p>
            <h1 className="mt-4 max-w-[20ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              {led.title}
            </h1>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">{led.tagline}</p>
            <p className="mt-4 max-w-[62ch] leading-relaxed text-muted">{led.plain}</p>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-2 md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">What to know</p>
            <ul className="mt-6 space-y-4">
              {led.points.map((p) => (
                <li key={p} className="flex gap-3 leading-relaxed text-text">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua" />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Best for</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {led.bestFor.map((b) => (
                <span key={b} className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted">
                  {b}
                </span>
              ))}
            </div>
            <div className="mt-8 rounded-[18px] border border-line bg-paper p-6">
              <p className="text-sm leading-relaxed text-muted">
                LED specification depends on your exact venue and audience. Rough out a
                screen with the{" "}
                <Link href="/led" className="text-aqua hover:underline">pixel-pitch planner</Link>, or see the full{" "}
                <Link href="/services/led-display-rental" className="text-aqua hover:underline">
                  LED Display Solutions
                </Link>{" "}
                service.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Other LED types */}
      <section className="bg-paper py-16 md:py-20">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Other LED types</p>
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((t, i) => (
              <Reveal key={t.slug} delay={(i % 4) * 0.05}>
                <Link
                  href={`/led/${t.slug}`}
                  className="group flex h-full flex-col rounded-[20px] border border-line bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/40"
                >
                  <h3 className="text-base font-semibold tracking-[-0.01em] text-text group-hover:text-aqua">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t.tagline}</p>
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
            Planning {led.title.toLowerCase()}?
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-text-inv/60">
            Tell us the venue and audience and we&rsquo;ll confirm the right screen.
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
