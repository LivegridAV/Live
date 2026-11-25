/**
 * Which file the venue draws for a GLB. Pure (no browser or React imports),
 * so the Node test runner checks it.
 *
 * - `full`: the authored file.
 * - `lite`: `<name>.lite.glb`, the light pack a zone shows until its group is
 *   warm (lite mode, see liteMode.ts).
 * - `lod1`: `<name>.lod1.glb`, simplified visitors and projection interior for
 *   the medium and low quality tiers.
 * - `phone`: `<name>.phone.glb`, the phone copy of every GLB (fewer
 *   triangles, textures at most 512 px): what phones draw outside lite mode,
 *   in place of the full file and of a lod1.
 * - `none`: nothing; lite mode must never fetch a later group's full file.
 *
 * The build lists which derived files exist in load-manifest.json.
 */
export type ModelVariant = "full" | "lite" | "lod1" | "phone" | "none";
export type QualityTierName = "low" | "medium" | "high";
export type VariantManifest = {
  groups: readonly { id?: string; lite?: readonly string[] }[];
  lod1?: readonly string[];
  phone?: readonly string[];
};

const DERIVED: ReadonlySet<ModelVariant> = new Set(["lite", "lod1", "phone"]);

/** `/models/expo/a.glb` → `/models/expo/a.lite.glb` (or `.lod1.glb`, `.phone.glb`). */
export function variantPath(path: string, variant: ModelVariant): string {
  return DERIVED.has(variant) ? path.replace(/\.glb$/i, `.${variant}.glb`) : path;
}

/** The same, for a URL with a revision query: the `?v=` stays. */
export function variantUrl(url: string, variant: ModelVariant): string {
  return DERIVED.has(variant) ? url.replace(/\.glb(?=$|[?#])/i, `.${variant}.glb`) : url;
}

export function chooseModelVariant(path: string, opts: {
  lite: boolean;
  quality: QualityTierName;
  /** A phone (see detectQuality): draws the phone copy where the build made one. */
  phone?: boolean;
  manifest: VariantManifest | null;
  /** Files of the start group: already in memory before any zone renders in lite mode. */
  startFiles: ReadonlySet<string>;
}): ModelVariant {
  const { lite, quality, phone = false, manifest, startFiles } = opts;
  if (lite && !startFiles.has(path)) {
    const litePath = variantPath(path, "lite");
    return manifest?.groups.some(group => group.lite?.includes(litePath)) ? "lite" : "none";
  }
  if (phone && manifest?.phone?.includes(variantPath(path, "phone"))) return "phone";
  if (quality !== "high" && manifest?.lod1?.includes(variantPath(path, "lod1"))) return "lod1";
  return "full";
}

/** Whether the choice for these settings depends on the manifest (the caller waits for it). */
export const variantNeedsManifest = (lite: boolean, quality: QualityTierName, phone = false) => lite || phone || quality !== "high";
