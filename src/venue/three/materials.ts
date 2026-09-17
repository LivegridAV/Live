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
  /** polished dark floor — low roughness so the env map and screens streak across it */
  floor: make({ color: "#080b0c", roughness: 0.22, metalness: 0.34 }),
  /** matte deck / riser tops, non-reflective */
  deck: make({ color: "#0c0f10", roughness: 0.86, metalness: 0.08 }),
  /** graphite architectural surfaces */
  graphite: make({ color: "#151a1c", roughness: 0.68, metalness: 0.22 }),
  charcoal: make({ color: "#0b0f10", roughness: 0.8, metalness: 0.12 }),
  /** anodised black metal — equipment cases, frames */
  anodised: make({ color: "#0c0f10", roughness: 0.42, metalness: 0.85 }),
  /** brushed aluminium — trim, edges, rails */
  aluminium: make({ color: "#9ba2a6", roughness: 0.34, metalness: 0.95 }),
  steel: make({ color: "#6e777b", roughness: 0.28, metalness: 0.95 }),
  /** smoked glass — pavilion fronts, balustrades */
  smokedGlass: new THREE.MeshPhysicalMaterial({
    color: "#0d1315",
    roughness: 0.08,
    metalness: 0,
    transmission: 0,
    opacity: 0.42,
    transparent: true,
    side: THREE.DoubleSide,
  }),
  /** pale stone for the exterior plaza */
  stone: make({ color: "#14161a", roughness: 0.94, metalness: 0.05 }),
  concrete: make({ color: "#191b1a", roughness: 0.95, metalness: 0.02 }),
  /** warm wood/composite accents in the bar + pavilions */
  composite: make({ color: "#241b14", roughness: 0.7, metalness: 0.1 }),
  /** matte black: light traps, ceiling voids */
  void: make({ color: "#040707", roughness: 1, metalness: 0 }),
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
