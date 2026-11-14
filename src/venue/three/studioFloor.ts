import * as THREE from "three";

type StudioFloorSurface = {
  colour: THREE.DataTexture;
  roughness: THREE.DataTexture;
  normal: THREE.DataTexture;
  neutralNormal: THREE.DataTexture;
};

let surface: StudioFloorSurface | undefined;

function hash(x: number, y: number, seed: number) {
  let value = Math.imul(x + seed, 374761393) ^ Math.imul(y + seed, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

/** Periodic noise keeps both the stone grain and the joints seamless. */
function noise(u: number, v: number, cells: number, seed: number) {
  const x = u * cells, y = v * cells;
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const wrap = (n: number) => ((n % cells) + cells) % cells;
  const a = hash(wrap(ix), wrap(iy), seed);
  const b = hash(wrap(ix + 1), wrap(iy), seed);
  const c = hash(wrap(ix), wrap(iy + 1), seed);
  const d = hash(wrap(ix + 1), wrap(iy + 1), seed);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, sx), THREE.MathUtils.lerp(c, d, sx), sy);
}

/**
 * Charcoal mineral slabs for the Content Studio view. The colour and polish
 * vary independently: grey veins catch the warm reveals without turning the
 * whole aisle into a black mirror. These are authored data, not a photo plate.
 */
export function studioFloorSurface(): StudioFloorSurface {
  if (surface) return surface;
  const size = 512;
  const colour = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const cloud = noise(u, v, 4, 11) * .58 + noise(u, v, 8, 23) * .27 + noise(u, v, 32, 47) * .15;
    // A warped, multi-scale fracture field produces isolated irregular
    // mineral seams instead of repeated parallel marble bands.
    const wu = u + (noise(u, v, 4, 131) - .5) * .34;
    const wv = v + (noise(u, v, 4, 197) - .5) * .26;
    const fracture = noise(wu, wv, 8, 233) * .6 + noise(wu, wv, 16, 317) * .28 + noise(wu, wv, 32, 431) * .12;
    const ridge = Math.max(0, 1 - Math.abs(fracture - .53) * 42);
    const vein = ridge * ridge * noise(u, v, 8, 557);
    const grain = hash(x, y, 79) - .5;
    const joint = x < 1 || y < 1;
    const value = joint ? 94 : 137 + cloud * 24 + vein * 8 + grain * 7;
    const at = (y * size + x) * 4;
    colour.set([value * 1.015, value, value * .982, 255], at);
    const polish = joint ? 252 : 178 + cloud * 36 - vein * 8 + grain * 9;
    roughness.set([polish, polish, polish, 255], at);
    heights[y * size + x] = cloud * .2 + fracture * .04 + grain * .012;
  }

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const left = heights[y * size + (x + size - 1) % size];
    const right = heights[y * size + (x + 1) % size];
    const down = heights[((y + size - 1) % size) * size + x];
    const up = heights[((y + 1) % size) * size + x];
    // A honed surface has microscopic relief, never water-like ripples.
    normal.set([128 + (left - right) * 48, 128 + (down - up) * 48, 255, 255], (y * size + x) * 4);
  }

  function texture(data: Uint8Array, srgb = false) {
    const map = new THREE.DataTexture(data, size, size);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(22, 90); // four-metre slabs on the 88 × 360 m floor.
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.anisotropy = 8;
    map.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.needsUpdate = true;
    return map;
  }

  const neutralNormal = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
  neutralNormal.needsUpdate = true;
  surface = { colour: texture(colour, true), roughness: texture(roughness), normal: texture(normal), neutralNormal };
  return surface;
}
