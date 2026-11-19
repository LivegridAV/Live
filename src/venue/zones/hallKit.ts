import * as THREE from "three";
import { GRAND } from "../data/grand";

/**
 * The hall furniture kit: every piece is a list of instanced parts (position,
 * rotation, scale, colour) in shared geometry/material buckets, so a whole
 * zone of furniture draws in about a dozen calls.
 */

export const FLOOR = GRAND.master.floor;
/** Fixings hang from just under the roof deck. */
export const ROOF = GRAND.hall.roofHeight - .3;

export type Vec3 = [number, number, number];
export type Part = { p: Vec3; r?: Vec3; s: Vec3; c: string };
export type Guest = { p: [number, number]; face: [number, number]; seated: boolean };
export type Sign = { title: string; line: string; arrow?: "left" | "right" | "up" };

export const C = {
  steel: "#1c1e20", champagne: "#a88b5f", stone: "#d8d0c3", walnut: "#3a2b21",
  fabricWarm: "#6f675f", fabricIvory: "#c9bfae", fabricTaupe: "#8a7c6c", fabricOlive: "#4f5544", rug: "#2a2622", rugAlt: "#34302a",
  ceramic: "#141516", soil: "#2a221b", bark: "#4a3a2c", glassAmber: "#8a5a22", glassGreen: "#3d5a3a",
  deskFront: "#202326",
};

/* ── layout ────────────────────────────────────────────── */

export class Layout {
  metal: Part[] = []; metalBox: Part[] = []; metalTorus: Part[] = []; soft: Part[] = []; solid: Part[] = []; disc: Part[] = [];
  leaves: Part[] = []; pots: Part[] = []; glow: Part[] = []; pools: Part[] = []; guests: Guest[] = [];
  /** Point in a local frame (x across, z along) rotated by yaw about (ox, oz). */
  at(ox: number, oz: number, yaw: number, x: number, z: number): [number, number] {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return [ox + c * x + s * z, oz - s * x + c * z];
  }

  cocktailTable(x: number, z: number) {
    this.metal.push({ p: [x, FLOOR + .015, z], s: [.6, .03, .6], c: C.steel });
    this.metal.push({ p: [x, FLOOR + .55, z], s: [.07, 1.04, .07], c: C.steel });
    this.disc.push({ p: [x, FLOOR + 1.085, z], s: [.8, .035, .8], c: C.stone });
  }

  stool(x: number, z: number) {
    this.metal.push({ p: [x, FLOOR + .01, z], s: [.4, .02, .4], c: C.steel });
    this.metal.push({ p: [x, FLOOR + .38, z], s: [.05, .74, .05], c: C.champagne });
    this.metalTorus.push({ p: [x, FLOOR + .3, z], r: [Math.PI / 2, 0, 0], s: [.17, .17, .17], c: C.champagne });
    this.disc.push({ p: [x, FLOOR + .78, z], s: [.4, .07, .4], c: C.fabricWarm });
  }

