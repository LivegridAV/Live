"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { streakTexture } from "./materials";

/**
 * A screen's reflection on the floor.
 *
 * A real planar reflector would re-render the venue for every polished
 * surface. At these viewing angles a stretched additive gradient, tinted to the
 * screen it sits under, is indistinguishable — and costs one transparent quad.
 */
export function ReflectionStreak({
  position,
  rotation = [-Math.PI / 2, 0, 0],
  width = 6,
  length = 7,
  color = "#7fd3c6",
  opacity = 0.2,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  length?: number;
  color?: string;
  opacity?: number;
}) {
  const tex = useMemo(() => streakTexture(), []);
  return (
    <mesh position={position} rotation={rotation} renderOrder={1}>
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial
        map={tex}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
