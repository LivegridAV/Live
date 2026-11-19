import * as THREE from "three";
import { GRAND } from "../data/grand";
import { PAVILIONS } from "../data/pavilions";
import { SECOND_PAIR_SHIFT } from "../data/placements";
import { C, FLOOR, LEAF_TINTS, Layout, ROOF, mulberry, scaled, type Sign, type Vec3 } from "./hallKit";

/**
 * The hall's "Signature Mix" dressing, placed on the free floor left between
 * the stalls once the empty bays were removed (see the zone plan in
 * hall-decoration-concepts/Hall-Plan-Free-Zones.png):
 *
 * - J1, J2  the logo's 5×5 signal grid as suspended LED sculptures over the
 *           two aisle junctions.
 * - A       café: lit bar, stools, high tables under pendants.
 * - B       olive grove with benches; G a tree row beside reception.
 * - C       two lounges and a pair of trees.
 * - D       freestanding backlit service lightboxes.
 * - E       a living green wall behind LED Rental and service panels behind
 *           Projection Mapping.
 * - H       the arena forecourt planters, signs and guests.
 *
 * Poster content comes from the pavilion data, so it always names services
 * the site actually offers.
 */

type Rect = { x0: number; x1: number; z0: number; z1: number };
const FRONT_LEFT: Rect = { x0: -37, x1: -4, z0: -59.5, z1: -69 };
const FRONT_RIGHT: Rect = { x0: 9.5, x1: 37.5, z0: -60.3, z1: -65.8 };
const MIDDLE_LEFT: Rect = { x0: -37, x1: -3, z0: -96, z1: -104.8 };
const MIDDLE_RIGHT: Rect = { x0: 9.5, x1: 37.5, z0: -99.8, z1: -106.8 };
const mid = (r: Rect) => (r.z0 + r.z1) / 2;
/** Stall backs along the right wall: LED Rental, then Projection Mapping. */
const STALL_BACKS = { x: 31.12, rental: [-68, -97.5] as const, projection: [-109.5, -143] as const };
const JUNCTIONS: Vec3[] = [[2, 11.2, -63.6], [3, 11.2, -101.6]];

export type Panel = { kind: "lightbox"; x: number; z: number; yaw: number; service: number }
  | { kind: "wall"; x: number; z: number; dir: number; service: number };
export type Zone = {
  label: string; from: number; to: number; cast: number;
  layout: Layout; panels: Panel[]; signs: { sign: Sign; p: Vec3; yaw: number }[];
};

/* ── features ───────────────────────────────────────────── */

function tree(L: Layout, x: number, z: number, seed: number, scale = 1.55) {
  L.planter(x, z, scale, true, seed);
  L.pools.push({ p: [x, FLOOR + .02, z], r: [-Math.PI / 2, 0, 0], s: [4.5, 4.5, 1], c: scaled("#ffcf95", .12) });
}

/** A planted wall on a stall back; `dir` is its facing (+1 = +x). */
function greenWall(L: Layout, x: number, z0: number, z1: number, dir: number, seed: number, h = 5.4) {
  const len = Math.abs(z1 - z0), zc = (z0 + z1) / 2;
  L.solid.push({ p: [x + dir * .06, FLOOR + .3 + h / 2, zc], s: [.12, h, len], c: "#141a14" });
  L.solid.push({ p: [x + dir * .55, FLOOR + .1, zc], s: [.8, .2, len], c: "#1a1714" });
  const rnd = mulberry(seed);
  for (let i = 0; i < len * h * 11; i++) {
    const z = zc + (rnd() - .5) * len, y = FLOOR + .35 + rnd() * h, size = .17 + rnd() * .14;
    L.leaves.push({ p: [x + dir * (.14 + rnd() * .22), y, z],
      r: [(rnd() - .5) * 1.2, dir * Math.PI / 2 + (rnd() - .5) * 1.4, (rnd() - .5) * 2],
      s: [size * .55, size, 1], c: LEAF_TINTS[Math.floor(rnd() * LEAF_TINTS.length)] });
  }
  // Grazing uplights every 4 m: a lamp lens on the plinth and its wash.
  for (let z = Math.max(z0, z1) - 2; z > Math.min(z0, z1) + 1; z -= 4) {
    L.pools.push({ p: [x + dir * .45, FLOOR + 2.6, z], r: [0, Math.PI / 2, 0], s: [3.6, 5.6, 1], c: scaled("#ffd6a0", .2) });
    L.glow.push({ p: [x + dir * .7, FLOOR + .21, z], r: [-Math.PI / 2, 0, 0], s: [.16, .16, 1], c: "#ffd9a8" });
  }
}

