"use client";
/* eslint-disable react-hooks/set-state-in-effect -- capability + quality are read
   once on mount; a single sync setState there is intentional. */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useWorld, detectQuality, type Quality } from "./store";
import Chrome from "./ui/Chrome";
import CinematicHero from "./CinematicHero";

const Stage = dynamic(() => import("./Stage"), { ssr: false, loading: () => null });

// Baked cinematic per world (drop Unreal renders here to override the real-time scene).
const CINEMATICS: Record<number, string> = { 0: "/videos/anamorphic-hero" };

export default function Experience() {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [quality, setQ] = useState<Quality>("high");
  const loaded = useWorld((s) => s.loaded);
  const world = useWorld((s) => s.world);
  const setQuality = useWorld((s) => s.setQuality);
  const setReduced = useWorld((s) => s.setReducedMotion);
  const [cineAvail, setCineAvail] = useState<Record<number, boolean>>({});
  const cine = CINEMATICS[world];
  const showCine = !!cine && cineAvail[world] === true;

  // Only mount the cinematic once its footage actually exists (auto-activates when
  // the Unreal render is dropped at the path). Avoids covering the R3F fallback.
  useEffect(() => {
    if (!cine || cineAvail[world] !== undefined) return;
    let ok = true;
    fetch(`${cine}.mp4`, { method: "HEAD" })
      .then((r) => { if (ok) setCineAvail((m) => ({ ...m, [world]: r.ok })); })
      .catch(() => { if (ok) setCineAvail((m) => ({ ...m, [world]: false })); });
    return () => { ok = false; };
  }, [cine, world, cineAvail]);

  useEffect(() => {
    let ok = false;
    try { const c = document.createElement("canvas"); ok = !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { ok = false; }
    const q = detectQuality();
    setQ(q); setQuality(q);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setWebgl(ok);
  }, [setQuality, setReduced]);

  return (
    <div className="vf-root">
      {/* CSS venue (first paint + no-WebGL fallback, brief §9/§32) */}
      <div className="vf-fallback" aria-hidden />
      {webgl && <Stage quality={quality} />}
      {showCine && (
        <CinematicHero base={cine} onUnavailable={() => setCineAvail((m) => ({ ...m, [world]: false }))} />
      )}
      {webgl === false && <NoWebGL />}

      {/* loading show (brief §23) */}
      {webgl && !loaded && (
        <div className="vf-loader" role="status" aria-label="Loading experience">
          <div className="vf-loader-grid">{Array.from({ length: 25 }, (_, i) => <span key={i} style={{ animationDelay: `${((i % 5) + (4 - Math.floor(i / 5))) * 90}ms` }} />)}</div>
          <p>POWERING THE STAGE</p>
        </div>
      )}

      {webgl && <Chrome />}
    </div>
  );
}

function NoWebGL() {
  return (
    <div className="vf-nowebgl">
      <h1>WE TURN IDEAS INTO<br /><span className="vf-accent-text">UNFORGETTABLE EXPERIENCES</span></h1>
      <p>Immersive LED, anamorphic content, live production and 360° installations.</p>
      <Link href="/contact" className="vf-cta">START A PROJECT <span aria-hidden>→</span></Link>
    </div>
  );
}
