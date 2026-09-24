"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useVenue } from "./store";
import { journey } from "./journey";

/** Opt-in, local-only diagnostics. No telemetry is sent to a server. */
export function RenderMetrics() {
  const gl = useThree(s => s.gl);
  const enabled = useRef(process.env.NODE_ENV === "development" || new URLSearchParams(location.search).has("perf"));
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
  useFrame((_, dt) => {
    if (!enabled.current) return;
    const output = document.querySelector<HTMLOutputElement>("[data-render-metrics]");
    if (!output) return;
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
