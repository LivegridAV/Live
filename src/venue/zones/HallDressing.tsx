"use client";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useModelUrl } from "../loading/useModelUrl";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useVenue } from "../systems/store";
import { expoAssetUrl } from "../three/ExpoAsset";
import { getPoolTexture } from "../three/environment";
import { LocalPointLight } from "../three/LocalLights";
import { ZoneGroup } from "../three/ZoneGroup";
import rentalLayout from "../../../public/models/expo/grand-rental-finish-v2-layout.json";
import { FLOOR, type Guest, type Layout, type Part, type Sign } from "./hallKit";
import { hallZones, servicePosterTexture, type Zone } from "./hallFeatures";
import { applySurface, refineAvatarSkin } from "../three/surfaceDetail";
import { gltfExtender } from "../three/textureLoading";

/**
 * Hall dressing — renders the furniture, planting, LED sculptures, lightboxes,
 * signage and people that make the open floor between the stalls read as a
 * working exhibition hall. What goes where is in hallFeatures.ts; the pieces
 * themselves are in hallKit.ts.
 *
 * Cost discipline: everything is built from a handful of shared geometries
 * and two lit materials, drawn as instanced meshes, so a whole zone is about
 * a dozen draw calls and a few new shader programs. The people are the
 * licensed Rocketbox visitors already downloaded for the LED rental stall,
 * cloned (shared geometry and materials), so they add no download at all.
 */

/* ── signage ───────────────────────────────────────────── */

function signTexture(sign: Sign) {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 768;
  const g = canvas.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 768);
  grad.addColorStop(0, "#15191b"); grad.addColorStop(1, "#0b0d0e");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 768);
  g.fillStyle = "#c79a63"; g.fillRect(28, 64, 200, 3);
  g.fillStyle = "#f2e6d4"; g.font = "600 30px 'Segoe UI', Helvetica, Arial, sans-serif";
  g.textAlign = "center";
  const words = sign.title.split(" ");
  words.forEach((word, i) => g.fillText(word.toUpperCase(), 128, 140 + i * 42));
  g.fillStyle = "#b8ab98"; g.font = "400 20px 'Segoe UI', Helvetica, Arial, sans-serif";
  sign.line.split("\n").forEach((line, i) => g.fillText(line, 128, 300 + i * 30));
  if (sign.arrow) {
    g.save(); g.translate(128, 520);
    g.rotate(sign.arrow === "left" ? Math.PI : sign.arrow === "up" ? -Math.PI / 2 : 0);
    g.strokeStyle = "#e8c48f"; g.lineWidth = 9; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(-46, 0); g.lineTo(46, 0); g.moveTo(16, -30); g.lineTo(46, 0); g.lineTo(16, 30); g.stroke();
    g.restore();
  }
  g.fillStyle = "#6f655a"; g.font = "500 16px 'Segoe UI', Helvetica, Arial, sans-serif";
  g.fillText("LIVEGRID AV", 128, 712);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function leafTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 128;
  const g = canvas.getContext("2d")!;
  g.clearRect(0, 0, 64, 128);
  const grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, "#c8d6b0"); grad.addColorStop(1, "#ffffff");
  g.fillStyle = grad;
  g.beginPath(); g.moveTo(32, 126);
  g.bezierCurveTo(4, 96, 2, 40, 32, 2);
  g.bezierCurveTo(62, 40, 60, 96, 32, 126);
  g.fill();
  g.strokeStyle = "rgba(90,110,70,.55)"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(32, 124); g.lineTo(32, 8); g.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ── meshes ────────────────────────────────────────────── */

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, parts: Part[], name: string,
  options: { cast?: boolean; receive?: boolean } = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, parts.length));
  mesh.count = parts.length;
  const o = new THREE.Object3D(), colour = new THREE.Color();
  parts.forEach((part, i) => {
    o.position.set(...part.p); o.rotation.set(...(part.r ?? [0, 0, 0])); o.scale.set(...part.s); o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, colour.set(part.c));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = options.cast ?? false;
  mesh.receiveShadow = options.receive ?? true;
  mesh.name = name;
  return mesh;
}

