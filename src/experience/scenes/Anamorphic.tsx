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
const BASE_YAW = Math.PI * 0.5; // broadside-to-camera, prowling across the stage

/** smootherstep — eases in AND out, so the prowl has no visible snap. */
function smoother(x: number) {
  x = Math.min(1, Math.max(0, x));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function Tiger() {
  const { scene, animations } = useGLTF(MODEL);
  const { actions, names } = useAnimations(animations, scene);

  useEffect(() => {
    const n = names[0];
    const a = n ? actions[n] : null;
    if (a) {
      a.reset().setLoop(THREE.LoopRepeat, Infinity).play();
      // slowed right down to a heavy prowl (brief §8/§9 — weight, not a sprint)
      a.timeScale = 0.5;
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

    // ── One long, seamless prowl cycle (brief §10): the tiger eases FORWARD
    // out of the LED environment, past the physical screen plane, holds proud
    // of the wall to breathe, then eases back into the scene. A smootherstep
    // ping-pong means both ends decelerate — there is no reset the eye can
    // catch. Period ~26s so it never reads as a short game loop.
    const PERIOD = 26;
    const phase = (t % PERIOD) / PERIOD;
    const pingpong = 1 - Math.abs(phase * 2 - 1); // 0→1→0
    const emerge = smoother(pingpong); // eased approach/retreat 0..1

    // gentle breathing only — no scale "pop"
    const breathe = 1 + Math.sin(t * 1.15) * 0.018;
    group.current.scale.setScalar(shown.current * breathe * BASE_SCALE);

    // stays on the right half of the wall (clear of the headline); depth is
    // driven by the eased prowl so paws travel with the body, not in place
    group.current.position.x = 5.4 + signals.pointerSmooth.x * 0.7;
    group.current.position.y =
      3.55 + signals.pointerSmooth.y * 0.35 + Math.sin(t * 0.7) * 0.08;
    // z: -1 (deep behind the LED plane, inside the forest) → 9 (proud of the wall)
    group.current.position.z = -1 + emerge * 10;
    // turns a little toward the crowd as it emerges
    group.current.rotation.y =
      BASE_YAW + signals.pointerSmooth.x * 0.16 - emerge * 0.12;
  });

  return (
    <group ref={group} position={[5.4, 3.7, 8]}>
      <Suspense fallback={null}>
        <Tiger />
      </Suspense>
      {/* warm tungsten key so the orange fur + cream chest read as real */}
      <pointLight color="#ffe3bf" intensity={17} distance={14} decay={1.6} position={[2.6, 2.8, 3.4]} />
      {/* soft warm fill from the front so the face isn't lost in shadow */}
      <pointLight color="#fff2e2" intensity={7} distance={12} decay={1.6} position={[-1.2, 1.4, 3.6]} />
      {/* faint cool moonlight rim from behind — natural back-edge separation,
          NOT a neon cyan spill (brief §11) */}
      <pointLight color="#9fb0bd" intensity={4.5} distance={9} decay={1.9} position={[-1.8, 2.8, -2.2]} />
    </group>
  );
}
