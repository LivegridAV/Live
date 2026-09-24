"use client";
import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Distance gating along the venue's axis.
 *
 * The venue is 375 m of corridor, and three.js has no occlusion culling — so
 * standing at the entrance, the frustum happily accepts the arena 350 m away
 * behind two solid walls, and every one of its meshes gets submitted. Gating
 * whole zones by the camera's Z is what turns ~1000 draw calls into ~200:
 * a group that is switched off costs nothing at all, and the exponential fog
 * means the boundary is never visible.
 *
 * `from` is the near (less negative) end, `to` the far end. The camera travels
 * toward -Z, so `ahead` is how far in front of a zone it switches on — generous,
 * because that is the direction the camera is looking — and `behind` is how far
 * past it the zone stays lit, which can be much shorter.
 */
export function ZoneGroup({
  from,
  to,
  ahead = 95,
  behind = 45,
  children,
}: {
  from: number;
  to: number;
  ahead?: number;
  behind?: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  // Start visible: the first frame must render, or nothing warms up.
  useFrame(({ camera }) => {
    const g = ref.current;
    if (!g) return;
    const z = camera.position.z;
    // Visible while the camera is approaching the zone, inside it, or has only
    // just passed through it.
    const visible = z <= from + ahead && z >= to - behind;
    if (g.visible !== visible) g.visible = visible;
  }, -2);
  return <group ref={ref}>{children}</group>;
}