type Shared = {
  geometry: Record<"box" | "round" | "cylinder" | "pot" | "torus" | "plane" | "leaf", THREE.BufferGeometry>;
  material: Record<"metal" | "fabric" | "wood" | "stone" | "ceramic" | "wet" | "leaf" | "glow" | "pool", THREE.Material>;
};

function createShared(): Shared {
  const leaf = new THREE.PlaneGeometry(1, 1);
  leaf.translate(0, .5, 0);
  const torus = new THREE.TorusGeometry(1, .07, 6, 20);
  return {
    geometry: {
      box: new THREE.BoxGeometry(1, 1, 1),
      round: new RoundedBoxGeometry(1, 1, 1, 3, .09),
      cylinder: new THREE.CylinderGeometry(.5, .5, 1, 24, 1),
      // Tapered planter with a rolled lip.
      pot: new THREE.LatheGeometry([[.36, -.5], [.42, -.46], [.5, .44], [.52, .47], [.52, .5], [.47, .5]].map(([x, y]) => new THREE.Vector2(x, y)), 28),
      torus,
      plane: new THREE.PlaneGeometry(1, 1),
      leaf,
    },
    material: {
      // White base: each instance carries its own colour.
      // Each family carries its own fine world-space grain (hallSurface.ts).
      metal: applySurface(new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: .8, roughness: .3, envMapIntensity: 1.1 }), "metal"),
      fabric: applySurface(new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0, roughness: .9, envMapIntensity: .4 }), "fabric"),
      wood: applySurface(new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0, roughness: .52, envMapIntensity: .7 }), "wood"),
      stone: applySurface(new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0, roughness: .3, envMapIntensity: .85 }), "stone"),
      ceramic: applySurface(new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0, roughness: .2, envMapIntensity: 1 }), "ceramic"),
      wet: applySurface(new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0, roughness: .16, envMapIntensity: 1.2 }), "wet"),
      leaf: applySurface(new THREE.MeshStandardMaterial({ color: "#ffffff", map: leafTexture(), alphaTest: .5, side: THREE.DoubleSide,
        roughness: .42, metalness: 0, envMapIntensity: .8 }), "leaf"),
      glow: new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, side: THREE.DoubleSide }),
      pool: new THREE.MeshBasicMaterial({ map: getPoolTexture(), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }),
    },
  };
}

function buildMeshes(layout: Layout, shared: Shared, label: string) {
  const { geometry: g, material: m } = shared;
  const meshes = [
    instanced(g.cylinder, m.metal, layout.metal, `${label} · metal`),
    instanced(g.box, m.metal, layout.metalBox, `${label} · metal trims`),
    instanced(g.torus, m.metal, layout.metalTorus, `${label} · metal rings`),
    instanced(g.round, m.fabric, layout.soft, `${label} · upholstery`),
    instanced(g.box, m.fabric, layout.rugs, `${label} · rugs`),
    instanced(g.box, m.wood, layout.solid, `${label} · joinery`),
    instanced(g.cylinder, m.stone, layout.disc, `${label} · tops, pots and bottles`),
    instanced(g.pot, m.ceramic, layout.pots, `${label} · planters`),
    instanced(g.cylinder, m.wet, layout.wet, `${label} · watered soil`),
    instanced(g.box, m.wet, layout.water, `${label} · water channels`),
    instanced(g.leaf, m.leaf, layout.leaves, `${label} · planting`),
    instanced(g.plane, m.glow, layout.glow, `${label} · lamps and LED strips`, { receive: false }),
    instanced(g.plane, m.pool, layout.pools, `${label} · light pools`, { receive: false }),
  ].filter(mesh => mesh.count > 0);
  const pool = meshes.find(mesh => mesh.material === m.pool);
  if (pool) pool.renderOrder = 2;
  return meshes;
}

