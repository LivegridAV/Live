import type { Metadata } from "next";
import Link from "next/link";
import "./venue.css";
import VenueMount from "@/venue/VenueMount";
import { SERVICES, SERVICE_GROUPS } from "@/content/services";
import { LED_TYPES } from "@/content/led";
import { ZONES } from "@/venue/data/zones";
import { PAVILIONS, PARTNER_BAY } from "@/venue/data/pavilions";
import { CONTACT, contactLinks } from "@/experience/contact";

/**
 * The LivegridAV homepage — a virtual event walkthrough.
 *
 * The WebGL venue is the experience; everything below it is the same business
 * rendered as real, server-side HTML. Search engines, screen readers and
 * anyone without WebGL get the full service catalogue, the real contact
 * details and links to every route — nothing important lives only in a canvas.
 */

export const metadata: Metadata = {
  title: "LivegridAV — Interactive LED, AV & Live Production Experience",
  description:
    "Explore a livegridAV event experience: a four-sided immersive LED tunnel, creative LED installations, working service environments and a main stage that transforms from meetings and conferences to celebrations and social events.",
  alternates: { canonical: "https://livegridav.com/" },
  openGraph: {
    title: "livegridAV — We turn ideas into unforgettable experiences",
    description:
      "Explore LivegridAV capabilities: immersive LED, creative content, AV engineering and two distinct main-stage experiences.",
    url: "https://livegridav.com/",
    siteName: "livegridAV",
    type: "website",
  },
};

