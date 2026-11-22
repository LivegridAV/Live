import { useGLTF, useProgress } from "@react-three/drei";
import { LOAD_GROUPS, START_GROUP, assetsFor, groupForZ } from "./groups";
import { startStreaming, type FetchSample, type LoadManifest, type StreamHandle } from "./streamer";
import { mediaRequests, modelRequest, pathOf } from "./assetUrls";
import { rememberImage } from "./prefetched";
import { useVenue } from "../systems/store";

/**
 * Browser glue for the streamer: what "fetching a group" means in the venue,
 * how bandwidth is measured, and the state the loader and the gates read.
 * One streamer runs per mounted venue (`startVenueStreaming`).
 */
export const MANIFEST_URL = "/models/load-manifest.json";

let handle: StreamHandle | null = null;
let manifest: LoadManifest | null = null;
const failed = new Set<string>();
const perf = () => typeof location !== "undefined" && new URLSearchParams(location.search).has("perf");

/**
 * The file conditions the venue loads under: always `festival` (the stage's
 * festival package is preloaded, so the show cue never fetches), plus
 * `mobile` on phones.
 */
export function loadConditions(): Set<string> {
  const conditions = new Set(["festival"]);
  if (useVenue.getState().isMobile) conditions.add("mobile");
  return conditions;
}

/**
 * Review, capture and inspection modes open only once every group is warm,
 * so what they record is complete.
 */
