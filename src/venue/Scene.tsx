"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { MediaProvider } from "./media/MediaContext";
import { CameraRig } from "./systems/CameraRig";
import { QualityGovernor } from "./systems/Quality";
import { ShowCue } from "./systems/ShowCue";
import { LightRig, VenueEnvironment } from "./three/environment";
import { ArenaPortal, ArenaShell, Ground, HallShell } from "./zones/Architecture";
import { EntranceP01 } from "./zones/EntranceP01";
import { HallAtmosphere } from "./zones/HallAtmosphere";
import { HallDressing } from "./zones/HallDressing";
import { Gallery } from "./zones/Gallery";
import { Boulevard } from "./zones/ServicePavilion";
import { Arena } from "./zones/Arena";
import { useVenue } from "./systems/store";
import { ZoneGroup } from "./three/ZoneGroup";
import { RenderMetrics } from "./systems/RenderMetrics";
import { LocalLightPool } from "./three/LocalLights";
import * as THREE from "three";
import { closeWarmupGate, openWarmupGate, submitPrograms, warmScene, warmupHold } from "./three/warmScene";
import { shareTextureDownloads } from "./three/sharedTextures";

shareTextureDownloads();
import { StallDimensions } from "./three/StallDimensions";
import { EXHIBITION_RANGES } from "./data/placements";
import { PlacementInspection, placementInspectionEnabled } from "./systems/PlacementInspection";
import { START_GROUP } from "./loading/groups";
import { groupsBeforeOpening } from "./loading/plan";
import { journeyStartZ } from "./data/path";
import { VenueStreaming } from "./loading/LoadGroupGate";
import { downloadedBytes, fullLoadRequested, groupFailed, planOpening, plannerGroups, streamBandwidth, venueOpened } from "./loading/stream";

/**
 * While mounted, R3F skips its own on-screen draw (a priority subscriber takes
 * over rendering) and draws nothing. The loader is opaque, so nothing is lost;
 * what is gained is that no frame compiles shaders synchronously before the
 * warm-up has submitted them all to the driver.
 */
function RenderHold() {
  useEffect(() => {
    warmupHold.active = true;
    closeWarmupGate();
    return () => { warmupHold.active = false; };
  }, []);
  useFrame(() => {}, 1);
  return null;
}

/**
 * Warm-up.
 *
 * Wait for the groups the venue must open with, then prepare every shader
 * behind the loader. Compiling several hundred programs inside the first
 * animated frame is what would otherwise freeze the page the moment the
 * visitor scrolls. The compile runs on the driver's threads while the loader
 * reports honest progress, and the screen is not drawn until it has finished.
 *
 * Which groups: the entrance group always. Its download measures the
 * connection, and the planner adds every later group that could not stream in
 * ahead of a visitor walking from the start (loading/plan.ts). Those stream
 * and warm in their own gates first. Review, capture and inspection modes wait
 * for every group. Everything else streams in after the venue opens.
 */
