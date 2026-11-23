import type { MeshStandardMaterial } from "three";
import { applyFinishGrain, PLAIN_GRAIN } from "./finishGrain";

const PREFIX = "Premium Sign | ";
const styled = new WeakSet<MeshStandardMaterial>();

/** The seven `Premium Sign | …` materials the stall lettering is built from. */
export function isPremiumSignMaterial(name: string): boolean {
  return name.startsWith(PREFIX) && name.length > PREFIX.length;
}

/**
 * One runtime look for every sign, whichever stall carries it. Every stall's
 * material pass calls this first for these names and then skips its own rules,
 * so a `/glass/`, `/white/` or `/metal/` rule elsewhere can never restyle one.
 *
 * This reproduces what the owner-approved spike render gave these materials.
 * That asset was named `spike-premium-rental-shell`, so no rental rule ran and
 * only prepareArchitecture touched it: none of the seven names matches any of
 * its special cases (glass, light, stone, granite, counter, upholstery), so
 * each got the plain fine grain, with no installation frame. The GLB's own
 * colour, metalness, roughness, envMapIntensity and emission stay as authored.
 * The halo is a BLENDED plane: the glTF loader hands it over as transparent,
 * and it must never write depth or it would hide the letters behind it.
 */
export function stylePremiumSign(material: MeshStandardMaterial): void {
  if (/aqua halo/i.test(material.name)) {
    material.transparent = true;
    material.depthWrite = false;
  } else {
    material.transparent = false;
    material.depthWrite = true;
  }
  if (styled.has(material)) return;
  styled.add(material);
  applyFinishGrain(material, PLAIN_GRAIN, null);
}
