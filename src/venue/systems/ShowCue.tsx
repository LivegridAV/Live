"use client";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useMedia } from "../media/MediaContext";
import { useVenue } from "./store";
import { show } from "./journey";

/**
 * The stage mode transition, run as a show cue.
 *
 * Pressing the switch does not swap a texture. It starts a two-second cue:
 * the rig dips, and at the bottom of the dip — when the screens are dark and
 * nothing can be seen changing — the new content package is loaded. The room
 * then comes back up with different visuals, different lighting and the
 * movers in new positions. That is how a real show changes look, and it is
 * the difference between a website toggling a value and a venue taking a cue.
 */
const CUE_SECONDS = 2.1;

export function ShowCue() {
  const engine = useMedia();
  const stageMode = useVenue((s) => s.stageMode);
  const applied = useRef<"corporate" | "festival">("corporate");

  useEffect(() => {
    const target = stageMode === "festival" ? 1 : 0;
    if (target === show.target) return;
    show.target = target;
    show.t = 0;
  }, [stageMode]);

  useFrame((_, dt) => {
    if (show.t >= 1) {
      show.cue = 0;
      show.mode += (show.target - show.mode) * Math.min(1, dt * 6);
      return;
    }

    show.t = Math.min(1, show.t + dt / CUE_SECONDS);

    // A dip that is quick to fall and slower to recover — the shape a lighting
    // operator would program, and the reason the swap is invisible.
    const t = show.t;
    show.cue = t < 0.34 ? Math.sin((t / 0.34) * Math.PI * 0.5) : Math.pow(1 - (t - 0.34) / 0.66, 1.6);

    // Content changes at the bottom, never in view.
    const wantFestival = show.target > 0.5;
    const want = wantFestival ? "festival" : "corporate";
    if (t >= 0.34 && applied.current !== want) {
      applied.current = want;
      engine.setMode(want);
    }

    // Colour and fixture behaviour cross a little after the content, so the
    // room appears to respond to the new look rather than anticipate it.
    const blend = Math.min(1, Math.max(0, (t - 0.38) / 0.34));
    const from = show.target > 0.5 ? 0 : 1;
    show.mode = from + (show.target - from) * (blend * blend * (3 - 2 * blend));
  });

  return null;
}
