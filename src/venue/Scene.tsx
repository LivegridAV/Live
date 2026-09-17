"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MediaProvider } from "./media/MediaContext";
import { CameraRig } from "./systems/CameraRig";
import { QualityGovernor } from "./systems/Quality";
import { LightRig, VenueEnvironment } from "./three/environment";
import { ArenaPortal, ArenaShell, Ground, HallShell } from "./zones/Architecture";
import { Arrival } from "./zones/Arrival";
import { Tunnel } from "./zones/Tunnel";
import { Gallery } from "./zones/Gallery";
import { Boulevard } from "./zones/ServicePavilion";
import { Arena } from "./zones/Arena";
import { useVenue } from "./systems/store";
import { journey } from "./systems/journey";
import { ZoneGroup } from "./three/ZoneGroup";

/**
 * Warm-up.
 *
 * Nothing here is downloaded — the venue's content is generated — so "loading"
 * is really shader compilation, and compiling several hundred programs inside
 * the first animated frame is what would otherwise produce a two second freeze
 * the moment the visitor scrolls. So we force it to happen while the loader is
 * still up, and report honest progress while it does.
 */
function Warmup() {
  const { gl, scene, camera } = useThree();

  // Development-only handle for profiling: draw calls, triangle counts and
  // live scene inspection from the console without shipping a debug overlay.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as Record<string, unknown>).__venue = { gl, scene, camera, journey, store: useVenue };
  }, [gl, scene, camera]);

  const frame = useRef(0);
  const setLoadPercent = useVenue((s) => s.setLoadPercent);
  const setLoaded = useVenue((s) => s.setLoaded);
  const done = useRef(false);

  useFrame(() => {
    if (done.current) return;
    frame.current++;

    // Give the media engine a couple of frames to fill its targets first, so
    // compile() sees the textures it will actually sample.
    if (frame.current === 4) {
      gl.compile(scene, camera);
    }

    const p = Math.min(1, frame.current / 26);
    setLoadPercent(p);
    if (frame.current >= 26) {
      done.current = true;
      setLoaded(true);
    }
  });

  return null;
}

export function Scene() {
  return (
    <MediaProvider>
      <QualityGovernor />
      <VenueEnvironment />
      <LightRig />
      <CameraRig />
      <Warmup />

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
      <ZoneGroup from={2} to={-26} ahead={60} behind={30}>
        <Tunnel />
      </ZoneGroup>
      <ZoneGroup from={-26} to={-102} ahead={70} behind={40}>
        <Gallery />
      </ZoneGroup>
      <Boulevard />
      <Arena />
    </MediaProvider>
  );
}
