"use client";
import { useEffect, useMemo } from "react";
import { useVenue } from "../systems/store";
import { NAV_STOPS } from "../data/zones";
import { scrollToProgress } from "../systems/ScrollRig";

/**
 * The guided route.
 *
 * For anyone who asks their system for reduced motion, the venue still has all
 * of its content — it just stops flying. The camera settles onto each stop
 * instead of sweeping between them, the idle drift and pointer parallax are
 * dropped, and these controls step through the walkthrough one place at a time.
 * It is the same journey, walked rather than travelled.
 */
export function GuideControls() {
  const reduced = useVenue((s) => s.reducedMotion);
  const setReduced = useVenue((s) => s.setReducedMotion);
  const entered = useVenue((s) => s.entered);
  const progress = useVenue((s) => s.progress);
  const panelOpen = useVenue((s) => s.activePavilion);

  // Follow the system preference, and keep following it if it changes.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setReduced]);

  const index = useMemo(() => {
    let best = 0;
    NAV_STOPS.forEach((s, i) => {
      if (progress >= s.p - 0.02) best = i;
    });
    return best;
  }, [progress]);

  if (!reduced || !entered || panelOpen) return null;
  const stop = NAV_STOPS[index];

  return (
    <div className="v-guide" role="group" aria-label="Guided walkthrough">
      <button
        type="button"
        className="v-btn"
        onClick={() => scrollToProgress(NAV_STOPS[Math.max(0, index - 1)].p, "auto")}
        disabled={index === 0}
      >
        Back
      </button>
      <span className="v-guide-step">{stop.label}</span>
      <button
        type="button"
        className="v-btn v-btn--primary"
        onClick={() => scrollToProgress(NAV_STOPS[Math.min(NAV_STOPS.length - 1, index + 1)].p, "auto")}
        disabled={index === NAV_STOPS.length - 1}
      >
        Next
      </button>
    </div>
  );
}
