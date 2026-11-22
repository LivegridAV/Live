/**
 * Background streamer for the venue's load groups. Pure queue and retry logic:
 * no React, three or DOM imports, so the Node test runner drives it with a
 * fake `fetchGroup`, a fake clock and mocked timers.
 *
 * Policy:
 * - The groups come from the build's byte manifest, in journey order.
 * - The first group (`start`) downloads alone: the opening decision measures
 *   bandwidth while it arrives, and nothing should compete with it.
 * - After it, at most `MAX_IN_FLIGHT` groups download at once, the
 *   prioritized group first, otherwise in journey order.
 * - A failed group is retried after 1 s, 3 s and 9 s. After the fourth
 *   failure it is reported failed and is not retried on its own (its zone
 *   keeps the lite pack). Prioritizing a failed group, i.e. a visitor jumping
 *   to it, arms it again.
 */
export const MAX_IN_FLIGHT = 2;
export const RETRY_DELAYS_MS: readonly number[] = [1000, 3000, 9000];

export type ManifestGroup = {
  id: string;
  bytes: number;
  bytesByCondition?: Readonly<Record<string, number>>;
  lite?: readonly string[];
};
/** `lod1`: the build's simplified models for the medium and low tiers (see modelVariants.ts). */
export type LoadManifest = { groups: readonly ManifestGroup[]; lod1?: readonly string[]; ktx2Media?: readonly string[] };

/** One finished download: its bytes and when it ran, in the `now()` time base (ms). */
export type FetchSample = { bytes: number; startMs: number; endMs: number };

export type StreamHandle = {
  /** Move `id` to the front of the queue (last call wins). */
  prioritize(id: string): void;
  /** Bytes per second over every finished fetch; 0 until one has finished. */
  bandwidth(): number;
  /** Stop starting fetches and cancel pending retries. */
  stop(): void;
};

type State = "pending" | "inflight" | "waiting" | "ready" | "failed";

export function startStreaming(opts: {
  manifestUrl: string;
  fetchGroup: (id: string) => Promise<void>;
  now?: () => number;
  /**
   * Measures a finished fetch, e.g. from Resource Timing. Returning undefined
   * falls back to the manifest bytes over the time `fetchGroup` took.
   */
  measure?: (id: string, startMs: number, endMs: number) => FetchSample | undefined;
  /** Group ids to stream if the manifest cannot be loaded (bytes then count as 0). */
  fallbackIds?: readonly string[];
  onManifest?: (manifest: LoadManifest) => void;
  onReady?: (id: string) => void;
  onRetry?: (id: string, attempt: number, delayMs: number, error: unknown) => void;
  onFailed?: (id: string, error: unknown) => void;
}): StreamHandle {
  const now = opts.now ?? (() => globalThis.performance?.now?.() ?? Date.now());
  const state = new Map<string, State>();
  const failures = new Map<string, number>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const samples: FetchSample[] = [];
  let ids: string[] = [];
  let bytes = new Map<string, number>();
  let priority: string | undefined;
  let stopped = false;

  const later = (ms: number, run: () => void) => {
    const timer = setTimeout(() => { timers.delete(timer); if (!stopped) run(); }, ms);
    timers.add(timer);
  };
  const inFlight = () => ids.filter(id => state.get(id) === "inflight").length;
  const pick = () => {
    const free = (id: string) => state.get(id) === "pending";
    if (priority !== undefined && free(priority)) return priority;
    return ids.find(free);
  };

  function pump() {
    if (stopped || ids.length === 0) return;
    const first = ids[0];
    if (state.get(first) !== "ready") {
      if (state.get(first) === "pending") launch(first);
      return;
    }
    for (let next = pick(); next !== undefined && inFlight() < MAX_IN_FLIGHT; next = pick()) launch(next);
  }

  function launch(id: string) {
    state.set(id, "inflight");
    const startMs = now();
    let request: Promise<void>;
    try { request = opts.fetchGroup(id); } catch (error) { request = Promise.reject(error); }
    request.then(() => {
      if (stopped) return;
      const endMs = now();
      samples.push(opts.measure?.(id, startMs, endMs) ?? { bytes: bytes.get(id) ?? 0, startMs, endMs });
      state.set(id, "ready");
      if (priority === id) priority = undefined;
      opts.onReady?.(id);
      pump();
    }, error => {
      if (stopped) return;
      const attempt = (failures.get(id) ?? 0) + 1;
      failures.set(id, attempt);
      const delay = RETRY_DELAYS_MS[attempt - 1];
      if (delay === undefined) {
        state.set(id, "failed");
        if (priority === id) priority = undefined;
        opts.onFailed?.(id, error);
      } else {
        state.set(id, "waiting");
        opts.onRetry?.(id, attempt, delay, error);
        later(delay, () => { if (state.get(id) === "waiting") { state.set(id, "pending"); pump(); } });
      }
      pump();
    });
  }

  function adoptManifest(manifest: LoadManifest) {
    ids = manifest.groups.map(group => group.id);
    bytes = new Map(manifest.groups.map(group => [group.id, group.bytes]));
    for (const id of ids) state.set(id, "pending");
    opts.onManifest?.(manifest);
    pump();
  }

  async function loadManifest(attempt: number): Promise<void> {
    try {
      const response = await fetch(opts.manifestUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json() as LoadManifest;
      if (!stopped) adoptManifest(manifest);
    } catch (error) {
      if (stopped) return;
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay !== undefined) {
        opts.onRetry?.("manifest", attempt + 1, delay, error);
        later(delay, () => void loadManifest(attempt + 1));
        return;
      }
      opts.onFailed?.("manifest", error);
      if (opts.fallbackIds?.length) adoptManifest({ groups: opts.fallbackIds.map(id => ({ id, bytes: 0 })) });
    }
  }
  void loadManifest(0);

  return {
    prioritize(id) {
      if (stopped) return;
      priority = id;
      if (state.get(id) === "failed") { failures.set(id, 0); state.set(id, "pending"); }
      pump();
    },
    bandwidth() {
      if (samples.length === 0) return 0;
      const total = samples.reduce((sum, sample) => sum + sample.bytes, 0);
      // Time during which at least one finished fetch was running (union of intervals).
      const spans = samples.map(s => [s.startMs, Math.max(s.startMs, s.endMs)]).sort((a, b) => a[0] - b[0]);
      let busy = 0, from = spans[0][0], to = spans[0][1];
      for (const [start, end] of spans.slice(1)) {
        if (start > to) { busy += to - from; from = start; to = end; } else to = Math.max(to, end);
      }
      busy += to - from;
      if (busy <= 0) return total > 0 ? Infinity : 0;
      return total / (busy / 1000);
    },
    stop() {
      stopped = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    },
  };
}
