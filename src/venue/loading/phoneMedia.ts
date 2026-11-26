/**
 * Phone-size screen images. Pure (no browser or React imports, no imports at
 * all), so the build (optimize-export) and the Node test runner use it too.
 *
 * The build writes `<name>.phone.webp` at half the width and height next to
 * every load-group WebP that `phoneMediaSources` lists, and phones load that
 * file instead (phoneMediaUrl.ts). Three kinds of file are left out:
 * - the projection stall's artwork: its painters draw some layers at their
 *   natural pixel size and hard-coded offsets, so a smaller file would not
 *   just be softer, it would be laid out wrong;
 * - the technical stall's control-room artwork: its painter crops panels out
 *   of it at fixed pixel positions;
 * - the PBR material maps under /media/technical-showcase/materials/: they go
 *   through loadVenueTexture, which already prefers their KTX2 copies.
 */
export const PHONE_MEDIA_SCALE = 0.5;

const EXCLUDED_GROUPS: ReadonlySet<string> = new Set(["projection"]);
const EXCLUDED_DIRS = ["/media/technical-showcase/materials/"];
const EXCLUDED_FILES: ReadonlySet<string> = new Set(["/media/final/technical-control.webp"]);

type GroupFiles = { id: string; assets: readonly string[]; variants?: Readonly<Record<string, readonly string[]>> };

/** The /media WebP files that get a phone copy, from groups.json's groups. */
export function phoneMediaSources(groups: readonly GroupFiles[]): string[] {
  const files = new Set<string>();
  for (const group of groups) {
    if (EXCLUDED_GROUPS.has(group.id)) continue;
    for (const file of [...group.assets, ...Object.values(group.variants ?? {}).flat()]) {
      if (file.startsWith("/media/") && file.toLowerCase().endsWith(".webp") && !EXCLUDED_FILES.has(file)
        && !EXCLUDED_DIRS.some(dir => file.startsWith(dir))) files.add(file);
    }
  }
  return [...files];
}

/** `/media/a/b.webp` → `/media/a/b.phone.webp` (a `?v=` query stays). */
export const phoneMediaPath = (url: string) => url.replace(/\.webp(?=$|[?#])/i, ".phone.webp");
