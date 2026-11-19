"use client";
import { useEffect } from "react";
import { useVenue } from "../systems/store";

/**
 * The start of the walkthrough.
 *
 * There is no splash page and no door: the venue opens by itself the moment
 * its shaders are ready. Until then only a hairline progress bar runs across
 * the top of the screen. Scrolling stays held while the scene prepares, so
 * the journey always starts from the first frame of the path.
 */
export function Loader() {
  const loaded = useVenue((s) => s.loaded);
  const percent = useVenue((s) => s.loadPercent);
  const entered = useVenue((s) => s.entered);
  const enter = useVenue((s) => s.enter);

  useEffect(() => {
    if (loaded && !entered) enter();
  }, [loaded, entered, enter]);

  // Hold the page still until the scene is ready. The browser's own scroll
  // restoration would otherwise drop a returning visitor into the middle of
  // the venue, so the walkthrough always starts at the entrance.
  useEffect(() => {
    if (entered) return;
    const prevRestore = history.scrollRestoration;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = prev;
      if ("scrollRestoration" in history) history.scrollRestoration = prevRestore;
    };
  }, [entered]);

  if (entered) return null;
  return <LoadingRoom percent={percent} />;
}

/**
 * The dark room before the first frame: the venue's own background colour
 * (so the written article below never flashes through) and a hairline bar.
 */
export function LoadingRoom({ percent }: { percent: number }) {
  return (
    <div
      data-venue-loading=""
      role="progressbar"
      aria-label="Loading the venue"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent * 100)}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "#05090a" }}
    >
      <div style={{ position: "absolute", inset: "0 0 auto 0", height: 2, background: "rgba(63,214,200,.12)" }}>
        <div
          style={{
            height: "100%", background: "#3FD6C8", boxShadow: "0 0 8px #3FD6C8",
            transformOrigin: "left", transform: `scaleX(${Math.max(0.02, percent)})`, transition: "transform .4s ease-out",
          }}
        />
      </div>
    </div>
  );
}
