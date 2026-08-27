/**
 * Work catalogue — derives slugs, categories and gallery data from the real
 * PROJECTS model in site.ts (the single source of truth, also used by the 3D
 * projects-city scene). We only classify and restate real fields here; no
 * outcomes, quotes or numbers are invented (brief §38).
 */
import { PROJECTS, type Project } from "./site";

export type WorkCategory =
  | "Corporate"
  | "Live Events"
  | "LED"
  | "Anamorphic"
  | "Projection"
  | "Show Control"
  | "Hybrid"
  | "Content";

export interface WorkItem extends Project {
  slug: string;
  categories: WorkCategory[];
}

/** Deterministic url-safe slug from a project name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Honest classification of each project from its real led/gear description.
 * Keyed by project name so it stays stable if the array order changes.
 */
const CATEGORIES: Record<string, WorkCategory[]> = {
  "Skyline Music Fest": ["Live Events", "LED", "Show Control"],
  "Nova Auto Launch": ["Corporate", "Anamorphic", "LED", "Content"],
  "Summit ONE Keynote": ["Corporate", "LED", "Show Control"],
  "Neon City EDM Night": ["Live Events", "LED", "Show Control"],
  "Heritage Gala": ["Live Events", "Projection", "LED"],
  "Hybrid Product Expo": ["Hybrid", "Corporate", "LED"],
  "Championship Finals": ["Live Events", "LED", "Show Control"],
  "Royal Wedding Show": ["Live Events", "LED"],
  "Brand World Tour": ["Corporate", "LED", "Live Events"],
};

export const WORK: WorkItem[] = PROJECTS.map((p) => ({
  ...p,
  slug: slugify(p.name),
  categories: CATEGORIES[p.name] ?? ["LED"],
}));

/** Filter order for the gallery — "All" plus every category actually in use. */
export const WORK_CATEGORIES: ("All" | WorkCategory)[] = [
  "All",
  ...(["Corporate", "Live Events", "LED", "Anamorphic", "Projection", "Show Control", "Hybrid", "Content"] as WorkCategory[]).filter(
    (c) => WORK.some((w) => w.categories.includes(c)),
  ),
];

export const WORK_BY_SLUG: Record<string, WorkItem> = Object.fromEntries(
  WORK.map((w) => [w.slug, w]),
);

export function getProject(slug: string): WorkItem | undefined {
  return WORK_BY_SLUG[slug];
}

/** A truthful one-line overview built only from known fields. */
export function projectSummary(w: WorkItem): string {
  return `${w.led} for ${w.client} at ${w.location}, ${w.year}. Delivered and operated with ${w.gear}.`;
}

/** Soft card background tinted with the project's signature accent (matches the classic Work section). */
export function vibeBg(vibe: string): string {
  return `radial-gradient(120% 120% at 20% 10%, ${vibe}33, transparent 55%), linear-gradient(160deg, #17403a, #13201e)`;
}