/**
 * The 5×5 signal grid (column heights 2-4-3-5-4, as in the logo) as a
 * suspended LED sculpture, pitched slightly towards the visitor. Everything is
 * instanced parts: lit cells are glow planes front and back, unlit cells dark
 * boxes, on a black tray hung from two wires.
 */
function signalGrid(L: Layout, [x, y, z]: Vec3, cell: number, yaw = 0, pitch = -.18) {
  const heights = [2, 4, 3, 5, 4];
  const frame = new THREE.Object3D();
  frame.position.set(x, y, z); frame.rotation.set(pitch, yaw, 0, "YXZ"); frame.updateMatrix();
  const euler = new THREE.Euler().setFromQuaternion(frame.quaternion, "XYZ");
  const r: Vec3 = [euler.x, euler.y, euler.z];
  const at = (lx: number, ly: number, lz: number): Vec3 => {
    const v = new THREE.Vector3(lx, ly, lz).applyMatrix4(frame.matrix);
    return [v.x, v.y, v.z];
  };
  const pitchCell = cell * 1.12, size = pitchCell * 5 + cell * .3;
  L.metalBox.push({ p: at(0, 0, -.1), r, s: [size, size, .14], c: C.steel });
  const lit = scaled("#3FD6C8", .8);
  for (let col = 0; col < 5; col++) for (let row = 0; row < 5; row++) {
    const cx = (col - 2) * pitchCell, cy = (2 - row) * pitchCell;
    if (5 - row <= heights[col]) {
      L.glow.push({ p: at(cx, cy, .035), r, s: [cell, cell, 1], c: lit });
      L.glow.push({ p: at(cx, cy, -.235), r, s: [cell, cell, 1], c: lit });
    } else {
      L.solid.push({ p: at(cx, cy, 0), r, s: [cell, cell, .07], c: "#18211f" });
      L.solid.push({ p: at(cx, cy, -.2), r, s: [cell, cell, .07], c: "#18211f" });
    }
  }
  for (const side of [-1, 1]) {
    const [tx, ty, tz] = at(side * size * .45, size / 2, -.1);
    L.metal.push({ p: [tx, (ty + ROOF) / 2, tz], s: [.014, ROOF - ty, .014], c: C.steel });
  }
  L.pools.push({ p: [x, FLOOR + .025, z + 1.2], r: [-Math.PI / 2, 0, 0], s: [size * 1.5, size * 1.2, 1], c: scaled("#3fd6c8", .08) });
}

/** Freestanding backlit lightbox feet and its floor spill; the face is a Panel. */
function lightboxBase(L: Layout, x: number, z: number, yaw: number, accent: string) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const e of [-1, 1]) L.metalBox.push({ p: [x + c * e * .88, FLOOR + .23, z - s * e * .88], r: [0, yaw, 0], s: [.08, .46, .5], c: C.steel });
  L.pools.push({ p: [x + s * 1.4, FLOOR + .02, z + c * 1.4], r: [-Math.PI / 2, 0, 0], s: [3.4, 2.6, 1], c: scaled(accent, .16) });
}

function cafe(L: Layout, r: Rect, x: number, len = 9) {
  const zc = mid(r);
  L.barCounter(x, zc + .2, 0, len);
  L.pools.push({ p: [x, FLOOR + .02, zc + .4], r: [-Math.PI / 2, 0, 0], s: [len + 12, 9, 1], c: scaled("#ffcf95", .16) });
  for (let i = 0; i < 3; i++) L.pendant(x - len / 3 + i * len / 3, zc + 1.1, 4.4);
  for (let i = 0; i < len / 1.3; i++) L.stool(x - len / 2 + .6 + i * 1.3, zc + .85);
  const tables = [x - len / 2 - 3.5, x - len / 2 - 7.5, x + len / 2 + 3.5, x + len / 2 + 7.5].filter(t => t > r.x0 + 1 && t < r.x1 - 1);
  tables.forEach((t, i) => {
    for (const dz of [-2.4, 2.2]) {
      L.cocktailTable(t, zc + dz);
      L.pendant(t, zc + dz, 5.8);
      L.guest(t + .55, zc + dz + .2, -1, -.1);
      if ((i + (dz > 0 ? 1 : 0)) % 2 === 0) L.guest(t - .5, zc + dz - .3, 1, .3);
    }
  });
  L.guest(x - 1.2, zc + 1.4, 0, -1); L.guest(x + 1.6, zc + 1.5, -.2, -1);
}

