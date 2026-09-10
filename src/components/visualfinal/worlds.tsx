"use client";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LedWall, VenueFloor, Truss, LightRig, Silhouette } from "./systems/stage";
import { FRAGMENTS, contentVertex, oceanFragment } from "./systems/shaders";

/* ---------- 01 Anamorphic lion stage ---------- */
export function WorldAnamorphic() {
  return (
    <group>
      <LedWall fragment={FRAGMENTS.anamorphic} panels={6} width={30} height={9} radius={24} y={4.6} z={-11} />
      <Truss width={32} z={-9.5} y={9.2} />
      <LightRig colorA="#bfe0ff" colorB="#dfeeff" intensity={110} />
      <VenueFloor tint="#0a0b0e" />
      <Silhouette z={7} x={0.5} />
      {/* debris rocks drifting near the LED boundary (anamorphic 'break-out') */}
      <DriftRocks />
    </group>
  );
}

function DriftRocks() {
  const g = useRef<THREE.Group>(null);
  // biased to the right so they don't sit under the left-side hero copy
  const rocks = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      p: [3 + Math.random() * 8, 2 + Math.random() * 5, -5 - Math.random() * 3] as [number, number, number],
      s: 0.35 + Math.random() * 0.6, r: Math.random() * Math.PI,
    })), []);
  useFrame((s) => { if (g.current) g.current.children.forEach((c, i) => { c.rotation.y = s.clock.elapsedTime * 0.1 + i; c.position.y += Math.sin(s.clock.elapsedTime * 0.3 + i) * 0.002; }); });
  return (
    <group ref={g}>
      {rocks.map((r, i) => (
        <mesh key={i} position={r.p} rotation={[r.r, r.r, 0]} scale={r.s}>
          <dodecahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color="#3b414c" roughness={0.85} metalness={0.15} emissive="#0a1420" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 02 Corporate globe ---------- */
export function WorldCorporate() {
  const globe = useRef<THREE.Group>(null);
  useFrame((s) => { if (globe.current) globe.current.rotation.y = s.clock.elapsedTime * 0.12; });
  return (
    <group>
      <LedWall fragment={FRAGMENTS.corporate} panels={6} width={30} height={9} radius={26} y={4.6} z={-12} />
      <Truss width={32} z={-10} y={9.2} />
      <LightRig colorA="#39d6c8" colorB="#1fa093" intensity={90} />
      <VenueFloor tint="#070b0d" />
      <group ref={globe} position={[0, 3.2, -5]}>
        <mesh>
          <icosahedronGeometry args={[2.1, 2]} />
          <meshBasicMaterial color="#39d6c8" wireframe transparent opacity={0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.02, 32, 32]} />
          <meshStandardMaterial color="#05171a" emissive="#0a3b3a" emissiveIntensity={0.5} roughness={0.4} />
        </mesh>
      </group>
      <Silhouette z={7} x={-1.5} />
    </group>
  );
}

/* ---------- 03 Festival / space ---------- */
export function WorldFestival() {
  return (
    <group>
      <LedWall fragment={FRAGMENTS.festival} panels={6} width={30} height={9.5} radius={22} y={4.8} z={-11} />
      <Truss width={32} z={-9.5} y={9.4} />
      <LightRig colorA="#c04cff" colorB="#2fd0ff" intensity={140} />
      <VenueFloor tint="#0a0710" />
      <FestivalParticles />
      <Silhouette z={7.2} x={1.2} />
    </group>
  );
}

function FestivalParticles() {
  const pts = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 400; const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = (Math.random() - 0.5) * 24; arr[i * 3 + 1] = Math.random() * 10; arr[i * 3 + 2] = -8 + Math.random() * 12; }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((s) => { if (pts.current) pts.current.rotation.y = s.clock.elapsedTime * 0.03; });
  return (
    <points ref={pts} geometry={geo}>
      <pointsMaterial color="#7fe6ff" size={0.05} transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

/* ---------- 04 Social / nature ---------- */
export function WorldSocial() {
  return (
    <group>
      <LedWall fragment={FRAGMENTS.social} panels={6} width={30} height={9} radius={24} y={4.6} z={-11} />
      <Truss width={32} z={-9.5} y={9.2} />
      <LightRig colorA="#ffd9a0" colorB="#ffbe73" intensity={100} />
      <VenueFloor tint="#0d0a07" />
      <Silhouette z={7} x={0} />
    </group>
  );
}

/* ---------- 05 360 installation / suspended ocean cube ---------- */
export function WorldInstallation() {
  const cube = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame((s) => {
    if (cube.current) cube.current.rotation.y = s.clock.elapsedTime * 0.15;
    if (mat.current) mat.current.uniforms.uTime.value = s.clock.elapsedTime;
  });
  return (
    <group>
      {/* dark circular room implied by floor + ring lights */}
      <VenueFloor tint="#05090b" />
      <mesh ref={cube} position={[0, 4.2, -6]}>
        <boxGeometry args={[4.2, 4.2, 4.2]} />
        <shaderMaterial
          ref={mat} vertexShader={contentVertex} fragmentShader={oceanFragment} toneMapped={false}
          uniforms={{ uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMood: { value: 1 },
            uUvOffset: { value: new THREE.Vector2(0, 0) }, uUvScale: { value: new THREE.Vector2(1, 1) } }} />
      </mesh>
      <RingLights />
      <LightRig colorA="#2fd0ff" colorB="#39d6c8" intensity={70} />
      <Silhouette z={8} x={2} />
    </group>
  );
}

function RingLights() {
  const items = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2; return [Math.cos(a) * 10, 7.5, -6 + Math.sin(a) * 10] as [number, number, number];
  }), []);
  return <>{items.map((p, i) => (
    <mesh key={i} position={p}><sphereGeometry args={[0.12, 8, 8]} /><meshBasicMaterial color="#39d6c8" /></mesh>
  ))}</>;
}

export const WORLD_SCENES = [WorldAnamorphic, WorldCorporate, WorldFestival, WorldSocial, WorldInstallation];
