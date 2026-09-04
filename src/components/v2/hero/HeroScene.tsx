"use client";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { forestVertex, forestFragment } from "./forest";

/**
 * V2 hero — the physical LED installation (brief Gate 2 §15-17).
 * A real graphite room: reflective floor, an L-corner LED (two framed walls
 * that sit ON the floor with cabinet depth), warm practical lighting, and a
 * living forest as the LED content. NO animal yet (that is Gate 4). Fixed
 * anamorphic sweet-spot camera (§18).
 *
 * Camera sweet spot (recorded, §18):
 *   position [0, 2.35, 9.2]  target [0, 2.35, -3]  fov 40
 * LED L-corner:
 *   corner edge at (0, 0..5, -6); each wall 9w x 5h, splayed ±32° about Y,
 *   bottom at floor (y=0).
 */

const WALL_W = 9;
const WALL_H = 5;
const CORNER_Z = -6;
const SPLAY = 0.56; // ~32°

function ForestWall({ side }: { side: 1 | -1 }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uFlip: { value: side }, uAmp: { value: 1.8 } }),
    [side],
  );
  useFrame((s) => {
    if (mat.current) mat.current.uniforms.uTime.value = s.clock.elapsedTime;
  });

  // group at the corner; splay about Y; plane centred so its inner edge meets
  // the corner and it extends outward toward the camera
  return (
    <group position={[0, 0, CORNER_Z]} rotation={[0, side * SPLAY, 0]}>
      <group position={[side * (WALL_W / 2), WALL_H / 2, 0]}>
        {/* cabinet body (depth) + frame — the wall has real thickness */}
        <mesh position={[0, 0, -0.14]}>
          <boxGeometry args={[WALL_W + 0.18, WALL_H + 0.18, 0.28]} />
          <meshStandardMaterial color="#0c0b0a" metalness={0.6} roughness={0.5} />
        </mesh>
        {/* emissive LED surface */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[WALL_W, WALL_H, 1, 1]} />
          <shaderMaterial
            ref={mat}
            vertexShader={forestVertex}
            fragmentShader={forestFragment}
            uniforms={uniforms}
            toneMapped={false}
          />
        </mesh>
      </group>
      {/* LED spill onto the floor in front of this wall */}
      <pointLight
        position={[side * (WALL_W / 2), 1.8, 1.8]}
        color="#bfe6d6" intensity={18} distance={14} decay={1.6}
      />
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#070605"]} />
      <fog attach="fog" args={["#070605", 12, 34]} />

      {/* natural-warm practical lighting */}
      <ambientLight intensity={0.16} color="#b3aa9c" />
      <hemisphereLight intensity={0.12} color="#caa878" groundColor="#0a0908" />
      {/* warm key wash from the front-top, like a venue fixture */}
      <spotLight position={[3, 8, 7]} angle={0.7} penumbra={0.9} intensity={90} color="#ffe4c0" distance={28} />
      <spotLight position={[-4, 7, 6]} angle={0.7} penumbra={0.9} intensity={40} color="#ffe4c0" distance={26} />

      {/* reflective floor — grounds the LED walls (contact + reflection) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]}>
        <planeGeometry args={[70, 70]} />
        <MeshReflectorMaterial
          resolution={1024}
          mixBlur={1}
          mixStrength={2.2}
          blur={[300, 60]}
          roughness={0.85}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#0a0908"
          metalness={0.55}
          mirror={0}
        />
      </mesh>

      {/* the L-corner LED installation */}
      <ForestWall side={1} />
      <ForestWall side={-1} />

      {/* a low riser / floor edge in front, giving human scale + contact line */}
      <mesh position={[0, 0.06, 2.4]}>
        <boxGeometry args={[26, 0.12, 0.4]} />
        <meshStandardMaterial color="#131210" metalness={0.4} roughness={0.6} />
      </mesh>
    </>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 2.35, 9.2], fov: 40, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Scene />
    </Canvas>
  );
}