function lounge(L: Layout, x: number, zc: number, colour: string, seed: number) {
  L.rug(x, zc, 6.4, 4.6, seed % 2 ? C.rug : C.rugAlt);
  L.sofa(x, zc - 1.3, 0, 2.3, colour);
  L.sofa(x - 1.4, zc + 1.25, Math.PI + .35, 1, C.fabricIvory);
  L.sofa(x + 1.4, zc + 1.25, Math.PI - .35, 1, C.fabricIvory);
  L.coffeeTable(x, zc + .05, .45);
  L.floorLamp(x - 2.6, zc - 1.6); L.floorLamp(x + 2.6, zc - 1.6);
  L.planter(x + 3.4, zc + 1.4, .9, false, seed);
  L.guest(x - .5, zc - 1.3, 0, 1, true); L.guest(x + .55, zc - 1.25, 0, 1, true);
  if (seed % 2) L.guest(x - 1.4, zc + 1.2, .35, -1, true);
}

/** A row of olive trees with benches and low planters between them. */
function grove(L: Layout, r: Rect, seed: number) {
  const zc = mid(r), xs: number[] = [];
  for (let x = r.x0 + 2; x < r.x1 - 1.5; x += 6.6) xs.push(x);
  xs.forEach((x, i) => {
    tree(L, x, zc, seed + i, i % 3 === 1 ? 1.75 : 1.5);
    if (i < xs.length - 1) { L.bench(x + 3.3, zc + .9, 0, 2.2); L.planter(x + 3.3, zc - .8, .9, false, seed + 30 + i); }
  });
  L.guest(xs[1] + 1.5, zc + 1.6, .4, -1); L.guest(xs[1] + 2.3, zc + 1.4, -.6, -.7);
  if (xs.length > 3) L.guest(xs[3] - 1.2, zc - .3, 1, .2);
}

const junctionSigns = (z: number, line: string): { sign: Sign; p: Vec3; yaw: number }[] => [
  { sign: { title: "Café · Lounge", line, arrow: "left" }, p: [-2.4, 0, z], yaw: 0 },
  { sign: { title: "Explore", line, arrow: "right" }, p: [7.2, 0, z], yaw: 0 },
];

/* ── zones ──────────────────────────────────────────────── */

/** The forecourt was authored behind the second stall pair; it moves with it. */
const FORECOURT_SHIFT = SECOND_PAIR_SHIFT;

export function hallZones(): Zone[] {
  const front = new Layout(), middle = new Layout(), forecourt = new Layout();
  const frontPanels: Panel[] = [], middlePanels: Panel[] = [];
  const accent = (i: number) => PAVILIONS[i % PAVILIONS.length].accent;

  // Front: café (A), signal grid over J1, olive grove (B), trees beside reception (G).
  signalGrid(front, JUNCTIONS[0], .9);
  cafe(front, FRONT_LEFT, -21);
  grove(front, FRONT_RIGHT, 21);
  for (const z of [-36, -44, -52]) tree(front, 34.5, z, 50 + z);

  // Middle: signal grid over J2, lounges and trees (C), service lightboxes (D),
  // green wall behind LED Rental and service panels behind Projection (E).
  signalGrid(middle, JUNCTIONS[1], .9);
  lounge(middle, -29, mid(MIDDLE_LEFT), C.fabricTaupe, 3);
  lounge(middle, -19.5, mid(MIDDLE_LEFT), C.fabricOlive, 4);
  tree(middle, -10.5, mid(MIDDLE_LEFT) - 1.5, 77); tree(middle, -6.5, mid(MIDDLE_LEFT) + 2, 78);
  let service = 0;
  for (let x = MIDDLE_RIGHT.x0 + 2.5, i = 0; x < MIDDLE_RIGHT.x1 - 1.5; x += 5.4, i++) {
    const z = mid(MIDDLE_RIGHT) + (i % 2 ? -.6 : .6), yaw = i % 2 ? -.35 : .35;
    lightboxBase(middle, x, z, yaw, accent(service));
    middlePanels.push({ kind: "lightbox", x, z, yaw, service: service++ });
  }
  middle.guest(MIDDLE_RIGHT.x0 + 5, mid(MIDDLE_RIGHT) + 2.2, .2, -1);
  middle.guest(MIDDLE_RIGHT.x0 + 15.5, mid(MIDDLE_RIGHT) + 2.4, -.3, -1);
  greenWall(middle, STALL_BACKS.x, STALL_BACKS.rental[0], STALL_BACKS.rental[1], 1, 5);
  for (let z = STALL_BACKS.projection[0] - 3; z > STALL_BACKS.projection[1] + 1; z -= 5.5) {
    middlePanels.push({ kind: "wall", x: STALL_BACKS.x, z, dir: 1, service: service++ });
    middle.pools.push({ p: [STALL_BACKS.x + .4, FLOOR + 2.6, z], r: [0, Math.PI / 2, 0], s: [3.6, 5, 1], c: scaled("#ffe2bd", .14) });
  }

  // Forecourt (H): planters either side of the portal and two guests.
  for (const side of [-1, 1]) {
    forecourt.planter(side * 9.5, -202.5 + FORECOURT_SHIFT, 1.25, true, 120 + side);
    forecourt.planter(side * 12.5, -205.5 + FORECOURT_SHIFT, 1, false, 130 + side);
  }
  forecourt.guest(-3.2, -204.5 + FORECOURT_SHIFT, .3, -1);
  forecourt.guest(-2.5, -205.2 + FORECOURT_SHIFT, -.5, .8);
  const arena = { title: "Main Arena", line: "Keynote stage\nStraight ahead", arrow: "up" as const };

  return [
    { label: "Café, grove and signal grid", from: -28, to: -72, cast: 2, layout: front, panels: frontPanels,
      signs: junctionSigns(-60.4, "Studio · Rental\nThis way") },
    { label: "Lounges, lightboxes and green wall", from: -66, to: -146, cast: 7, layout: middle, panels: middlePanels,
      signs: junctionSigns(-97.2, "Engineering · Mapping\nThis way") },
    { label: "Arena forecourt", from: -146.5, to: GRAND.hall.to, cast: 9, layout: forecourt, panels: [],
      signs: [{ sign: arena, p: [-6.2, 0, -203 + FORECOURT_SHIFT], yaw: 0 }, { sign: arena, p: [6.2, 0, -203 + FORECOURT_SHIFT], yaw: 0 }] },
  ];
}

