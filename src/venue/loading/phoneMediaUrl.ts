import { LOAD_GROUPS } from "./groups";
import { phoneMediaPath, phoneMediaSources } from "./phoneMedia";
import { useVenue } from "../systems/store";

let sources: ReadonlySet<string> | null = null;

/**
 * The URL a screen image is loaded from on this device: its phone copy on a
 * phone when the build makes one (phoneMedia.ts), otherwise `url` itself.
 * Every loader of load-group images (the streamer, the media engine, the
 * painters) asks through here, so a file is fetched once, under one URL.
 */
export function phoneMediaUrl(url: string): string {
  if (!useVenue.getState().isPhone) return url;
  sources ??= new Set(phoneMediaSources(LOAD_GROUPS));
  return sources.has(url.replace(/[?#].*$/, "")) ? phoneMediaPath(url) : url;
}
