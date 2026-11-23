import type { MeshStandardMaterial } from "three";

const PREFIX = "Premium Sign | ";

/** The seven `Premium Sign | …` materials the stall lettering is built from. */
export function isPremiumSignMaterial(name: string): boolean {
  return name.startsWith(PREFIX) && name.length > PREFIX.length;
}

/**
 * One runtime look for every sign, whichever stall carries it. Every stall's
 * material pass calls this first for these names and then skips its own rules,
 * so a `/glass/`, `/white/` or `/metal/` rule elsewhere can never restyle one.
 *
 * The GLB already carries the colour, roughness and emission of the lit faces
 * and cells, so those are left alone. Champagne gets the finish the rental
 * pass gave brushed/champagne metal in the approved render (rule at
 * rental2026Materials.ts, non-reference branch). The halo is a BLENDED plane:
 * the glTF loader hands it over as transparent, and it must never write depth
 * or it would hide the letters behind it.
 */
export function stylePremiumSign(material: MeshStandardMaterial): void {
  const name = material.name;
  if (/champagne/i.test(name)) {
    material.metalness = .82;
    material.roughness = .29;
    material.envMapIntensity = 1.2;
  }
  if (/aqua halo/i.test(name)) {
    material.transparent = true;
    material.depthWrite = false;
  } else {
    material.transparent = false;
    material.depthWrite = true;
  }
}
