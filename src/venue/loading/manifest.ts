import type { LoadManifest } from "./streamer";

/**
 * The build's load manifest as the streamer received it, for code that must
 * choose files from it (lite and lod1 models). Resolves with the manifest, or
 * with null once the streamer gives up on it (then no derived file is used).
 * It settles once per page: every streamer run reads the same build.
 */
let settle: (manifest: LoadManifest | null) => void = () => {};
const settled = new Promise<LoadManifest | null>(resolve => { settle = resolve; });
let known: LoadManifest | null | undefined;

export function settleManifest(manifest: LoadManifest | null) {
  if (known !== undefined) return;
  known = manifest;
  settle(manifest);
}

export const venueManifest = () => settled;
/** The manifest if it has settled (null when it failed), undefined before. */
export const settledManifest = () => known;