/* ── guests ────────────────────────────────────────────── */

type Figure = { root: THREE.Object3D; centre: THREE.Vector3; forward: number; seated: boolean };

/**
 * Each licensed figure is one node (a group of mesh parts when it has several
 * materials), baked in place. Read its footprint and facing from its own
 * vertices: seated figures face where their knees are relative to the torso,
 * standing ones where the toes are relative to the ankles.
 */
function figures(scene: THREE.Object3D): Figure[] {
  const out: Figure[] = [];
  scene.updateMatrixWorld(true);
  const roots: THREE.Object3D[] = [];
  scene.traverse(object => {
    if (/Rocketbox/i.test(object.name) && !(object.parent && /Rocketbox/i.test(object.parent.name))) roots.push(object);
  });
  const v = new THREE.Vector3();
  for (const root of roots) {
    const meshes: THREE.Mesh[] = [];
    root.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
    if (!meshes.length) continue;
    const box = new THREE.Box3();
    for (const mesh of meshes) {
      const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) box.expandByPoint(v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
    }
    // Standing figures measure ~1.79 m with hair, seated ones 1.47–1.52 m.
    const seated = box.max.y - box.min.y < 1.65;
    const low = new THREE.Vector3(), mid = new THREE.Vector3();
    let lowN = 0, midN = 0;
    for (const mesh of meshes) {
      const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        const y = v.y - box.min.y;
        if (seated ? y > .3 && y < .55 : y < .05) { low.add(v); lowN++; }
        if (seated ? y > .85 && y < 1.15 : y > .1 && y < .2) { mid.add(v); midN++; }
      }
    }
    if (!lowN || !midN) continue;
    low.divideScalar(lowN); mid.divideScalar(midN);
    const centre = box.getCenter(new THREE.Vector3());
    centre.y = box.min.y;
    out.push({ root, centre, forward: Math.atan2(low.x - mid.x, low.z - mid.z), seated });
  }
  return out;
}

/**
 * Clothing tones for variety: the licensed set has four people, so each clone
 * may wear its outfit in a different tone (navy, sand, charcoal). Only the
 * body (clothing) material is tinted; faces and hair keep their own maps.
 */
const OUTFIT_TONES = [null, "#c3cde2", "#ead9bf", "#9d9ea6"] as const;
const tinted = new Map<string, THREE.Material>();
function outfit(material: THREE.Material, tone: string) {
  const key = material.uuid + tone;
  let result = tinted.get(key);
  if (!result) {
    result = material.clone();
    (result as THREE.MeshStandardMaterial).color.multiply(new THREE.Color(tone));
    tinted.set(key, result);
  }
  return result;
}

function placeGuests(source: THREE.Object3D, guests: Guest[], offset: number) {
  const pool = figures(source);
  const standing = pool.filter(f => !f.seated), seated = pool.filter(f => f.seated);
  const group = new THREE.Group();
  group.name = "Hall guests";
  let s = offset, t = offset;
  guests.forEach((guest, index) => {
    const list = guest.seated ? seated : standing;
    if (!list.length) return;
    const n = guest.seated ? t++ : s++;
    const figure = list[n % list.length];
    // Second time round the pose list, mirror the pose so repeats read as new people.
    const mirrored = Math.floor(n / list.length) % 2 === 1;
    const pivot = new THREE.Group();
    pivot.position.set(guest.p[0], FLOOR - figure.centre.y, guest.p[1]);
    pivot.rotation.y = Math.atan2(guest.face[0], guest.face[1]) - figure.forward * (mirrored ? -1 : 1);
    // A slow, small weight shift: phase and pace differ per person.
    pivot.userData.idle = { yaw: pivot.rotation.y, phase: (index * 2.39) % (Math.PI * 2), pace: .55 + (index * .37) % .4 };
    // The figure's own world frame, moved so its footprint centre is the pivot.
    const clone = figure.root.clone(true);
    figure.root.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale);
    clone.position.x -= figure.centre.x; clone.position.z -= figure.centre.z;
    const tone = OUTFIT_TONES[(index * 7 + offset) % OUTFIT_TONES.length];
    clone.traverse(object => {
      object.castShadow = false; object.frustumCulled = true;
      if (tone && object instanceof THREE.Mesh && !Array.isArray(object.material) && /\|\s*[^|]*body(?:\.\d+)?$/i.test(object.material.name))
        object.material = outfit(object.material, tone);
    });
    const holder = new THREE.Group();
    if (mirrored) holder.scale.x = -1;
    holder.add(clone);
    pivot.add(holder);
    group.add(pivot);
  });
  return group;
}