  /** A sofa (or, with len < 1.2, an armchair) whose seat faces local +z. */
  sofa(ox: number, oz: number, yaw: number, len: number, colour: string) {
    const r: Vec3 = [0, yaw, 0];
    const put = (x: number, y: number, z: number, s: Vec3) => {
      const [px, pz] = this.at(ox, oz, yaw, x, z);
      this.soft.push({ p: [px, FLOOR + y, pz], r, s, c: colour });
    };
    put(0, .2, 0, [len, .24, .86]);
    put(0, .38, .06, [len - .34, .14, .7]);
    put(0, .62, -.34, [len, .52, .2]);
    for (const e of [-1, 1]) put(e * (len / 2 - .09), .44, 0, [.18, .36, .86]);
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) {
      const [px, pz] = this.at(ox, oz, yaw, ex * (len / 2 - .12), ez * .32);
      this.metal.push({ p: [px, FLOOR + .04, pz], s: [.05, .08, .05], c: C.champagne });
    }
  }

  coffeeTable(x: number, z: number, radius = .5) {
    this.metal.push({ p: [x, FLOOR + .2, z], s: [radius * 1.2, .4, radius * 1.2], c: C.steel });
    this.disc.push({ p: [x, FLOOR + .42, z], s: [radius * 2, .04, radius * 2], c: C.stone });
  }

  /** A dining-height chair whose seat faces local +z. */
  chair(ox: number, oz: number, yaw: number) {
    const r: Vec3 = [0, yaw, 0];
    const put = (x: number, y: number, z: number, s: Vec3, c: string, soft = true) => {
      const [px, pz] = this.at(ox, oz, yaw, x, z);
      (soft ? this.soft : this.metal).push({ p: [px, FLOOR + y, pz], r, s, c });
    };
    put(0, .46, 0, [.5, .07, .48], C.fabricTaupe);
    put(0, .74, -.22, [.48, .44, .06], C.fabricTaupe);
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) put(ex * .21, .22, ez * .2, [.03, .44, .03], C.steel, false);
  }

  roundTable(x: number, z: number) {
    this.metal.push({ p: [x, FLOOR + .015, z], s: [.56, .03, .56], c: C.steel });
    this.metal.push({ p: [x, FLOOR + .37, z], s: [.08, .7, .08], c: C.steel });
    this.disc.push({ p: [x, FLOOR + .745, z], s: [1.2, .035, 1.2], c: C.stone });
  }

  rug(x: number, z: number, w: number, d: number, colour: string, yaw = 0) {
    this.solid.push({ p: [x, FLOOR + .006, z], r: [0, yaw, 0], s: [w, .012, d], c: colour });
  }

  /** Ceramic planter with a leafy crown; `tree` adds a bare trunk below it. */
  planter(x: number, z: number, scale: number, tree: boolean, seed: number) {
    const rnd = mulberry(seed);
    const potH = (tree ? .62 : .78) * scale, potR = (tree ? .42 : .34) * scale;
    this.pots.push({ p: [x, FLOOR + potH / 2, z], s: [potR * 2, potH, potR * 2], c: C.ceramic });
    this.disc.push({ p: [x, FLOOR + potH - .02, z], s: [potR * 1.86, .02, potR * 1.86], c: C.soil });
    const crownY = FLOOR + potH + (tree ? 1.45 * scale : .45 * scale);
    const crownR = (tree ? .78 : .52) * scale;
    if (tree) {
      this.disc.push({ p: [x, FLOOR + potH + .72 * scale, z], s: [.07 * scale, 1.5 * scale, .07 * scale], c: C.bark });
      for (let i = 0; i < 3; i++) {
        const a = rnd() * Math.PI * 2;
        this.disc.push({ p: [x + Math.cos(a) * .12, crownY - .25 * scale, z + Math.sin(a) * .12],
          r: [Math.sin(a) * .5, 0, Math.cos(a) * .5], s: [.035 * scale, .6 * scale, .035 * scale], c: C.bark });
      }
    }
    const count = tree ? 420 : 260;
    for (let i = 0; i < count; i++) {
      // Points through a squashed ball, denser outside, leaves pointing out.
      const u = rnd(), v = rnd(), w = Math.cbrt(.35 + .65 * rnd());
      const theta = u * Math.PI * 2, phi = Math.acos(2 * v - 1);
      const dx = Math.sin(phi) * Math.cos(theta), dy = Math.cos(phi), dz = Math.sin(phi) * Math.sin(theta);
      const sy = tree ? .78 : (dy < 0 ? .45 : 1.05);
      const px = x + dx * crownR * w, py = crownY + dy * crownR * sy * w, pz = z + dz * crownR * w;
      const size = (tree ? .12 : .2) * scale * (.75 + rnd() * .5);
      const tint = LEAF_TINTS[Math.floor(rnd() * LEAF_TINTS.length)];
      this.leaves.push({ p: [px, py, pz], r: [(rnd() - .5) * 1.6 + (tree ? 0 : -.4 * dy), theta + Math.PI / 2 + (rnd() - .5), (rnd() - .5) * 1.2],
        s: [size * .55, size, 1], c: tint });
    }
  }

  floorLamp(x: number, z: number) {
    this.metal.push({ p: [x, FLOOR + .015, z], s: [.32, .03, .32], c: C.steel });
    this.metal.push({ p: [x, FLOOR + .8, z], s: [.03, 1.6, .03], c: C.champagne });
    this.disc.push({ p: [x, FLOOR + 1.68, z], s: [.42, .3, .42], c: C.fabricIvory });
    this.glow.push({ p: [x, FLOOR + 1.53, z], r: [Math.PI / 2, 0, 0], s: [.36, .36, 1], c: "#ffd9a8" });
    this.pools.push({ p: [x, FLOOR + .02, z], r: [-Math.PI / 2, 0, 0], s: [3.4, 3.4, 1], c: scaled("#ffcf95", .16) });
  }

  pendant(x: number, z: number, drop = 6.2) {
    const y = FLOOR + drop;
    this.metal.push({ p: [x, (y + ROOF) / 2, z], s: [.012, ROOF - y, .012], c: C.steel });
    this.metal.push({ p: [x, y, z], s: [.5, .34, .5], c: C.champagne });
    this.glow.push({ p: [x, y - .175, z], r: [Math.PI / 2, 0, 0], s: [.44, .44, 1], c: "#ffe2b8" });
    this.pools.push({ p: [x, y - .4, z], r: [Math.PI / 2, 0, 0], s: [1.6, 1.6, 1], c: scaled("#ffd2a0", .32) });
    this.pools.push({ p: [x, FLOOR + .02, z], r: [-Math.PI / 2, 0, 0], s: [4.2, 4.2, 1], c: scaled("#ffcf95", .14) });
  }

  barCounter(ox: number, oz: number, yaw: number, len: number) {
    const r: Vec3 = [0, yaw, 0];
    const box = (list: Part[], x: number, y: number, z: number, s: Vec3, c: string) => {
      const [px, pz] = this.at(ox, oz, yaw, x, z);
      list.push({ p: [px, FLOOR + y, pz], r, s, c });
    };
    box(this.solid, 0, .53, 0, [len, 1.06, .62], C.walnut);
    box(this.solid, 0, 1.085, .03, [len + .12, .05, .78], C.stone);
    box(this.metalBox, 0, .06, .3, [len, .1, .04], C.champagne);
    box(this.glow, 0, 1.045, .43, [len, .025, .01], "#ffd9a8");
    // Fluted front: thin vertical fins catching the light.
    for (let i = 0; i < Math.floor(len / .2); i++)
      box(this.solid, -len / 2 + .1 + i * .2, .53, .325, [.08, .96, .03], "#4a382b");
    // Back bar: a tall unit with lit shelves and bottles.
    box(this.solid, 0, 1.3, -1.55, [len, 2.6, .42], "#1d1814");
    for (const y of [1.2, 1.7, 2.2]) {
      box(this.solid, 0, y, -1.42, [len - .3, .04, .3], C.walnut);
      box(this.glow, 0, y - .03, -1.29, [len - .3, .015, .01], "#ffcf95");
      const rnd = mulberry(Math.round(y * 100 + ox));
      for (let x = -len / 2 + .3; x < len / 2 - .3; x += .16 + rnd() * .12) {
        const h = .22 + rnd() * .12;
        const [px, pz] = this.at(ox, oz, yaw, x, -1.45);
        this.disc.push({ p: [px, FLOOR + y + .02 + h / 2, pz], s: [.075, h, .075], c: rnd() < .5 ? C.glassAmber : C.glassGreen });
      }
    }
    const [wx, wz] = this.at(ox, oz, yaw, 0, -1.3);
    this.pools.push({ p: [wx, FLOOR + 1.6, wz], r: [0, yaw, 0], s: [len + 2, 3.2, 1], c: scaled("#ffcf95", .1) });
  }

  infoDesk(ox: number, oz: number, yaw: number, len: number) {
    const r: Vec3 = [0, yaw, 0];
    const box = (list: Part[], x: number, y: number, z: number, s: Vec3, c: string) => {
      const [px, pz] = this.at(ox, oz, yaw, x, z);
      list.push({ p: [px, FLOOR + y, pz], r, s, c });
    };
    box(this.solid, 0, .5, 0, [len, 1, .7], C.deskFront);
    box(this.solid, 0, 1.025, 0, [len + .1, .05, .82], C.stone);
    box(this.glow, 0, .08, .36, [len - .2, .03, .01], "#ffd9a8");
    box(this.metalBox, 0, .55, .356, [len - .4, .02, .01], C.champagne);
  }

  bench(ox: number, oz: number, yaw: number, len: number) {
    const r: Vec3 = [0, yaw, 0];
    const [px, pz] = this.at(ox, oz, yaw, 0, 0);
    this.soft.push({ p: [px, FLOOR + .42, pz], r, s: [len, .1, .5], c: C.fabricOlive });
    this.solid.push({ p: [px, FLOOR + .19, pz], r, s: [len - .3, .36, .4], c: C.walnut });
  }

  guest(x: number, z: number, faceX: number, faceZ: number, seated = false) {
    this.guests.push({ p: [x, z], face: [faceX, faceZ], seated });
  }
}

export const LEAF_TINTS = ["#4f6b39", "#5d7a40", "#435d32", "#6d8a4a", "#3e5530"];

export function scaled(hex: string, k: number) {
  return "#" + new THREE.Color(hex).multiplyScalar(k).getHexString();
}

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
