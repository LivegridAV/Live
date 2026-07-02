"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THEMES, useExperience } from "../store";

/**
 * The physical venue: stage deck, truss towers + roof, line arrays,
 * subwoofers, FOH riser and an instanced audience. Built entirely from
 * primitives + instancing — no downloaded assets, everything ships in code.
 */

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

/** Build a matrix that places a unit-height cylinder between two points. */
function strut(a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.Matrix4 {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const m = new THREE.Matrix4();
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize(),
  );
  m.compose(mid, quat, new THREE.Vector3(r, len, r));
  return m;
}

/** Cross-braced truss tower + roof beams, as one instanced mesh. */
function Truss() {
  const ref = useRef<THREE.InstancedMesh>(null);

  const matrices = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    // two towers at x = ±11, 1.2m square, 13m tall
    for (const sx of [-1, 1]) {
      const X = 11 * sx;
      for (const [ox, oz] of [
        [-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6],
      ]) {
        out.push(strut(v(X + ox, 0, oz), v(X + ox, 13, oz), 0.07));
      }
      // cross bracing every 2m
      for (let y = 0; y < 12; y += 2) {
        out.push(strut(v(X - 0.6, y, -0.6), v(X + 0.6, y + 2, -0.6), 0.04));
        out.push(strut(v(X + 0.6, y, 0.6), v(X - 0.6, y + 2, 0.6), 0.04));
        out.push(strut(v(X - 0.6, y, -0.6), v(X - 0.6, y, 0.6), 0.04));
        out.push(strut(v(X + 0.6, y, -0.6), v(X + 0.6, y, 0.6), 0.04));
      }
    }
    // roof beams spanning the towers (fixtures hang here)
    for (const z of [-0.6, 0.6]) {
      out.push(strut(v(-11, 12.4, z), v(11, 12.4, z), 0.07));
      out.push(strut(v(-11, 13, z), v(11, 13, z), 0.07));
    }
    for (let x = -10; x <= 10; x += 2.5) {
      out.push(strut(v(x, 12.4, -0.6), v(x + 1.6, 13, 0.6), 0.04));
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    if (!ref.current) return;
    matrices.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, matrices.length]}>
      <cylinderGeometry args={[1, 1, 1, 6]} />
      <meshStandardMaterial color="#2a3532" metalness={0.85} roughness={0.35} />
    </instancedMesh>
  );
}

/** Hanging line-array of speaker boxes with a slight J-curve. */
function LineArray({ x }: { x: number }) {
  const boxes = [];
  let y = 10.6;
  let tilt = 0;
  for (let i = 0; i < 8; i++) {
    boxes.push(
      <mesh key={i} position={[x, y, 0.4 + i * 0.06]} rotation={[tilt, 0, 0]}>
        <boxGeometry args={[1.5, 0.55, 0.8]} />
        <meshStandardMaterial color="#121917" roughness={0.8} />
      </mesh>,
    );
    y -= 0.58;
    tilt -= 0.045; // progressive down-tilt = the classic J hang
  }
  return <group>{boxes}</group>;
}

/** Audience: two instanced meshes (bodies + heads), bouncing to the show. */
function Crowd({ count = 700 }: { count?: number }) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);

  const people = useMemo(() => {
    const arr: { x: number; z: number; h: number; phase: number; energy: number }[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 36,
        z: 10 + Math.random() * 18,
        h: 1.45 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        energy: 0.4 + Math.random() * 0.6,
      });
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!bodies.current || !heads.current) return;
    const t = state.clock.elapsedTime;
    const s = useExperience.getState();
    const excitement = s.powered ? 1 : 0.15;
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      const bounce =
        Math.max(0, Math.sin(t * 2.2 + p.phase)) * 0.16 * p.energy * excitement;
      tmpObj.position.set(p.x, p.h * 0.5 + bounce, p.z);
      tmpObj.scale.set(1, p.h, 1);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.updateMatrix();
      bodies.current.setMatrixAt(i, tmpObj.matrix);
      tmpObj.position.set(p.x, p.h + 0.12 + bounce, p.z);
      tmpObj.scale.setScalar(1);
      tmpObj.updateMatrix();
      heads.current.setMatrixAt(i, tmpObj.matrix);
    }
    bodies.current.instanceMatrix.needsUpdate = true;
    heads.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, people.length]}>
        <cylinderGeometry args={[0.13, 0.2, 1, 5]} />
        <meshStandardMaterial color="#0b1210" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, people.length]}>
        <sphereGeometry args={[0.11, 6, 5]} />
        <meshStandardMaterial color="#0d1412" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** Glowing LED floor strip along the stage lip + barricade line. */
