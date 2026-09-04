"use client";
import { ReactNode, useEffect, useRef } from "react";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Effects, PerformanceMonitor } from "@react-three/drei";
import { UnrealBloomPass } from "three-stdlib";
import * as THREE from "three";

// three's own bloom (version-matched via three-stdlib) — the
// postprocessing package renders black against this three release
extend({ UnrealBloomPass });

declare module "@react-three/fiber" {
  interface ThreeElements {
    unrealBloomPass: object;
  }
}
import { signals, THEMES, useExperience } from "./store";
import { audio } from "./audio";
import ScrollRig from "./ScrollRig";
import CameraRig from "./CameraRig";
import Stage from "./scenes/Stage";
import LedWall from "./scenes/LedWall";
import Beams from "./scenes/Beams";
import Smoke from "./scenes/Smoke";
import Equipment from "./scenes/Equipment";
import Universe from "./scenes/Universe";
import Space from "./scenes/Space";
import ServicesCylinder from "./scenes/ServicesCylinder";
import Pillars from "./scenes/Pillars";
import Lab from "./scenes/Lab";
import ProjectsCity from "./scenes/ProjectsCity";
import Anamorphic from "./scenes/Anamorphic";
import Projection from "./scenes/Projection";
import Finale from "./scenes/Finale";
import Hud from "./overlay/Hud";
import PowerIntro from "./overlay/PowerIntro";
import SpecCard from "./overlay/SpecCard";
import Journey from "./overlay/Journey";
import CursorOrb from "./overlay/CursorOrb";
import { useEasterEggs } from "./useEasterEggs";

/**
 * The whole experience: one fixed WebGL canvas behind a tall DOM journey.
 * Scrolling never changes pages — it moves the camera through the venue.
 * Rooms are visibility-gated by scroll progress so only what's near the
 * camera is rendered.
 */

/** Mounts children only while progress is inside [from, to] (with margin). */
function Room({
  from, to, children,
}: {
  from: number;
  to: number;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const p = signals.progress;
    group.current.visible = p > from - 0.08 && p < to + 0.08;
  });
  return <group ref={group}>{children}</group>;
}

/** Scene fog + background that follow the active theme. */
function Atmosphere() {
  const fogRef = useRef<THREE.Fog>(null);
  const bg = useRef(new THREE.Color("#060b0a"));
  useFrame(({ scene }) => {
    const s = useExperience.getState();
    const th = THEMES[s.theme];
    // keep the void properly dark — space, not haze
    bg.current.lerp(new THREE.Color(th.deep).multiplyScalar(0.38), 0.03);
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(bg.current);
    } else {
      scene.background = bg.current.clone();
    }
    if (fogRef.current) {
      fogRef.current.color.copy(bg.current);
      // "ATMOSPHERE" control thickens the haze — fog closes in
      const near = s.atmosphere ? 8 : 18;
      const far = s.atmosphere ? 52 : 85;
      fogRef.current.near += (near - fogRef.current.near) * 0.04;
      fogRef.current.far += (far - fogRef.current.far) * 0.04;
    }
  });
  return <fog ref={fogRef} attach="fog" args={["#060b0a", 18, 85]} />;
}

function SceneContent() {
  const quality = useExperience((s) => s.quality);
  const atmosphere = useExperience((s) => s.atmosphere);
  return (
    <>
      <Atmosphere />
      <CameraRig />

      {/* the cosmos around the venue — persistent through every room */}
      <Space />

      {/* natural fill: neutral-warm sky, deep earth ground — lets real
          materials (metal, fur, concrete) read honestly, no cyan cast */}
      <ambientLight intensity={0.2} color="#bab3a4" />
      <hemisphereLight intensity={0.16} color="#caa678" groundColor="#0a0908" />

      {/* Scene 1–2: the venue + LED wall (kept alive through the dive) */}
      <Room from={0} to={0.34}>
        <Stage />
        <Beams />
        <Projection />
        <Smoke count={quality === "high" ? 34 : 16} />
        {/* extra haze when the ATMOSPHERE control is on */}
        {atmosphere && <Smoke count={quality === "high" ? 26 : 12} />}
        <Equipment />
        {/* side LED wings flanking the main wall */}
        <LedWall position={[-14.5, 6, 1.5]} rotation={[0, 0.35, 0]} size={[7, 9]} main={false} />
        <LedWall position={[14.5, 6, 1.5]} rotation={[0, -0.35, 0]} size={[7, 9]} main={false} />
        <LedWall position={[0, 6, 0]} size={[19.2, 10.8]} main />
        {/* anamorphic subject bursting from the main wall — "3D VISUAL" control */}
        <Anamorphic />
      </Room>

      {/* Scene 3: the naked-eye universe inside the wall */}
      <Room from={0.26} to={0.48}>
        <Universe />
      </Room>

      {/* Scene 4: services cylinder */}
      <Room from={0.4} to={0.6}>
        <ServicesCylinder />
      </Room>

      {/* Scene 5: achievements */}
      <Room from={0.52} to={0.7}>
        <Pillars />
      </Room>

      {/* Scene 6: equipment lab */}
      <Room from={0.62} to={0.8}>
        <Lab />
      </Room>

      {/* Scene 7: projects city */}
      <Room from={0.72} to={0.9}>
        <ProjectsCity />
      </Room>

      {/* Scene 8: finale venue */}
      <Room from={0.82} to={1}>
        <Finale />
      </Room>
    </>
  );
}

export default function Experience() {
  const quality = useExperience((s) => s.quality);
  const setQuality = useExperience((s) => s.setQuality);
  const musicOn = useExperience((s) => s.musicOn);
  const audioOn = useExperience((s) => s.audioOn);
  useEasterEggs();

  // mobile / low-power heuristic before the first frame
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse || window.innerWidth < 768 || navigator.hardwareConcurrency <= 4) {
      setQuality("low");
    }
  }, [setQuality]);

  useEffect(() => audio.setMusic(musicOn), [musicOn]);
  useEffect(() => audio.setEnabled(audioOn), [audioOn]);

  return (
    <div className="lg-experience">
      <ScrollRig />

      {/* fixed canvas behind everything */}
      <div className="fixed inset-0" aria-hidden>
        <Canvas
          camera={{ position: [0, 3.4, 30], fov: 55, near: 0.1, far: 140 }}
          dpr={quality === "high" ? [1, 1.75] : [0.75, 1.1]}
          gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
        >
          <PerformanceMonitor
            onDecline={() => setQuality("low")}
            flipflops={2}
          >
            <SceneContent />
            {quality === "high" && (
              <Effects>
                {/* args: resolution, strength, radius, threshold */}
                <unrealBloomPass args={[undefined, 0.38, 0.3, 0.72]} />
              </Effects>
            )}
          </PerformanceMonitor>
        </Canvas>
      </div>

      {/* cinematic vignette — CSS, so it can never break the GL pipeline */}
      <div className="lg-vignette" aria-hidden />

      {/* the scrollable DOM journey (copy, CTAs, contact console) */}
      <Journey />

      {/* fixed chrome */}
      <Hud />
      <SpecCard />
      <CursorOrb />
      <PowerIntro />
    </div>
  );
}
