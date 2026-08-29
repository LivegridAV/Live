"use client";
import { Suspense, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { signals, useExperience } from "../store";

/**
 * The anamorphic hero moment (brief §7/§10/§12): a REAL, naturally-coloured tiger
 * that appears to break past the front plane of the main LED wall and lunge toward
 * the audience — the naked-eye-3D signature.
 *
 * Art direction (immutable, brief §11/§12/§57): a real tiger — orange fur, black
 * stripes, white underside — NOT a neon/cyan graphic. The model keeps its natural
 * PBR materials; the only cyan is a faint rim light standing in for the LED wall's
 * environment spill on the fur. Rigged "Run" cycle plays continuously; the whole
 * body periodically surges forward past the LED plane, then settles.
 *
 * Asset: Sketchfab "Running Tiger" by francescolima74 (CC-BY) — see
 * public/models/CREDITS.md. Gated by the "3D VISUAL" control.
 */

const MODEL = "/models/tiger.glb";
const BASE_SCALE = 1.5; // tuned against the 19.2 m wall
const BASE_YAW = Math.PI * 0.5; // broadside-to-camera, leaping across the stage

function Tiger() {
  const { scene, animations } = useGLTF(MODEL);
  const { actions, names } = useAnimations(animations, scene);

  useEffect(() => {
    const n = names[0];
    const a = n ? actions[n] : null;
    if (a) {
      a.reset().setLoop(THREE.LoopRepeat, Infinity).play();
      a.timeScale = 0.85;
    }
    // keep materials natural (no self-glow on fur), let the scene light it
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.frustumCulled = false;
        const mat = m.material as THREE.MeshStandardMaterial | undefined;
        if (mat && "emissiveIntensity" in mat) mat.emissiveIntensity = 0;
      }
    });
    return () => {
      if (a) a.stop();
    };
  }, [actions, names, scene]);

  return <primitive object={scene} />;
}
useGLTF.preload(MODEL);

export default function Anamorphic() {
  const group = useRef<THREE.Group>(null);
  const shown = useRef(0); // eased 0..1 visibility

  useFrame((state, delta) => {
    if (!group.current) return;
    const s = useExperience.getState();

    // ease visibility so toggling the "3D VISUAL" control crossfades
    const target = s.visual3d && s.powered ? 1 : 0;
    shown.current += (target - shown.current) * Math.min(1, delta * 3.5);
    group.current.visible = shown.current > 0.01;
    if (!group.current.visible) return;

    const t = state.clock.elapsedTime;
    // periodic lunge — every ~6.5s the tiger surges out of the wall toward the
    // crowd (a refined 0→1→0 pulse over ~1.4s), then settles.
    const cyc = t % 6.5;
    const lunge = cyc < 1.4 ? Math.sin((cyc / 1.4) * Math.PI) ** 1.5 : 0;
    const breathe = 1 + Math.sin(t * 1.6) * 0.03;
    const sc = shown.current * breathe * (BASE_SCALE + lunge * 0.22);
    group.current.scale.setScalar(sc);

    // offset to the right half of the wall (clear of the headline), standing
    // slightly proud of the LED plane and surging further forward on the lunge
    group.current.position.x = 5.4 + signals.pointerSmooth.x * (1.2 + lunge * 1.0);
    group.current.position.y = 3.7 + signals.pointerSmooth.y * 0.5 + Math.sin(t * 0.9) * 0.12;
    group.current.position.z = 8 + lunge * 4.5; // proud of the wall, surging at the crowd
    group.current.rotation.y = BASE_YAW + signals.pointerSmooth.x * 0.26 - lunge * 0.14;
  });

  return (
    <group ref={group} position={[5.4, 3.7, 8]}>
      <Suspense fallback={null}>
        <Tiger />
      </Suspense>
      {/* warm key so the orange fur reads as real */}
      <pointLight color="#ffe7c6" intensity={16} distance={14} decay={1.6} position={[2.6, 2.8, 3.4]} />
      {/* soft fill from the front so the face + chest aren't lost in shadow */}
      <pointLight color="#fff4e6" intensity={7} distance={12} decay={1.6} position={[-1.2, 1.4, 3.6]} />
      {/* faint cyan LED environment spill on the top/back edge (art rule) */}
      <pointLight color="#3fd6c8" intensity={6} distance={8} decay={1.8} position={[-1.8, 2.6, -1.8]} />
    </group>
  );
}
