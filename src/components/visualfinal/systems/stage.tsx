"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { contentVertex } from "./shaders";

/**
 * Reusable stage systems (brief §34): a curved multi-panel LED wall driven by a
 * content shader, a reflective venue floor, overhead truss, moving light rig and
 * a foreground human silhouette for scale. Shared by all five worlds.
 */

/** Curved array of LED panels. Content is sliced across panels so the image is
 *  continuous across the whole wall (no per-panel repeat). */
export function LedWall({
  fragment, panels = 5, width = 26, height = 8, radius = 22, y = 4, z = -10, intensity = 1,
}: {
  fragment: string; panels?: number; width?: number; height?: number;
  radius?: number; y?: number; z?: number; intensity?: number;
}) {
  const mats = useRef<THREE.ShaderMaterial[]>([]);
  const arc = width / radius;                 // total angular span
  const panelW = width / panels;
  const gap = 0.04;

  const items = useMemo(() => {
    const out: { pos: [number, number, number]; rot: [number, number, number]; off: number }[] = [];
    for (let i = 0; i < panels; i++) {
      const t = (i + 0.5) / panels;           // 0..1 across wall
      const ang = (t - 0.5) * arc;            // angle from center
      const px = Math.sin(ang) * radius;
      const pz = z + (radius - Math.cos(ang) * radius);
      out.push({ pos: [px, y, pz], rot: [0, -ang, 0], off: i / panels });
    }
    return out;
  }, [panels, arc, radius, y, z]);

  useFrame((s) => {
    for (const m of mats.current) if (m) m.uniforms.uTime.value = s.clock.elapsedTime;
  });

  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={it.pos} rotation={it.rot}>
          {/* dark cabinet behind the emissive face */}
          <mesh position={[0, 0, -0.16]}>
            <boxGeometry args={[panelW + gap, height + 0.2, 0.3]} />
            <meshStandardMaterial color="#08090c" metalness={0.7} roughness={0.5} />
          </mesh>
          <mesh>
            <planeGeometry args={[panelW - gap, height]} />
            <shaderMaterial
              ref={(m) => { if (m) mats.current[i] = m as THREE.ShaderMaterial; }}
              vertexShader={contentVertex}
              fragmentShader={fragment}
              toneMapped={false}
              uniforms={{
                uTime: { value: 0 },
                uRes: { value: new THREE.Vector2(width, height) },
                uMood: { value: intensity },
                uUvOffset: { value: new THREE.Vector2(it.off, 0) },
                uUvScale: { value: new THREE.Vector2(1 / panels, 1) },
              }}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function VenueFloor({ tint = "#0a0a0c" }: { tint?: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[120, 120]} />
      <MeshReflectorMaterial
        resolution={1024} mixBlur={1.1} mixStrength={2.6} blur={[320, 80]}
        roughness={0.82} depthScale={1.15} minDepthThreshold={0.4} maxDepthThreshold={1.3}
        color={tint} metalness={0.6} mirror={0} />
    </mesh>
  );
}

/** Overhead truss spanning the stage width. */
export function Truss({ width = 30, z = -9, y = 8.4 }: { width?: number; z?: number; y?: number }) {
  const bars = [-width / 2, -width / 6, width / 6, width / 2];
  return (
    <group>
      <mesh position={[0, y, z]}>
        <boxGeometry args={[width, 0.28, 0.28]} />
        <meshStandardMaterial color="#111318" metalness={1} roughness={0.5} />
      </mesh>
      {bars.map((x, i) => (
        <mesh key={i} position={[x, y - 0.4, z]}>
          <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
          <meshStandardMaterial color="#0e1013" metalness={1} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

/** Moving-head style spot lights with a slow pan; visible via scene fog. */
export function LightRig({
  colorA = "#bfe0ff", colorB = "#ffd9a8", intensity = 120, animate = true,
}: { colorA?: string; colorB?: string; intensity?: number; animate?: boolean }) {
  const a = useRef<THREE.SpotLight>(null);
  const b = useRef<THREE.SpotLight>(null);
  const c = useRef<THREE.SpotLight>(null);
  useFrame((s) => {
    if (!animate) return;
    const t = s.clock.elapsedTime;
    if (a.current) a.current.position.x = -8 + Math.sin(t * 0.3) * 3;
    if (b.current) b.current.position.x = 8 + Math.cos(t * 0.26) * 3;
    if (c.current) c.current.position.x = Math.sin(t * 0.2) * 2;
  });
  return (
    <>
      <spotLight ref={a} position={[-8, 9, 2]} angle={0.34} penumbra={0.9} intensity={intensity} color={colorA} distance={40} castShadow={false} />
      <spotLight ref={b} position={[8, 9, 2]} angle={0.34} penumbra={0.9} intensity={intensity} color={colorB} distance={40} />
      <spotLight ref={c} position={[0, 10, 0]} angle={0.28} penumbra={0.85} intensity={intensity * 0.9} color={colorA} distance={44} />
    </>
  );
}

/** Foreground human silhouette (brief §12) — communicates the ~100ft scale. */
export function Silhouette({ z = 6.5, x = 0, h = 1.85 }: { z?: number; x?: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h * 0.52, 0]}>
        <capsuleGeometry args={[0.22, h * 0.62, 6, 12]} />
        <meshStandardMaterial color="#000" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, h * 0.92, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#000" roughness={1} />
      </mesh>
    </group>
  );
}
