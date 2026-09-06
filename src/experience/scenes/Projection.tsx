"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THEMES, useExperience } from "../store";

/**
 * Projection control (brief §9): two projectors in the audience throw wide,
 * mapped cones of light forward onto the stage / LED wall. Cheap additive cones
 * that fade in when "PROJECTION" is enabled, so the toggle is never dead.
 */

const UP = new THREE.Vector3(0, 1, 0);

function Projector({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const lens = useRef<THREE.MeshBasicMaterial>(null);

  const { position, quaternion, length } = useMemo(() => {
    const o = new THREE.Vector3(...from);
    const t = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(t, o);
    const len = dir.length();
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    return { position: o, quaternion: q, length: len };
  }, [from, to]);

  useFrame((state) => {
    const s = useExperience.getState();
    const th = THEMES[s.theme];
    const t = state.clock.elapsedTime;
    const on = s.powered && s.projection ? 0.6 + Math.sin(t * 8) * 0.06 : 0;
    if (mat.current) {
      mat.current.opacity += (on * 0.16 - mat.current.opacity) * 0.08;
      mat.current.color.lerp(new THREE.Color(th.accent), 0.05);
    }
    if (lens.current) {
      lens.current.opacity += ((on > 0 ? 1 : 0) - lens.current.opacity) * 0.08;
      lens.current.color.lerp(new THREE.Color(th.glow), 0.05);
    }
  });

  // cone apex at the projector, opening toward the stage over `length`
  return (
    <group position={position} quaternion={quaternion}>
      <mesh position={[0, length / 2, 0]}>
        <coneGeometry args={[3.4, length, 28, 1, true]} />
        <meshBasicMaterial
          ref={mat}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial ref={lens} transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Projection() {
  return (
    <group>
      <Projector from={[-6, 8.5, 20]} to={[-3, 5, 0.5]} />
      <Projector from={[6, 8.5, 20]} to={[3, 5, 0.5]} />
    </group>
  );
}
