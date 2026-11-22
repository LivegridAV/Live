import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import type { GLTFLoader } from "three-stdlib";
import { venueManifest } from "../loading/manifest";

/**
 * KTX2 textures for the venue (the build swaps them in from a local cache,
 * see scripts/ktx2-swap.mjs; the start group never uses them).
 *
 * One KTX2Loader serves every GLB and every plain texture load: each instance
 * would fetch its own Basis transcoder and start its own workers. It is made
 * on first KTX2 texture with the venue's renderer (detectSupport once).
 *
 * The transcoder can fail for good: without WebAssembly (iOS Lockdown Mode,
 * locked-down Edge) or after one dropped /basis/ fetch, three's KTX2Loader
 * keeps the failed (or never-settling) transcoder for the session. So every
 * KTX2 texture goes through `loadKtx2`, which bounds the transcoder start and
 * each transcode with a timeout, replaces a broken loader with a new one,
 * and turns KTX2 off for the visit after `KTX2_MAX_FAILURES` broken loaders.
 * Without WebAssembly it never fetches the transcoder at all. A KTX2 texture
 * that fails rejects: plain textures then use their WebP (`loadVenueTexture`),
 * and the streamer treats a GLB with a failed KTX2 texture as failed, so its
 * zone keeps its light pack (stream.ts).
 */
export const BASIS_TRANSCODER_PATH = "/basis/";
/** The transcoder's start: two files (0.58 MB) and the worker code. */
export const KTX2_INIT_TIMEOUT_MS = 60_000;
/** One texture's transcode, waiting for a free worker included. */
export const KTX2_TRANSCODE_TIMEOUT_MS = 30_000;
/** Broken transcoders after which KTX2 is off for the visit. */
export const KTX2_MAX_FAILURES = 3;

let ktx2: KTX2Loader | null = null;
let ktx2Ready: Promise<KTX2Loader> | null = null;
let ktx2Failures = 0;

/** Can this page decode KTX2 textures (WebAssembly and workers, and not given up on)? */
export const ktx2Available = () =>
  typeof WebAssembly === "object" && typeof Worker === "function" && ktx2Failures < KTX2_MAX_FAILURES;

class TimeoutError extends Error {
  name = "TimeoutError";
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(`${what} did not finish within ${ms / 1000} s`)), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

/** Drop a broken loader (its workers too); the next KTX2 texture makes a new one, until KTX2 is off. */
function breakKtx2(loader: KTX2Loader, error: unknown) {
  if (ktx2 !== loader) return;
  ktx2 = null;
  ktx2Ready = null;
  ktx2Failures++;
  try { loader.dispose(); } catch { /* already unusable */ }
  console.warn(`[venue] the Basis transcoder failed (${ktx2Failures} of ${KTX2_MAX_FAILURES}); ${ktx2Available()
    ? "a new one starts with the next KTX2 texture" : "KTX2 textures are off for this visit"}`, error);
}

/** The shared loader once its transcoder has started. */
function readyKtx2Loader(gl: THREE.WebGLRenderer): Promise<KTX2Loader> {
  if (!ktx2Available()) return Promise.reject(new Error("KTX2 textures are not available on this page"));
  if (!ktx2Ready) {
    // three's FileLoader joins a request for a URL that is still in flight, so
    // a replacement loader asks for the transcoder under a new query: a
    // never-settling first request must not hold the next one too.
    const retry = ktx2Failures;
    const manager = retry ? new THREE.LoadingManager() : undefined;
    manager?.setURLModifier(url => `${url}?retry=${retry}`);
    const loader = ktx2 = new KTX2Loader(manager).setTranscoderPath(BASIS_TRANSCODER_PATH).detectSupport(gl);
    ktx2Ready = withTimeout(loader.init(), KTX2_INIT_TIMEOUT_MS, "the Basis transcoder start")
      .then(() => loader, error => { breakKtx2(loader, error); throw error; });
  }
  return ktx2Ready;
}

/**
 * Load and transcode one KTX2 texture. Rejects, never hangs: when KTX2 is
 * unavailable (nothing is fetched then), when the file or the transcoder
 * fails to load, or when the transcoder start or the transcode runs past its
 * timeout (the loader is then replaced).
 */
export async function loadKtx2(url: string, gl: THREE.WebGLRenderer): Promise<THREE.CompressedTexture> {
  if (!ktx2Available()) throw new Error(`KTX2 textures are not available on this page (${url.startsWith("blob:") ? "a GLB texture" : url})`);
  const [buffer, loader] = await Promise.all([
    new THREE.FileLoader().setResponseType("arraybuffer").loadAsync(url) as Promise<ArrayBuffer>,
    readyKtx2Loader(gl),
  ]);
  try {
    return await withTimeout(new Promise<THREE.CompressedTexture>((resolve, reject) => loader.parse(buffer, resolve, reject)),
      KTX2_TRANSCODE_TIMEOUT_MS, `transcoding ${url.startsWith("blob:") ? "a GLB texture" : url}`);
  } catch (error) {
    if (error instanceof TimeoutError) breakKtx2(loader, error);
    throw error;
  }
}

/** What GLTFLoader's KHR_texture_basisu extension calls: only `load`. */
const gltfKtx2 = new WeakMap<THREE.WebGLRenderer, { load: KTX2Loader["load"] }>();
function gltfKtx2Loader(gl: THREE.WebGLRenderer) {
  let loader = gltfKtx2.get(gl);
  if (!loader) {
    gltfKtx2.set(gl, loader = {
      load(url, onLoad, _onProgress, onError) {
        loadKtx2(url, gl).then(onLoad, error => onError?.(error));
      },
    });
  }
  return loader;
}

