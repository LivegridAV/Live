"use client";
import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorld, QUALITY_DPR, type Quality } from "./store";
import { WORLD_SCENES } from "./worlds";

/** Per-world cinematic camera presets (position, look target, fov). */
const CAMS: { pos: [number, number, number]; tgt: [number, number, number]; fov: number; bg: string }[] = [
  { pos: [0, 3.4, 16], tgt: [0, 4.2, -6], fov: 46, bg: "#05070b" },   // 01 anamorphic
  { pos: [0, 2.4, 12], tgt: [0, 3.2, -6], fov: 40, bg: "#04080a" },   // 02 corporate
  { pos: [0, 2.6, 11.5], tgt: [0, 3.8, -6], fov: 46, bg: "#070510" }, // 03 festival
  { pos: [0, 2.4, 12], tgt: [0, 3.4, -6], fov: 40, bg: "#0a0705" },   // 04 social
  { pos: [0, 3.0, 11], tgt: [0, 3.8, -6], fov: 48, bg: "#04080a" },   // 05 installation
];

function Rig() {
  const world = useWorld((s) => s.world);
  const explore = useWorld((s) => s.explore);
  const reduced = useWorld((s) => s.reducedMotion);
  const setLoaded = useWorld((s) => s.setLoaded);
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef(new THREE.Vector3());
  const firstFrame = useRef(true);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, dt) => {
    const c = state.camera as THREE.PerspectiveCamera;
    const scene = state.scene;
    const pre = CAMS[world];
    const k = reduced ? 1 : Math.min(1, dt * 2.2);
    // explore drag pans horizontally across the ~100ft stage
    const panX = (explore - 0.5) * 8;
    const par = reduced ? 0 : 1;
    const wantX = pre.pos[0] + panX + mouse.current.x * 1.6 * par;
    const wantY = pre.pos[1] - mouse.current.y * 0.6 * par;
    c.position.x += (wantX - c.position.x) * k;
    c.position.y += (wantY - c.position.y) * k;
    c.position.z += (pre.pos[2] - c.position.z) * k;
    target.current.set(pre.tgt[0] + panX * 0.5, pre.tgt[1], pre.tgt[2]);
    c.lookAt(target.current);
    if (Math.abs(c.fov - pre.fov) > 0.01) { c.fov += (pre.fov - c.fov) * k; c.updateProjectionMatrix(); }
    // background + fog per world
    const bg = new THREE.Color(pre.bg);
    if (!(scene.background instanceof THREE.Color)) scene.background = bg.clone();
    (scene.background as THREE.Color).lerp(bg, k);
    if (!scene.fog) scene.fog = new THREE.Fog(pre.bg, 14, 46);
    (scene.fog as THREE.Fog).color.lerp(bg, k);
    if (firstFrame.current) { firstFrame.current = false; setLoaded(true); }
  });
  return null;
}

function Scenes() {
  const world = useWorld((s) => s.world);
  return (
    <>
      <ambientLight intensity={0.18} color="#b9c6d6" />
      <hemisphereLight intensity={0.12} color="#88a" groundColor="#050506" />
      {WORLD_SCENES.map((W, i) => (
        <group key={i} visible={i === world}>{i === world ? <W /> : null}</group>
      ))}
    </>
  );
}

export default function Stage({ quality }: { quality: Quality }) {
  const setExplore = useWorld((s) => s.setExplore);
  const drag = useRef<{ on: boolean; startX: number; base: number }>({ on: false, startX: 0, base: 0.5 });

  return (
    <Canvas
      dpr={QUALITY_DPR[quality]}
      camera={{ position: [0, 2.6, 12], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: quality !== "mobile", powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      onPointerDown={(e) => { drag.current = { on: true, startX: e.clientX, base: useWorld.getState().explore }; }}
      onPointerUp={() => { drag.current.on = false; }}
      onPointerLeave={() => { drag.current.on = false; }}
      onPointerMove={(e) => {
        if (!drag.current.on) return;
        const dx = (e.clientX - drag.current.startX) / window.innerWidth;
        setExplore(drag.current.base - dx * 1.2);
      }}
    >
      <Rig />
      <Scenes />
    </Canvas>
  );
}
