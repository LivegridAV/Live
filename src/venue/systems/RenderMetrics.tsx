"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Quaternion, PerspectiveCamera, OrthographicCamera, Box3, Mesh, Group, type Object3D } from "three";
import { useVenue } from "./store";
import { journey } from "./journey";
import { baselineCameraForSearch } from "../data/baselineCameras";
import { progressToScroll } from "./ScrollRig";
import { perfHandle } from "../media/engine";

type PerfSnapshot = Record<string, {position:[number,number,number]; quaternion:[number,number,number,number]; size:[number,number,number]}>;
declare global { interface Window { __venuePerf?: {
  loaded(): boolean; groupsReady(): string[]; allReady(): boolean;
  /** Min and max over the last 6 frames; some frames add an extra pass, targets are judged on the max. */
  stats(): {callsMin:number; callsMax:number; trianglesMin:number; trianglesMax:number; textures:number; geometries:number};
  longTasks(): {ms:number; progress:number}[];
  snapshot(): PerfSnapshot;
  /** Harness extra: page scroll offset (px) at which the journey sits at progress p. */
  scrollTop(p: number): number;
  /** Harness extra: pin media time (LED screens, videos) to t seconds so screenshots repeat. */
  freeze(t: number): void;
}; } }

const mm = (v: number) => Math.round(v * 1000) / 1000;
/** Every named Mesh/Group, keyed by its named-ancestor path (repeats get #n). */
function snapshotScene(root: Object3D): PerfSnapshot {
  const out: PerfSnapshot = {}, seen = new Map<string, number>();
  const box = new Box3(), size = new Vector3(), pos = new Vector3(), quat = new Quaternion();
  root.updateWorldMatrix(true, true);
  const walk = (o: Object3D, path: string[]) => {
    const named = !!o.name && (o instanceof Mesh || o instanceof Group);
    const next = o.name ? [...path, o.name] : path;
    if (named) {
      const base = next.join("/"), n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      o.getWorldPosition(pos); o.getWorldQuaternion(quat);
      box.setFromObject(o); if (box.isEmpty()) size.set(0, 0, 0); else box.getSize(size);
      out[n ? `${base}#${n}` : base] = {
        position: [mm(pos.x), mm(pos.y), mm(pos.z)],
        quaternion: [mm(quat.x), mm(quat.y), mm(quat.z), mm(quat.w)],
        size: [mm(size.x), mm(size.y), mm(size.z)],
      };
    }
    for (const c of o.children) walk(c, next);
  };
  walk(root, []);
  return out;
}

