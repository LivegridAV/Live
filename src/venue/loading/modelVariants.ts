/**
 * Which file the venue draws for a GLB. Pure (no browser or React imports),
 * so the Node test runner checks it.
 *
 * - `full`: the authored file.
 * - `lite`: `<name>.lite.glb`, the light pack a zone shows until its group is
 *   warm (lite mode, see liteMode.ts).
 * - `lod1`: `<name>.lod1.glb`, simplified visitors and projection interior for
 *   the medium and low quality tiers.
 * - `none`: nothing; lite mode must never fetch a later group's full file.
 *
 * The build lists which derived files exist in load-manifest.json.
 */
export type ModelVariant = "full" | "lite" | "lod1" | "none";
export type QualityTierName = "low" | "medium" | "high";
export type VariantManifest = {
  groups: readonly { id?: string; lite?: readonly string[] }[];
  lod1?: readonly string[];
};

/** `/models/expo/a.glb` → `/models/expo/a.lite.glb` (or `.lod1.glb`). */
export function variantPath(path: string, variant: ModelVariant): string {
  return variant === "lite" || variant === "lod1" ? path.replace(/\.glb$/i, `.${variant}.glb`) : path;
}

/** The same, for a URL with a revision query: the `?v=` stays. */
export function variantUrl(url: string, variant: ModelVariant): string {
  return variant === "lite" || variant === "lod1" ? url.replace(/\.glb(?=$|[?#])/i, `.${variant}.glb`) : url;
}

export function chooseModelVariant(path: string, opts: {
  lite: boolean;
  quality: QualityTierName;
  manifest: VariantManifest | null;
  /** Files of the start group: already in memory before any zone renders in lite mode. */
  startFiles: ReadonlySet<string>;
}): ModelVariant {
  const { lite, quality, manifest, startFiles } = opts;
  if (lite && !startFiles.has(path)) {
    const litePath = variantPath(path, "lite");
    return manifest?.groups.some(group => group.lite?.includes(litePath)) ? "lite" : "none";
  }
  if (quality !== "high" && manifest?.lod1?.includes(variantPath(path, "lod1"))) return "lod1";
  return "full";
}

/** Whether the choice for these settings depends on the manifest (the caller waits for it). */
export const variantNeedsManifest = (lite: boolean, quality: QualityTierName) => lite || quality !== "high";
