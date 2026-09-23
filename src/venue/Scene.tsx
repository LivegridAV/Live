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
import { journey, show } from "./systems/journey";
import { ZoneGroup } from "./three/ZoneGroup";

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

  // Development-only handle for profiling: draw calls, triangle counts and
  // live scene inspection from the console without shipping a debug overlay.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as Record<string, unknown>).__venue = { gl, scene, camera, journey, show, store: useVenue };
    const autoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    return () => { gl.info.autoReset = autoReset; };
  }, [gl, scene, camera]);

  const frame = useRef(0);
  const setLoadPercent = useVenue((s) => s.setLoadPercent);
  const setLoaded = useVenue((s) => s.setLoaded);
  const done = useRef(false);
  const metrics = useRef({ frames: 0, elapsed: 0 });
  const longTasks = useRef({ count: 0, maxMs: 0 });
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !PerformanceObserver.supportedEntryTypes.includes("longtask")) return;
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        longTasks.current.count++;
        longTasks.current.maxMs = Math.max(longTasks.current.maxMs, entry.duration);
      }
    });
    observer.observe({ type: "longtask" });
    return () => observer.disconnect();
  }, []);

  useFrame((_, dt) => {
    if (process.env.NODE_ENV === "development" && !document.hidden && dt < .5) {
      metrics.current.frames++; metrics.current.elapsed += dt;
      if (metrics.current.elapsed >= 1.5) {
        const output = document.querySelector<HTMLOutputElement>("[data-render-metrics]");
        if (output) {
          output.value = `${Math.round(metrics.current.frames/metrics.current.elapsed)} fps · ${gl.info.render.calls} calls · ${Math.round(gl.info.render.triangles/1000)}k triangles · ${gl.info.memory.textures} textures · ${gl.info.memory.geometries} geometries`;
          const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
          output.dataset.mediaRequests = JSON.stringify(resources.filter(r => /\.(png|webp|mp4|webm)(\?|$)/.test(r.name)).map(r => ({url:r.name, bytes:r.transferSize, duration:Math.round(r.duration)})));
          output.dataset.longTasks = JSON.stringify(longTasks.current);
          const heap = (performance as Performance & {memory?: {usedJSHeapSize:number}}).memory;
          output.dataset.heapMb = heap ? (heap.usedJSHeapSize / 1048576).toFixed(1) : "unavailable";
        }
        metrics.current = { frames: 0, elapsed: 0 };
      }
    }
    if (process.env.NODE_ENV === "development") gl.info.reset();
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
    if (frame.current === 4) {
      gl.compile(scene, camera);
    }

    const p = 0.85 + Math.min(1, frame.current / 26) * 0.15;
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
      <ShowCue />
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
      <ZoneGroup from={2} to={-30} ahead={64} behind={30}>
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
