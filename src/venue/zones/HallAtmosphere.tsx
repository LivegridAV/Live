"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getPoolTexture } from "../three/environment";
import { ARENA_SHIFT, GRAND, HALL_BAY, HALL_BAYS } from "../data/grand";
import { useVenue } from "../systems/store";

/**
 * Hall decoration and architectural light — "Warm Gallery".
 *
 * The exhibition hall is a dark room on purpose — the stalls are the light
 * sources — but with nothing on its walls and ceiling it read as a void the
 * stalls floated in. This carries the entrance's own language (graphite
 * architecture, warm edge light) through the hall:
 *
 * - fluted graphite pilasters on both side walls, washed from below by warm
 *   uplight scallops between them;
 * - a continuous warm cove under the roof line and a low skirting glow;
 * - suspended light rafts over the aisle whose diffusers pool warm light on
 *   the stone;
 * - a warm outline around the portal into the arena, so the far end of the
 *   hall is a destination rather than a dark wall.
 *
 * Everything is emissive or additive — no real lights, so no lighting work
 * is added to any other shader. The whole hall is three instanced draw calls.
 */

const HW = GRAND.hall.halfWidth;          // 40 m
const WALL = HW - 0.35;                   // just proud of the inner wall face
const BAY = HALL_BAY;
const BAYS = Array.from({ length: HALL_BAYS }, (_, i) => -39.25 - i * BAY);
const SIDES = [-1, 1] as const;
const PORTAL = { z: -240.3 + ARENA_SHIFT, w: 14, h: 11 };

type Vec3 = [number, number, number];
type Item = { p: Vec3; r?: Vec3; s: [number, number, number?]; c: string; k?: number };

const wallRot = (side: number): Vec3 => [0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0];
const DOWN: Vec3 = [Math.PI / 2, 0, 0];   // a plane facing the floor
const UP: Vec3 = [-Math.PI / 2, 0, 0];    // a plane facing the roof

const COLOURS = {
  graphite: "#2a2f31", raft: "#1c1f21",
  cove: "#ffe7c2", skirting: "#c79a63", raftEdge: "#ffe4bd", diffuser: "#6b5238", portal: "#ffe0b3",
  scallop: "#ffd9a6", warm: "#ffcf95",
};

function layout() {
  const solids: Item[] = [], lines: Item[] = [], pools: Item[] = [];
  for (const z of BAYS) {
    for (const side of SIDES) {
      for (const f of [-0.375, -0.125, 0.125, 0.375])
        solids.push({ p: [side * (WALL - 0.3), 8.6, z + f * BAY], s: [0.6, 17.2, 1.1], c: COLOURS.graphite });
      // Uplight scallops sit between the pilasters; their lower half is
      // below the floor, so only the fan of light rising up the wall shows.
      for (const f of [-0.25, 0, 0.25, 0.5])
        pools.push({ p: [side * (WALL - 0.05), 0.4, z + f * BAY], r: wallRot(side), s: [5.4, 16], c: COLOURS.scallop, k: 0.46 });
      lines.push({ p: [side * (WALL - 0.04), 17.4, z], r: wallRot(side), s: [BAY, 0.16], c: COLOURS.cove });
      pools.push({ p: [side * (WALL - 0.05), 17.4, z], r: wallRot(side), s: [BAY * 1.1, 6], c: COLOURS.warm, k: 0.18 });
      lines.push({ p: [side * (WALL - 0.04), 0.3, z], r: wallRot(side), s: [BAY, 0.06], c: COLOURS.skirting });
    }
    for (const f of [-0.25, 0.25]) {
      const rz = z + f * BAY;
      solids.push({ p: [0, 14.2, rz], s: [13, 0.28, 4.2], c: COLOURS.raft });
      lines.push({ p: [0, 14.05, rz], r: DOWN, s: [12.6, 3.9], c: COLOURS.diffuser });
      for (const e of [-1, 1]) lines.push({ p: [0, 14.05, rz + e * 2.1], r: UP, s: [13, 0.1], c: COLOURS.raftEdge });
      pools.push({ p: [0, 14.03, rz], r: DOWN, s: [16, 7], c: COLOURS.warm, k: 0.2 });
      pools.push({ p: [0, 0.15, rz], r: UP, s: [16, 9], c: COLOURS.warm, k: 0.11 });
    }
  }
  const { z, w, h } = PORTAL;
  for (const side of SIDES) lines.push({ p: [side * (w / 2 + 0.45), h / 2, z], s: [0.14, h], c: COLOURS.portal });
  lines.push({ p: [0, h + 0.45, z], s: [w + 1.04, 0.14], c: COLOURS.portal });
  // Washes on the wall beside and above the opening — never across it, or
  // they would veil the view through to the arena stage.
  for (const side of SIDES) pools.push({ p: [side * (w / 2 + 2.6), h / 2, z + 0.05], s: [5, h + 6], c: COLOURS.warm, k: 0.12 });
  pools.push({ p: [0, h + 2.1, z + 0.05], s: [w + 6, 4.2], c: COLOURS.warm, k: 0.1 });
  return { solids, lines, pools };
}

