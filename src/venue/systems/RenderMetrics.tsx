"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, Quaternion, PerspectiveCamera, OrthographicCamera } from "three";
import { useVenue } from "./store";
import { journey } from "./journey";
import { baselineCameraForSearch } from "../data/baselineCameras";

/** Opt-in, local-only diagnostics. No telemetry is sent to a server. */
export function RenderMetrics() {
  const gl = useThree(s => s.gl);
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
        for (const e of list.getEntries()) sample.current.tasks.push({ ms: Math.round(e.duration), progress: +journey.progress.toFixed(3) });
      }) : null;
    observer?.observe({ type: "longtask" });
    return () => { observer?.disconnect(); gl.info.autoReset = autoReset; };
  }, [gl]);
  useFrame(({camera}, dt) => {
    if (!enabled.current) return;
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
