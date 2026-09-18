import * as THREE from "three";

/**
 * The venue's material library.
 *
 * Shared instances, because a hall built from two hundred meshes should still
 * compile a handful of shader programs. The palette is the brief's: graphite,
 * charcoal, anodised and brushed metal, smoked glass, dark stone. Colour comes
 * from the screens, not the building.
 */

const make = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);

export const M = {
  /**
   * Polished dark floor.
   *
   * Roughness is what decides whether the hall has reflections, and reflections
   * are most of why the reference photographs read as premium: every one of
   * them is a dark glossy floor with the installations running down it. 0.14 is
   * a sealed resin floor — still dark, but genuinely specular.
   */
  floor: make({ color: "#1c2326", roughness: 0.1, metalness: 0.6 }),
  /** matte deck / riser tops, non-reflective */
  deck: make({ color: "#121618", roughness: 0.86, metalness: 0.08 }),
  /** graphite architectural surfaces */
  graphite: make({ color: "#232b2f", roughness: 0.62, metalness: 0.22 }),
  charcoal: make({ color: "#11171a", roughness: 0.78, metalness: 0.14 }),
  /** anodised black metal — equipment cases, frames */
  anodised: make({ color: "#131718", roughness: 0.4, metalness: 0.88 }),
  /** brushed aluminium — trim, edges, rails */
  aluminium: make({ color: "#9ba2a6", roughness: 0.34, metalness: 0.95 }),
  steel: make({ color: "#6e777b", roughness: 0.28, metalness: 0.95 }),
  /** smoked glass — pavilion fronts, balustrades */
  smokedGlass: new THREE.MeshPhysicalMaterial({
    color: "#0d1315",
    roughness: 0.08,
    metalness: 0,
    // Enough to read as glass, not enough to become a mirror of the PMREM.
    envMapIntensity: 0.55,
    transmission: 0,
    opacity: 0.42,
    transparent: true,
    side: THREE.DoubleSide,
  }),
  /** pale stone for the exterior plaza */
  stone: make({ color: "#1a1d21", roughness: 0.9, metalness: 0.05 }),
  concrete: make({ color: "#262b29", roughness: 0.9, metalness: 0.04 }),
  /** warm wood/composite accents in the bar + pavilions */
  composite: make({ color: "#241b14", roughness: 0.7, metalness: 0.1 }),
  /** matte black: light traps, ceiling voids */
  void: make({ color: "#040707", roughness: 1, metalness: 0 }),
  /** hall ceilings — dark, but a surface rather than a hole */
  ceiling: make({ color: "#121a1e", roughness: 0.9, metalness: 0.08 }),

  /* ── exhibition furniture ──
     A hall full of expensive installations and nothing else reads as a
     showroom at 3 a.m. Furniture is what puts human scale into the frame and
     tells the visitor the room is meant to be occupied. It is deliberately
     pale — near enough to white to catch the LED spill, which is also what
     makes the screens look like they are lighting something. */
  upholstery: make({ color: "#2b3134", roughness: 0.92, metalness: 0.02 }),
  pale: make({ color: "#6d7478", roughness: 0.78, metalness: 0.04 }),
  /** planting — matte, dark, and never saturated enough to read as plastic */
  foliage: make({ color: "#22362a", roughness: 0.95, metalness: 0 }),
  planter: make({ color: "#171b1c", roughness: 0.55, metalness: 0.3 }),
} as const;

/** An unlit emissive strip — LED trim, edge lighting, wayfinding lines. */
export function trim(color: string, intensity = 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: true });
}

let streak: THREE.Texture | null = null;
/** Gradient used for faked floor reflections beneath bright surfaces. */
export function streakTexture() {
  if (streak) return streak;
  const w = 8;
  const h = 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.25, "rgba(255,255,255,0.2)");
  g.addColorStop(0.6, "rgba(255,255,255,0.05)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  streak = new THREE.CanvasTexture(c);
  streak.colorSpace = THREE.SRGBColorSpace;
  return streak;
}

export function disposeMaterials() {
  Object.values(M).forEach((m) => m.dispose());
  streak?.dispose();
  streak = null;
}
