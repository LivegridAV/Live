"use client";
import { useCallback, useEffect, useRef } from "react";
import { journey } from "./journey";
import { useVenue } from "./store";
import { zoneAt } from "../data/zones";
import { BASE_SCROLL_VH, SCROLL_PLAN_VH, createSample, progressToScrollFraction, samplePath, scrollFractionToProgress } from "../data/path";
import { prioritizeZ } from "../loading/stream";
import { stallAtProgress } from "../data/stallVisits";

/**
 * Scroll → journey.
 *
 * Native scrolling is deliberate: it keeps momentum, trackpads, touch and
 * keyboard exactly as the visitor's device does them, and it lets an open
 * detail panel scroll its own content without fighting a hijacked wheel. The
 * cinematic feel comes from damping the camera toward the scroll position
 * rather than from taking the scroll over.
 */

/**
 * How many viewport heights the whole walkthrough occupies: the camera path's
 * scroll plan (path.ts), which gives each move enough scrolling to stay
 * comfortable. Phones keep the same proportions, a little shorter.
 */
const SCROLL_VH_DESKTOP = SCROLL_PLAN_VH;
const SCROLL_VH_MOBILE = SCROLL_PLAN_VH * 11 / BASE_SCROLL_VH;

/**
 * The walkthrough is measured against its own scroll track, not the document.
 * The crawlable content below the venue is part of the page but not part of
 * the journey — measuring against `document.scrollHeight` would spend the
 * finale and the contact zone underneath an article the visitor cannot see.
 */
export const TRACK_ATTR = "data-venue-track";

function trackRange() {
  const el = document.querySelector<HTMLElement>(`[${TRACK_ATTR}]`);
  const height = el ? el.offsetHeight : document.documentElement.scrollHeight;
  return Math.max(1, height - window.innerHeight);
}

export function useScrollHeight() {
  const isMobile = useVenue((s) => s.isMobile);
  return isMobile ? SCROLL_VH_MOBILE : SCROLL_VH_DESKTOP;
}

/** Drives `journey` from window scroll. Rendered once, outside the canvas. */
export function ScrollRig() {
  const setZone = useVenue((s) => s.setZone);
  const setProgress = useVenue((s) => s.setProgress);
  const setPastVenue = useVenue((s) => s.setPastVenue);
  const reduced = useVenue((s) => s.reducedMotion);
  const lastPublish = useRef(0);
  const lastProgress = useRef(0);
  const raf = useRef(0);
  const prevT = useRef(0);

  const read = useCallback(() => {
    if (useVenue.getState().stallVisit) return;
    journey.target = scrollFractionToProgress(window.scrollY / trackRange());
  }, []);

  useEffect(() => {
    read();
    let resizeFrame=0,resizing=false;
    const onScroll = () => {
      if (!journey.locked&&!resizing) read();
    };
    const onResize=()=>{
      const current=journey.target,state=useVenue.getState();
      if(!state.entered||(state.pastVenue&&!state.stallVisit)){read();return;}
      resizing=true;cancelAnimationFrame(resizeFrame);
      resizeFrame=requestAnimationFrame(()=>{
        // A visit locks manual scrolling, but its document anchor must still
        // follow the new viewport height or the HUD mistakes it for an article.
        window.scrollTo({top:progressToScroll(current),behavior:"instant"});
        resizing=false;read();
      });
    };
    const onPointer = (e: PointerEvent) => {
      journey.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      journey.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [read]);

  // Damping loop. Runs outside the R3F frame loop so scroll still tracks while
  // the canvas is paused (reduced motion, background tab recovery).
  useEffect(() => {
    const tick = (t: number) => {
      raf.current = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (t - (prevT.current || t)) / 1000);
      prevT.current = t;

      const prev = journey.progress;
      // A softer follow in reduced-motion mode: the camera arrives, it just
      // doesn't swoop.
      const k = reduced ? 9 : 3.4;
      journey.progress += (journey.target - journey.progress) * Math.min(1, dt * k);
      const delta = journey.progress - prev;
      journey.velocity = dt > 0 ? delta / dt : 0;
      journey.idle = Math.abs(delta) > 1e-5 ? 0 : journey.idle + dt;

      // Publish to React sparingly — the HUD only needs a readable number.
      const now = t / 1000;
      if (now - lastPublish.current > 0.1 || Math.abs(journey.progress - lastProgress.current) > 0.004) {
        lastPublish.current = now;
        lastProgress.current = journey.progress;
        setProgress(journey.progress, journey.velocity);
        setZone(zoneAt(journey.progress).id);
        // Once the written content is on screen the venue chrome would be
        // floating over an article, so it stands down.
        setPastVenue(!useVenue.getState().stallVisit&&window.scrollY > trackRange() + window.innerHeight * 0.25);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [reduced, setProgress, setZone, setPastVenue]);

  return null;
}

const target = createSample();

/**
 * Scroll the page so the journey lands on `p` (0 → 1). Every jump (the nav,
 * the progress rail, the guide, review links) first moves the load group at
 * the destination to the front of the streaming queue.
 */
export function scrollToProgress(p: number, behavior: ScrollBehavior = "smooth") {
  // The stall at the destination names its own group (side-by-side stalls share a z range).
  prioritizeZ(samplePath(p, target).pos.z, stallAtProgress(p));
  window.scrollTo({ top: progressToScroll(p), behavior });
}

/** Where on the page is progress `p`, in pixels. */
export function progressToScroll(p: number) {
  return progressToScrollFraction(p) * trackRange();
}
