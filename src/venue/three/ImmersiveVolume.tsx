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
  /** a flat panel, or an arched vault springing from the floor either side */
  kind?: "plane" | "vault";
  /** plane: width and height. vault: springing radius and length. */
  size: [number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  /** vault only: crown height as a multiple of the radius */
  rise?: number;
}

const LAYERS = { low: 4, medium: 7, high: 11 } as const;

export function ImmersiveVolume({
  surfaces,
  phase,
  portalZ,
  maxLayers,
  backdrop,
  ...options
}: Omit<ImmersiveOptions, "portalZ" | "layers" | "backdrop"> & {
  surfaces: Surface[];
  backdrop?: string;
  /** a small demonstration cube does not need an arena's worth of depth */
  maxLayers?: number;
  /** 0 → 1 along the installation, from the camera's world Z, read per frame */
  phase: (camZ: number) => number;
  /** may move, so the destination can open as the visitor advances */
  portalZ: (p: number) => number;
}) {
  const quality = useVenue((s) => s.quality);
  const reduced = useVenue((s) => s.reducedMotion);
  const backdropTexture = useMemo(() => {
    if (!backdrop) return undefined;
    const texture = new THREE.TextureLoader().load(backdrop);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 4;
    return texture;
  }, [backdrop]);
  useEffect(() => () => backdropTexture?.dispose(), [backdropTexture]);

  const material = useMemo(
    () =>
      createImmersiveMaterial({
        ...options,
        backdrop: backdropTexture,
        portalZ: portalZ(0),
        layers: Math.min(LAYERS[quality], maxLayers ?? LAYERS.high),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options are fixed per installation; quality is the only live input
    [quality, backdropTexture],
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
      {surfaces.map((s, i) =>
        s.kind === "vault" ? (
          /* A half-cylinder lying along Z, scaled vertically into an ellipse.
             Real immersive tunnels are vaulted rather than boxed, and the
             difference is not decorative: an arch has no corner for the eye to
             find, so the room stops having a shape at all. The projection does
             not care what surface it is drawn on, so the vault costs nothing
             in continuity. */
          <mesh
            key={i}
            material={material}
            position={s.position}
            rotation={s.rotation ?? [Math.PI / 2, 0, 0]}
            scale={[1, 1, s.rise ?? 1.5]}
          >
            <cylinderGeometry
              args={[s.size[0], s.size[0], s.size[1], 48, 1, true, Math.PI / 2, Math.PI]}
            />
          </mesh>
        ) : (
          <mesh
            key={i}
            material={material}
            position={s.position}
            rotation={s.rotation ?? [0, 0, 0]}
          >
            <planeGeometry args={[s.size[0], s.size[1]]} />
          </mesh>
        ),
      )}
    </group>
  );
}