function Warmup({ full }: { full: boolean }) {
  const { gl, scene, camera, size } = useThree();

  const frame = useRef(0);
  const setLoadPercent = useVenue((s) => s.setLoadPercent);
  const setLoaded = useVenue((s) => s.setLoaded);
  const markGroupWarm = useVenue((s) => s.markGroupWarm);
  const done = useRef(false);
  const compiling = useRef(false);
  const compiled = useRef(false);
  const alive = useRef(true);
  const compileFraction = useRef(0);
  const [holding, setHolding] = useState(true);
  const early = useRef({ target: null as THREE.WebGLRenderTarget | null, loaded: -1, at: 0 });
  /** Groups the venue opens with, once the entrance group has measured the connection. */
  const plan = useRef<string[] | null>(null);
  const bar = useRef({ value: 0, at: -Infinity });
  useEffect(() => {
    alive.current = true;
    const state = early.current;
    return () => { alive.current = false; state.target?.dispose(); state.target = null; };
  }, []);
  useFrame(() => {
    if (done.current) return;
    const venueState = useVenue.getState();
    const startReady = venueState.readyGroups.includes(START_GROUP);
    if (!plan.current && startReady) {
      const groups = plannerGroups();
      if (groups) {
        const bytesPerSecond = streamBandwidth();
        // The visitor starts walking at the journey's p = 0 camera (with the
        // portrait push-back on narrow frames), whatever this frame's camera is.
        const startZ = journeyStartZ(size.width / Math.max(1, size.height));
        plan.current = full ? groups.map(g => g.id)
          : groupsBeforeOpening({ bytesPerSecond, groups, startZ });
        // The plan's groups stream now; the rest get their light pack at opening.
        planOpening(plan.current);
        if (new URLSearchParams(location.search).has("perf")) {
          console.info(`[venue] opening with ${plan.current.join(", ")} (${Math.round(bytesPerSecond / 1000)} kB/s, start z ${startZ.toFixed(1)})`);
        }
      }
    }
    const required = plan.current ?? [START_GROUP];
    const waiting = !plan.current || required.some(id =>
      id !== START_GROUP && !venueState.warmGroups.includes(id) && !groupFailed(id));
    if (waiting) {
      const now = performance.now();
      // 0-0.85: bytes of the groups the venue opens with.
      if (now - bar.current.at > 250) {
        bar.current.at = now;
        const groups = plannerGroups();
        const expected = groups?.filter(g => required.includes(g.id)).reduce((sum, g) => sum + g.bytes, 0) ?? 0;
        const fraction = expected > 0 ? Math.min(1, downloadedBytes(required) / expected) : 0;
        bar.current.value = Math.max(bar.current.value, fraction * 0.85);
        setLoadPercent(bar.current.value);
      }
      frame.current = 0;
      // Hand the driver the shaders of everything that has already arrived,
      // so it compiles them while the network is still busy. Throttled, and
      // only when something new has loaded since the last submission. Read
      // the loader in the frame loop: subscribing the component to its store
      // triggers a cross-component render update when a GLB suspends.
      const { loaded } = useProgress.getState();
      if (loaded !== early.current.loaded && now - early.current.at > 900) {
        early.current.loaded = loaded; early.current.at = now;
        early.current.target ??= new THREE.WebGLRenderTarget(32, 32);
        try { submitPrograms(gl, scene, camera, early.current.target); }
        catch (error) { console.warn("Early shader submission skipped", error); }
      }
      return;
    }
    if (early.current.target) { early.current.target.dispose(); early.current.target = null; }
    frame.current++;

    // Give the media engine a couple of frames to fill its targets first, so
    // compile() sees the textures it will actually sample.
    if (frame.current >= 4 && !compiling.current) {
      compiling.current = true;
      // Await GPU readiness, not just shader submission. The old fixed 26-frame
      // delay let the visitor enter while the driver was still compiling.
      const cancelled = () => !alive.current;
      void (async () => {
        await warmScene(gl, scene, camera, cancelled, f => { compileFraction.current = f * 0.85; });
        if (cancelled()) return;
        // Every shader is ready: let the gated work in (contact-shadow bakes,
        // the floor reflection), let the bakes finish and the reflection
        // mount, then prepare the handful of programs they added.
        await Promise.race([openWarmupGate(), new Promise(resolve => setTimeout(resolve, 30_000))]);
        await new Promise(resolve => setTimeout(resolve, 120));
        await warmScene(gl, scene, camera, cancelled, f => { compileFraction.current = 0.85 + f * 0.15; });
      })().then(() => {
        if (alive.current) compiled.current = true;
      }).catch(error => {
        console.error("Venue shader warm-up failed", error);
        if (alive.current) compiled.current = true;
      });
    }

    const p = compiled.current ? 1 : 0.85 + compileFraction.current * 0.14;
    setLoadPercent(Math.max(bar.current.value, p));
    if (frame.current >= 26 && compiled.current) {
      done.current = true;
      setHolding(false);
      markGroupWarm(START_GROUP);
      setLoaded(true);
      venueOpened();
    }
  });

  return holding ? <RenderHold /> : null;
}

export function Scene({inspection=false}:{inspection?:boolean}) {
  const [full] = useState(() => fullLoadRequested(inspection));
  return (
    <MediaProvider>
      <LocalLightPool>
      <QualityGovernor />
      <ShowCue />
      <VenueEnvironment />
      <LightRig />
      {!inspection && (placementInspectionEnabled()?<PlacementInspection />:<CameraRig />)}
      <VenueStreaming />
      <Warmup full={full} />
      <RenderMetrics />
      <StallDimensions />

      {/* the building */}
      <group>
      <Ground />
      <HallShell />
      <HallAtmosphere />
      <Suspense fallback={null}><HallDressing /></Suspense>
      <ArenaPortal />
      <ArenaShell />

      {/* The journey. Each zone is switched off once the camera is well past
          it — the fog hides every boundary, and the draw-call saving is what
          makes a 375 m venue affordable on a laptop. */}
      <ZoneGroup from={0} to={-28.4} ahead={80} behind={40}>
        <Suspense fallback={null}><EntranceP01 /></Suspense>
      </ZoneGroup>
      <ZoneGroup from={-26} to={EXHIBITION_RANGES.gallery.to} ahead={70} behind={40}>
        <Gallery />
      </ZoneGroup>
      <Boulevard />
      <Arena />
      </group>
      </LocalLightPool>
    </MediaProvider>
  );
}
