"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { signals, useExperience } from "../store";

/**
 * The anamorphic hero moment (brief §7): a naturally-coloured creature form that
 * appears to break past the front plane of the main LED wall and lunge toward
 * the audience.
 *
 * Art direction (immutable, brief §11/§12/§57): the tiger reads as a REAL tiger —
 * orange fur, black stripes, white underside — NOT a neon/cyan graphic. Colours
 * live in a per-particle vertex-colour attribute with NORMAL blending, so it does
 * not glow; only a faint cyan rim on the top edge represents the LED environment
 * light spilling onto the fur. This is a procedural stand-in for a real tiger GLB
 * (see docs) — swap the geometry/material for a rigged model when the asset lands.
 * Gated by the "3D VISUAL" control; tracks the pointer to sell the pop-out.
 */

const COUNT = 1800;

// natural tiger palette
const C_ORANGE = new THREE.Color("#d9741f");
const C_DARK = new THREE.Color("#160c05"); // near-black stripe
const C_WHITE = new THREE.Color("#efe4d6");
const C_RIM = new THREE.Color("#3fd6c8"); // LED environment spill (subtle)

export default function Anamorphic() {
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const shown = useRef(0); // eased 0..1 visibility

  // Forward-leaning body mass, denser toward the head (front, +z), coloured
  // per-particle so it reads as fur rather than an energy field.
  const geo = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const tmp = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const t = Math.pow(rnd(), 0.6); // 0 = tail (at wall), 1 = head (forward)
      const bodyR = 0.9 * (0.5 + 1.1 * (1 - Math.abs(t - 0.6) * 1.3));
      const head = t > 0.82 ? 0.5 : 0; // fuller cluster at the head
      const radius = (bodyR + head) * (0.55 + rnd() * 0.6);
      const ang = rnd() * Math.PI * 2;
      const r = radius * Math.sqrt(rnd());
      const x = Math.cos(ang) * r * 1.15;
      const y = Math.sin(ang) * r;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y + Math.sin(t * Math.PI) * 0.5; // arch of the back
      positions[i * 3 + 2] = t * 6.0;

      // colour — orange base, black vertical stripes, white belly + face
      tmp.copy(C_ORANGE);
      if (Math.sin(t * 26 + x * 1.5) > 0.45) tmp.lerp(C_DARK, 0.82); // stripe
      const vert = Math.sin(ang); // -1 belly … +1 back
      if (vert < -0.35) tmp.lerp(C_WHITE, 0.6); // underside
      if (t > 0.9 && vert > 0.1) tmp.lerp(C_WHITE, 0.35); // cheek/face
      if (vert > 0.62) tmp.lerp(C_RIM, 0.16); // faint LED rim on the back
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const s = useExperience.getState();

    // ease visibility so toggling crossfades rather than pops
    const target = s.visual3d && s.powered ? 1 : 0;
    shown.current += (target - shown.current) * Math.min(1, delta * 3.5);
    group.current.visible = shown.current > 0.01;
    if (!group.current.visible) return;

    const t = state.clock.elapsedTime;
    // periodic lunge — every ~6.5s the tiger surges out of the wall toward the
    // crowd (a refined 0→1→0 pulse over ~1.4s), then settles. Not game-y.
    const cyc = t % 6.5;
    const lunge = cyc < 1.4 ? Math.sin((cyc / 1.4) * Math.PI) ** 1.5 : 0;
    const breathe = 1 + Math.sin(t * 1.6) * 0.04;
    const sc = shown.current * breathe * (1.35 + lunge * 0.4);
    group.current.scale.setScalar(sc);
    // offset to the right half of the wall (clear of the headline)
    group.current.position.x = 4.4 + signals.pointerSmooth.x * (1.4 + lunge * 1.2);
    group.current.position.y = 5.6 + signals.pointerSmooth.y * 0.6 + Math.sin(t * 0.9) * 0.12;
    group.current.position.z = lunge * 3.4; // forward, past the LED plane
    group.current.rotation.y = signals.pointerSmooth.x * 0.32 + Math.sin(t * 0.4) * 0.05 - lunge * 0.1;

    if (mat.current) {
      mat.current.opacity = shown.current;
      mat.current.size = 0.11 + lunge * 0.03;
    }
    if (points.current) points.current.rotation.z = Math.sin(t * 0.5) * 0.04;
  });

  return (
    <group ref={group} position={[4.4, 5.6, 0]}>
      <points ref={points} geometry={geo}>
        <pointsMaterial
          ref={mat}
          vertexColors
          transparent
          depthWrite={false}
          size={0.11}
          sizeAttenuation
          opacity={0}
        />
      </points>
    </group>
  );
}
