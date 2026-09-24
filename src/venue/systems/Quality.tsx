"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useVenue, type QualityTier } from "./store";

/**
 * Device profiling and adaptive resolution.
 *
 * The venue has to run on a laptop on battery and on a phone, so quality is
 * profiled once before warm-up. Keep geometry, shader layers and media targets
 * stable while exploring; only pixel ratio adapts. Switching tiers at runtime
 * invalidated the very resources the loader had just warmed.
 */

/** Runs outside the canvas: picks the starting tier before anything is built. */
export function detectQuality(): { tier: QualityTier; mobile: boolean; dpr: number } {
  if (typeof window === "undefined") return { tier: "high", mobile: false, dpr: 1 };

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 760;
  // Layout and budget follow the *frame*, not the input device: a narrow
  // desktop window needs the same treatment a phone does.
  const mobile = coarse || narrow;
  const touch = coarse && window.innerWidth < 900;
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;

  let tier: QualityTier = "high";
  if (touch) tier = cores >= 6 && mem >= 4 ? "medium" : "low";
  else if (mobile || cores <= 4 || mem <= 2) tier = "medium";

  // A very wide, very dense display is a lot of pixels to fill either way.
  if (!mobile && window.innerWidth * dpr > 4200 && cores < 8) tier = "medium";

  return { tier, mobile, dpr };
}

const TARGET_DPR: Record<QualityTier, [number, number]> = {
  low: [0.85, 1],
  medium: [1, 1.35],
  high: [1, 1.8],
};

export function QualityGovernor() {
  const setDpr = useThree((s) => s.setDpr);
  const quality = useVenue((s) => s.quality);
  const isMobile = useVenue((s) => s.isMobile);

  const samples = useRef<number[]>([]);
  const dpr = useRef(1);
  const cooldown = useRef(2.5);

  useEffect(() => {
    const base = Math.min(window.devicePixelRatio || 1, TARGET_DPR[quality][1]);
    dpr.current = Math.max(TARGET_DPR[quality][0], base);
    setDpr(dpr.current);
  }, [quality, setDpr]);

  useFrame((_, dt) => {
    if (dt <= 0 || dt > 0.5 || document.hidden || !useVenue.getState().loaded) return;
    cooldown.current -= dt;
    const s = samples.current;
    s.push(1 / dt);
    if (s.length > 90) s.shift();
    if (s.length < 60 || cooldown.current > 0) return;

    // Median, not mean: one hitch shouldn't cost the visitor their quality.
    const sorted = [...s].sort((a, b) => a - b);
    const fps = sorted[Math.floor(sorted.length / 2)];
    const [min, max] = TARGET_DPR[quality];

    if (fps < 42) {
      if (dpr.current > min + 0.01) {
        dpr.current = Math.max(min, dpr.current - 0.2);
        setDpr(dpr.current);
      }
      cooldown.current = 3;
      s.length = 0;
    } else if (fps > 57 && dpr.current < Math.min(max, window.devicePixelRatio || 1) - 0.01) {
      dpr.current = Math.min(max, window.devicePixelRatio || 1, dpr.current + 0.12);
      setDpr(dpr.current);
      cooldown.current = 4;
      s.length = 0;
    }
  });

  // Phones throttle hard in the background; drop the pixel ratio while hidden
  // so returning to the tab isn't a stutter.
  useEffect(() => {
    if (!isMobile) return;
    const onVis = () => setDpr(document.hidden ? 0.5 : dpr.current);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isMobile, setDpr]);

  return null;
}
