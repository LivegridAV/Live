import groups from "./groups.json" with { type: "json" };

/**
 * Journey-ordered load groups. Plain data (no browser or React imports) so the
 * Node test runner and build scripts can read it.
 *
 * `switchOnZ` is the camera z at which the group's zone first switches on
 * (its `ZoneGroup` `from + ahead`). The walk heads toward -z, so a group is
 * needed once the camera z is at or below it. `groups.json` is the source of
 * truth; build scripts read it directly.
 *
 * `assets` is the base set every device loads. `variants` lists files loaded
 * only under a condition the venue chooses files by: `mobile` (the store's
 * `isMobile`, the media engine's `mobile` source) and `festival` (the stage
 * show cue's `festival` source). `replaces` maps a variant to the base asset
 * it stands in for on that device; a variant without an entry is additional.
 */
export type LoadGroup = {
  id: string;
  switchOnZ: number;
  assets: readonly string[];
  variants?: Readonly<Record<string, readonly string[]>>;
  replaces?: Readonly<Record<string, string>>;
};

// JSON inference unions the optional fields; the shape is checked by scripts/venue-loading.test.mjs.
export const LOAD_GROUPS = groups as readonly LoadGroup[];
export const START_GROUP = "start";

/**
 * The group whose zone contains `z`: the last group (in journey order) that
 * has switched on by the time the camera reaches `z`. A z in front of every
 * group falls back to the nearest one ahead, the first group.
 */
export function groupForZ(z: number): LoadGroup {
  let found = LOAD_GROUPS[0];
  for (const group of LOAD_GROUPS) {
    if (z <= group.switchOnZ) found = group;
    else break;
  }
  return found;
}

/** The files `group` loads under `conditions` (e.g. `new Set(["mobile"])`). */
export function assetsFor(group: LoadGroup, conditions: ReadonlySet<string>): string[] {
  const extra = Object.entries(group.variants ?? {})
    .filter(([condition]) => conditions.has(condition))
    .flatMap(([, paths]) => paths);
  const replaced = new Set(extra.map(path => group.replaces?.[path]).filter(Boolean));
  return [...group.assets.filter(path => !replaced.has(path)), ...new Set(extra)];
}