/** Breathing room: every guest sways a degree or so, never in step. */
function idleGuests(group: THREE.Group, time: number) {
  for (const pivot of group.children) {
    const idle = pivot.userData.idle as { yaw: number; phase: number; pace: number } | undefined;
    if (!idle) continue;
    pivot.rotation.y = idle.yaw + Math.sin(time * idle.pace + idle.phase) * .022;
    pivot.scale.y = 1 + Math.sin(time * 1.6 + idle.phase) * .0025;
  }
}

/* ── component ─────────────────────────────────────────── */

const LIGHTBOX = { w: 2.1, h: 3 }, WALL_PANEL = { w: 2.4, h: 3.4 };

/** Totems and the lit faces of the lightboxes and wall panels. */
function buildFixtures(zone: Zone) {
  const group = new THREE.Group();
  group.name = `${zone.label} · signs and lightboxes`;
  const frame = new THREE.MeshStandardMaterial({ color: "#1b1e20", metalness: .6, roughness: .4 });
  const box = new THREE.BoxGeometry(.72, 2.3, .14), face = new THREE.PlaneGeometry(.6, 1.8);
  for (const { sign, p, yaw } of zone.signs) {
    const totem = new THREE.Group();
    totem.position.set(p[0], FLOOR + 1.15, p[2]); totem.rotation.y = yaw;
    totem.add(new THREE.Mesh(box, frame));
    const screen = new THREE.MeshBasicMaterial({ map: signTexture(sign), toneMapped: true });
    for (const side of [1, -1]) {
      const panel = new THREE.Mesh(face, screen);
      panel.position.set(0, .12, side * .071); panel.rotation.y = side > 0 ? 0 : Math.PI;
      totem.add(panel);
    }
    group.add(totem);
  }
  const posters = new Map<number, THREE.Material>();
  const poster = (service: number, wall: boolean) => {
    const key = service * 2 + (wall ? 1 : 0);
    if (!posters.has(key)) {
      const map = wall ? servicePosterTexture(service, 512, 720) : servicePosterTexture(service);
      posters.set(key, new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: "#ffffff", emissiveIntensity: .5, roughness: .6 }));
    }
    return posters.get(key)!;
  };
  const lightboxFace = new THREE.PlaneGeometry(LIGHTBOX.w, LIGHTBOX.h);
  const lightboxCase = new THREE.BoxGeometry(LIGHTBOX.w + .08, LIGHTBOX.h + .08, .16);
  const wallFace = new THREE.PlaneGeometry(WALL_PANEL.w, WALL_PANEL.h);
  const wallCase = new THREE.BoxGeometry(WALL_PANEL.w + .1, WALL_PANEL.h + .1, .06);
  for (const panel of zone.panels) {
    const holder = new THREE.Group();
    if (panel.kind === "lightbox") {
      holder.position.set(panel.x, FLOOR + .45 + LIGHTBOX.h / 2, panel.z); holder.rotation.y = panel.yaw;
      const material = poster(panel.service, false);
      const front = new THREE.Mesh(lightboxFace, material); front.position.z = .085;
      const back = new THREE.Mesh(lightboxFace, material); back.position.z = -.085; back.rotation.y = Math.PI;
      holder.add(new THREE.Mesh(lightboxCase, frame), front, back);
    } else {
      holder.position.set(panel.x + panel.dir * .04, FLOOR + 2.6, panel.z); holder.rotation.y = panel.dir * Math.PI / 2;
      const front = new THREE.Mesh(wallFace, poster(panel.service, true)); front.position.z = .035;
      holder.add(new THREE.Mesh(wallCase, frame), front);
    }
    group.add(holder);
  }
  return group;
}

