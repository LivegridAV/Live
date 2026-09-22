"use client";
import { useEffect, useState } from "react";
import { useVenue } from "../systems/store";

/**
 * The loader.
 *
 * Not a spinner: the brand mark powering on, an honest percentage (it tracks
 * shader compilation, which is the real cost), and a door to walk through.
 * Scrolling stays locked until the visitor chooses to enter, so the journey
 * always starts from the first frame of the path.
 */

const HEIGHTS = [2, 4, 3, 5, 4];

function SignalMark({ percent }: { percent: number }) {
  return (
    <div className="v-loader-mark" aria-hidden="true">
      {Array.from({ length: 25 }, (_, i) => {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const lit = 5 - row <= HEIGHTS[col];
        const order = col + (4 - row);
        // Cells light in the same diagonal sweep as the logo, gated by progress.
        const revealed = lit && percent >= (order / 8) * 0.85;
        return (
          <span
            key={i}
            className="v-loader-cell"
            data-on={revealed ? "true" : "false"}
            style={revealed ? { animationDelay: `${order * 0.13}s` } : undefined}
          />
        );
      })}
    </div>
  );
}

export function Loader() {
  const loaded = useVenue((s) => s.loaded);
  const percent = useVenue((s) => s.loadPercent);
  const entered = useVenue((s) => s.entered);
  const enter = useVenue((s) => s.enter);
  const [shown, setShown] = useState(0);

  // Ease the number upward so it never jumps, and never shows 100 before it is.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      setShown((v) => v + (percent - v) * 0.12);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  // Hold the page still until the visitor steps inside. The browser's own
  // scroll restoration would otherwise drop a returning visitor into the middle
  // of the venue behind the loader, so the walkthrough always starts at the
  // entrance.
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

  const pct = Math.round(Math.min(shown, percent) * 100);

  return (
    <div className="v-loader" data-done={entered ? "true" : "false"} aria-hidden={entered}>
      <div className="v-loader-inner">
        <SignalMark percent={percent} />
        <p className="v-loader-word">
          livegrid<span>AV</span>
        </p>
        <p className="v-mono">Preparing the experience</p>
        <div className="v-loader-bar">
          <div className="v-loader-fill" style={{ transform: `scaleX(${Math.max(0.02, percent)})` }} />
        </div>
        <p className="v-mono">Loading experience {pct}%</p>

        {loaded ? (
          <div className="v-loader-enter">
            <button type="button" className="v-btn v-btn--primary" onClick={enter} autoFocus>
              Enter the experience
            </button>
          </div>
        ) : null}

        <p className="v-loader-note">
          A walkthrough of a live event experience — entrance, immersive LED
          tunnel, creative gallery, what we do and a transformable main stage.
          Scroll to move through it.
        </p>
      </div>
    </div>
  );
}
