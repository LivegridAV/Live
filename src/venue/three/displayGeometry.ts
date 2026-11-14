import * as THREE from "three";

export type DisplayAperture = {
  id: string; type?: string; x: number; y: number; z: number;
  w: number; h: number; rotation: number[]; mediaHint: string;
  radius?: number; radiusX?: number; radiusZ?: number; arc?: number;
  transparent?: boolean; uv?: number[];
  height?: number; bandWidth?: number; turns?: number; phase?: number; segments?: number;
  innerFraction?:number;
};

/** Emitting geometry uses the same authoring coordinates as the Blender cabinets. */
export function displayGeometry(a: DisplayAperture): THREE.BufferGeometry {
  if (a.type === "sphere") return new THREE.SphereGeometry(a.radius ?? a.w / 2, 64, 40).rotateY(Math.PI);
  if (a.type === "ellipse") return (a.innerFraction
    ? new THREE.RingGeometry(a.innerFraction,1,128)
    : new THREE.CircleGeometry(1,128)).scale(a.radiusX ?? a.w / 2,a.radiusZ ?? a.h / 2,1);
  if (a.type === "cylinder" || a.type === "curved") {
    const radius = a.radius ?? a.w / (Math.PI * 2);
    const arc = a.arc ?? Math.PI / 3;
    const geometry = new THREE.CylinderGeometry(radius, radius, a.h, 96, 1, true,
      a.type === "curved" ? -arc / 2 : 0, a.type === "curved" ? arc : Math.PI * 2);
    if (a.type === "cylinder") geometry.rotateY(Math.PI);
    return geometry;
  }
  if (a.type === "helix") {
    const count = Math.max(96, a.segments ?? 384);
    const radius = a.radius ?? .52, height = a.height ?? 2.9;
    const band = a.bandWidth ?? .47, turns = a.turns ?? 3, phase = a.phase ?? 0;
    const vertices = new Float32Array((count + 1) * 6);
    const uv = new Float32Array((count + 1) * 4);
    const indices: number[] = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count, theta = phase + t * Math.PI * 2 * turns;
      for (let side = 0; side < 2; side++) {
        const index = i * 2 + side;
        vertices.set([radius * Math.sin(theta), t * height + (side - .5) * band, radius * Math.cos(theta)], index * 3);
        uv.set([t, side], index * 2);
      }
      if (i < count) {
        const start = i * 2;
        indices.push(start, start + 2, start + 1, start + 1, start + 2, start + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    return geometry;
  }
  return new THREE.PlaneGeometry(a.w, a.h);
}