/** Let a GLTFLoader read KHR_texture_basisu textures, through `loadKtx2`. */
export function configureGltfLoader(loader: GLTFLoader, gl: THREE.WebGLRenderer): void {
  // drei's GLTFLoader is three-stdlib's; it only calls load() on the loader.
  loader.setKTX2Loader(gltfKtx2Loader(gl) as unknown as Parameters<GLTFLoader["setKTX2Loader"]>[0]);
}

type ParsedGltf = { parser?: { json?: { extensionsUsed?: string[] }; textureCache?: Record<string, Promise<unknown>> } };

/** Does a parsed GLB (drei's useGLTF result) use KHR_texture_basisu textures? */
export const usesKtx2 = (gltf: unknown) =>
  !!(gltf as ParsedGltf)?.parser?.json?.extensionsUsed?.includes("KHR_texture_basisu");

/**
 * How many of a parsed GLB's textures failed to load. GLTFLoader resolves a
 * failed texture as null and loads the model without it.
 */
export async function missingTextures(gltf: unknown): Promise<number> {
  const textures = await Promise.all(Object.values((gltf as ParsedGltf)?.parser?.textureCache ?? {}));
  return textures.filter(texture => !texture).length;
}

const extenders = new WeakMap<THREE.WebGLRenderer, (loader: GLTFLoader) => void>();
/**
 * The `extendLoader` argument every venue `useGLTF` call passes: the same
 * function for the same renderer, so the streamer's loads and the mounted
 * components' loads configure drei's shared GLTFLoader identically.
 */
export function gltfExtender(gl: THREE.WebGLRenderer) {
  let extend = extenders.get(gl);
  if (!extend) extenders.set(gl, extend = loader => configureGltfLoader(loader, gl));
  return extend;
}

/** The `.ktx2` the build writes next to a plain-loader `/media` WebP. */
export const ktx2Sibling = (url: string) => url.replace(/[?#].*$/, "").replace(/\.webp$/i, ".ktx2");

/** Does the build's manifest list a KTX2 sibling for `url`? Waits for the manifest. */
export async function hasKtx2Sibling(url: string) {
  const manifest = await venueManifest();
  return !!manifest?.ktx2Media?.includes(ktx2Sibling(url));
}

const loads = new Map<string, Promise<THREE.Texture>>();

/**
 * Load a plain venue texture: its `.ktx2` sibling when the load manifest
 * lists one (decoded off the main thread, already mipmapped and GPU
 * compressed), otherwise `url` with a TextureLoader (which adopts an image the
 * streamer prefetched). A failed KTX2 falls back to `url`, and so does every
 * texture once KTX2 is unavailable (`ktx2Available`).
 *
 * Each call resolves to its own clone, so callers can set their own repeat,
 * wrapping and colour space; clones share the image, so the file is fetched
 * and uploaded once. KTX2 textures are not flipped on upload (the cache
 * stores them Y-flipped instead) and carry their own mipmaps: never set
 * `generateMipmaps` on them (see `isCompressed`).
 */
export function loadVenueTexture(url: string, gl: THREE.WebGLRenderer): Promise<THREE.Texture> {
  let base = loads.get(url);
  if (!base) {
    base = (async () => {
      if (ktx2Available() && await hasKtx2Sibling(url)) {
        try {
          return await loadKtx2(ktx2Sibling(url), gl);
        } catch (error) {
          console.warn(`[venue] ${ktx2Sibling(url)} failed; using ${url}`, error);
        }
      }
      return new THREE.TextureLoader().loadAsync(url);
    })();
    loads.set(url, base);
    const own = base;
    base.catch(() => { if (loads.get(url) === own) loads.delete(url); });
  }
  return base.then(cloneShared);
}

/** Forget a load that never settled, so the next `loadVenueTexture(url)` starts again. */
export function forgetVenueTexture(url: string) {
  loads.delete(url);
}

/**
 * Clone a texture without marking its shared image for upload again. In r185
 * `clone()` (Texture.copy) sets `needsUpdate`, which also bumps the shared
 * Source's version, so three re-uploads the whole image for every clone made
 * after the first upload. The clone keeps its own bumped version, so three
 * binds it: it shares the GPU texture of a clone with the same sampler
 * settings, and uploads only when the settings differ or the image has never
 * been uploaded. Configure the clone before its first draw; never set
 * `needsUpdate` on it.
 */
export function cloneShared<T extends THREE.Texture>(texture: T): T {
  const version = texture.source.version;
  const copy = texture.clone() as T;
  texture.source.version = version;
  return copy;
}

export const isCompressed = (texture: THREE.Texture) => (texture as THREE.CompressedTexture).isCompressedTexture === true;

const placeholders = new Map<string, THREE.DataTexture>();
/** A shared 1 x 1 texture of `colour` (hex, linear bytes) shown until a texture has loaded. */
export function placeholderTexture(colour: string) {
  let texture = placeholders.get(colour);
  if (!texture) {
    const c = new THREE.Color(colour);
    texture = new THREE.DataTexture(new Uint8Array([c.r * 255, c.g * 255, c.b * 255, 255].map(Math.round)), 1, 1);
    texture.name = `venue placeholder ${colour}`;
    texture.needsUpdate = true;
    placeholders.set(colour, texture);
  }
  return texture;
}
