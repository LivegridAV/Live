"use client";
import { ReactNode, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Experience = dynamic(() => import("./Experience"), {
  ssr: false,
  loading: () => <div style={{ position: "fixed", inset: 0, background: "#04080a" }} />,
});

/**
 * Decides between the immersive WebGL experience and the classic site.
 * The classic site is server-rendered (SEO + no-JS), then we upgrade to
 * 3D when the device can carry it. Escape hatches:
 *  - ?classic=1 forces the classic site
 *  - prefers-reduced-motion gets the classic site (no motion trap)
 *  - missing WebGL gets the classic site
 */
export default function ExperienceGate({ classic }: { classic: ReactNode }) {
  const [mode, setMode] = useState<"classic" | "3d">("classic");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("classic")) return;
    // reduced-motion users get the calm site unless they opt in explicitly
    const forced = params.has("experience");
    if (!forced && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!gl) return;
    } catch {
      return;
    }
    setMode("3d");
  }, []);

  if (mode === "3d") return <Experience />;
  return <>{classic}</>;
}
