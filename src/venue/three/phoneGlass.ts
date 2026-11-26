import * as THREE from "three";

/**
 * Phone glass. three draws the whole scene once more, into a background
 * buffer, for every render whose view holds a transmissive material
 * (MeshPhysicalMaterial.transmission > 0): the screen and each planar
 * reflection. The reception's glassware and bronze glass are in view from the
 * entrance, so a phone drew the venue twice per pass. On a phone the glass is
 * plain see-through instead: no refraction blur, same tint and highlights.
 *
 * Applied when a GLB is parsed (before any shader is built), so the warm-up
 * compiles the final programs and nothing recompiles mid-walk.
 */
export const PHONE_GLASS_OPACITY_FLOOR = 0.18;

/** The opacity a sheet with this transmission gets as plain see-through glass. */
export const phoneGlassOpacity = (transmission: number, opacity = 1) =>
  Math.min(opacity, Math.max(PHONE_GLASS_OPACITY_FLOOR, 1 - 0.85 * transmission));

/** Turn transmission into transparency. Returns whether the material changed. */
export function flattenGlass(material: THREE.Material): boolean {
  if (!(material instanceof THREE.MeshPhysicalMaterial) || !(material.transmission > 0)) return false;
  material.opacity = phoneGlassOpacity(material.transmission, material.opacity);
  material.transmission = 0;
  material.transparent = true;
  material.depthWrite = false;
  material.needsUpdate = true;
  return true;
}

/** flattenGlass on every material under `root`. */
export function flattenGlassIn(root: THREE.Object3D) {
  root.traverse(object => {
    const material = (object as THREE.Mesh).material;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) flattenGlass(m);
  });
}
