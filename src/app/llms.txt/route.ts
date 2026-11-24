import { SERVICES } from "@/content/services";
import { LED_TYPES } from "@/content/led";
import { ARTICLES } from "@/content/insights";
import { CITIES } from "@/content/cities";
import { CONTACT } from "@/experience/contact";
import { SITE } from "@/content/seo";

/**
 * /llms.txt — a plain-language summary for AI search and assistants
 * (ChatGPT, Perplexity, Google's AI answers), built from the same content as
 * the pages so it never drifts from them.
 */
export const dynamic = "force-static";

export function GET() {
  const list = (items: { title: string; url: string; note?: string }[]) =>
    items.map((i) => `- [${i.title}](${i.url})${i.note ? `: ${i.note}` : ""}`).join("\n");

  const body = `# livegridAV

> livegridAV is a Delhi-based event technology company working across India. It designs, engineers and operates the visual side of live events: LED screens (indoor, outdoor, floor, stage and creative), content and naked-eye 3D / anamorphic visuals, projection mapping, immersive environments, show control and media-server operation, live production, broadcast and streaming, and virtual and hybrid events.

- Office: ${CONTACT.address}, India (the only office)
- Service area: all of India; the crew travels with its own equipment. Frequent cities: Delhi NCR (Delhi, Gurugram, Noida), Mumbai, Hyderabad, Bengaluru and Kolkata.
- Contact: ${CONTACT.email} · ${CONTACT.phoneDisplay} · WhatsApp ${CONTACT.phoneDisplay}
- Start a project: ${SITE}/contact

## Services

${list(SERVICES.map((s) => ({ title: s.title, url: `${SITE}/services/${s.slug}`, note: s.tagline })))}

## LED screens

${list(LED_TYPES.map((t) => ({ title: t.title, url: `${SITE}/led/${t.slug}`, note: t.tagline })))}

## Events by city

${list(CITIES.map((c) => ({ title: c.h1, url: `${SITE}/locations/${c.slug}` })))}

## Guides

${list(ARTICLES.map((a) => ({ title: a.title, url: `${SITE}/insights/${a.slug}` })))}
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
