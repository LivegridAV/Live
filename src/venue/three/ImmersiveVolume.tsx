"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createImmersiveMaterial, type ImmersiveOptions } from "./immersive";
import { useVenue } from "../systems/store";

/**
 * An enveloping LED installation.
 *
 * All of its surfaces share a single material instance, which is the whole
 * point: one shader program, one set of uniforms updated once per frame, and —
 * because the content is generated from world position rather than from a
 * texture — one virtual world that every surface is a window onto. Add a
 * surface and it joins the same world automatically, at the same brightness,
 * with the same pitch, aligned along every edge it shares.
 */

export interface Surface {
  /** panel size in metres */
  size: [number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
}

const LAYERS = { low: 4, medium: 7, high: 11 } as const;

export function ImmersiveVolume({
  surfaces,
  phase,
  portalZ,
  maxLayers,
  ...options
}: Omit<ImmersiveOptions, "portalZ" | "layers"> & {
  surfaces: Surface[];
  /** a small demonstration cube does not need an arena's worth of depth */
  maxLayers?: number;
  /** 0 → 1 along the installation, from the camera's world Z, read per frame */
  phase: (camZ: number) => number;
  /** may move, so the destination can open as the visitor advances */
  portalZ: (p: number) => number;
}) {
  const quality = useVenue((s) => s.quality);
  const reduced = useVenue((s) => s.reducedMotion);

  const material = useMemo(
    () =>
      createImmersiveMaterial({
        ...options,
        portalZ: portalZ(0),
        layers: Math.min(LAYERS[quality], maxLayers ?? LAYERS.high),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options are fixed per installation; quality is the only live input
    [quality],
  );
  useEffect(() => () => material.dispose(), [material]);

  const eye = useRef(new THREE.Vector3());

  useFrame(({ camera, clock }) => {
    const u = material.uniforms;
    u.uTime.value = clock.elapsedTime * (reduced ? 0.35 : 1);
    // The eye is the real camera. That is what makes the projection exact and
    // the physical structure disappear: every surface shows precisely what the
    // viewer would see through it if the wall were not there.
    camera.getWorldPosition(eye.current);
    u.uEye.value.copy(eye.current);
    const p = phase(eye.current.z);
    u.uPhase.value = p;
    u.uPortalZ.value = portalZ(p);
  });

  return (
    <group>
      {surfaces.map((s, i) => (
        <mesh
          key={i}
          material={material}
          position={s.position}
          rotation={s.rotation ?? [0, 0, 0]}
        >
          <planeGeometry args={[s.size[0], s.size[1]]} />
        </mesh>
      ))}
    </group>
  );
}