/** Opt-in, local-only diagnostics. No telemetry is sent to a server. */
export function RenderMetrics() {
  const gl = useThree(s => s.gl);
  const scene = useThree(s => s.scene);
  // Last 6 frames of render stats (see stats()).
  const recentStats = useRef<{calls:number; triangles:number; textures:number; geometries:number}[]>([]);
  const allTasks = useRef<{ms:number; progress:number}[]>([]);
  const hardware=useMemo(()=>{
    const context=gl.getContext(),debug=context.getExtension("WEBGL_debug_renderer_info");
    return {userAgent:navigator.userAgent,logicalCores:navigator.hardwareConcurrency,
      vendor:debug?context.getParameter(debug.UNMASKED_VENDOR_WEBGL):context.getParameter(context.VENDOR),
      renderer:debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):context.getParameter(context.RENDERER)};
  },[gl]);
  const enabled = useRef(process.env.NODE_ENV === "development" || new URLSearchParams(location.search).has("perf"));
  const previousCamera=useRef({position:new Vector3(),quaternion:new Quaternion(),fov:0});
  const sample = useRef({ frames: [] as number[], tasks: [] as {ms: number; progress: number}[], reset: "", elapsed: 0, total:0, maxMs:0, over50:0, over100:0 });
  useEffect(() => {
    const enabled = process.env.NODE_ENV === "development" || new URLSearchParams(location.search).has("perf");
    if (!enabled) return;
    const autoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    const observer = typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes.includes("longtask")
      ? new PerformanceObserver(list => {
        if (!useVenue.getState().entered || document.hidden) return;
        for (const e of list.getEntries()) {
          const task = { ms: Math.round(e.duration), progress: +journey.progress.toFixed(3) };
          sample.current.tasks.push(task); allTasks.current.push(task);
        }
      }) : null;
    observer?.observe({ type: "longtask" });
    // Measurement hook for scripts/measure-venue.mjs; exists only with ?perf.
    if (new URLSearchParams(location.search).has("perf")) {
      window.__venuePerf = {
        loaded: () => useVenue.getState().loaded,
        groupsReady: () => [],
        allReady: () => useVenue.getState().loaded,
        stats: () => {
          const f = recentStats.current, calls = f.map(x => x.calls), tris = f.map(x => x.triangles), last = f[f.length - 1] ?? {textures:0, geometries:0};
          return { callsMin: Math.min(...calls), callsMax: Math.max(...calls), trianglesMin: Math.min(...tris), trianglesMax: Math.max(...tris), textures: last.textures, geometries: last.geometries };
        },
        longTasks: () => [...allTasks.current],
        snapshot: () => snapshotScene(scene),
        scrollTop: progressToScroll,
        freeze: (t: number) => perfHandle.engine?.freeze(t),
      };
    }
    return () => { observer?.disconnect(); gl.info.autoReset = autoReset; delete window.__venuePerf; };
  }, [gl, scene]);
  useFrame(({camera}, dt) => {
    if (!enabled.current) return;
    // info still holds the previous frame here (reset happens at the end of this callback).
    if (gl.info.render.calls > 0) { recentStats.current.push({calls: gl.info.render.calls, triangles: gl.info.render.triangles, textures: gl.info.memory.textures, geometries: gl.info.memory.geometries}); if (recentStats.current.length > 6) recentStats.current.shift(); }
    const output = document.querySelector<HTMLOutputElement>("[data-render-metrics]");
    if (!output) return;
    const perspective=camera instanceof PerspectiveCamera;
    const aspect=perspective?camera.aspect:camera instanceof OrthographicCamera?(camera.right-camera.left)/(camera.top-camera.bottom):1;
    const lens=perspective?camera.fov:camera.zoom;
    output.dataset.cameraType=perspective?"perspective":"orthographic";
    output.dataset.cameraAspect=aspect.toFixed(4);
    output.dataset.cameraProgress=journey.progress.toFixed(3);
    const baseline=baselineCameraForSearch(location.search);
    output.dataset.cameraMode=baseline?"baseline":useVenue.getState().stallVisit?"stall-visit":"journey";
    output.dataset.cameraSourceId=baseline?.camera.id??"";
    output.dataset.cameraBaselineShot=baseline?.shot??"";
    output.dataset.cameraPose=JSON.stringify({position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:perspective?camera.fov:null,aspect,near:camera.near,far:camera.far});
    output.dataset.renderConditions=JSON.stringify({viewport:{width:window.innerWidth,height:window.innerHeight,devicePixelRatio:window.devicePixelRatio},canvas:{width:gl.domElement.clientWidth,height:gl.domElement.clientHeight},exposure:gl.toneMappingExposure,toneMapping:gl.toneMapping,outputColorSpace:gl.outputColorSpace,hardware});
    output.dataset.cameraMoving=String(previousCamera.current.position.distanceTo(camera.position)>.0002
      || Math.abs(previousCamera.current.fov-lens)>.002
      || 1-Math.min(1,Math.abs(previousCamera.current.quaternion.dot(camera.quaternion))
        /Math.sqrt(previousCamera.current.quaternion.lengthSq()*camera.quaternion.lengthSq()))>1e-10);
    previousCamera.current.position.copy(camera.position);
    previousCamera.current.quaternion.copy(camera.quaternion);
    previousCamera.current.fov=lens;
    const s = sample.current;
    if (s.reset !== output.dataset.reset) {
      s.reset = output.dataset.reset ?? "";
      s.frames = []; s.tasks = []; s.elapsed = 0;
      s.total = s.maxMs = s.over50 = s.over100 = 0;
    }
    if (!document.hidden && useVenue.getState().entered && dt > 0) {
      s.frames.push(dt * 1000);
      s.total++; s.maxMs = Math.max(s.maxMs, dt*1000);
      if (dt > .05) s.over50++;
      if (dt > .1) s.over100++;
      if (s.frames.length > 10000) s.frames.shift();
      s.elapsed += dt;
    }
    if (s.elapsed >= .5 || !output.value) {
      const frames = [...s.frames].sort((a,b) => a-b);
      const recent = s.frames.slice(-60);
      const fps = recent.length ? Math.round(1000 * recent.length / recent.reduce((a,b) => a+b, 0)) : 0;
      output.value = `${fps} fps · ${gl.info.render.calls} calls · ${Math.round(gl.info.render.triangles/1000)}k triangles · ${gl.info.memory.textures} textures · ${gl.info.memory.geometries} geometries`;
      output.dataset.timing = JSON.stringify({frames:s.total, p95Ms:Math.round(frames[Math.floor(frames.length*.95)] ?? 0), maxMs:Math.round(s.maxMs), over50:s.over50, over100:s.over100, tasks:s.tasks.slice(-60), programs:gl.info.programs?.length, quality:useVenue.getState().quality, dpr:gl.getPixelRatio(), progress:+journey.progress.toFixed(3)});
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      output.dataset.mediaRequests = JSON.stringify(resources.filter(r=>/\.(png|webp|mp4|webm)(\?|$)/.test(r.name)).map(r=>({url:r.name,bytes:r.transferSize,duration:Math.round(r.duration)})));
      s.elapsed = 0;
    }
    gl.info.reset();
  });
  return null;
}
