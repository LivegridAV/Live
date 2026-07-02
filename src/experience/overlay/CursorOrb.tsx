"use client";
import { useEffect, useRef } from "react";

/**
 * The glowing energy-orb cursor. A soft dot leads, a larger halo trails
 * with lag — pure transform updates, zero React re-renders.
 * Hidden automatically on touch devices.
 */
export default function CursorOrb() {
  const dot = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let x = -100, y = -100, hx = -100, hy = -100;
    let raf = 0;
    const onMove = (e: PointerEvent) => { x = e.clientX; y = e.clientY; };
    const tick = () => {
      hx += (x - hx) * 0.14;
      hy += (y - hy) * 0.14;
      if (dot.current) dot.current.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
      if (halo.current) halo.current.style.transform = `translate(${hx - 16}px, ${hy - 16}px)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="lg-cursor">
      <div ref={halo} className="lg-cursor-halo" />
      <div ref={dot} className="lg-cursor-dot" />
    </div>
  );
}
