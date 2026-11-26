"use client";
import { useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { START_GROUP } from "./groups";
import { liteBeforeOpening, openingLitePacks } from "./plan";
import { journeyStartZ } from "../data/path";
import { useVenue } from "../systems/store";
import {
  downloadedBytes, groupFailed, openingSet, planOpening, plannerGroups, streamBandwidth,
} from "./stream";

/**
 * The opening plan, read once per frame by the venue's warm-up (Scene.tsx).
 *
 * Owner decision 3, open early and fill in: the venue opens once the start
 * group is warm and every later group's light pack is warm (the "all lite"
 * rule, see below); on a phone, once the light packs a walker reaches first
 * are warm. Full groups never hold the opening; they stream in
 * afterwards and sharpen each zone. Review, capture and inspection modes
 * (`full`) wait for every full group instead.
 *
 * If the manifest could not be loaded there is no light pack to fetch:
 * stream.ts then requires each later group's full version instead.
 */
export function useOpeningPlan(full: boolean) {
  const get = useThree(state => state.get);
  const state = useRef({ planned: false, bar: 0, at: -Infinity });
  return useMemo(() => ({
    /** True while the opening set is still arriving or warming; also advances the bar (0–0.85). */
    waiting(now: number): boolean {
      const current = state.current;
      const venue = useVenue.getState();
      if (!current.planned && venue.readyGroups.includes(START_GROUP)) {
        const groups = plannerGroups();
        if (groups) {
          const bytesPerSecond = streamBandwidth();
          // The visitor starts walking at the journey's p = 0 camera (with the
          // portrait push-back on narrow frames), whatever this frame's camera is.
          const { size } = get();
          const startZ = journeyStartZ(size.width / Math.max(1, size.height));
          const later = groups.filter(g => g.id !== START_GROUP);
          // The "all lite" rule (Task 6b fix round 1): computers and tablets
          // open with every later group's light pack (~7.4 MiB), so even a
          // jump straight to the far end right after opening never meets
          // empty space. Phones open with the walk-pace minimum (owner
          // decision, Nov 2026): preparing every zone's shaders first cost a
          // phone about 4.5 s of its opening; the rest stream in behind.
          const walkMinimum = liteBeforeOpening({ bytesPerSecond, groups: later, startZ });
          const lite = openingLitePacks({
            later: later.map(g => g.id), walkMinimum, phone: venue.isPhone,
            override: new URLSearchParams(location.search).get("opening"),
          });
          const plan = full ? { full: groups.map(g => g.id), lite: [] } : { full: [START_GROUP], lite };
          current.planned = true;
          planOpening(plan);
          if (new URLSearchParams(location.search).has("perf")) {
            const set = openingSet();
            console.info(`[venue] opening with ${set?.full.join(", ")}${set?.lite.length ? ` and the light packs of ${set.lite.join(", ")}` : ""} (${Math.round(bytesPerSecond / 1000)} kB/s, start z ${startZ.toFixed(1)}; walk-pace minimum would be ${walkMinimum.join(", ") || "none"})`);
          }
        }
      }
      const set = current.planned ? openingSet() : null;
      const fullIds = set?.full ?? [START_GROUP];
      const liteIds = set?.lite ?? [];
      const waiting = !set
        || fullIds.some(id => id !== START_GROUP && !venue.warmGroups.includes(id) && !groupFailed(id))
        || liteIds.some(id => !venue.liteWarmGroups.includes(id) && !venue.warmGroups.includes(id));
      // 0–0.85: bytes of the opening set (start, and the required light
      // packs). Never moves backwards, even when the set grows (a failed
      // light pack makes its full group required).
      if (waiting && now - current.at > 250) {
        current.at = now;
        const groups = plannerGroups();
        const expected = (groups ?? []).reduce((sum, g) =>
          sum + (fullIds.includes(g.id) ? g.bytes : 0) + (liteIds.includes(g.id) ? g.liteBytes : 0), 0);
        const fraction = expected > 0 ? Math.min(1, downloadedBytes(fullIds, liteIds) / expected) : 0;
        current.bar = Math.max(current.bar, fraction * 0.85);
      }
      return waiting;
    },
    /** The bar's download part so far (0–0.85). */
    bar: () => state.current.bar,
  }), [full, get]);
}
