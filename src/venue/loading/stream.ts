import { useGLTF, useProgress } from "@react-three/drei";
import type * as THREE from "three";
import { LOAD_GROUPS, START_GROUP, assetsFor, jumpOrder } from "./groups";
import { isItemTimeout, startStreaming, type FetchSample, type LoadManifest, type QueueItem, type StreamHandle } from "./streamer";
import { mediaRequests, modelRequest, pathOf } from "./assetUrls";
import { rememberBlob, rememberImage } from "./prefetched";
import { BITMAP_SOURCES } from "../media/projectionPainters";
import { settleManifest } from "./manifest";
import { variantPath, type ModelVariant } from "./modelVariants";
import { streamedVariant } from "./useModelUrl";
import { useVenue } from "../systems/store";
import { forgetVenueTexture, gltfExtender, ktx2Available, ktx2Sibling, loadVenueTexture, missingTextures, usesKtx2 } from "../three/textureLoading";

/**
 * Browser glue for the streamer: what "fetching a group" means in the venue,
 * how bandwidth is measured, and the state the loader and the gates read.
 * One streamer runs per mounted venue (`startVenueStreaming`).
 *
 * The queue (owner decision 3, open early and fill in): the start group
 * alone, then every later group's light pack in journey order, then the full
 * groups in journey order. Before opening only the opening set runs: the
 * start group and the light packs the opening plan names (every pack, on
 * normal visits; see useOpeningPlan.ts) via `planOpening`. Everything else
 * is held until the venue opens; then the
 * remaining light packs run, and the full groups only once every light pack
 * has settled, so no full download takes bandwidth from a pack a visitor is
 * walking towards (the planner assumes the packs arrive back to back). Review,
 * capture and inspection modes queue no light pack and open on every full
 * group.
 */
export const MANIFEST_URL = "/models/load-manifest.json";

let handle: StreamHandle | null = null;
/** The venue's renderer: KTX2 transcoding needs it (one shared KTX2Loader). */
let renderer: THREE.WebGLRenderer | null = null;
let manifest: LoadManifest | null = null;
const failed = new Set<string>();
/** Review, capture and inspection modes: every full group, no light pack. */
let fullMode = false;
/** What the venue must have before it opens; null until the plan is known. */
let opening: { full: string[]; lite: string[] } | null = null;
let opened = false;
/** Light packs that have arrived, failed for good or been dropped (their full group arrived first). */
const liteSettled = new Set<string>();

const LITE = ".lite";
/** The queue item of a group's light pack. */
export const liteItem = (id: string) => `${id}${LITE}`;
const isLiteItem = (item: string) => item.endsWith(LITE);
const groupOfItem = (item: string) => isLiteItem(item) ? item.slice(0, -LITE.length) : item;
const liteFiles = (id: string) => manifest?.groups.find(g => g.id === id)?.lite ?? [];
const laterIds = () => LOAD_GROUPS.map(group => group.id).filter(id => id !== START_GROUP);
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
// the same loader, the same cache entry the component will read, configured
// by the same extender (KTX2) the components pass.
const readGLTF = useGLTF;

/** GLBs that need KTX2 textures (seen once loaded): not loaded again once KTX2 is off. */
const needsKtx2 = new Set<string>();

/**
 * GLTFLoader loads a GLB whose texture failed without that texture. For a
 * KTX2 GLB that means a broken or missing transcoder (textureLoading.ts):
 * fail the load instead, so the streamer retries it and, if KTX2 stays
 * broken, reports the group failed and its zone keeps the light pack.
 */
async function requireTextures(url: string, gltf: unknown) {
  if (!usesKtx2(gltf)) return;
  needsKtx2.add(url);
  const missing = await missingTextures(gltf);
  if (missing) throw new Error(`${url}: ${missing} KTX2 GLB texture${missing > 1 ? "s" : ""} failed to load`);
}

