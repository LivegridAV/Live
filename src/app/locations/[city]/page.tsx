import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import { contactLinks } from "@/experience/contact";
import { CITIES, getCity } from "@/content/cities";
import { getService } from "@/content/services";
import { BRAND, PROVIDER, SITE } from "@/content/seo";

/**
 * A city page. Not linked from the menu or footer — see src/content/cities.ts
 * for why, and for the content rules these pages follow.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) return {};
  const url = `${SITE}/locations/${city.slug}`;
  return {
    title: city.metaTitle,
    description: city.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: city.metaTitle,
      description: city.metaDescription,
      url,
      siteName: BRAND,
      type: "website",
      locale: "en_IN",
    },
  };
}

const eyebrow = "font-mono text-xs uppercase tracking-[0.2em] text-aqua";

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = getCity(slug);
  if (!city) notFound();

  const url = `${SITE}/locations/${city.slug}`;
  const services = city.highlights.flatMap((h) => {
    const s = getService(h.service);
    return s ? [{ ...h, title: s.title }] : [];
  });
  const cityName = city.alsoKnownAs ?? city.name;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `LED screen rental and event AV in ${city.name}`,
      serviceType: "Event LED, AV and live production",
      description: city.metaDescription,
      url,
      provider: PROVIDER,
      areaServed: { "@type": "City", name: cityName },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `${BRAND} services in ${city.name}`,
        itemListElement: [
          ...(city.rental?.screens ?? []).map((s) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: `${s.name} rental (${s.pitch}) in ${city.name}`,
              description: s.bestFor,
              url: `${SITE}/led/${s.led}`,
            },
          })),
          ...services.map((s) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: s.title, url: `${SITE}/services/${s.service}` },
          })),
        ],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: city.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: city.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-paper pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className={eyebrow}>{BRAND} · {city.region}</p>
            <h1 className="mt-4 max-w-[22ch] text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-text md:text-6xl">
              {city.h1}
            </h1>
            <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-muted">{city.tagline}</p>
            {city.intro.map((p) => (
              <p key={p} className="mt-4 max-w-[64ch] leading-relaxed text-muted">{p}</p>
            ))}
          </Reveal>
        </div>
      </section>

      {city.rental && (
        <section className="border-b border-line bg-white py-16 md:py-24">
          <div className="mx-auto max-w-[1180px] px-6 md:px-12">
            <Reveal>
              <p className={eyebrow}>Screens on rent</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-text md:text-4xl">
                {city.rental.heading}
              </h2>
              <p className="mt-5 max-w-[64ch] leading-relaxed text-muted">{city.rental.intro}</p>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {city.rental.screens.map((s, i) => (
                <Reveal key={s.name} delay={i * 0.05}>
                  <Link
                    href={`/led/${s.led}`}
                    className="group flex h-full flex-col rounded-[20px] border border-line bg-paper p-6 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/40"
                  >
                    <span className="font-mono text-2xl font-semibold text-aqua">{s.pitch}</span>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.01em] text-text group-hover:text-aqua">{s.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{s.bestFor}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
            <div className="mt-12 grid gap-12 md:grid-cols-2">
              <Reveal>
                <h3 className="text-base font-semibold text-text">Every rental includes</h3>
                <ul className="mt-4 space-y-3">
                  {city.rental.included.map((item) => (
                    <li key={item} className="flex gap-3 leading-relaxed text-muted">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={0.08}>
                <h3 className="text-base font-semibold text-text">How the price is worked out</h3>
                <p className="mt-4 max-w-[56ch] leading-relaxed text-muted">{city.rental.pricing}</p>
                <h3 className="mt-8 text-base font-semibold text-text">Areas we cover</h3>
                <p className="mt-4 leading-relaxed text-muted">{city.rental.areas.join(" · ")}</p>
                <p className="mt-6 text-sm leading-relaxed text-faint">
                  Not sure which screen fits?{" "}
                  <Link href="/insights/what-pixel-pitch-for-event-led" className="text-aqua underline-offset-4 hover:underline">
                    How to choose a pixel pitch
                  </Link>
                </p>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className={eyebrow}>What we bring to {city.name}</p>
          </Reveal>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {services.map((s, i) => (
              <Reveal key={s.service} delay={(i % 2) * 0.05}>
                <Link
                  href={`/services/${s.service}`}
                  className="group flex h-full flex-col rounded-[20px] border border-line bg-paper p-6 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/40"
                >
                  <h2 className="text-lg font-semibold tracking-[-0.01em] text-text group-hover:text-aqua">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.note}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper py-16 md:py-24">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 md:grid-cols-2 md:px-12">
          <Reveal>
            <p className={eyebrow}>Events in {city.name}</p>
            <p className="mt-6 max-w-[56ch] leading-relaxed text-text">{city.scene}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <p className={eyebrow}>Where events happen</p>
            <ul className="mt-6 space-y-3">
              {city.venues.map((v) => (
                <li key={v} className="flex gap-3 leading-relaxed text-muted">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua" />
                  {v}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-relaxed text-faint">
              Every venue has its own load-in times, power and rigging rules — we plan the build to them.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1180px] px-6 md:px-12">
          <Reveal>
            <p className={eyebrow}>How a {city.name} show comes together</p>
          </Reveal>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {city.logistics.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.05}>
                <li className="h-full rounded-[20px] border border-line bg-paper p-6">
                  <span className="font-mono text-xs text-aqua">0{i + 1}</span>
                  <h3 className="mt-3 text-base font-semibold text-text">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-paper py-16 md:py-24">
        <div className="mx-auto max-w-[860px] px-6 md:px-12">
          <Reveal>
            <p className={eyebrow}>Questions</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-text md:text-4xl">
              Events in {city.name}: good to know
            </h2>
          </Reveal>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {city.faq.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-text [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="font-mono text-lg text-aqua transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-[62ch] leading-relaxed text-muted">{f.a}</p>
              </details>
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
            Planning an event in {city.name}?
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-text-inv/60">
            Tell us the date, venue and audience and we&rsquo;ll come back with the right screens and a plan.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="rounded-xl bg-glow px-7 py-3.5 text-sm font-medium text-ink transition-[filter] hover:brightness-110"
            >
              Start a project
            </Link>
            <a
              href={contactLinks.whatsapp(`Hi livegridAV — I'd like a quote for an event in ${city.name}.`)}
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
