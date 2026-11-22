/**
 * Background streamer for the venue's load groups. Pure queue and retry logic:
 * no React, three or DOM imports, so the Node test runner drives it with a
 * fake `fetchGroup`, a fake clock and mocked timers.
 *
 * Policy:
 * - The queue comes from the build's byte manifest: its groups in journey
 *   order, or the items `items` derives from it (the venue queues each
 *   group's light pack ahead of the full groups).
 * - The first group (`start`) downloads alone: the opening decision measures
 *   bandwidth while it arrives, and nothing should compete with it.
 * - After it, at most `MAX_IN_FLIGHT` items download at once, the
 *   prioritized items first (in the order given), otherwise in queue order.
 *   Prioritizing never cancels a running download.
 * - A failed group is retried after 1 s, 3 s and 9 s. After the fourth
 *   failure it is reported failed and is not retried on its own (its zone
 *   keeps the lite pack). Prioritizing a failed group, i.e. a visitor jumping
 *   to it, arms it again.
 * - A held group does not start until it is released (the venue holds the
 *   later groups until the opening plan is known, and the groups that stream
 *   after opening until the venue has opened).
 * - A dropped item is never started (a light pack whose full group is
 *   already in memory).
 * - A download that has not settled within `itemTimeoutMs` (sized to its
 *   bytes and the measured bandwidth, with a generous floor) counts as a
 *   failure: it frees its slot and enters the same 1/3/9 s retries. Its
 *   late result, if it ever settles, is ignored.
 */
export const MAX_IN_FLIGHT = 2;
export const RETRY_DELAYS_MS: readonly number[] = [1000, 3000, 9000];

/** No item times out sooner than this (ms): parsing and warming a group take main-thread time too. */
export const TIMEOUT_FLOOR_MS = 60_000;
/** The timeout allows this many times the expected download time. */
export const TIMEOUT_SLACK = 4;
/**
 * Bytes per second assumed when nothing has been measured yet (400 kbit/s,
 * a fifth of the Slow 4G profile in scripts/measure-venue.mjs).
 */
export const TIMEOUT_ASSUMED_BPS = 50_000;
/**
 * A measured bandwidth above this (4 Mbit/s, twice Slow 4G) is not trusted
 * for the timeout: cached files make Resource Timing report far more than the
 * network gives. So a healthy Slow 4G download always has at least twice its
 * time, even when the estimate is wildly optimistic.
 */
export const TIMEOUT_MAX_BPS = 500_000;
/** Bytes assumed for an item whose size is unknown (the manifest failed to load). */
export const TIMEOUT_UNKNOWN_BYTES = 32 * 2 ** 20;

/**
 * How long an item of `bytes` may run before it counts as hung: the slack
 * times its expected time at `bandwidth` (bytes per second, 0 when unknown)
 * shared with `share` concurrent downloads, never under the floor.
 */
export function itemTimeoutMs(bytes: number, bandwidth: number, share = MAX_IN_FLIGHT): number {
  const size = bytes > 0 ? bytes : TIMEOUT_UNKNOWN_BYTES;
  const bps = bandwidth > 0 && Number.isFinite(bandwidth) ? Math.min(bandwidth, TIMEOUT_MAX_BPS) : TIMEOUT_ASSUMED_BPS;
  return Math.max(TIMEOUT_FLOOR_MS, Math.ceil(TIMEOUT_SLACK * share * size / bps * 1000));
}

/** The error a download that ran past its timeout fails with. */
export class ItemTimeoutError extends Error {
  readonly item: string;
  readonly timeoutMs: number;
  constructor(item: string, timeoutMs: number) {
    super(`${item} did not finish within ${Math.round(timeoutMs / 1000)} s`);
    this.name = "ItemTimeoutError";
    this.item = item;
    this.timeoutMs = timeoutMs;
  }
}
export const isItemTimeout = (error: unknown): error is ItemTimeoutError =>
  error instanceof Error && error.name === "ItemTimeoutError";

export type ManifestGroup = {
  id: string;
  bytes: number;
  bytesByCondition?: Readonly<Record<string, number>>;
  lite?: readonly string[];
  /** Summed size of `lite` (bytes). */
  liteBytes?: number;
};
/** `lod1`: the build's simplified models for the medium and low tiers (see modelVariants.ts). */
export type LoadManifest = { groups: readonly ManifestGroup[]; lod1?: readonly string[]; ktx2Media?: readonly string[] };

/** One finished download: its bytes and when it ran, in the `now()` time base (ms). */
export type FetchSample = { bytes: number; startMs: number; endMs: number };

