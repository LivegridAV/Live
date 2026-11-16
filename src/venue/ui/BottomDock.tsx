"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * One bottom-centre dock for the controls that used to pin themselves to the
 * same edge independently: a stall's view toolbar sits above the guided
 * Back / Next route instead of on top of it. The dock sizes to its content, so
 * a toolbar that wraps onto two rows on a phone still clears the route.
 *
 * Corner and centre chrome that also lives along the bottom (zone caption,
 * "Explore …" prompt, stage-mode switch, entrance atmosphere bar) is lifted
 * only when it would actually overlap the dock — wide screens keep their
 * authored layout. The lift uses the independent CSS `translate` property, so
 * each control's own `transform` and transitions are untouched.
 */
const AVOID = ".v-hud, .v-prompt, .v-stagemode, [aria-label='Entrance atmosphere']";
const GAP = 10;
type Box = { left: number; right: number; top: number; bottom: number };

export function BottomDock({ children }: { children: ReactNode }) {
  const dock = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const host = dock.current;
      if (!host) return;
      let top = Infinity, left = Infinity, right = -Infinity;
      for (const child of Array.from(host.children) as HTMLElement[]) {
        // Fixed-position children (stall diagnostics) are not part of the dock.
        if (getComputedStyle(child).position === "fixed") continue;
        const r = child.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        top = Math.min(top, r.top); left = Math.min(left, r.left); right = Math.max(right, r.right);
      }
      // Each control's un-lifted box, lowest first. Every placed control
      // becomes an obstacle for the ones above it, so two controls never land
      // on the same line (on phones the zone caption used to sit behind the
      // "Explore …" prompt). Controls that touch nothing keep their authored
      // position.
      const items = Array.from(document.querySelectorAll<HTMLElement>(AVOID))
        .filter(el => !host.contains(el))
        .map((el, order) => {
          const applied = Number(el.dataset.dockLift || 0), r = el.getBoundingClientRect();
          const visible = r.width > 0 && r.height > 0 && Number(getComputedStyle(el).opacity) > 0.05;
          return { el, order, applied, visible, left: r.left, right: r.right, top: r.top + applied, bottom: r.bottom + applied };
        })
        .sort((a, b) => b.bottom - a.bottom || a.order - b.order);
      const obstacles: Box[] = top === Infinity ? [] : [{ left, right, top, bottom: Infinity }];
      for (const item of items) {
        let lift = 0;
        if (item.visible) {
          for (let pass = 0; pass < 6; pass++) {
            const hit = obstacles.find(o => item.right > o.left && item.left < o.right
              && item.bottom - lift > o.top - GAP && item.top - lift < o.bottom + GAP);
            if (!hit) break;
            lift = Math.ceil(item.bottom - (hit.top - GAP));
          }
          obstacles.push({ left: item.left, right: item.right, top: item.top - lift, bottom: item.bottom - lift });
        }
        if (lift !== item.applied) {
          item.el.dataset.dockLift = String(lift);
          item.el.style.translate = lift ? `0 ${-lift}px` : "";
        }
      }
    };
    update();
    const id = window.setInterval(update, 200);
    window.addEventListener("resize", update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", update);
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(AVOID))) {
        delete el.dataset.dockLift;
        el.style.translate = "";
      }
    };
  }, []);

  return <div ref={dock} className="v-dock">{children}</div>;
}
