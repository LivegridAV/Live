"use client";
import { useEffect, useRef, useState } from "react";
import { audio } from "../audio";
import { useExperience } from "../store";

/**
 * The opening: silence, darkness, one small pulse.
 * Mouse movement stirs a faint energy halo; a single click powers the
 * whole venue on. Nothing autoplays — the visitor starts the show.
 */

const BOOT_LINES = [
  "MAINS ONLINE",
  "LED PROCESSORS · SYNC LOCKED",
  "MOVING HEADS · HOMED",
  "HAZE · FLOWING",
  "SHOW CONTROL · READY",
];

export default function PowerIntro() {
  const powered = useExperience((s) => s.powered);
  const booted = useExperience((s) => s.booted);
  const powerOn = useExperience((s) => s.powerOn);
  const finishBoot = useExperience((s) => s.finishBoot);
  const [line, setLine] = useState(-1);
  const [hidden, setHidden] = useState(false);
  const halo = useRef<HTMLDivElement>(null);

  // pre-boot: the halo follows the cursor like static charge
  useEffect(() => {
    if (powered) return;
    const onMove = (e: PointerEvent) => {
      if (halo.current) {
        halo.current.style.transform = `translate(${e.clientX - 250}px, ${e.clientY - 250}px)`;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [powered]);

  // boot sequence after the click
  useEffect(() => {
    if (!powered) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_LINES.forEach((_, i) =>
      timers.push(setTimeout(() => setLine(i), 500 + i * 480)),
    );
    timers.push(
      setTimeout(() => finishBoot(), 3300),
      setTimeout(() => setHidden(true), 4300),
    );
    return () => timers.forEach(clearTimeout);
  }, [powered, finishBoot]);

  if (hidden) return null;

  const activate = () => {
    if (powered) return;
    audio.init();
    audio.powerOn();
    audio.startHum();
    powerOn();
  };

  return (
    <div
      className={`lg-intro ${powered ? "is-powering" : ""} ${booted ? "is-done" : ""}`}
      onClick={activate}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && activate()}
      role="button"
      tabIndex={0}
      aria-label="Power on the LiveGridAV experience"
    >
      {!powered && (
        <>
          <div ref={halo} className="lg-intro-halo" aria-hidden />
          <div className="lg-intro-center">
            <span className="lg-intro-pulse" aria-hidden />
            <p className="lg-intro-hint">click to power on</p>
            <p className="lg-intro-brand">
              livegrid<span>AV</span>
            </p>
          </div>
          <a
            className="lg-intro-skip"
            href="/?classic"
            onClick={(e) => e.stopPropagation()}
          >
            skip · classic site
          </a>
        </>
      )}
      {powered && (
        <div className="lg-intro-boot" aria-live="polite">
          {BOOT_LINES.map((l, i) => (
            <p key={l} className={i <= line ? "is-on" : ""}>
              <span aria-hidden>▮ </span>
              {l}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
