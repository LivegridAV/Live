import groups from "./groups.json" with { type: "json" };

/**
 * Journey-ordered load groups. Plain data (no browser or React imports) so the
 * Node test runner and build scripts can read it.
 *
 * `switchOnZ` is the camera z at which the group's zone first switches on
 * (its `ZoneGroup` `from + ahead`). The walk heads toward -z, so a group is
 * needed once the camera z is at or below it. `groups.json` is the source of
 * truth; build scripts read it directly.
 */
export type LoadGroup = { id: string; switchOnZ: number; assets: readonly string[] };

export const LOAD_GROUPS: readonly LoadGroup[] = groups;
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
