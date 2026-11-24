/**
 * The one business record every page hands to search engines.
 *
 * livegridAV has one office, in Delhi, and travels to any city for events. So
 * the record carries exactly one address and names the country and the main
 * cities as the area served — Google's guidance for a service-area business.
 * Never add an address for a city we only travel to: a made-up office gets a
 * business listing suspended.
 */
import { CONTACT } from "@/experience/contact";

export const SITE = "https://livegridav.com";
export const BRAND = "livegridAV";
export const ORG_ID = `${SITE}/#org`;

/** Cities named as served. Slugs match /locations/<slug>. */
export const SERVED_CITIES = [
  { slug: "delhi", name: "Delhi", wikidata: "Q1353" },
  { slug: "mumbai", name: "Mumbai", wikidata: "Q1156" },
  { slug: "hyderabad", name: "Hyderabad", wikidata: "Q1361" },
  { slug: "bangalore", name: "Bengaluru", wikidata: "Q1355" },
  { slug: "kolkata", name: "Kolkata", wikidata: "Q1348" },
] as const;

export const AREA_SERVED = [
  { "@type": "Country", name: "India" },
  ...SERVED_CITIES.map((c) => ({
    "@type": "City",
    name: c.name,
    sameAs: `https://www.wikidata.org/wiki/${c.wikidata}`,
  })),
];

export const ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "Uday Vihar 2, Khushi Ram Park, Nangloi",
  addressLocality: "Delhi",
  addressRegion: "Delhi",
  postalCode: "110041",
  addressCountry: "IN",
} as const;

/** Full business record — the home page publishes it under ORG_ID. */
export const ORGANIZATION = {
  "@type": ["Organization", "ProfessionalService"],
  "@id": ORG_ID,
  name: BRAND,
  url: SITE,
  logo: `${SITE}/brand/app-icon.svg`,
  image: `${SITE}/opengraph-image.jpg`,
  email: CONTACT.email,
  telephone: CONTACT.phone,
  address: ADDRESS,
  areaServed: AREA_SERVED,
  description:
    "livegridAV is a Delhi-based event technology company working across India. It designs, engineers and operates LED displays, immersive content, projection mapping, show control and live event production.",
} as const;

/** Short provider reference for Service / Article records on other pages. */
export const PROVIDER = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: BRAND,
  url: SITE,
  email: CONTACT.email,
  telephone: CONTACT.phone,
  address: ADDRESS,
} as const;