function StageDeckDetail() {
  const strip = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (!strip.current) return;
    const s = useExperience.getState();
    const th = THEMES[s.theme];
    const pulse = s.powered
      ? 0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 2)
      : 0.02;
    strip.current.color.set(th.glow).multiplyScalar(pulse);
  });
  return (
    <group>
      {/* stage lip LED strip */}
      <mesh position={[0, 1.21, 6.02]}>
        <boxGeometry args={[24, 0.08, 0.05]} />
        <meshBasicMaterial ref={strip} toneMapped={false} />
      </mesh>
      {/* crowd barricade */}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[-18 + i * 3, 0.55, 8.6]}>
          <boxGeometry args={[2.8, 1.1, 0.08]} />
          <meshStandardMaterial color="#39433f" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** FOH riser with consoles + glowing screens (Watchout / VJ station). */
function FOH() {
  const screens = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (!screens.current) return;
    const s = useExperience.getState();
    const th = THEMES[s.theme];
    const flicker = 0.75 + 0.25 * Math.sin(state.clock.elapsedTime * 7.3);
    screens.current.color
      .set(th.accent)
      .multiplyScalar(s.powered ? flicker : 0.02);
  });
  return (
    <group position={[0, 0, 21]}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[6, 0.7, 3]} />
        <meshStandardMaterial color="#101715" roughness={0.85} />
      </mesh>
      {/* console desks */}
      {[-1.8, 0, 1.8].map((x) => (
        <group key={x} position={[x, 0.95, 0]}>
          <mesh rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[1.5, 0.5, 0.08]} />
            <meshStandardMaterial color="#1a2421" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.55, -0.4]} rotation={[-0.15, 0, 0]}>
            <planeGeometry args={[1.4, 0.8]} />
            <meshBasicMaterial ref={x === 0 ? screens : undefined} color="#0a5a52" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function Stage({
  variant = "main",
}: {
  variant?: "main" | "finale";
}) {
  const floor = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    if (!floor.current) return;
    const s = useExperience.getState();
    const th = THEMES[s.theme];
    // audience wash: floor picks up a faint themed tint when lights are on
    tmpColor.set(
      s.powered && s.audienceLights ? th.deep : "#050807",
    );
    floor.current.color.lerp(tmpColor, 0.04);
  });

  const isMain = variant === "main";

  return (
    <group>
      {/* ground plane — slightly reflective black like a wet festival field
          (depth capped so it never leaks into the room behind the wall) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 6]}>
        <planeGeometry args={[90, 44]} />
        <meshStandardMaterial
          ref={floor}
          color="#050807"
          metalness={0.6}
          roughness={0.45}
        />
      </mesh>

      {/* stage deck */}
      <mesh position={[0, 0.6, 2]}>
        <boxGeometry args={[26, 1.2, 8]} />
        <meshStandardMaterial color="#0c1211" roughness={0.7} metalness={0.3} />
      </mesh>

      <Truss />
      <LineArray x={-9.2} />
      <LineArray x={9.2} />

      {/* subwoofer wall at the stage base */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[-10.5 + i * 3, 0.55, 6.8]}>
          <boxGeometry args={[2.6, 1.1, 1.2]} />
          <meshStandardMaterial color="#0e1513" roughness={0.85} />
        </mesh>
      ))}

      <StageDeckDetail />

      {isMain && <FOH />}
      {isMain && <Crowd />}

      {/* camera crane silhouette, stage right */}
      <group position={[15, 0, 12]} rotation={[0, -0.6, 0]}>
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[1.4, 2, 1.4]} />
          <meshStandardMaterial color="#111917" roughness={0.8} />
        </mesh>
        <mesh position={[-2.5, 3.4, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[7, 0.22, 0.22]} />
          <meshStandardMaterial color="#1c2624" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
