"use client";
import { useMemo } from "react";
import { useVenue } from "../systems/store";
import { NAV_STOPS, ZONES, zoneAt, zoneLocal } from "../data/zones";
import { scrollToProgress } from "../systems/ScrollRig";
import { PAVILIONS, PARTNER_BAY, PAVILION_RANGE } from "../data/pavilions";

/**
 * The ambient HUD.
 *
 * One zone label, one headline, one supporting line — they fade as the camera
 * leaves a zone and fade back as it enters the next, so the venue narrates
 * itself without ever putting a wall of text over the view. The rail on the
 * right is both a progress indicator and the fastest way to jump.
 */

export function ZoneHud() {
  const progress = useVenue((s) => s.progress);
  const entered = useVenue((s) => s.entered);
  const activePavilion = useVenue((s) => s.activePavilion);

  const zone = useMemo(() => zoneAt(progress), [progress]);
  const local = zoneLocal(progress, zone);
  // Keep the exhibit's name in the visitor's sightline, including the overhead
  // ring shot where a floor-mounted physical placard is necessarily off-camera.
  const galleryTitle = progress < 0.39 ? "Four-sided LED pillars"
    : progress < 0.435 ? "Vertical LED blades"
    : progress < 0.478 ? "Cylindrical LED"
    : progress < 0.515 ? "Suspended LED rings"
    : progress < 0.537 ? "LED bar counter"
    : progress < 0.55 ? "Curved LED"
    : progress < 0.562 ? "Creative LED shapes"
    : "Anamorphic corner LED";

  // Present the moment a zone begins — the arrival headline in particular has
  // to be readable on the very first frame — and fade out as the camera leaves.
  const pastVenue = useVenue((s) => s.pastVenue);
  const opacity =
    entered && !activePavilion && !pastVenue && ![...PAVILIONS, PARTNER_BAY].some(p => Math.abs(progress - p.p) < PAVILION_RANGE * 1.5)
      ? zone.id === "gallery" ? 1 : Math.min(1, Math.min(local + 0.4, 1 - local) / 0.16)
      : 0;

  return (
    <div className="v-hud" data-zone={zone.id} aria-live="polite">
      <div
        className="v-hud-fade"
        style={{ opacity, transform: `translateY(${(1 - opacity) * 10}px)` }}
      >
        <div className="v-hud-zone">
          <span className="v-hud-dot" />
          <span className="v-mono">{zone.label}</span>
        </div>
        <h2 className="v-hud-title">{zone.id === "gallery" ? galleryTitle : zone.title}</h2>
        <p className="v-hud-line">{zone.line}</p>
      </div>
    </div>
  );
}

export function ProgressRail() {
  const progress = useVenue((s) => s.progress);
  const zone = useVenue((s) => s.zone);
  const entered = useVenue((s) => s.entered);
  const pastVenue = useVenue((s) => s.pastVenue);
  if (!entered || pastVenue) return null;

  return (
    <nav className="v-rail" aria-label="Jump to a part of the experience">
      {NAV_STOPS.map((s) => {
        const z = ZONES.find((x) => x.id === s.id);
        const active =
          zone === s.id ||
          (z ? progress >= z.range[0] && progress < z.range[1] : false);
        return (
          <button
            key={s.id}
            type="button"
            className="v-rail-stop"
            aria-label={s.label}
            data-active={active ? "true" : "false"}
            onClick={() => scrollToProgress(s.p)}
            aria-current={active ? "true" : undefined}
          >
            <span className="v-rail-label">{s.label}</span>
            <span className="v-rail-tick" />
          </button>
        );
      })}
    </nav>
  );
}

export function ScrollCue() {
  const progress = useVenue((s) => s.progress);
  const entered = useVenue((s) => s.entered);
  const reduced = useVenue((s) => s.reducedMotion);
  const show = entered && !reduced && progress < 0.035;
  return (
    <div className="v-scrollcue" style={{ opacity: show ? 1 : 0 }} aria-hidden="true">
      <span className="v-mono">Scroll to enter</span>
      <span className="v-scrollcue-rail" />
    </div>
  );
}
