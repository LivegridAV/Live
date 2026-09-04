"use client";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { forestVertex, forestFragment } from "./forest";
import AnamorphicCorner, { SWEET_POS, SWEET_TARGET, SWEET_FOV } from "./AnamorphicCorner";
import { HeroContent } from "./content";

type Mode = "hero" | "forest" | "atest";

/**
 * V2 hero (brief Gates 2–5). A real graphite room: reflective floor, an
 * L-corner LED that sits on the floor, warm practical lighting.
 *  - mode "forest": LED shows the living forest (Gate 2 environment).
 *  - mode "atest":  the anamorphic corner projects a primitive (Gate 3 test).
 *  - view "off": actual camera moves off-axis to expose the distortion.
 */

const WALL_W = 9, WALL_H = 5, CORNER_Z = -6, SPLAY = 0.56;

function ForestWall({ side }: { side: 1 | -1 }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uFlip: { value: side }, uAmp: { value: 1.8 } }),
    [side],
  );
  useFrame((s) => { if (mat.current) mat.current.uniforms.uTime.value = s.clock.elapsedTime; });
  return (
    <group position={[0, 0, CORNER_Z]} rotation={[0, side * SPLAY, 0]}>
      <group position={[side * (WALL_W / 2), WALL_H / 2, 0]}>
        <mesh position={[0, 0, -0.14]}>
          <boxGeometry args={[WALL_W + 0.18, WALL_H + 0.18, 0.28]} />
          <meshStandardMaterial color="#0c0b0a" metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[WALL_W, WALL_H, 1, 1]} />
          <shaderMaterial ref={mat} vertexShader={forestVertex} fragmentShader={forestFragment} uniforms={uniforms} toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[side * (WALL_W / 2), 1.8, 1.8]} color="#bfe6d6" intensity={18} distance={14} decay={1.6} />
    </group>
  );
}

/** Gate 3 test content (JSX into the corner's content scene): a ground grid +
 *  a primitive box + a depth pole. Proves the projection. */
function TestContent() {
  const box = useRef<THREE.Mesh>(null);
  useFrame((s) => { if (box.current) box.current.rotation.y = s.clock.elapsedTime * 0.35; });
  return (
    <>
      <ambientLight intensity={0.7} color="#9fb0c0" />
      <pointLight position={[3, 6, -1]} color="#ffe6c4" intensity={90} distance={44} decay={1.6} />
      <pointLight position={[-3, 3, -3]} color="#bfe6d6" intensity={30} distance={30} decay={1.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0b0d0b" roughness={0.95} metalness={0.05} />
      </mesh>
      <gridHelper args={[50, 50, 0x2a3a2c, 0x18211a]} position={[0, 0.01, -6]} />
      <mesh ref={box} position={[0, 0.9, -4.6]}>
        <boxGeometry args={[1.8, 1.8, 1.8]} />
        <meshStandardMaterial color="#e0a94a" emissive="#3a1f08" emissiveIntensity={0.4} metalness={0.2} roughness={0.45} />
      </mesh>
      <mesh position={[-2.6, 1.5, -7.5]}>
        <cylinderGeometry args={[0.12, 0.12, 3, 12]} />
        <meshStandardMaterial color="#46d8ca" emissive="#0d3f39" emissiveIntensity={0.6} />
      </mesh>
    </>
  );
}

function Scene({ mode, view }: { mode: Mode; view: "sweet" | "off" }) {
  const camApplied = useRef(false);
  useFrame(({ camera }) => {
    if (camApplied.current) return;
    camApplied.current = true;
    const c = camera as THREE.PerspectiveCamera;
    if (view === "off") { c.position.set(6.2, 2.1, 7.4); }
    else { c.position.copy(SWEET_POS); }
    c.lookAt(SWEET_TARGET);
    c.fov = SWEET_FOV; c.updateProjectionMatrix();
  });

  return (
    <>
      <color attach="background" args={["#070605"]} />
      <fog attach="fog" args={["#070605", 12, 34]} />
      <ambientLight intensity={0.16} color="#b3aa9c" />
      <hemisphereLight intensity={0.12} color="#caa878" groundColor="#0a0908" />
      <spotLight position={[3, 8, 7]} angle={0.7} penumbra={0.9} intensity={90} color="#ffe4c0" distance={28} />
      <spotLight position={[-4, 7, 6]} angle={0.7} penumbra={0.9} intensity={40} color="#ffe4c0" distance={26} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]}>
        <planeGeometry args={[70, 70]} />
        <MeshReflectorMaterial resolution={1024} mixBlur={1} mixStrength={2.2} blur={[300, 60]}
          roughness={0.85} depthScale={1.1} minDepthThreshold={0.4} maxDepthThreshold={1.2}
          color="#0a0908" metalness={0.55} mirror={0} />
      </mesh>

      {mode === "atest" && <AnamorphicCorner><TestContent /></AnamorphicCorner>}
      {mode === "hero" && <AnamorphicCorner><HeroContent /></AnamorphicCorner>}
      {mode === "forest" && (<><ForestWall side={1} /><ForestWall side={-1} /></>)}

      <mesh position={[0, 0.06, 2.4]}>
        <boxGeometry args={[26, 0.12, 0.4]} />
        <meshStandardMaterial color="#131210" metalness={0.4} roughness={0.6} />
      </mesh>
    </>
  );
}

export default function HeroScene({ mode = "hero", view = "sweet" }: { mode?: Mode; view?: "sweet" | "off" }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 2.35, 9.2], fov: 40, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Scene mode={mode} view={view} />
    </Canvas>
  );
}
