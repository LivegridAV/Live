/**
 * Opening planner. Pure logic, no browser or React imports.
 *
 * Decides which load groups must be ready before the venue opens, given the
 * measured bandwidth: a group may stream in after opening only if its
 * download, queued behind the groups ahead of it, finishes a safety margin
 * before a visitor walking from the start reaches it.
 */
export const WALK_PACE_MPS = 6;
export const SAFETY_MARGIN_S = 4;

type SizedGroup = { id: string; switchOnZ: number; bytes: number };

export function groupsBeforeOpening(input: {
  bytesPerSecond: number;
  groups: readonly SizedGroup[];
  startZ: number;
  paceMps?: number;
  marginS?: number;
}): string[] {
  const { bytesPerSecond, groups, startZ, paceMps = WALK_PACE_MPS, marginS = SAFETY_MARGIN_S } = input;
  if (groups.length === 0) return [];
  // The first group is always loaded before opening.
  let loadedThrough = 0;
  // Downloads after opening run sequentially, starting with the group after
  // `loadedThrough`. The first group that would arrive late is pulled into
  // the pre-opening list together with everything before it, and the rest
  // are checked again with the queue now starting after it.
  for (let start = 1; start < groups.length;) {
    let elapsed = 0;
    let late = -1;
    for (let j = start; j < groups.length; j++) {
      elapsed += groups[j].bytes / bytesPerSecond;
      const reachedAt = (startZ - groups[j].switchOnZ) / paceMps;
      if (elapsed + marginS > reachedAt) { late = j; break; }
    }
    if (late < 0) break;
    loadedThrough = late;
    start = late + 1;
  }
  return groups.slice(0, loadedThrough + 1).map(g => g.id);
}

/**
 * The next group to download: `priority` if it is a known group that is
 * neither ready nor in flight, otherwise the first such group in order.
 */
export function nextToFetch(
  groups: readonly { id: string }[],
  ready: ReadonlySet<string>,
  inFlight: ReadonlySet<string>,
  priority?: string,
): string | undefined {
  const pending = (id: string) => !ready.has(id) && !inFlight.has(id);
  if (priority !== undefined && groups.some(g => g.id === priority) && pending(priority)) return priority;
  return groups.find(g => pending(g.id))?.id;
}
