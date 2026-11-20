import { Cache } from "three";

/**
 * Textures that several GLBs share are exported once to /textures/ (see
 * scripts/optimize-export.mjs) and referenced by URI. The GLBs load in
 * parallel, so without this every stall would request the same avatar atlas
 * at the same moment and, unless the HTTP cache happens to coalesce them,
 * download it once per stall.
 *
 * three's loader cache does that coalescing, but enabling it globally would
 * also keep every GLB's ArrayBuffer alive in memory. Only the shared texture
 * URLs are admitted, so nothing else changes.
 *
 * One correction is needed. ImageBitmapLoader (r185) caches its in-flight
 * fetch promise, but that promise resolves to `undefined`, so every loader
 * that joined while the image was downloading received no image and drew the
 * material untextured (white foliage). The in-flight entry is replaced with a
 * promise that resolves to the decoded image once the loader stores it.
 */
const SHARED_TEXTURES = "/textures/";
let installed = false;

export function shareTextureDownloads() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  // Cache.clear() replaces the files object, so always write through Cache.
  const files = () => Cache.files as Record<string, unknown>;
  const waiting = new Map<string, (file: unknown) => void>();
  Cache.add = function (key: string, file: unknown) {
    if (!Cache.enabled || !key.includes(SHARED_TEXTURES)) return;
    if (file && typeof (file as PromiseLike<unknown>).then === "function") {
      // In flight: joiners wait for the image itself. If the download fails
      // the loader removes the entry; release joiners rather than leave the
      // loading manager waiting forever.
      const inFlight = new Promise<unknown>(resolve => waiting.set(key, resolve));
      (file as PromiseLike<unknown>).then(() => { waiting.get(key)?.(undefined); waiting.delete(key); });
      files()[key] = inFlight;
      return;
    }
    files()[key] = file;
    waiting.get(key)?.(file);
    waiting.delete(key);
  };
  Cache.enabled = true;
}
