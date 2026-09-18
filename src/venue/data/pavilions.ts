import { SERVICES, type ServiceDetail } from "@/content/services";

/**
 * Service pavilions on the exhibition boulevard.
 *
 * Every service in `src/content/services.ts` is represented — related services
 * share a pavilion so the boulevard reads as eight distinct exhibition stalls
 * rather than fifteen identical booths, while every individual service keeps
 * its own route, copy and detail panel.
 */

export interface Pavilion {
  id: string;
  /** boulevard number, "01" … "08" */
  no: string;
  headline: string;
  /**
   * The discipline itself, as a noun phrase, so the venue can say
   * "We Do <doing>". The headline is free to be evocative — "Content without
   * boundaries" — but "We Do Content without boundaries" is not a sentence,
   * so the naming reads from here instead.
   */
  doing: string;
  support: string;
  /** slugs from src/content/services.ts, first is the primary */
  services: string[];
  /** which side of the boulevard: -1 left, +1 right */
  side: -1 | 1;
  /** world Z of the pavilion centre */
  z: number;
  /** progress at which the camera is level with it */
  p: number;
  /** media ids for the pavilion's screens, main first */
  screens: string[];
  /** accent used by the pavilion's architectural lighting (natural, not neon) */
  accent: string;
  /** structural variant so no two pavilions share a silhouette */
  form: "console" | "gallery" | "rack" | "vault" | "control" | "broadcast" | "link" | "studio";
}

export const PAVILIONS: Pavilion[] = [
  {
    id: "av-engineering",
    no: "01",
    headline: "AV Engineering",
    doing: "AV Engineering",
    support: "From technical planning to show-ready systems.",
    services: ["av-engineering"],
    side: -1,
    z: -112,
    p: 0.592,
    screens: ["av-signal-diagram", "av-led-plan", "av-rack-status"],
    accent: "#8fa3b8",
    form: "console",
  },
  {
    id: "content-studio",
    no: "02",
    headline: "Content without boundaries",
    doing: "Content & Visual Production",
    support: "Motion, 3D and anamorphic content built for the exact canvas.",
    services: ["content-design", "3d-anamorphic", "presentation-content"],
    side: 1,
    z: -127,
    p: 0.617,
    screens: ["content-motion", "content-3d", "content-anamorphic"],
    accent: "#d9a05f",
    form: "gallery",
  },
  {
    id: "led-solutions",
    no: "03",
    headline: "LED Display Solutions",
    doing: "LED Display Solutions",
    support: "Screen technology, system engineering and creative application.",
    services: ["led-display-rental"],
    side: -1,
    z: -142,
    p: 0.642,
    screens: ["led-formats", "led-pitch", "led-install"],
    accent: "#c3cbd2",
    form: "rack",
  },
  {
    id: "spatial",
    no: "04",
    headline: "Spatial Experiences",
    doing: "Projection Mapping & Spatial",
    support: "Projection mapping and immersive rooms — architecture as the screen.",
    services: ["projection-mapping", "immersive-experiences"],
    side: 1,
    z: -157,
    p: 0.667,
    screens: ["mapping-facade", "immersive-room", "mapping-warp"],
    accent: "#b98a6a",
    form: "vault",
  },
  {
    id: "show-control",
    no: "05",
    headline: "Show Control & Media Servers",
    doing: "Show Control & Media Servers",
    support: "VJ, timeline and console operation — cued, previewed, programmed.",
    services: ["show-control-media-server"],
    side: -1,
    z: -172,
    p: 0.692,
    screens: ["sc-cues", "sc-preview", "sc-program", "sc-sources"],
    accent: "#7f9aa8",
    form: "control",
  },
  {
    id: "live-production",
    no: "06",
    headline: "Live Production & Broadcast",
    doing: "Live Production & Broadcast",
    support: "Multi-camera, multiview, program and stream — run as one.",
    services: ["live-production", "broadcast-streaming"],
    side: 1,
    z: -187,
    p: 0.717,
    screens: ["lp-multiview", "lp-program", "lp-stream"],
    accent: "#a8705f",
    form: "broadcast",
  },
  {
    id: "connected-events",
    no: "07",
    headline: "One event. Every audience.",
    doing: "Connected & Hybrid Events",
    support: "Virtual and hybrid — the room and everyone outside it, together.",
    services: ["virtual-events", "hybrid-events"],
    side: -1,
    z: -202,
    p: 0.742,
    screens: ["ce-stage", "ce-remote", "ce-map"],
    accent: "#7ea390",
    form: "link",
  },
  {
    id: "digital",
    no: "08",
    headline: "Digital experiences beyond the venue",
    doing: "Digital Experiences",
    support: "Immersive sites, microsites and web applications. Including this one.",
    services: ["web-development"],
    side: 1,
    z: -217,
    p: 0.767,
    screens: ["web-showreel", "web-code", "web-devices"],
    accent: "#9d95c0",
    form: "studio",
  },
];

/** The sound & lighting partner bay — related, but deliberately distinct. */
export const PARTNER_BAY = {
  id: "partner-bay",
  headline: "Sound & Lighting",
  doing: "Sound & Lighting",
  support: "Delivered with trusted production partners.",
  note: "Specified, coordinated and integrated into the show by us — supplied and operated by specialist partner vendors, not from owned inventory.",
  services: ["professional-sound", "professional-lighting"],
  side: 1 as const,
  z: -231,
  p: 0.789,
  screens: ["partner-bay"],
  accent: "#c08a54",
};

/* ── lookups ───────────────────────────────────────────── */

const BY_SLUG = new Map(SERVICES.map((s) => [s.slug, s]));

export function service(slug: string): ServiceDetail | undefined {
  return BY_SLUG.get(slug);
}

export function pavilionServices(p: Pick<Pavilion, "services">): ServiceDetail[] {
  return p.services.map((s) => BY_SLUG.get(s)).filter(Boolean) as ServiceDetail[];
}

export function pavilionById(id: string) {
  if (id === PARTNER_BAY.id) return PARTNER_BAY;
  return PAVILIONS.find((p) => p.id === id);
}

/** How close (in progress) the camera must be for a pavilion to wake up. */
export const PAVILION_RANGE = 0.016;

/** Every service slug represented somewhere on the boulevard — used by tests. */
export const REPRESENTED_SLUGS = [
  ...PAVILIONS.flatMap((p) => p.services),
  ...PARTNER_BAY.services,
];
