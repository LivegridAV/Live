import { Cache } from "three";

/**
 * Images the streamer has already downloaded and decoded for a load group that
 * has not mounted yet. The media engine, the painters and three's
 * TextureLoader adopt them when the group mounts, so the file is neither
 * requested nor decoded a second time (the HTTP cache would usually serve a
 * second request, but not with the cache disabled, and the decode would still
 * repeat).
 */
const images = new Map<string, HTMLImageElement>();

export function rememberImage(url: string, image: HTMLImageElement) {
  images.set(url, image);
  // three's ImageLoader (TextureLoader) looks here first (r185 key format) and
  // hands a complete cached image to its caller on the next tick. Written
  // directly: Cache.add only admits shared /textures/ (sharedTextures.ts).
  if (Cache.enabled) (Cache.files as Record<string, unknown>)[`image:${url}`] = image;
}

/** The decoded image the streamer fetched for `url`, if there is one. */
export function prefetchedImage(url: string): HTMLImageElement | undefined {
  const image = images.get(url);
  return image && image.complete && image.naturalWidth > 0 ? image : undefined;
}