function DressedZone({ zone, visitors }: { zone: Zone; visitors: THREE.Object3D }) {
  const shared = useMemo(() => createShared(), []);
  const meshes = useMemo(() => buildMeshes(zone.layout, shared, zone.label), [zone, shared]);
  const guests = useMemo(() => placeGuests(visitors, zone.layout.guests, zone.cast), [visitors, zone]);
  // Only while the zone is shown: ZoneGroup hides its group when out of range.
  useFrame(({ clock }) => { if (guests.parent?.visible !== false) idleGuests(guests, clock.elapsedTime); });
  const fixtures = useMemo(() => buildFixtures(zone), [zone]);
  useEffect(() => () => {
    meshes.forEach(mesh => mesh.dispose());
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    fixtures.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry); materials.add(object.material as THREE.Material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => { (material as THREE.MeshStandardMaterial).map?.dispose(); material.dispose(); });
  }, [meshes, fixtures]);
  useEffect(() => () => {
    Object.values(shared.geometry).forEach(geometry => geometry.dispose());
    Object.values(shared.material).forEach(material => {
      if (material !== shared.material.pool) (material as THREE.MeshStandardMaterial).map?.dispose();
      material.dispose();
    });
  }, [shared]);
  return <ZoneGroup from={zone.from} to={zone.to} ahead={70} behind={40}>
    {meshes.map(mesh => <primitive key={mesh.name} object={mesh} />)}
    <primitive object={guests} />
    <primitive object={fixtures} />
  </ZoneGroup>;
}

export function HallDressing() {
  const diagnostic = useVenue(s => s.stallVisit?.view === "plan" || s.stallVisit?.view === "section");
  // The same file the rental booth draws (its lod1 below high quality), so it loads once.
  const visitorsUrl = useModelUrl(expoAssetUrl("grand-rental-finish-v2-visitors", rentalLayout.stats.visitors.sha256))!;
  const gl = useThree(state => state.gl);
  const { scene: visitors } = useGLTF(visitorsUrl, false, true, gltfExtender(gl));
  useMemo(() => refineAvatarSkin(visitors), [visitors]);
  const zones = useMemo(() => hallZones(), []);
  return <group visible={!diagnostic} name="Hall dressing">
    {zones.map(zone => <DressedZone key={zone.label} zone={zone} visitors={visitors} />)}
    {/* Pooled fixtures: candidates for the six shared lights, never extra shader lights. */}
    <LocalPointLight position={[-21, 4.2, -62.5]} color="#ffd3a0" intensity={46} distance={15} decay={2} />
    <LocalPointLight position={[-32, 4, -64]} color="#ffd3a0" intensity={34} distance={12} decay={2} />
    <LocalPointLight position={[22, 4.6, -62]} color="#ffdcb0" intensity={34} distance={14} decay={2} />
    <LocalPointLight position={[-24, 3.6, -99.5]} color="#ffcf98" intensity={40} distance={14} decay={2} />
    <LocalPointLight position={[23, 3.4, -101]} color="#f4e6d6" intensity={30} distance={13} decay={2} />
    <LocalPointLight position={[34.5, 4, -82]} color="#ffdcb0" intensity={36} distance={14} decay={2} />
  </group>;
}
