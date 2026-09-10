"use client";
/* eslint-disable react-hooks/set-state-in-effect -- device/source is read once on mount. */
import { useEffect, useRef, useState } from "react";
import { useWorld } from "./store";

/**
 * Baked-cinematic hero (brief §14 hybrid): plays a pre-rendered Unreal/Blender
 * cinematic full-bleed as the World 01 scene, with the interactive chrome layered
 * on top. Drag-to-explore scrubs the shot; light-control grades it; reduced motion
 * holds a frame. If the footage isn't present yet it calls onUnavailable so the
 * caller falls back to the real-time R3F stage.
 *
 * Expected assets (drop-in): `${base}.webm`, `${base}.mp4`, `${base}-mobile.mp4`,
 * poster `${base}.jpg`.
 */
const GRADE = [
  "none",                                             // 0 cool (as graded in-engine)
  "saturate(1.05) sepia(0.18) hue-rotate(-12deg) brightness(1.03)", // 1 warm
  "contrast(1.12) saturate(1.15) brightness(1.08)",  // 2 intense
];

export default function CinematicHero({ base, onUnavailable }: { base: string; onUnavailable?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const explore = useWorld((s) => s.explore);
  const mood = useWorld((s) => s.mood);
  const reduced = useWorld((s) => s.reducedMotion);
  const setLoaded = useWorld((s) => s.setLoaded);
  const [mobile, setMobile] = useState(false);
  const scrubTimer = useRef<number | null>(null);
  const lastExplore = useRef(explore);

  useEffect(() => { setMobile(window.matchMedia("(max-width: 767px)").matches); }, []);

  // drag-to-explore → scrub the cinematic, resume shortly after the drag stops
  useEffect(() => {
    const v = ref.current;
    if (!v || !v.duration || Number.isNaN(v.duration)) return;
    if (explore === lastExplore.current) return;
    lastExplore.current = explore;
    if (reduced) return;
    v.pause();
    v.currentTime = Math.min(v.duration - 0.05, Math.max(0, explore * v.duration));
    if (scrubTimer.current) window.clearTimeout(scrubTimer.current);
    scrubTimer.current = window.setTimeout(() => { v.play().catch(() => {}); }, 500);
  }, [explore, reduced]);

  useEffect(() => {
    const v = ref.current; if (!v) return;
    if (reduced) v.pause(); else v.play().catch(() => {});
  }, [reduced]);

  return (
    <div className="vf-cine" style={{ filter: GRADE[mood] }}>
      <video
        ref={ref}
        className="vf-cine-video"
        poster={`${base}.jpg`}
        muted
        loop
        playsInline
        autoPlay={!reduced}
        preload="auto"
        onLoadedData={() => setLoaded(true)}
        onError={() => onUnavailable?.()}
      >
        {mobile
          ? <source src={`${base}-mobile.mp4`} type="video/mp4" />
          : <>
              <source src={`${base}.webm`} type="video/webm" />
              <source src={`${base}.mp4`} type="video/mp4" />
            </>}
      </video>
    </div>
  );
}