export type StreamHandle = {
  /** Move `ids` (in this order) to the front of the queue (last call wins). */
  prioritize(ids: string | readonly string[]): void;
  /** Bytes per second over every finished fetch; 0 until one has finished. */
  bandwidth(): number;
  /** Do not start these groups until they are released (a running fetch is not affected). */
  hold(ids: readonly string[]): void;
  /** Let held groups start again. */
  release(ids: readonly string[]): void;
  /** Never start these items (a running fetch is not affected). */
  drop(ids: readonly string[]): void;
  /** Stop starting fetches and cancel pending retries. */
  stop(): void;
};

type State = "pending" | "inflight" | "waiting" | "ready" | "failed" | "dropped";
export type QueueItem = { id: string; bytes: number };

export function startStreaming(opts: {
  manifestUrl: string;
  fetchGroup: (id: string) => Promise<void>;
  now?: () => number;
  /**
   * Measures a finished fetch, e.g. from Resource Timing. Returning undefined
   * falls back to the manifest bytes over the time `fetchGroup` took.
   */
  measure?: (id: string, startMs: number, endMs: number) => FetchSample | undefined;
  /** The queue, in order, for a manifest. Defaults to its groups. The first item downloads alone. */
  items?: (manifest: LoadManifest) => readonly QueueItem[];
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
  const held = new Set<string>();
  const samples: FetchSample[] = [];
  let ids: string[] = [];
  let bytes = new Map<string, number>();
  let priority: string[] = [];
  let stopped = false;

  const later = (ms: number, run: () => void) => {
    const timer = setTimeout(() => { timers.delete(timer); if (!stopped) run(); }, ms);
    timers.add(timer);
    return timer;
  };
  const inFlight = () => ids.filter(id => state.get(id) === "inflight").length;
  const pick = () => {
    const free = (id: string) => state.get(id) === "pending" && !held.has(id);
    return priority.find(free) ?? ids.find(free);
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
    // The first item downloads alone; later ones share the connection.
    const timeoutMs = itemTimeoutMs(bytes.get(id) ?? 0, bandwidth(), id === ids[0] ? 1 : MAX_IN_FLIGHT);
    let settled = false;
    /** Only the first of success, failure and timeout counts for this attempt. */
    const once = <A extends unknown[]>(run: (...args: A) => void) => (...args: A) => {
      if (settled || stopped) return;
      settled = true;
      clearTimeout(timer);
      timers.delete(timer);
      run(...args);
    };
    let request: Promise<void>;
    try { request = opts.fetchGroup(id); } catch (error) { request = Promise.reject(error); }
    const onFailure = once((error: unknown) => {
      const attempt = (failures.get(id) ?? 0) + 1;
      failures.set(id, attempt);
      const delay = RETRY_DELAYS_MS[attempt - 1];
      if (delay === undefined) {
        state.set(id, "failed");
        priority = priority.filter(p => p !== id);
        opts.onFailed?.(id, error);
      } else {
        state.set(id, "waiting");
        opts.onRetry?.(id, attempt, delay, error);
        later(delay, () => { if (state.get(id) === "waiting") { state.set(id, "pending"); pump(); } });
      }
      pump();
    });
    const timer = later(timeoutMs, () => onFailure(new ItemTimeoutError(id, timeoutMs)));
    request.then(once(() => {
      const endMs = now();
      samples.push(opts.measure?.(id, startMs, endMs) ?? { bytes: bytes.get(id) ?? 0, startMs, endMs });
      state.set(id, "ready");
      priority = priority.filter(p => p !== id);
      opts.onReady?.(id);
      pump();
    }), onFailure);
  }

  /** Bytes per second over every finished fetch; 0 until one has finished. */
  function bandwidth() {
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
  }

  function adoptManifest(manifest: LoadManifest) {
    const items = opts.items?.(manifest) ?? manifest.groups;
    ids = items.map(item => item.id);
    bytes = new Map(items.map(item => [item.id, item.bytes]));
    for (const id of ids) state.set(id, "pending");
    opts.onManifest?.(manifest);
    pump();
  }

  async function loadManifest(attempt: number): Promise<void> {
    try {
      // Always revalidated: /models/* may be served from cache for an hour (and
      // stale for 30 days), and a returning visitor after a deploy must not get
      // the previous build's manifest with the new code (final review, Important 2).
      const response = await fetch(opts.manifestUrl, { cache: "no-cache" });
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
    prioritize(first) {
      if (stopped) return;
      priority = typeof first === "string" ? [first] : [...first];
      for (const id of priority) if (state.get(id) === "failed") { failures.set(id, 0); state.set(id, "pending"); }
      pump();
    },
    bandwidth,
    hold(holdIds) {
      for (const id of holdIds) held.add(id);
    },
    release(releaseIds) {
      for (const id of releaseIds) held.delete(id);
      pump();
    },
    drop(dropIds) {
      for (const id of dropIds) {
        const current = state.get(id);
        if (current === "pending" || current === "waiting" || current === "failed") state.set(id, "dropped");
      }
    },
    stop() {
      stopped = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    },
  };
}