export function fullLoadRequested(inspection = false) {
  if (inspection || typeof location === "undefined") return true;
  const query = new URLSearchParams(location.search);
  return query.has("inspect") || query.get("camera") === "baseline" || query.get("camera") === "qa"
    || query.get("capture") === "1" || query.has("record") || query.has("view");
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  !!value && typeof (value as PromiseLike<unknown>).then === "function";

// drei's useGLTF is R3F's useLoader, which is only suspend-react's suspend()
// over a [GLTFLoader, url] key (R3F 9.6): it holds no React hook state. Called
// outside a component it returns the parsed model, throws the in-flight
// promise, or throws the cached load error. That is how completion is detected:
// the same loader, the same cache entry the component will read.
const readGLTF = useGLTF;

async function loadModel(path: string, owned: boolean) {
  const { url, useDraco } = modelRequest(path);
  for (;;) {
    try {
      readGLTF(url, useDraco);
      return;
    } catch (thrown) {
      if (isThenable(thrown)) { await thrown; continue; }
      // suspend-react keeps a failed entry forever. Drop it so the retry
      // downloads again; a mounted component would otherwise throw it.
      if (owned) useGLTF.clear(url);
      throw thrown;
    }
  }
}

async function loadImage(url: string) {
  const image = new Image();
  image.decoding = "async";
  image.crossOrigin = "anonymous";
  image.src = url;
  await image.decode();
  rememberImage(url, image);
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Every loader the mounted scene started (images, textures, models) has settled. */
async function loadersIdle() {
  for (let quiet = 0; quiet < 3;) {
    await wait(100);
    quiet = useProgress.getState().active ? 0 : quiet + 1;
  }
}

/**
 * Fetch one group. Later groups are not mounted yet, so their GLBs are parsed
 * into drei's cache and their images downloaded and decoded here. The start
 * group mounts directly and its components start its loads; this joins the
 * GLB loads through the same cache and then waits for every loader to settle,
 * which is the old opening condition restricted to the entrance.
 */
async function fetchGroup(id: string) {
  const group = LOAD_GROUPS.find(g => g.id === id);
  if (!group) throw new Error(`unknown load group ${id}`);
  const paths = assetsFor(group, loadConditions());
  const models = paths.filter(path => path.endsWith(".glb"));
  if (id === START_GROUP) {
    await Promise.all(models.map(path => loadModel(path, false)));
    await loadersIdle();
    return;
  }
  const images = paths.filter(path => !path.endsWith(".glb")).flatMap(mediaRequests);
  await Promise.all([...models.map(path => loadModel(path, true)), ...images.map(loadImage)]);
}

const STREAMED = /^\/(models|media|textures)\//;
const entryPath = (entry: PerformanceEntry) => { try { return new URL(entry.name).pathname; } catch { return entry.name; } };

/**
 * Resource Timing over one group's files: the window from its first request
 * to its last response, and every asset byte that arrived inside it (shared
 * /textures/ files arrive alongside and share the same connection).
 */
function measure(id: string): FetchSample | undefined {
  const group = LOAD_GROUPS.find(g => g.id === id);
  if (!group || typeof performance === "undefined") return undefined;
  const own = new Set([...group.assets, ...Object.values(group.variants ?? {}).flat()]);
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const mine = entries.filter(entry => own.has(pathOf(entryPath(entry))));
  if (!mine.length) return undefined;
  const startMs = Math.min(...mine.map(entry => entry.startTime));
  const endMs = Math.max(...mine.map(entry => entry.responseEnd));
  const bytes = entries
    .filter(entry => entry.startTime >= startMs && entry.responseEnd <= endMs && STREAMED.test(entryPath(entry)))
    .reduce((sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0), 0);
  return { bytes, startMs, endMs };
}

/** Start streaming for a mounted venue. Returns the stop function for effect cleanup. */
export function startVenueStreaming() {
  handle?.stop();
  manifest = null;
  failed.clear();
  useVenue.setState({ readyGroups: [], warmGroups: [] });
  // The default buffer (250) fills before the last group arrives.
  try { performance.setResourceTimingBufferSize(2000); } catch { /* not supported */ }
  const current = startStreaming({
    manifestUrl: MANIFEST_URL,
    fetchGroup,
    measure: id => measure(id),
    fallbackIds: LOAD_GROUPS.map(group => group.id),
    onManifest: loaded => { manifest = loaded; },
    onReady: id => {
      if (perf()) console.info(`[venue] load group ${id} ready at ${Math.round(performance.now())} ms`);
      useVenue.getState().markGroupReady(id);
    },
    onRetry: (id, attempt, delayMs, error) =>
      console.warn(`[venue] load group ${id} failed (attempt ${attempt}); retrying in ${delayMs / 1000} s`, error),
    onFailed: (id, error) => {
      failed.add(id);
      console.warn(`[venue] load group ${id} failed ${id === "manifest" ? "" : "4 times "}and is not retried; its zone keeps the light pack`, error);
    },
  });
  handle = current;
  const unsubscribe = perf() ? reportDuplicatesWhenWarm() : () => {};
  return () => {
    unsubscribe();
    current.stop();
    if (handle === current) handle = null;
  };
}

/** Move the group needed at camera z `z` to the front of the queue (nav jumps, stall visits). */
export function prioritizeZ(z: number) {
  if (Number.isFinite(z)) handle?.prioritize(groupForZ(z).id);
}

export const streamBandwidth = () => handle?.bandwidth() ?? 0;
export const groupFailed = (id: string) => failed.has(id);

/** Groups with their switch-on z and the bytes they cost under the current conditions. */
export function plannerGroups() {
  if (!manifest) return null;
  const conditions = loadConditions();
  return LOAD_GROUPS.map(group => {
    const entry = manifest!.groups.find(g => g.id === group.id);
    const base = entry?.bytes ?? 0;
    // Each active condition adds what it changes: bytes + Σ (bytesByCondition[c] − bytes).
    const bytes = [...conditions].reduce((sum, c) => sum + ((entry?.bytesByCondition?.[c] ?? base) - base), base);
    return { id: group.id, switchOnZ: group.switchOnZ, bytes };
  });
}

/** Bytes of `ids`' own files (and shared textures) that have arrived so far. */
export function downloadedBytes(ids: readonly string[]) {
  if (typeof performance === "undefined") return 0;
  const own = new Set(LOAD_GROUPS.filter(group => ids.includes(group.id))
    .flatMap(group => [...group.assets, ...Object.values(group.variants ?? {}).flat()]));
  return (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
    .filter(entry => { const p = pathOf(entryPath(entry)); return own.has(p) || p.startsWith("/textures/"); })
    .reduce((sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0), 0);
}

/**
 * ?perf only: once every group is warm, list any venue file the page fetched
 * more than once (a URL mismatch between the streamer and a component).
 */
function reportDuplicatesWhenWarm() {
  let reported = false;
  return useVenue.subscribe(state => {
    if (reported || !LOAD_GROUPS.every(group => state.warmGroups.includes(group.id))) return;
    reported = true;
    const seen = new Map<string, string[]>();
    for (const entry of performance.getEntriesByType("resource")) {
      const p = entryPath(entry);
      if (!/^\/(models|media)\//.test(p)) continue;
      seen.set(pathOf(p), [...(seen.get(pathOf(p)) ?? []), entry.name]);
    }
    const repeated = [...seen].filter(([, urls]) => urls.length > 1);
    if (repeated.length) console.warn("[venue] files requested more than once", Object.fromEntries(repeated));
    else console.info("[venue] every venue file was requested once");
  });
}
