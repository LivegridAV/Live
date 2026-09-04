"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => null,
});

/**
 * Wraps the WebGL hero scene. The CSS stage (graphite room + floor) is always
 * painted first so the hero is never blank and reads premium without WebGL
 * (brief §9/§13/§36). The 3D scene fades in on top once ready; if WebGL is
 * unavailable the CSS stage remains as the fallback.
 */
export default function HeroStage() {
  const [webgl, setWebgl] = useState(false);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"forest" | "atest">("forest");
  const [view, setView] = useState<"sweet" | "off">("sweet");

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (c.getContext("webgl2") || c.getContext("webgl")) setWebgl(true);
    } catch { /* keep CSS fallback */ }
    const q = new URLSearchParams(window.location.search);
    if (q.has("atest")) setMode("atest");
    if (q.get("view") === "off") setView("off");
  }, []);

  return (
    <div className="v2-hero-stage" aria-hidden>
      {/* always-on CSS stage (fallback + first paint) */}
      <div className="v2-stage-fallback" />
      <div className="v2-stage-floor" />
      {webgl && (
        <div
          style={{ position: "absolute", inset: 0, opacity: ready ? 1 : 0, transition: "opacity 1.1s ease" }}
          onTransitionEnd={() => { /* noop */ }}
        >
          <SceneMount onReady={() => setReady(true)} mode={mode} view={view} />
        </div>
      )}
    </div>
  );
}

function SceneMount({ onReady, mode, view }: { onReady: () => void; mode: "forest" | "atest"; view: "sweet" | "off" }) {
  useEffect(() => {
    // give the canvas a beat to compile shaders before we fade it in
    const t = setTimeout(onReady, 220);
    return () => clearTimeout(t);
  }, [onReady]);
  return <HeroScene mode={mode} view={view} />;
}