/** Load `path` (a groups.json GLB) as the variant the mounted component will ask for. */
async function loadModel(path: string, owned: boolean, variant: ModelVariant = streamedVariant(path)) {
  const { url, useDraco } = modelRequest(path, variant);
  if (!renderer) throw new Error("venue streaming has no renderer");
  if (needsKtx2.has(url) && !ktx2Available()) throw new Error(`${url} needs KTX2 textures, which are off for this visit`);
  for (;;) {
    try {
      const gltf = readGLTF(url, useDraco, true, gltfExtender(renderer));
      // A later group's GLB is not mounted yet: a failed KTX2 texture fails the load (the light pack stays).
      if (owned) await requireTextures(url, gltf);
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
  // One request: the bytes are kept as a Blob (for painters that need an
  // ImageBitmap decoded off the main thread) and the image is decoded from them.
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.src = objectUrl;
    await image.decode();
    rememberImage(url, image);
    // Only the artwork a painter makes a bitmap from keeps its bytes.
    if (BITMAP_SOURCES.includes(url)) rememberBlob(url, blob);
  } finally { URL.revokeObjectURL(objectUrl); }
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
  // A plain-loader texture with a KTX2 sibling is fetched (and transcoded)
  // through the loader its component uses; everything else is an image.
  const media = paths.filter(path => !path.endsWith(".glb"));
  const ktx2 = media.filter(hasKtx2);
  const images = media.filter(path => !hasKtx2(path)).flatMap(mediaRequests);
  await Promise.all([...models.map(path => loadModel(path, true)), ...images.map(loadImage),
    ...ktx2.map(path => loadVenueTexture(path, renderer!))]);
}

/** A light pack: its lite models, parsed into the cache its LiteGroup reads. */
async function fetchLite(id: string) {
  const paths = liteFiles(id);
  if (!paths.length) throw new Error(`load group ${id} has no light pack`);
  await Promise.all(paths.map(path => loadModel(sourceOfLite(path), true, "lite")));
}

const hasKtx2 = (path: string) => !!manifest?.ktx2Media?.includes(ktx2Sibling(path));

/**
 * An item that timed out (the streamer's per-item timeout) may have left a
 * load that never settles in drei's cache or the texture cache: forget it so
 * the retry downloads again instead of waiting on it. The start group is
 * mounted and reads those entries itself, so it is left alone.
 */
function forgetItem(item: string) {
  const id = groupOfItem(item);
  if (id === START_GROUP) return;
  if (isLiteItem(item)) {
    for (const path of liteFiles(id)) useGLTF.clear(modelRequest(sourceOfLite(path), "lite").url);
    return;
  }
  const group = LOAD_GROUPS.find(g => g.id === id);
  if (!group) return;
  for (const path of assetsFor(group, loadConditions())) {
    if (path.endsWith(".glb")) useGLTF.clear(modelRequest(path, streamedVariant(path)).url);
    else if (hasKtx2(path)) forgetVenueTexture(path);
  }
}

const sourceOfLite = (path: string) => path.replace(/\.lite\.glb$/i, ".glb");

/** A group's own files, including the lod1 models it may load instead, plus the light packs of `liteIds`. */
function ownFiles(ids: readonly string[], liteIds: readonly string[] = []) {
  const files = new Set<string>(liteIds.flatMap(liteFiles));
  for (const group of LOAD_GROUPS) {
    if (!ids.includes(group.id)) continue;
    for (const path of [...group.assets, ...Object.values(group.variants ?? {}).flat()]) {
      files.add(path);
      if (path.endsWith(".glb")) files.add(variantPath(path, "lod1"));
      if (path.endsWith(".webp")) files.add(ktx2Sibling(path));
    }
  }
  return files;
}

const STREAMED = /^\/(models|media|textures|basis)\//;
const entryPath = (entry: PerformanceEntry) => { try { return new URL(entry.name).pathname; } catch { return entry.name; } };

/**
 * Resource Timing over one group's files: the window from its first request
 * to its last response, and every asset byte that arrived inside it (shared
 * /textures/ files arrive alongside and share the same connection).
 */
function measure(item: string): FetchSample | undefined {
  const id = groupOfItem(item);
  if (!LOAD_GROUPS.some(g => g.id === id) || typeof performance === "undefined") return undefined;
  const own = isLiteItem(item) ? ownFiles([], [id]) : ownFiles([id]);
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

/** The queue for a manifest: start, the light packs (normal visits), then the full groups. */
function queueItems(loaded: LoadManifest): QueueItem[] {
  const [first, ...rest] = loaded.groups;
  if (!first) return [];
  const lite = fullMode ? [] : rest.filter(group => group.lite?.length)
    .map(group => ({ id: liteItem(group.id), bytes: group.liteBytes ?? 0 }));
  return [first, ...lite, ...rest];
}

/**
 * Start streaming for a mounted venue (on its renderer). `full`: review,
 * capture and inspection modes (`fullLoadRequested`). Returns the stop
 * function for effect cleanup.
 */
export function startVenueStreaming(gl: THREE.WebGLRenderer, { full = false }: { full?: boolean } = {}) {
  handle?.stop();
  renderer = gl;
  manifest = null;
  failed.clear();
  fullMode = full;
  opening = null;
  opened = false;
  liteSettled.clear();
  useVenue.setState({ readyGroups: [], warmGroups: [], liteGroups: [], liteWarmGroups: [] });
  // The default buffer (250) fills before the last group arrives.
  try { performance.setResourceTimingBufferSize(2000); } catch { /* not supported */ }
  const current: StreamHandle = startStreaming({
    manifestUrl: MANIFEST_URL,
    items: queueItems,
    fetchGroup: item => isLiteItem(item) ? fetchLite(groupOfItem(item)) : fetchGroup(item),
    measure: item => measure(item),
    fallbackIds: LOAD_GROUPS.map(group => group.id),
    onManifest: loaded => { manifest = loaded; settleManifest(loaded); },
    onReady: item => {
      const id = groupOfItem(item);
      if (perf()) console.info(`[venue] ${isLiteItem(item) ? "light pack" : "load group"} ${id} ready at ${Math.round(performance.now())} ms`);
      if (isLiteItem(item)) { useVenue.getState().markLiteReady(id); settleLite(id); return; }
      useVenue.getState().markGroupReady(id);
      // The full files are in memory: the light pack is no longer needed.
      current.drop([liteItem(id)]);
      settleLite(id);
    },
    onRetry: (item, attempt, delayMs, error) => {
      if (isItemTimeout(error)) forgetItem(item);
      console.warn(`[venue] ${isLiteItem(item) ? "light pack" : "load group"} ${groupOfItem(item)} failed (attempt ${attempt}); retrying in ${delayMs / 1000} s`, error);
    },
    onFailed: (item, error) => {
      if (isItemTimeout(error)) forgetItem(item);
      if (item === "manifest") settleManifest(null);
      failed.add(item);
      if (isLiteItem(item)) {
        const id = groupOfItem(item);
        console.warn(`[venue] light pack for ${id} failed 4 times and is not retried; the zone waits for its full group`, error);
        liteFailed(id);
        settleLite(id);
        return;
      }
      console.warn(`[venue] load group ${item} failed ${item === "manifest" ? "" : "4 times "}and is not retried; its zone keeps the light pack`, error);
    },
  });
  // Later groups and light packs wait for the opening plan (planOpening).
  current.hold([...laterIds(), ...laterIds().map(liteItem)]);
  handle = current;
  const unsubscribe = perf() ? reportDuplicatesWhenWarm() : () => {};
  return () => {
    unsubscribe();
    current.stop();
    if (handle === current) handle = null;
  };
}

/**
 * The opening plan is decided: `full` groups and the light packs of `lite`
 * groups stream now, and the venue opens once they are warm. A group in
 * `lite` that has no light pack (or whose pack has already failed) needs its
 * full group instead: a reachable zone is never left with nothing to show.
 */
export function planOpening(plan: { full: readonly string[]; lite: readonly string[] }) {
  const lite = plan.lite.filter(id => !plan.full.includes(id));
  const withPack = fullMode ? [] : lite.filter(id => liteFiles(id).length > 0 && !failed.has(liteItem(id)));
  opening = { full: [...plan.full, ...lite.filter(id => !withPack.includes(id))], lite: withPack };
  handle?.release([...opening.full, ...opening.lite.map(liteItem)]);
}

/** A light pack failed for good: before opening, its group's full version becomes required. */
function liteFailed(id: string) {
  if (opened || !opening?.lite.includes(id)) return;
  opening = { full: [...opening.full, id], lite: opening.lite.filter(other => other !== id) };
  handle?.release([id]);
}

/** What the venue opens with: full groups to be warm, groups whose light pack must be warm (null before the plan). */
export const openingSet = (): { readonly full: readonly string[]; readonly lite: readonly string[] } | null => opening;

/** Groups that queue a light pack on this visit. */
const withLitePack = () => fullMode ? [] : laterIds().filter(id => liteFiles(id).length > 0);

function settleLite(id: string) {
  liteSettled.add(id);
  releaseFullWhenLiteDone();
}

/** After opening, once every light pack has settled: the full groups stream, in journey order. */
function releaseFullWhenLiteDone() {
  if (opened && withLitePack().every(id => liteSettled.has(id))) handle?.release(laterIds());
}

/**
 * The venue has opened: the remaining light packs stream in journey order,
 * then the full groups (releaseFullWhenLiteDone), at most two at a time.
 */
export function venueOpened() {
  opened = true;
  handle?.release(laterIds().map(liteItem));
  releaseFullWhenLiteDone();
}

/**
 * Move the destination of a nav jump or stall visit to the front of the queue
 * (`jumpOrder`): the destination's own group (the stall's, when `stall` is
 * known), then the next group ahead. Each comes with its light pack first
 * unless that or the full group is already in memory. Running downloads are
 * not cancelled.
 */
export function prioritizeZ(z: number, stall?: string | null) {
  if (!Number.isFinite(z)) return;
  const ids = jumpOrder(z, stall);
  const { readyGroups, liteGroups } = useVenue.getState();
  const needsLite = (id: string) => !fullMode && !readyGroups.includes(id) && !liteGroups.includes(id);
  const order = ids.flatMap(id => needsLite(id) ? [liteItem(id), id] : [id]);
  // The destination need not wait for the other light packs; the group after it
  // still does (releaseFullWhenLiteDone releases it with the rest).
  const [target] = ids;
  if (opened) handle?.release(order.filter(item => item === target || item.endsWith(LITE)));
  handle?.prioritize(order);
}

export const streamBandwidth = () => handle?.bandwidth() ?? 0;
export const groupFailed = (id: string) => failed.has(id);

/** Groups with their switch-on z, the bytes they cost under the current conditions, and their light pack's bytes. */
export function plannerGroups() {
  if (!manifest) return null;
  const conditions = loadConditions();
  return LOAD_GROUPS.map(group => {
    const entry = manifest!.groups.find(g => g.id === group.id);
    const base = entry?.bytes ?? 0;
    // Each active condition adds what it changes: bytes + Σ (bytesByCondition[c] − bytes).
    const bytes = [...conditions].reduce((sum, c) => sum + ((entry?.bytesByCondition?.[c] ?? base) - base), base);
    return { id: group.id, switchOnZ: group.switchOnZ, bytes, liteBytes: entry?.liteBytes ?? 0 };
  });
}

/** Bytes of `ids`' own files, `liteIds`' light packs (and shared textures) that have arrived so far. */
export function downloadedBytes(ids: readonly string[], liteIds: readonly string[] = []) {
  if (typeof performance === "undefined") return 0;
  const own = ownFiles(ids, liteIds);
  return (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
    .filter(entry => { const p = pathOf(entryPath(entry)); return own.has(p) || p.startsWith("/textures/") || p.startsWith("/basis/"); })
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
