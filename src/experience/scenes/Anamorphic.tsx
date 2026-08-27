"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { signals, THEMES, useExperience } from "../store";

/**
 * The anamorphic hero moment (brief §7): a procedural energy form that appears
 * to break past the front plane of the main LED wall and lunge toward the
 * audience. Built from a particle mass + a few glowing shards — a stand-in for a
 * real tiger/vehicle asset, driven entirely in code. Gated by the "3D VISUAL"
 * control; it tracks the pointer to sell the pop-out from the designed viewpoint.
 *
 * Placement: in front of the main wall (centre ≈ 0,5.5,0), spanning from just
 * inside the LED (z≈0) forward to z≈6, so it reads as emerging from the screen.
 */

const COUNT = 1300;

export default function Anamorphic() {
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const shardMat = useRef<THREE.MeshBasicMaterial>(null);
  const shown = useRef(0); // eased 0..1 visibility

  // Elongated forward-leaning mass, denser toward the "head" (front, +z).
  const geo = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < COUNT; i++) {
      // bias t toward the front so the head is dense
      const t = Math.pow(rnd(), 0.6); // 0 = tail (at wall), 1 = head (forward)
      const radius = (0.35 + 1.35 * (1 - Math.abs(t - 0.62) * 1.4)) * (0.5 + rnd() * 0.7);
      const ang = rnd() * Math.PI * 2;
      const r = radius * Math.sqrt(rnd());
      const x = Math.cos(ang) * r * 1.15;
      const y = Math.sin(ang) * r;
      const z = t * 6.0; // 0 → 6, from the wall out toward the crowd
      positions[i * 3] = x;
      positions[i * 3 + 1] = y + Math.sin(t * Math.PI) * 0.6; // slight arc
      positions[i * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const s = useExperience.getState();
    const th = THEMES[s.theme];

    // ease visibility so toggling crossfades rather than pops
    const target = s.visual3d && s.powered ? 1 : 0;
    shown.current += (target - shown.current) * Math.min(1, delta * 3.5);
    group.current.visible = shown.current > 0.01;
    if (!group.current.visible) return;

    const t = state.clock.elapsedTime;
    // periodic lunge — every ~6.5s the subject roars and surges out of the wall
    // toward the crowd (a 0→1→0 pulse over ~1.4s), the anamorphic "wow" beat.
    const cyc = t % 6.5;
    const lunge = cyc < 1.4 ? Math.sin((cyc / 1.4) * Math.PI) ** 1.5 : 0;
    // breathe + lunge; offset to the right half of the wall (clear of headline).
    const breathe = 1 + Math.sin(t * 1.6) * 0.05;
    const sc = shown.current * breathe * (1.3 + lunge * 0.4);
    group.current.scale.setScalar(sc);
    group.current.position.x = 4.4 + signals.pointerSmooth.x * (1.4 + lunge * 1.2);
    group.current.position.y = 5.6 + signals.pointerSmooth.y * 0.6 + Math.sin(t * 0.9) * 0.15;
    group.current.position.z = lunge * 3.4; // forward, past the LED plane
    group.current.rotation.y = signals.pointerSmooth.x * 0.35 + Math.sin(t * 0.4) * 0.06 - lunge * 0.12;

    if (mat.current) {
      mat.current.color.copy(new THREE.Color(th.glow));
      mat.current.opacity = shown.current * (0.9 + Math.sin(t * 3) * 0.1 + lunge * 0.25);
      mat.current.size = 0.12 + Math.sin(t * 2.2) * 0.02 + lunge * 0.05;
    }
    if (shardMat.current) {
      // shards flash warm on the roar
      shardMat.current.color.copy(new THREE.Color(th.warm)).lerp(new THREE.Color("#fff"), lunge * 0.5);
      shardMat.current.opacity = shown.current * (0.9 + lunge * 0.4);
    }
    if (points.current) points.current.rotation.z = Math.sin(t * 0.5) * 0.05;
  });

  return (
    <group ref={group} position={[4.4, 5.6, 0]}>
      <points ref={points} geometry={geo}>
        <pointsMaterial
          ref={mat}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          size={0.09}
          sizeAttenuation
          toneMapped={false}
        />
      </points>

      {/* a few solid glowing shards near the head for mass */}
      {[
        [0.5, 0.3, 5.2, 0.5],
        [-0.6, -0.1, 4.6, 0.45],
        [0.1, 0.7, 4.9, 0.4],
        [0.0, -0.4, 5.6, 0.35],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[i, i * 1.3, 0]}>
          <octahedronGeometry args={[r, 0]} />
          <meshBasicMaterial ref={i === 0 ? shardMat : undefined} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
