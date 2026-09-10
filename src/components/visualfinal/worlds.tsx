"use client";
import { Suspense, Component, useRef, useMemo, useState, useEffect, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { LedWall, VenueFloor, Truss, LightRig, Silhouette } from "./systems/stage";
import { FRAGMENTS, contentVertex, oceanFragment } from "./systems/shaders";

// Random layouts are computed once at module load (kept out of render for purity).
// Rock-burst: a broken platform under the lion + debris breaking forward (anamorphic).
const ROCK_BURST = [
  ...Array.from({ length: 9 }, () => ({
    p: [(Math.random() - 0.5) * 6, Math.random() * 1.5, 0.3 + Math.random() * 2.6] as [number, number, number],
    s: 0.55 + Math.random() * 1.15, r: Math.random() * Math.PI, spin: 0,
  })),
  ...Array.from({ length: 10 }, () => ({
    p: [(Math.random() - 0.5) * 11, 1.6 + Math.random() * 4.4, 1 + Math.random() * 4.5] as [number, number, number],
    s: 0.3 + Math.random() * 0.7, r: Math.random() * Math.PI, spin: 0.08 + Math.random() * 0.18,
  })),
];
const FESTIVAL_POS = (() => {
  const n = 400; const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = (Math.random() - 0.5) * 24; arr[i * 3 + 1] = Math.random() * 10; arr[i * 3 + 2] = -8 + Math.random() * 12; }
  return arr;
})();

/** Renders children; if a child throws (e.g. missing GLB) it renders nothing
 *  instead of crashing the whole canvas. */
class SafeModel extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Flagship anamorphic subject: a lion emerging from the LED corner toward the
 *  viewer (naked-eye 3D). Loads /models/lion.glb when present; plays its first
 *  clip (walk) if the model is animated. Safe if the asset isn't there yet. */
function LionSubject() {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF("/models/lion.glb?v=3");
  const { actions, names } = useAnimations(gltf.animations, group);
  useMemo(() => { if (names.length && actions[names[0]]) actions[names[0]]!.reset().play(); }, [actions, names]);
  // the lion bursts out of the centre screen, standing on the breaking rocks
  return (
    <group ref={group} position={[0, 1.15, 1.8]} rotation={[0, 0, 0]} scale={2.4}>
      <primitive object={gltf.scene} />
    </group>
  );
}

/* ---------- 01 Anamorphic lion stage ---------- */
export function WorldAnamorphic() {
  // defer the heavy lion so the stage paints + loader clears first (brief §22/§23)
  const [ready, setReady] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id); }, []);
  return (
    <group>
      <LedWall fragment={FRAGMENTS.anamorphic} panels={5} width={34} height={12} radius={28} y={6} z={-12.5} />
      <Truss width={38} z={-10.5} y={11.6} />
      <RiggingTowers />
      <BlueBeams />
      <LightRig colorA="#2f7bff" colorB="#9fd0ff" intensity={80} />
      <VenueFloor tint="#0a0c11" />
      <Silhouette z={8} x={0} h={1.9} />
      <RockBurst />
      {/* neutral key so the lion + rocks read against the blue beams */}
      <spotLight position={[3, 9, 8]} angle={0.55} penumbra={0.85} intensity={90} color="#eaf1ff" distance={40} />
      <pointLight position={[0, 3, 5]} intensity={30} distance={18} color="#fff2df" />
      {ready && <Suspense fallback={null}><SafeModel><LionSubject /></SafeModel></Suspense>}
    </group>
  );
}

/** Broken rock platform under the lion + debris breaking forward (anamorphic). */
function RockBurst() {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!g.current) return;
    g.current.children.forEach((c, i) => {
      const spin = ROCK_BURST[i]?.spin ?? 0;
      if (spin) { c.rotation.y += spin * 0.01; c.position.y += Math.sin(s.clock.elapsedTime * 0.4 + i) * 0.003; }
    });
  });
  return (
    <group ref={g} position={[0, 0, 0]}>
      {ROCK_BURST.map((r, i) => (
        <mesh key={i} position={r.p} rotation={[r.r, r.r * 1.3, r.r * 0.5]} scale={r.s}>
          <dodecahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color="#6b6153" roughness={0.92} metalness={0.05} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Fake-volumetric moving-head beams: a spotlight + an additive cone you can see. */
function Beam({ x, color = "#3f8bff", tiltPhase = 0 }: { x: number; color?: string; tiltPhase?: number }) {
  const grp = useRef<THREE.Group>(null);
  useFrame((s) => { if (grp.current) grp.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.35 + tiltPhase) * 0.18; });
  return (
    <group position={[x, 11, -3]}>
      <group ref={grp}>
        <spotLight position={[0, 0, 0]} target-position={[x * 0.3, 0, 2]} angle={0.16} penumbra={0.9} intensity={140} color={color} distance={40} />
        <mesh position={[0, -5.5, 0]}>
          <coneGeometry args={[1.9, 11, 24, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </group>
  );
}
function BlueBeams() {
  return (
    <>
      <Beam x={-10} color="#2f6bff" tiltPhase={0} />
      <Beam x={-5} color="#5aa0ff" tiltPhase={1.1} />
      <Beam x={0} color="#a9d4ff" tiltPhase={2.0} />
      <Beam x={5} color="#5aa0ff" tiltPhase={3.0} />
      <Beam x={10} color="#2f6bff" tiltPhase={4.2} />
    </>
  );
}

/** Vertical truss towers flanking the stage. */
function RiggingTowers() {
  const xs = [-17, 17];
  return (
    <>{xs.map((x, i) => (
      <group key={i} position={[x, 0, -9]}>
        <mesh position={[0, 6, 0]}><boxGeometry args={[0.4, 12, 0.4]} /><meshStandardMaterial color="#0e1116" metalness={1} roughness={0.5} /></mesh>
        {[2, 5, 8, 11].map((y, j) => (
          <mesh key={j} position={[0, y, 0.5]}><sphereGeometry args={[0.1, 8, 8]} /><meshBasicMaterial color="#6fd0ff" /></mesh>
        ))}
      </group>
    ))}</>
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
    g.setAttribute("position", new THREE.BufferAttribute(FESTIVAL_POS, 3));
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