const ZONE_COPY: Record<string, string> = {
  arrival:
    "The experience opens outside a premium event entrance at night — brand band lit, light spilling out of the doors.",
  tunnel:
    "A four-sided immersive LED tunnel: left wall, right wall, ceiling and floor running one coordinated image, so the content is continuous across every seam.",
  hall: "The tunnel opens into a full-height exhibition hall — the change of scale is the point.",
  gallery:
    "Creative LED at real scale: pillars, vertical blades, a cylinder, a suspended ring, an LED bar counter, a curved wall, a shaped module mosaic and a 90° anamorphic corner.",
  boulevard:
    "Eight working service environments, each with its own architecture, screens and live content.",
  approach: "Giant LED pillars and portrait displays lead into the arena portal.",
  arena: "A full-scale arena: rigging, trussing, moving lights, haze, flown PA and large-format LED.",
  stage:
    "One main stage, two creative directions. The mode switch changes the content on every surface, the colour of the room and the way the lights behave — the structure never moves.",
  finale: "The house lights fall and every surface resolves into one synchronised brand moment.",
  contact: "Start a project — by form, WhatsApp, phone or email.",
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://livegridav.com/#org",
        name: "livegridAV",
        url: "https://livegridav.com",
        email: CONTACT.email,
        telephone: CONTACT.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: "20-1320 Serilingampally",
          addressLocality: "Hyderabad",
          addressRegion: "Telangana",
          postalCode: "500050",
          addressCountry: "IN",
        },
        description:
          "livegridAV designs, engineers and operates LED displays, immersive content, projection mapping, show control and live event production.",
      },
      {
        "@type": "WebSite",
        "@id": "https://livegridav.com/#website",
        url: "https://livegridav.com",
        name: "livegridAV",
        publisher: { "@id": "https://livegridav.com/#org" },
      },
      {
        "@type": "ItemList",
        name: "livegridAV services",
        itemListElement: SERVICES.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: s.title,
          url: `https://livegridav.com/services/${s.slug}`,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <VenueMount />

      {/* ── Everything that matters, as real HTML ── */}
      <section className="v-seo">
        <div className="v-seo-inner">
          <div>
            <p className="v-mono">livegridAV · Hyderabad</p>
            <h1>We turn ideas into unforgettable experiences</h1>
            <p style={{ marginTop: 18 }}>
              livegridAV designs, engineers and operates the visual side of live
              events: LED displays and creative screen installations, content and
              3D/anamorphic visuals, projection mapping, immersive environments,
              show control and media-server operation, live production, broadcast
              and streaming, virtual and hybrid events, and web development.
            </p>
            <p>
              The page above is a walkthrough of an event experience built in the browser —
              scroll and the camera moves through it. If you would rather read
              than walk, everything is here.
            </p>
          </div>

          <div>
            <h2>What you walk through</h2>
            <div className="v-seo-grid">
              {ZONES.filter((z) => ZONE_COPY[z.id]).map((z) => (
                <article key={z.id} className="v-seo-card">
                  <h3>{z.title}</h3>
                  <p>{ZONE_COPY[z.id]}</p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <h2>What we do</h2>
            <p>
              Every service below has its own page. In the experience they are
              grouped into eight distinct working environments plus a partner bay,
              because related work is delivered together.
            </p>
            <div className="v-seo-grid">
              {PAVILIONS.map((p) => (
                <article key={p.id} className="v-seo-card">
                  <p className="v-mono">We do · {p.no}</p>
                  <h3 style={{ marginTop: 8 }}>{p.headline}</h3>
                  <p style={{ marginBottom: 10 }}>{p.support}</p>
                  <ul className="v-seo-list">
                    {p.services.map((slug) => {
                      const s = SERVICES.find((x) => x.slug === slug);
                      return s ? (
                        <li key={slug}>
                          <Link href={`/services/${slug}`}>{s.title}</Link>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </article>
              ))}
              <article className="v-seo-card">
                <p className="v-mono">Partner bay</p>
                <h3 style={{ marginTop: 8 }}>{PARTNER_BAY.headline}</h3>
                <p style={{ marginBottom: 10 }}>{PARTNER_BAY.note}</p>
                <ul className="v-seo-list">
                  {PARTNER_BAY.services.map((slug) => {
                    const s = SERVICES.find((x) => x.slug === slug);
                    return s ? (
                      <li key={slug}>
                        <Link href={`/services/${slug}`}>{s.title}</Link>
                      </li>
                    ) : null;
                  })}
                </ul>
              </article>
            </div>
          </div>

          <div>
            <h2>All services</h2>
            <div className="v-seo-grid">
              {SERVICE_GROUPS.map((g) => (
                <div key={g.id}>
                  <h3>{g.label}</h3>
                  <p style={{ marginBottom: 10 }}>{g.blurb}</p>
                  <ul className="v-seo-list">
                    {SERVICES.filter((s) => s.group === g.id).map((s) => (
                      <li key={s.slug}>
                        <Link href={`/services/${s.slug}`}>{s.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2>LED display types</h2>
            <ul className="v-seo-list" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", display: "grid" }}>
              {LED_TYPES.map((t) => (
                <li key={t.slug}>
                  <Link href={`/led/${t.slug}`}>{t.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2>Start a project</h2>
            <p>
              Tell us the event, the venue, the date and what you need on screen,
              and we will come back with how we would design, engineer and run it.
            </p>
            <ul className="v-seo-list">
              <li>
                <a href={contactLinks.whatsapp()}>WhatsApp {CONTACT.phoneDisplay}</a>
              </li>
              <li>
                <a href={contactLinks.call()}>Call {CONTACT.phoneDisplay}</a>
              </li>
              <li>
                <a href={contactLinks.email()}>{CONTACT.email}</a>
              </li>
              <li>
                <Link href="/contact">Send a project brief</Link>
              </li>
            </ul>
            <p style={{ marginTop: 14 }}>livegridAV · {CONTACT.address}</p>
          </div>

          <nav className="v-seo-foot" aria-label="Site">
            <Link href="/services">Services</Link>
            <Link href="/work">Work</Link>
            <Link href="/led">LED</Link>
            <Link href="/av-lab">AV Lab</Link>
            <Link href="/equipment">Technology</Link>
            <Link href="/insights">Insights</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </section>
    </>
  );
}
