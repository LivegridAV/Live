import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import ServiceDetailView from "@/components/site/ServiceDetailView";
import { SERVICES, getService } from "@/content/services";
import { CONTACT } from "@/experience/contact";

// Fixed catalogue → only these slugs are built; anything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  const url = `https://livegridav.com/services/${service.slug}`;
  return {
    title: service.metaTitle,
    description: service.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: service.metaTitle,
      description: service.metaDescription,
      url,
      siteName: "livegridAV",
      type: "website",
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const url = `https://livegridav.com/services/${service.slug}`;

  // Structured data — crawlable answers for search + AI discovery (brief §49/50).
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.title,
      serviceType: service.eyebrow,
      description: service.metaDescription,
      url,
      provider: {
        "@type": "Organization",
        name: "LiveGridAV",
        email: CONTACT.email,
        telephone: CONTACT.phone,
        url: "https://livegridav.com",
      },
      areaServed: "IN",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://livegridav.com" },
        { "@type": "ListItem", position: 2, name: "Services", item: "https://livegridav.com/services" },
        { "@type": "ListItem", position: 3, name: service.title, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: service.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServiceDetailView service={service} />
    </PageShell>
  );
}
