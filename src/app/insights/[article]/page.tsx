import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import Reveal from "@/components/Reveal";
import SignalGrid from "@/components/SignalGrid";
import { ARTICLES, getArticle } from "@/content/insights";

export const dynamicParams = false;

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ article: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ article: string }>;
}): Promise<Metadata> {
  const { article: slug } = await params;
  const a = getArticle(slug);
  if (!a) return {};
  const url = `https://livegridav.com/insights/${a.slug}`;
  return {
    title: a.metaTitle,
    description: a.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: a.metaTitle,
      description: a.metaDescription,
      url,
      siteName: "livegridAV",
      type: "article",
      publishedTime: a.datePublished,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ article: string }>;
}) {
  const { article: slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();

  const related = a.related.map(getArticle).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const url = `https://livegridav.com/insights/${a.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.metaDescription,
      datePublished: a.datePublished,
      articleSection: a.category,
      author: { "@type": "Organization", name: "LiveGridAV" },
      publisher: { "@type": "Organization", name: "LiveGridAV", url: "https://livegridav.com" },
      mainEntityOfPage: url,
      url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://livegridav.com" },
        { "@type": "ListItem", position: 2, name: "Insights", item: "https://livegridav.com/insights" },
        { "@type": "ListItem", position: 3, name: a.title, item: url },
      ],
    },
  ];

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="bg-paper pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-[760px] px-6 md:px-12">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              <Link href="/insights" className="transition-colors hover:text-aqua">Insights</Link>
              <span className="px-2">/</span>
              <span className="text-muted">{a.category}</span>
            </nav>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-aqua">
              {a.category} · {a.readMins} min read
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-text md:text-5xl">
              {a.title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">{a.excerpt}</p>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="mt-10 space-y-8">
              {a.sections.map((s, i) => (
                <section key={i}>
                  {s.heading && (
                    <h2 className="text-xl font-semibold tracking-[-0.01em] text-text">{s.heading}</h2>
                  )}
                  <div className={s.heading ? "mt-3 space-y-4" : "space-y-4"}>
                    {s.paras.map((p, j) => (
                      <p key={j} className="leading-relaxed text-text/85">{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </Reveal>

          {/* Inline links to services */}
          <Reveal delay={0.08}>
            <div className="mt-10 rounded-[18px] border border-line bg-white p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Go deeper</p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {a.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-aqua transition-colors hover:text-text">
                      {l.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </article>

      {related.length > 0 && (
        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-[1180px] px-6 md:px-12">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Keep reading</p>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <Reveal key={r.slug} delay={(i % 3) * 0.05}>
                  <Link
                    href={`/insights/${r.slug}`}
                    className="group flex h-full flex-col rounded-[20px] border border-line bg-paper p-7 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/40"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-aqua">
                      {r.category}
                    </span>
                    <h3 className="mt-3 text-base font-semibold leading-snug tracking-[-0.01em] text-text group-hover:text-aqua">
                      {r.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{r.excerpt}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-ink py-20 text-text-inv md:py-24">
        <div className="mx-auto max-w-[720px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={14} gap={4} palette="dark" animate glow />
          </div>
          <h2 className="mt-7 text-2xl font-semibold tracking-[-0.02em] md:text-4xl">
            Planning something? Let&rsquo;s talk.
          </h2>
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
