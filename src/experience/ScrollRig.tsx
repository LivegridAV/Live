"use client";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { signals, useExperience } from "./store";

/**
 * Runs OUTSIDE the canvas. Owns the page scroll:
 *  - Lenis smooth-scrolls the tall DOM journey
 *  - writes normalized progress into `signals` for the render loop
 *  - tracks the pointer in NDC for camera parallax / light tracking
 * Scroll is locked until the visitor powers the venue on.
 *
 * IMPORTANT: Lenis animates toward its own internal target every frame,
 * so raw `window.scrollTo` calls get overwritten. All programmatic
 * scrolling must go through `journeyScroll` below.
 */

let lenisInstance: Lenis | null = null;

/** Scroll the journey to progress p (0..1). The only sanctioned way. */
export function journeyScroll(p: number, immediate = false) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const top = Math.max(0, Math.min(1, p)) * max;
  if (lenisInstance) lenisInstance.scrollTo(top, { immediate, duration: 1.8 });
  else window.scrollTo({ top, behavior: immediate ? "auto" : "smooth" });
}

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as Record<string, unknown>).__lgScrollTo = journeyScroll;
}

export default function ScrollRig() {
  const booted = useExperience((s) => s.booted);
  const bootedRef = useRef(booted);
  bootedRef.current = booted;

  // one Lenis for the lifetime of the experience
  useEffect(() => {
    // never let the browser restore a mid-journey position under the intro
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const lenis = new Lenis({
      duration: 1.35,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });
    lenisInstance = lenis;
    lenis.scrollTo(0, { immediate: true });
    lenis.stop(); // locked until boot

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      signals.rawProgress = max > 0 ? window.scrollY / max : 0;
      // extra smoothing layer for the camera (Lenis already smooths wheel)
      signals.progress += (signals.rawProgress - signals.progress) * 0.07;
      signals.pointerSmooth.x +=
        (signals.pointer.x - signals.pointerSmooth.x) * 0.06;
      signals.pointerSmooth.y +=
        (signals.pointer.y - signals.pointerSmooth.y) * 0.06;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onPointer = (e: PointerEvent) => {
      signals.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      signals.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  // unlock scroll once the venue is booted
  useEffect(() => {
    if (!lenisInstance) return;
    if (booted) {
      lenisInstance.scrollTo(0, { immediate: true });
      lenisInstance.start();
    } else {
      lenisInstance.stop();
    }
  }, [booted]);

  return null;
}