/**
 * A unit box whose faces carry fixed shading: faces turned toward the aisle
 * (±X) and down read lightest, the returns darker, the top darkest — the
 * modelling the hall's low key light would give matte graphite.
 */
function shadedBox() {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const normal = box.getAttribute("normal"), shade: number[] = [];
  for (let i = 0; i < normal.count; i++) {
    const v = Math.abs(normal.getX(i)) > 0.5 ? 1 : normal.getY(i) < -0.5 ? 0.9 : normal.getY(i) > 0.5 ? 0.45 : 0.62;
    shade.push(v, v, v);
  }
  box.setAttribute("color", new THREE.Float32BufferAttribute(shade, 3));
  return box;
}

/**
 * One instanced mesh per material. Instance colours carry each piece's tint;
 * for the additive washes the colour is pre-multiplied by its strength, which
 * is the same thing as opacity under additive blending.
 */
function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[], name: string) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const o = new THREE.Object3D(), colour = new THREE.Color();
  items.forEach((it, i) => {
    o.position.set(...it.p); o.rotation.set(...(it.r ?? [0, 0, 0])); o.scale.set(it.s[0], it.s[1], it.s[2] ?? 1); o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, colour.set(it.c).multiplyScalar(it.k ?? 1));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = name;
  return mesh;
}

export function HallAtmosphere() {
  // Plan and section diagnostics remove the hall envelope; its dressing goes with it.
  const diagnostic = useVenue(s => s.stallVisit?.view === "plan" || s.stallVisit?.view === "section");
  const meshes = useMemo(() => {
    const { solids, lines, pools } = layout();
    const plane = new THREE.PlaneGeometry(1, 1);
    // Unlit, with the shading baked in. Any lit material here compiles a new
    // shader variant each time the travelling rig's light count or the stall
    // environment changes; matte graphite in a dark hall gains nothing from it.
    const solid = instanced(shadedBox(),
      new THREE.MeshBasicMaterial({ vertexColors: true }), solids, "Hall pilasters and light rafts");
    const line = instanced(plane,
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), lines, "Hall coves, raft diffusers and portal outline");
    const pool = instanced(plane, new THREE.MeshBasicMaterial({ map: getPoolTexture(), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }), pools, "Hall warm light washes");
    pool.renderOrder = 2;
    return [solid, line, pool];
  }, []);
  useEffect(() => () => {
    const geometries = new Set<THREE.BufferGeometry>();
    for (const mesh of meshes) { geometries.add(mesh.geometry); (mesh.material as THREE.Material).dispose(); mesh.dispose(); }
    // The pool texture is shared with every LightPool, so it is not disposed.
    geometries.forEach(geometry => geometry.dispose());
  }, [meshes]);
  return <group visible={!diagnostic}>{meshes.map(mesh => <primitive key={mesh.name} object={mesh} />)}</group>;
}
