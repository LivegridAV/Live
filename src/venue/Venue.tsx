"use client";
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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

export default function Venue() {
  const [webgl] = useState(probeWebGL);
  const [profile] = useState(detectQuality);

  useEffect(() => {
    useVenue.setState({ quality: profile.tier, isMobile: profile.mobile });
    // Without WebGL there is nothing to warm up — release the door immediately
    // so the visitor is never held at a loader that will not finish.
    if (!webgl) useVenue.setState({ loaded: true });
  }, [profile, webgl]);

  return (
    <div className="venue">
      {webgl && (
        <div className="venue-canvas">
          <Canvas
            dpr={profile.dpr}
            gl={{
              antialias: true,
              powerPreference: "high-performance",
              alpha: false,
              stencil: false,
            }}
            camera={{ fov: 52, near: 0.1, far: 340, position: [0, 2.35, 21] }}
            onCreated={({ gl, scene }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              // Medium bright: the venue is a dark room with bright things in it, and
              // the job is to keep it atmospheric without losing the architecture.
              // 1.15 was a black box; past ~1.75 the LED flattens into paper.
              gl.toneMappingExposure = 1.62;
              gl.outputColorSpace = THREE.SRGBColorSpace;
              scene.background = new THREE.Color("#05090a");

              /* ── the environment map ──
                 Every brushed-aluminium rail, anodised case, steel dropper and
                 truss chord in this venue is a metal: `metalness` near 1. A
                 metal has no diffuse response at all — it can only show you
                 what is around it — so with no environment bound, all of it
                 rendered black, and the building's entire structural language
                 was invisible. Point lights do not fix that; only an
                 environment does.

                 `RoomEnvironment` is a small procedural studio: a soft box
                 with a few area sources. Pre-filtered once at start-up, it
                 costs nothing per frame, and it is what finally lets the
                 trusses, the rails and the glass read as materials. Held well
                 below 1 so it lifts the metalwork without flattening a venue
                 whose whole grade depends on rich blacks. */
              const pmrem = new THREE.PMREMGenerator(gl);
              scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
              scene.environmentIntensity = 0.7;
              pmrem.dispose();
            }}
          >
            <Scene />
          </Canvas>
        </div>
      )}

      <div className="venue-vignette" aria-hidden="true" />

      <ScrollRig />
      <ScrollTrack />

      <Loader />
      <Nav />
      <ZoneHud />
      <ProgressRail />
      <ScrollCue />
      <PavilionPrompt />
      <PavilionPanel />
      <StageModeSwitch />
      <ContactPanel />
      <GuideControls />
    </div>
  );
}
