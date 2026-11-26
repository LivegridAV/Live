"use client";
import { memo, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Scene } from "./Scene";
import { ScrollRig, TRACK_ATTR, useScrollHeight } from "./systems/ScrollRig";
import { detectQuality } from "./systems/Quality";
import { useVenue } from "./systems/store";
import { Loader } from "./ui/Loader";
import { Nav } from "./ui/Nav";
import { ProgressRail, ScrollCue, ZoneHud } from "./ui/Hud";
import { PavilionPanel, PavilionPrompt } from "./ui/Pavilion";
import { StageModeSwitch } from "./ui/StageMode";
import { ContactPanel } from "./ui/Contact";
import { GuideControls } from "./ui/Guide";
import { ReviewControls } from "./ui/ReviewControls";
import { StallVisitControls } from "./ui/StallVisit";
import { BottomDock } from "./ui/BottomDock";
import { ReviewRecorder } from "./ui/ReviewRecorder";
import { EntranceFinishes } from "./ui/EntranceFinishes";
import { EntranceWalkthrough } from "./ui/EntranceWalkthrough";
import { RotateGate } from "./ui/RotateGate";

/**
 * The venue walkthrough.
 *
 * A fixed canvas behind a tall, empty scroll track: the page's scrollbar is
 * the venue's dolly. Everything above the canvas is thin chrome — the building
 * carries the content. If WebGL is unavailable the canvas simply never mounts
 * and the semantic content below stands on its own.
 */

/**
 * This component is client-only (see VenueMount), so the probe can run in a
 * lazy initialiser — no effect, no second render before we know the answer.
 */
function probeWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    // Release the probe context immediately — some drivers cap them at 8.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

function ScrollTrack() {
  const vh = useScrollHeight();
  return (
    <div
      className="venue-track"
      style={{ height: `${vh * 100}vh` }}
      aria-hidden="true"
      {...{ [TRACK_ATTR]: "" }}
    />
  );
}

const GL = { antialias: true, powerPreference: "high-performance", alpha: false, stencil: false } as const;
const CAMERA = { fov: 52, near: 0.1, far: 340, position: [0, 2.35, 21] as [number, number, number] };

/**
 * The canvas, memoised. R3F re-applies the Canvas `dpr` prop on every render
 * of the Canvas element, which undid the QualityGovernor's pixel ratio each
 * time Venue re-rendered (it does when the walk opens): phones ran at 2x
 * instead of their tier's 1.35x. With stable props the governor owns it.
 */
const VenueCanvas = memo(function VenueCanvas({ dpr }: { dpr: number }) {
  return (
    <Canvas
      shadows="percentage"
      dpr={dpr}
      gl={GL}
      camera={CAMERA}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        // Medium bright: the venue is a dark room with bright things in it, and
        // the job is to keep it atmospheric without losing the architecture.
        // Physical material response and local fixtures supply the lift;
        // higher exposure would flatten the LED artwork into white.
        gl.toneMappingExposure = 1.15;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        // A program's first draw otherwise asks the driver for its info
        // log, which waits for the link: 100+ ms long tasks when a group
        // streams in during the walk (Task 6b trace). Kept in dev.
        gl.debug.checkShaderErrors = process.env.NODE_ENV === "development";
        scene.background = new THREE.Color("#05090a");
        // Environment lifetime is owned by VenueEnvironment.
      }}
    >
      <Scene />
    </Canvas>
  );
});

export default function Venue() {
  const [webgl] = useState(probeWebGL);
  const entered=useVenue(s=>s.entered);
  const [capture]=useState(()=>new URLSearchParams(location.search).get("capture")==="1");
  const [profile] = useState(detectQuality);

  useEffect(() => {
    useVenue.setState({ quality: profile.tier, isMobile: profile.mobile, isPhone: profile.phone });
    // Without WebGL there is nothing to warm up — release the door immediately
    // so the visitor is never held at a loader that will not finish.
    if (!webgl) useVenue.setState({ loaded: true });
  }, [profile, webgl]);

  return (
    <div className="venue" data-capture={capture&&entered?true:undefined}>
      {webgl && (
        <div className="venue-canvas">
          <VenueCanvas dpr={profile.dpr} />
        </div>
      )}

      <div className="venue-vignette" aria-hidden="true" />

      <ScrollRig />
      <ScrollTrack />

      <Loader />
      <Nav />
      <ZoneHud />
      <BottomDock>
        <StallVisitControls />
        <GuideControls />
      </BottomDock>
      <ProgressRail />
      <ScrollCue />
      <PavilionPrompt />
      <PavilionPanel />
      <StageModeSwitch />
      <ContactPanel />
      <ReviewControls />
      <ReviewRecorder />
      <EntranceFinishes />
      <EntranceWalkthrough />
      <RotateGate />
    </div>
  );
}
