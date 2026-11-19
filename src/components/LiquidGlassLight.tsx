"use client";
import { useEffect } from "react";

/**
 * Liquid Glass pointer light: as the pointer moves over a glass control, the
 * control's specular highlight follows it (see app/liquid-glass.css). One
 * delegated listener for the whole site; it only writes two custom properties
 * on the control under the pointer, at most once per frame. Off for touch
 * and for reduced motion, where the static material is used as is.
 */
const LIVE = [
  ".lg-btn", ".lg-glass-pill", ".lg-glass-sheet",
  ".v-btn", ".v-nav-brand", ".v-nav-links", ".v-nav-toggle", ".v-guide",
  ".v-stall-visit", ".v-projection-views", ".v-stagemode-switch", ".v-prompt", ".v-rail",
].join(",");

export function LiquidGlassLight() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, x = 0, y = 0, target: HTMLElement | null = null;
    const paint = () => {
      frame = 0;
      if (!target) return;
      const box = target.getBoundingClientRect();
      target.style.setProperty("--lg-x", `${x - box.left}px`);
      target.style.setProperty("--lg-y", `${y - box.top}px`);
    };
    const move = (event: PointerEvent) => {
      if (!fine.matches || still.matches || event.pointerType !== "mouse") return;
      target = (event.target as Element | null)?.closest?.(LIVE) as HTMLElement | null;
      if (!target) return;
      x = event.clientX; y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => {
      document.removeEventListener("pointermove", move);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
