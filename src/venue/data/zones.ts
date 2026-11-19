import { EXHIBITION_PROGRESS as EP } from "./placements";

/**
 * The venue is divided into zones along the camera path. A zone owns a slice
 * of `progress`, a HUD label, and the copy that fades in while the visitor is
 * inside it. Zone ranges are also what the loader uses to decide which assets
 * must be ready before the doors open.
 */

export interface Zone {
  id: string;
  /** mono HUD label */
  label: string;
  /** headline shown in the ambient overlay */
  title: string;
  /** one supporting line */
  line: string;
  /** [start, end] progress */
  range: [number, number];
  /** loading priority — 0 loads before the visitor may enter */
  priority: 0 | 1 | 2;
}

export const ZONES: Zone[] = [
  {
    id: "arrival",
    label: "Arrival",
    title: "We turn ideas into unforgettable experiences",
    line: "Scroll to begin the experience.",
    range: [0, 0.14],
    priority: 0,
  },
  {
    id: "tunnel",
    label: "Immersive Tunnel",
    title: "Four surfaces, one environment",
    line: "Emerald Current flows across the floor, walls and ceiling. Warm architecture, calm water, one shared rhythm.",
    range: [0.14, 0.285],
    priority: 0,
  },
  {
    id: "hall",
    label: "Exhibition Hall",
    title: "Inside the grid",
    line: "A working exhibition of what LED can be when it stops being a rectangle.",
    range: [0.285, EP.pillars.start],
    priority: 1,
  },
  {
    id: "gallery",
    label: "LED Pillars",
    title: "Four-sided LED pillars",
    line: "Four coordinated LED surfaces, with continuous artwork around each column.",
    range: EP.pillars.range,
    priority: 1,
  },
  {
    id: "reception",
    label: "Reception",
    title: "Reception & curved LED",
    line: "A cylindrical display, suspended halo, panoramic curve and LED reception counter.",
    range: [EP.reception.start, EP.rental.start],
    priority: 1,
  },
  {
    id: "led-rental",
    label: "LED Rental Solutions",
    title: "LED rental solutions · For every vision",
    line: "Floating LED formats, creative displays and a full-scale rental showcase.",
    range: [EP.rental.start, EP.anamorphic.start],
    priority: 1,
  },
  {
    id: "gallery-finish",
    label: "Content Studio",
    title: "Anamorphic corner & Content Studio",
    line: "A continuous corner illusion, an open studio and a gallery of visual content.",
    range: [EP.anamorphic.start, EP.technical.start],
    priority: 1,
  },
  {
    id: "technical",
    label: "Technical Showcase",
    title: "AV engineering · Show control · Live production",
    line: "Design, integrate, cue, capture and deliver — one connected technical team.",
    range: [EP.technical.start, EP.projection.start],
    priority: 1,
  },
  {
    id: "boulevard",
    label: "Projection Mapping",
    title: "Transform spaces into stories",
    line: "Projection mapping, immersive content and dimensional storytelling.",
    range: EP.projection.range,
    priority: 1,
  },
  {
    id: "approach",
    label: "Arena Approach",
    title: "Toward the main room",
    line: "The scale changes.",
    range: [EP.projection.end, 0.846],
    priority: 2,
  },
  {
    id: "arena",
    label: "Main Arena",
    title: "One stage, built for anything",
    line: "Rigging, trussing, movers, haze and large-format LED.",
    range: [0.846, 0.926],
    priority: 2,
  },
  {
    id: "stage",
    label: "Main Stage",
    title: "One stage. Every experience.",
    line: "Same infrastructure — switch the creative direction.",
    range: [0.926, 0.958],
    priority: 2,
  },
  {
    id: "finale",
    label: "Finale",
    title: "livegridAV",
    line: "We turn ideas into unforgettable experiences.",
    range: [0.958, 0.986],
    priority: 2,
  },
  {
    id: "contact",
    label: "Contact",
    title: "Let's build your next experience",
    line: "Tell us what you're planning.",
    range: [0.986, 1.0001],
    priority: 2,
  },
];

export function zoneAt(progress: number): Zone {
  for (const z of ZONES) {
    if (progress >= z.range[0] && progress < z.range[1]) return z;
  }
  return progress < 0.5 ? ZONES[0] : ZONES[ZONES.length - 1];
}

/** 0 → 1 position *within* the given zone. */
export function zoneLocal(progress: number, zone: Zone) {
  const [a, b] = zone.range;
  return Math.min(1, Math.max(0, (progress - a) / (b - a)));
}

/**
 * Jump targets for the progress rail and the mobile sheet. Labels deliberately
 * avoid colliding with the route names in the nav — "What We Do" and "Finale"
 * are places inside the venue, "Services" and "Contact" are pages.
 */
export const NAV_STOPS: { id: string; label: string; p: number }[] = [
  { id: "arrival", label: "Entrance", p: 0.0 },
  { id: "tunnel", label: "LED Tunnel", p: 0.185 },
  { id: "gallery", label: "LED Pillars", p: EP.pillars.overview },
  { id: "reception", label: "Reception", p: EP.reception.overview },
  { id: "led-rental", label: "LED Rental Solutions", p: EP.rental.overview },
  { id: "gallery-finish", label: "Content Studio", p: EP.anamorphic.overview },
  { id: "technical", label: "Technical Showcase", p: EP.technical.overview },
  { id: "boulevard", label: "Projection Mapping", p: EP.projection.overview },
  { id: "arena", label: "Arena", p: 0.865 },
  { id: "stage", label: "Main Stage", p: 0.941 },
  { id: "contact", label: "Finale", p: 1.0 },
];