/* ── service posters ────────────────────────────────────── */

/** A poster for one of the site's own services: light-field art in its accent. */
export function servicePosterTexture(service: number, w = 512, h = 768) {
  const pavilion = PAVILIONS[service % PAVILIONS.length];
  const base = new THREE.Color(pavilion.accent);
  const hues = [base.clone().offsetHSL(0, .25, -.08), base.clone().offsetHSL(.08, .3, .02), base.clone().offsetHSL(-.12, .35, -.15)].map(c => "#" + c.getHexString());
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext("2d")!, rnd = mulberry(40 + service);
  g.fillStyle = "#07090a"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 7; i++) {
    const cx = rnd() * w, cy = rnd() * h * .72, r = (.25 + rnd() * .5) * w;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, hues[i % 3] + "aa"); grad.addColorStop(1, hues[i % 3] + "00");
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = `rgba(255,240,220,${.04 + rnd() * .1})`; g.lineWidth = 1 + rnd() * 5;
    const y0 = rnd() * h * .75;
    g.beginPath(); g.moveTo(0, y0); g.bezierCurveTo(w * .3, y0 - 120 * rnd(), w * .7, y0 + 140 * rnd(), w, y0 - 60); g.stroke();
  }
  g.globalCompositeOperation = "source-over";
  const band = g.createLinearGradient(0, h * .6, 0, h);
  band.addColorStop(0, "rgba(6,8,9,0)"); band.addColorStop(.35, "rgba(6,8,9,.92)"); band.addColorStop(1, "rgba(6,8,9,1)");
  g.fillStyle = band; g.fillRect(0, h * .6, w, h * .4);
  g.fillStyle = "#3fd6c8"; g.fillRect(w * .08, h * .76, w * .1, 3);
  g.fillStyle = "#f2ece2"; g.font = `600 ${Math.round(w * .066)}px 'Segoe UI', Arial, sans-serif`;
  wrap(g, pavilion.doing, w * .84, 2).forEach((line, i) => g.fillText(line, w * .08, h * .83 + i * w * .075));
  g.fillStyle = "#a9a49b"; g.font = `400 ${Math.round(w * .034)}px 'Segoe UI', Arial, sans-serif`;
  wrap(g, pavilion.support, w * .84, 2).forEach((line, i) => g.fillText(line, w * .08, h * .93 + i * w * .045));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

function wrap(g: CanvasRenderingContext2D, text: string, width: number, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? line + " " + word : word;
    if (g.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > max) { lines.length = max; lines[max - 1] = lines[max - 1].replace(/\s*\S*$/, "…"); }
  return lines;
}
