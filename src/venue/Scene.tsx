"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { MediaProvider } from "./media/MediaContext";
import { CameraRig } from "./systems/CameraRig";
import { QualityGovernor } from "./systems/Quality";
import { ShowCue } from "./systems/ShowCue";
import { LightRig, VenueEnvironment } from "./three/environment";
import { ArenaPortal, ArenaShell, Ground, HallShell } from "./zones/Architecture";
import { Arrival } from "./zones/Arrival";
import { Tunnel } from "./zones/Tunnel";
import { Gallery } from "./zones/Gallery";
import { Boulevard } from "./zones/ServicePavilion";
import { Arena } from "./zones/Arena";
import { useVenue } from "./systems/store";
import { ZoneGroup } from "./three/ZoneGroup";
import { RenderMetrics } from "./systems/RenderMetrics";
import { LocalLightPool } from "./three/LocalLights";
import { warmScene } from "./three/warmScene";

/**
 * Warm-up.
 *
 * Wait for authored GLBs and textures before shader compilation. Compiling
 * several hundred programs inside
 * the first animated frame is what would otherwise produce a two second freeze
 * the moment the visitor scrolls. So we force it to happen while the loader is
 * still up, and report honest progress while it does.
 */
function Warmup() {
  const { gl, scene, camera } = useThree();

  const frame = useRef(0);
  const setLoadPercent = useVenue((s) => s.setLoadPercent);
  const setLoaded = useVenue((s) => s.setLoaded);
  const done = useRef(false);
  const compiling = useRef(false);
  const compiled = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useFrame(() => {
    if (done.current) return;
    // Read the loader in the frame loop. Subscribing the component to its
    // store triggers a cross-component render update when a GLB suspends.
    const { active, progress: assetProgress } = useProgress.getState();
    if (active) {
      setLoadPercent(Math.min(0.85, assetProgress / 100 * 0.85));
      frame.current = 0;
      return;
    }
    frame.current++;

    // Give the media engine a couple of frames to fill its targets first, so
    // compile() sees the textures it will actually sample.
    if (frame.current >= 4 && !compiling.current) {
      compiling.current = true;
      // Await GPU readiness, not just shader submission. The old fixed 26-frame
      // delay let the visitor enter while the driver was still compiling.
      void warmScene(gl, scene, camera, () => !alive.current).then(() => {
        if (alive.current) compiled.current = true;
      }).catch(error => {
        console.error("Venue shader warm-up failed", error);
        if (alive.current) compiled.current = true;
      });
    }

    const p = compiled.current ? 1 : 0.85 + Math.min(1, frame.current / 26) * 0.13;
    setLoadPercent(p);
    if (frame.current >= 26 && compiled.current) {
      done.current = true;
      setLoaded(true);
    }
  });

  return null;
}

export function Scene() {
  return (
    <MediaProvider>
      <LocalLightPool>
      <QualityGovernor />
      <ShowCue />
      <VenueEnvironment />
      <LightRig />
      <CameraRig />
      <Warmup />
      <RenderMetrics />

      {/* the building */}
      <Ground />
      <HallShell />
      <ArenaPortal />
      <ArenaShell />

      {/* The journey. Each zone is switched off once the camera is well past
          it — the fog hides every boundary, and the draw-call saving is what
          makes a 375 m venue affordable on a laptop. */}
      <ZoneGroup from={60} to={-14} ahead={40} behind={46}>
        <Arrival />
      </ZoneGroup>
      <ZoneGroup from={2} to={-30} ahead={64} behind={30}>
        <Tunnel />
      </ZoneGroup>
      <ZoneGroup from={-26} to={-102} ahead={70} behind={40}>
        <Gallery />
      </ZoneGroup>
      <Boulevard />
      <Arena />
      </LocalLightPool>
    </MediaProvider>
  );
}
