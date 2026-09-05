"use client";
/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect --
   imperative three.js / R3F: we mutate three objects, refs and materials each
   frame and build offscreen canvases in useMemo. The React-Compiler rules
   misfire on these standard WebGL patterns. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { forestVertex, forestFragment } from "./forest";

const MODEL = "/models/tiger.glb";
useGLTF.preload(MODEL);

function smoother(x: number) {
  x = Math.min(1, Math.max(0, x));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** prefers-reduced-motion (read once, live-updates). */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/** Forest environment shown as the LED backdrop, behind the subject. A large
 *  emissive plane far back in the virtual world. */
export function ForestBackdrop() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const reduced = usePrefersReducedMotion();
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFlip: { value: 1 }, uAmp: { value: 1.9 } }), []);
  useFrame((s) => {
    // reduced motion: near-freeze the wind/atmosphere (content stays visible)
    if (mat.current) mat.current.uniforms.uTime.value = s.clock.elapsedTime * (reduced ? 0.12 : 1);
  });
  return (
    <mesh position={[0, 4, -16]}>
      <planeGeometry args={[46, 20]} />
      <shaderMaterial ref={mat} vertexShader={forestVertex} fragmentShader={forestFragment} uniforms={uniforms} toneMapped={false} />
    </mesh>
  );
}

/** Virtual ground continuous with the physical floor, so the subject appears
 *  to stand on the same surface, plus a soft contact shadow that follows it. */
export function VirtualGround({ shadowRef }: { shadowRef: React.RefObject<THREE.Mesh | null> }) {
  const shadowTex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, "rgba(0,0,0,0.6)"); grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); return t;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]}>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#090b09" roughness={0.96} metalness={0.05} />
      </mesh>
      {/* forest-floor light spill so the ground under the tree line isn't pure black */}
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -5]}>
        <planeGeometry args={[3.4, 2.2]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.85} />
      </mesh>
    </group>
  );
}

/**
 * The hero tiger, grounded on the virtual floor (brief §22-27). Only a "Run"
 * clip exists, so we FOOT-LOCK it: translate forward at the speed that matches
 * the stride (tuned so planted paws don't slide), emerging toward the viewer,
 * and FADE at the loop boundary so there is no visible teleport.
 */
export function Tiger({ shadowRef }: { shadowRef: React.RefObject<THREE.Mesh | null> }) {
  const { scene, animations } = useGLTF(MODEL);
  const { actions, names } = useAnimations(animations, scene);
  const group = useRef<THREE.Group>(null);
  const [fit, setFit] = useState<{ scale: number; y: number } | null>(null);
  const meshes = useRef<THREE.Mesh[]>([]);
  const act = useRef<THREE.AnimationAction | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3(); box.getSize(size);
    const longest = Math.max(size.x, size.z);
    const targetLen = 3.6; // hero tiger, broadside across the corner
    const scale = longest > 0 ? targetLen / longest : 1;
    setFit({ scale, y: -box.min.y * scale });

    const n = names[0]; const a = n ? actions[n] : null;
    if (a) { a.reset().setLoop(THREE.LoopRepeat, Infinity).play(); a.timeScale = 0.62; act.current = a; }
    meshes.current = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.frustumCulled = false;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) { mat.transparent = true; mat.emissiveIntensity = 0; meshes.current.push(m); }
      }
    });
    return () => { if (a) a.stop(); };
  }, [scene, actions, names]);

  // Foot-locked BROADSIDE prowl across the corner mouth (the classic anamorphic
  // tiger). Steady lateral speed matched to the stride so planted paws don't
  // slide; fade at the ends so the loop reset is invisible.
  const TZ = -3.9;           // fixed depth in the corner mouth, on the floor
  const START_X = 5.0, END_X = -1.6;  // head-first (the model faces -X)
  const PERIOD = 16;         // ~0.41 m/s lateral
  useFrame((s) => {
    if (!group.current || !fit) return;
    const t = s.clock.elapsedTime;
    // live gait speed: near-frozen under reduced motion
    if (act.current) act.current.timeScale = reduced ? 0.06 : 0.62;
    // reduced motion: hold the tiger still at a visible spot, fully opaque
    if (reduced) {
      group.current.position.set(1.4, 0, TZ);
      for (const m of meshes.current) (m.material as THREE.MeshStandardMaterial).opacity = 1;
      if (shadowRef.current) {
        shadowRef.current.position.set(1.4, 0.02, TZ);
        (shadowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.8;
      }
      return;
    }
    const ph = (t % PERIOD) / PERIOD;
    const x = START_X + (END_X - START_X) * ph;
    group.current.position.set(x, 0, TZ);
    const fade = smoother(Math.min(1, ph / 0.12)) * (1 - smoother(Math.max(0, (ph - 0.88) / 0.12)));
    for (const m of meshes.current) (m.material as THREE.MeshStandardMaterial).opacity = fade;
    if (shadowRef.current) {
      shadowRef.current.position.set(x, 0.02, TZ);
      (shadowRef.current.material as THREE.MeshBasicMaterial).opacity = fade * 0.8;
    }
  });

  if (!fit) return null;
  // broadside to the camera, facing the direction of travel (+X). Model forward
  // is -Z at yaw 0, so -PI/2 turns it to face +X (we see its left flank).
  return (
    <group ref={group} position={[5.0, 0, TZ]} scale={fit.scale} rotation={[0, -Math.PI / 2, 0]}>
      <group position={[0, fit.y, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

/** The full hero content scene: forest backdrop + ground + grounded tiger. */
export function HeroContent() {
  const shadowRef = useRef<THREE.Mesh>(null);
  return (
    <>
      <ContentLights />
      <ForestBackdrop />
      <VirtualGround shadowRef={shadowRef} />
      <Tiger shadowRef={shadowRef} />
    </>
  );
}

/** Content lights so the tiger's orange fur reads naturally. */
export function ContentLights() {
  return (
    <>
      <ambientLight intensity={0.3} color="#b9c2c8" />
      <pointLight position={[3, 5, -1]} color="#ffe3bf" intensity={70} distance={30} decay={1.6} />
      <pointLight position={[-2.5, 3, -2]} color="#bfe6d6" intensity={26} distance={20} decay={1.7} />
      <pointLight position={[-1.5, 3.5, -11]} color="#9fb0bd" intensity={18} distance={16} decay={1.8} />
    </>
  );
}
