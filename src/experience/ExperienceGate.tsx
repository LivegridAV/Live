"use client";
import { ReactNode, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Experience = dynamic(() => import("./Experience"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, background: "#04080a" }} />,
});

/**
 * Decides between the immersive WebGL experience and the classic site.
 * The 3D venue is the default face of the site — it loads for every
 * device that can run it. The classic site is server-rendered first
 * (SEO + no-JS) and remains the genuine fallback. Escape hatches:
 *  - ?classic       forces the classic site
 *  - missing WebGL  falls back to the classic site
 *  - the venue's own "SKIP · CLASSIC SITE" link (and ?classic) let any
 *    visitor — including motion-sensitive ones — opt out of the 3D.
 *
 * Note: we intentionally do NOT auto-route prefers-reduced-motion users to
 * the classic site. This is a flagship marketing experience, so the venue
 * is the default; reduced-motion is still honoured *inside* it (Framer's
 * useReducedMotion calms non-essential animation), and the skip link is
 * always one click away.
 */
export default function ExperienceGate({ classic }: { classic: ReactNode }) {
  const [mode, setMode] = useState<"classic" | "3d">("classic");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("classic")) return;
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) return; // no WebGL → classic fallback
    } catch {
      return;
    }
    setMode("3d");
  }, []);

  if (mode === "3d") return <Experience />;
  return <>{classic}</>;
}
