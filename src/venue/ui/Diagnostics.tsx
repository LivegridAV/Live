"use client";
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useVenue } from "../systems/store";

/**
 * `?diag`: a small on-screen report for testing the venue on a real phone,
 * where there is no developer console. The owner opens the link, waits, and
 * sends a screenshot. Shows the device and GPU, when each loading step
 * finished (seconds since the page started), how much was downloaded, and
 * the frame rate once the walk is open. Read-only: it changes nothing the
 * venue does, and without `?diag` none of it mounts.
 */
export const diagnosticsEnabled = () =>
  typeof location !== "undefined" && new URLSearchParams(location.search).has("diag");

type Gpu = { renderer: string; parallel: boolean; maxTexture: number };
/** Filled by DiagnosticsProbe inside the canvas, read by the panel. */
const probe = { gpu: null as Gpu | null, programs: 0, fps: 0, worstMs: 0, canvas: "", dpr: 0, calls: 0 };

const now = () => performance.now() / 1000;

/** Inside the Canvas: GPU facts, program count, frame rate. */
export function DiagnosticsProbe() {
  const gl = useThree(s => s.gl);
  const frames = useRef<number[]>([]);
  useEffect(() => {
    const context = gl.getContext();
    const debug = context.getExtension("WEBGL_debug_renderer_info");
    probe.gpu = {
      renderer: String(debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER)),
      parallel: !!context.getExtension("KHR_parallel_shader_compile"),
      maxTexture: context.getParameter(context.MAX_TEXTURE_SIZE),
    };
  }, [gl]);
  useFrame((_, dt) => {
    probe.programs = gl.info.programs?.length ?? 0;
    probe.calls = gl.info.render.calls;
    probe.dpr = gl.getPixelRatio();
    probe.canvas = `${gl.domElement.width}x${gl.domElement.height}`;
    if (!useVenue.getState().entered || document.hidden || dt <= 0 || dt > 2) return;
    const f = frames.current;
    f.push(dt * 1000);
    if (f.length > 120) f.shift();
    const sorted = [...f].sort((a, b) => a - b);
    probe.fps = Math.round(1000 / sorted[Math.floor(sorted.length / 2)]);
    probe.worstMs = Math.round(sorted[sorted.length - 1]);
  });
  return null;
}

/** Outside the Canvas: the panel itself. */
export function DiagnosticsPanel() {
  const [, tick] = useState(0);
  const marks = useRef<[string, number][]>([]);
  useEffect(() => {
    const seen = new Set<string>();
    const mark = (label: string) => { if (!seen.has(label)) { seen.add(label); marks.current.push([label, now()]); } };
    mark("page script running");
    const check = () => {
      const s = useVenue.getState();
      for (const id of s.readyGroups) mark(`${id} arrived`);
      for (const id of s.liteWarmGroups) mark(`${id} light ready`);
      for (const id of s.warmGroups) mark(`${id} full ready`);
      if (s.loaded) mark("VENUE OPEN");
      if (s.entered) mark("walk started");
    };
    check();
    const unsubscribe = useVenue.subscribe(check);
    const timer = setInterval(() => tick(t => t + 1), 500);
    return () => { unsubscribe(); clearInterval(timer); };
  }, []);

  const s = useVenue.getState();
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const bytes = resources.reduce((sum, r) => sum + (r.transferSize || r.encodedBodySize || 0), 0);
  const lastFile = resources.reduce((t, r) => Math.max(t, r.responseEnd), 0) / 1000;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; downlink?: number } };
  const lines = [
    `livegridAV diag · ${now().toFixed(1)} s`,
    `${screen.width}x${screen.height} @${devicePixelRatio} · ${nav.hardwareConcurrency ?? "?"} cores · ${nav.deviceMemory ?? "?"} GB`,
    `net ${nav.connection?.effectiveType ?? "?"} ${nav.connection?.downlink ?? "?"} Mb/s · got ${(bytes / 1048576).toFixed(1)} MB, last file ${lastFile.toFixed(1)} s`,
    `GPU ${probe.gpu?.renderer ?? "…"} · parallel ${probe.gpu ? (probe.gpu.parallel ? "yes" : "NO") : "…"}`,
    `phone ${s.isPhone ? "yes" : "no"} · ${s.quality} · canvas ${probe.canvas} @${probe.dpr.toFixed(2)}`,
    `loading ${Math.round(s.loadPercent * 100)}% · shaders ${probe.programs} · calls ${probe.calls}`,
    `fps ${probe.fps || "–"} · worst frame ${probe.worstMs || "–"} ms`,
    ...marks.current.map(([label, t]) => `${t.toFixed(1).padStart(5)} s  ${label}`),
  ];
  return (
    <pre aria-hidden="true" style={{
      position: "fixed", left: 6, top: 6, zIndex: 100, margin: 0, padding: "6px 8px", maxWidth: "calc(100vw - 12px)",
      maxHeight: "calc(100vh - 12px)", overflow: "hidden", pointerEvents: "none", whiteSpace: "pre-wrap",
      font: "10px/1.35 ui-monospace, monospace", color: "#d8f5f1", background: "rgba(0,0,0,.78)", borderRadius: 6,
    }}>{lines.join("\n")}</pre>
  );
}
