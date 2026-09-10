import type { MetadataRoute } from "next";
import { SERVICES } from "@/content/services";
import { WORK } from "@/content/work";
import { LED_TYPES } from "@/content/led";
import { ARTICLES } from "@/content/insights";

// Required for `output: export` — emit a static sitemap.xml at build time.
export const dynamic = "force-static";

const BASE = "https://livegridav.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const monthly = "monthly" as const;
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: monthly, priority: 1 },
    { url: `${BASE}/work`, lastModified: now, changeFrequency: monthly, priority: 0.9 },
    { url: `${BASE}/services`, lastModified: now, changeFrequency: monthly, priority: 0.9 },
    { url: `${BASE}/led`, lastModified: now, changeFrequency: monthly, priority: 0.8 },
    { url: `${BASE}/av-lab`, lastModified: now, changeFrequency: monthly, priority: 0.7 },
    { url: `${BASE}/equipment`, lastModified: now, changeFrequency: monthly, priority: 0.7 },
    { url: `${BASE}/insights`, lastModified: now, changeFrequency: monthly, priority: 0.7 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    ...SERVICES.map((s) => ({
      url: `${BASE}/services/${s.slug}`,
      lastModified: now,
      changeFrequency: monthly,
      priority: 0.8,
    })),
    ...WORK.map((w) => ({
      url: `${BASE}/work/${w.slug}`,
      lastModified: now,
      changeFrequency: monthly,
      priority: 0.7,
    })),
    ...LED_TYPES.map((t) => ({
      url: `${BASE}/led/${t.slug}`,
      lastModified: now,
      changeFrequency: monthly,
      priority: 0.6,
    })),
    ...ARTICLES.map((a) => ({
      url: `${BASE}/insights/${a.slug}`,
      lastModified: now,
      changeFrequency: monthly,
      priority: 0.6,
    })),
  ];
}
