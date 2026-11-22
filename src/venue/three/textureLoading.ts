import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import type { GLTFLoader } from "three-stdlib";
import { venueManifest } from "../loading/manifest";

/**
 * KTX2 textures for the venue (the build swaps them in from a local cache,
 * see scripts/ktx2-swap.mjs).
 *
 * One KTX2Loader serves every GLB and every plain texture load: each instance
 * would fetch its own Basis transcoder and start its own workers. It is made
 * on first use with the venue's renderer (detectSupport once) and never
 * disposed, because every loaded model and texture shares it.
 */
export const BASIS_TRANSCODER_PATH = "/basis/";

let ktx2: KTX2Loader | null = null;
function sharedKtx2Loader(gl: THREE.WebGLRenderer) {
  return ktx2 ??= new KTX2Loader().setTranscoderPath(BASIS_TRANSCODER_PATH).detectSupport(gl);
}

/** Let a GLTFLoader read KHR_texture_basisu textures, with the shared KTX2Loader. */
export function configureGltfLoader(loader: GLTFLoader, gl: THREE.WebGLRenderer): void {
  // drei's GLTFLoader is three-stdlib's; it only calls load() on the loader.
  loader.setKTX2Loader(sharedKtx2Loader(gl) as unknown as Parameters<GLTFLoader["setKTX2Loader"]>[0]);
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
 * streamer prefetched). A failed KTX2 falls back to `url`.
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
      if (await hasKtx2Sibling(url)) {
        try {
          return await sharedKtx2Loader(gl).loadAsync(ktx2Sibling(url));
        } catch (error) {
          console.warn(`[venue] ${ktx2Sibling(url)} failed; using ${url}`, error);
        }
      }
      return new THREE.TextureLoader().loadAsync(url);
    })();
    loads.set(url, base);
    base.catch(() => loads.delete(url));
  }
  return base.then(texture => {
    const copy = texture.clone();
    copy.needsUpdate = true;
    return copy;
  });
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
