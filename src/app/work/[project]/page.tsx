import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import WorkDetailView from "@/components/site/WorkDetailView";
import { WORK, getProject, projectSummary } from "@/content/work";

export const dynamicParams = false;

export function generateStaticParams() {
  return WORK.map((w) => ({ project: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ project: string }>;
}): Promise<Metadata> {
  const { project: slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  const url = `https://livegridav.com/work/${project.slug}`;
  const description = projectSummary(project);
  return {
    title: `${project.name} — ${project.client} | LiveGridAV Work`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${project.name} — LiveGridAV`,
      description,
      url,
      siteName: "livegridAV",
      type: "article",
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const url = `https://livegridav.com/work/${project.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: project.name,
      about: project.categories.join(", "),
      description: projectSummary(project),
      dateCreated: project.year,
      locationCreated: { "@type": "Place", name: project.location },
      creator: { "@type": "Organization", name: "LiveGridAV", url: "https://livegridav.com" },
      url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://livegridav.com" },
        { "@type": "ListItem", position: 2, name: "Work", item: "https://livegridav.com/work" },
        { "@type": "ListItem", position: 3, name: project.name, item: url },
      ],
    },
  ];

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WorkDetailView project={project} />
    </PageShell>
  );
}
