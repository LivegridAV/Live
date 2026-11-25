"use client";
import { useEffect } from "react";
import { useUprightTouch } from "../systems/device";

/**
 * The rotate screen. On a phone or tablet held upright the venue asks to be
 * turned sideways: it is a walk built for a wide frame. The scene keeps
 * loading underneath, so turning the device opens the walk straight away at
 * the entrance (Loader waits for the sideways frame before it enters).
 * Turning back to upright mid-walk shows this screen again and holds the
 * page still; turning sideways again carries on from the same spot.
 */
export function RotateGate() {
  const upright = useUprightTouch();

  // Hold the page still while upright. A class on <html>, not body's inline
  // overflow: the loader, menu and panels save and restore that inline style
  // in their own order, and a fourth writer could leave it stuck on hidden.
  useEffect(() => {
    document.documentElement.classList.toggle("v-upright", upright);
    return () => document.documentElement.classList.remove("v-upright");
  }, [upright]);

  if (!upright) return null;
  return (
    <div className="v-rotate" role="dialog" aria-modal="true" aria-labelledby="v-rotate-title" aria-describedby="v-rotate-body">
      <svg className="v-rotate-device" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="21" y="8" width="22" height="40" rx="4" />
        <line x1="29" y1="43" x2="35" y2="43" />
      </svg>
      <p className="v-mono">livegridAV · Virtual venue</p>
      <h2 id="v-rotate-title" className="v-rotate-title">Turn your screen sideways</h2>
      <p id="v-rotate-body" className="v-rotate-body">
        The venue is a walk-through made for a wide screen. It opens at the entrance as soon as you turn.
      </p>
      <p className="v-rotate-hint">Screen won&rsquo;t turn? Switch off rotation lock in your quick settings.</p>
    </div>
  );
}
