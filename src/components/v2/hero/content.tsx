"use client";
/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect --
   imperative three.js / R3F: we mutate three objects, refs and materials each
   frame and build offscreen canvases in useMemo. The React-Compiler rules
   misfire on these standard WebGL patterns. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

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

/** Forest environment shown as the LED backdrop, behind the subject. A real
 *  Blender-authored, cinematically-graded misty-dawn forest, rendered to a
 *  seamless loop and shown as a video texture (brief §17/§23 — pre-rendered
 *  environment, real-time subject in front). Reduced motion pauses the loop. */
export function ForestBackdrop() {
  const reduced = usePrefersReducedMotion();
  const [tex, setTex] = useState<THREE.VideoTexture | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.crossOrigin = "anonymous"; v.preload = "auto";
    v.poster = "/videos/forest-poster.jpg";
    const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    const webm = document.createElement("source");
    const mp4 = document.createElement("source");
    if (mobile) { mp4.src = "/videos/forest-mobile.mp4"; mp4.type = "video/mp4"; v.appendChild(mp4); }
    else {
      webm.src = "/videos/forest-desktop.webm"; webm.type = "video/webm";
      mp4.src = "/videos/forest-desktop.mp4"; mp4.type = "video/mp4";
      v.appendChild(webm); v.appendChild(mp4);
    }
    videoRef.current = v;
    const t = new THREE.VideoTexture(v);
    // The anamorphic pipeline renders the content into a linear RT and the LED
    // shader outputs it raw (no sRGB re-encode), matching the old shader forest.
    // Treating the video as linear (not sRGB) lets its graded values pass through
    // at the intended brightness instead of being darkened by an sRGB->linear step.
    t.colorSpace = THREE.LinearSRGBColorSpace;
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    v.play().catch(() => {});
    setTex(t);
    return () => { v.pause(); v.removeAttribute("src"); v.load(); t.dispose(); };
  }, []);

  // reduced motion: hold a still frame (pause the loop) but keep the forest visible
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    if (reduced) v.pause(); else v.play().catch(() => {});
  }, [reduced, tex]);

  return (
    <mesh position={[0, 4, -16]}>
      <planeGeometry args={[46, 20]} />
      {tex
        ? <meshBasicMaterial map={tex} toneMapped={false} />
        : <meshBasicMaterial color="#0b0f0c" toneMapped={false} />}
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
 * The hero tiger, grounded on the virtual floor (brief §15/§22-27). It walks a
 * bespoke, Blender-authored WALK cycle (real 4-beat lateral-sequence gait, feet
 * baked to the ground with true paw-lock — no slowed "Run", no air-running),
 * emerging from deep in the forest, advancing toward the viewer and the LED
 * corner seam, then holding on an IDLE (breathe / look) before an invisible
 * fade reset. Forward speed is matched to the clip's baked stride so planted
 * paws never slide.
 */
// Baked stride per Walk cycle in model (GLB) units: 70 armature-units * 0.01082
// root scale. World stride = STRIDE_UNITS * fitScale, so paws stay locked at
// any on-screen size. CYCLE_DUR is the Walk clip's authored length (48f @ 24fps).
const STRIDE_UNITS = 0.757;
const CYCLE_DUR = 2.0;
const GAIT = 0.9;                    // gait playback rate (slower = heavier)
// The LED corner is a fixed "window": the tiger only reads inside the panel
// silhouette. It frames cleanly from deep in the forest up to ~z -4.5, where it
// has maximum presence at the seam; any closer and it overflows the panels and
// clips. So it walks a long approach out of the deep forest and settles, full
// and grounded, at the near edge of the window to breathe/look, then fades back.
const START_Z = -8.0, END_Z = -4.5; // approach: deep forest -> near the corner seam
const HERO_X = 0.0;                  // centred on the corner seam
const TARGET_LEN = 4.4;              // on-screen hero scale
const PAUSE_DUR = 3.4;               // hold on idle (breathe / look)
const FADE_DUR = 0.9;
const CALM_Z = -4.8;                 // reduced-motion resting spot (framed, grounded)

export function Tiger({ shadowRef }: { shadowRef: React.RefObject<THREE.Mesh | null> }) {
  const { scene, animations } = useGLTF(MODEL);
  const { actions } = useAnimations(animations, scene);
  const group = useRef<THREE.Group>(null);
  const [fit, setFit] = useState<{ scale: number; y: number; stride: number } | null>(null);
  const meshes = useRef<THREE.Mesh[]>([]);
  const walk = useRef<THREE.AnimationAction | null>(null);
  const idle = useRef<THREE.AnimationAction | null>(null);
  const reduced = usePrefersReducedMotion();
  // sequence state
  const st = useRef({ z: START_Z, phase: "approach" as "approach" | "pause" | "reset", tPhase: 0, opacity: 0 });

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3(); box.getSize(size);
    const longest = Math.max(size.x, size.y, size.z);
    const scale = longest > 0 ? TARGET_LEN / longest : 1;
    setFit({ scale, y: -box.min.y * scale, stride: STRIDE_UNITS * scale });

    const w = actions["Walk"]; const i = actions["Idle"];
    if (w) { w.reset().setLoop(THREE.LoopRepeat, Infinity).play(); w.timeScale = GAIT; walk.current = w; }
    if (i) { i.reset().setLoop(THREE.LoopRepeat, Infinity); i.timeScale = GAIT; i.setEffectiveWeight(0).play(); idle.current = i; }

    meshes.current = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.frustumCulled = false;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) { mat.transparent = true; mat.emissiveIntensity = 0; meshes.current.push(m); }
      }
    });
    return () => { if (w) w.stop(); if (i) i.stop(); };
  }, [scene, actions]);

  const setOpacity = (o: number) => {
    for (const m of meshes.current) (m.material as THREE.MeshStandardMaterial).opacity = o;
    if (shadowRef.current) (shadowRef.current.material as THREE.MeshBasicMaterial).opacity = o * 0.8;
  };

  useFrame((_s, delta) => {
    if (!group.current || !fit) return;
    const dt = Math.min(delta, 0.05);

    // Reduced motion: a calm, grounded, fully-visible idle near the corner.
    if (reduced) {
      if (walk.current) walk.current.setEffectiveWeight(0);
      if (idle.current) { idle.current.setEffectiveWeight(1); idle.current.timeScale = 0.25; }
      group.current.position.set(HERO_X, 0, CALM_Z);
      setOpacity(1);
      if (shadowRef.current) shadowRef.current.position.set(HERO_X, 0.02, CALM_Z);
      return;
    }

    const S = st.current;
    if (S.phase === "approach") {
      if (walk.current) { walk.current.setEffectiveWeight(1); walk.current.timeScale = GAIT; }
      if (idle.current) idle.current.setEffectiveWeight(0);
      // paw-locked forward speed: stride per cycle, scaled by gait rate
      const speed = (fit.stride * GAIT) / CYCLE_DUR; // world units / s along +Z
      S.z += speed * dt;
      S.opacity = Math.min(1, S.opacity + dt / FADE_DUR);
      if (S.z >= END_Z) { S.z = END_Z; S.phase = "pause"; S.tPhase = 0; }
    } else if (S.phase === "pause") {
      // ease Walk -> Idle for the breathe/look hold
      const k = Math.min(1, S.tPhase / 0.5);
      if (walk.current) walk.current.setEffectiveWeight(1 - k);
      if (idle.current) idle.current.setEffectiveWeight(k);
      S.tPhase += dt;
      S.opacity = 1;
      if (S.tPhase >= PAUSE_DUR) { S.phase = "reset"; S.tPhase = 0; }
    } else {
      // fade out at the boundary, jump back to the deep start, fade in (invisible reset)
      S.opacity = Math.max(0, S.opacity - dt / FADE_DUR);
      S.tPhase += dt;
      if (S.opacity <= 0) {
        S.z = START_Z; S.phase = "approach"; S.tPhase = 0;
        if (walk.current) { walk.current.reset().play(); }
      }
    }

    group.current.position.set(HERO_X, 0, S.z);
    setOpacity(smoother(S.opacity));
    if (shadowRef.current) shadowRef.current.position.set(HERO_X, 0.02, S.z);
  });

  if (!fit) return null;
  // The exported model faces +Z (Blender -Y forward). It walks toward the viewer
  // (+Z), so no yaw is needed; PI would turn it away. Verified in-browser.
  return (
    <group ref={group} position={[HERO_X, 0, START_Z]} scale={fit.scale} rotation={[0, 0, 0]}>
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
