// KTX2 swap for the post-export step (imported by optimize-export.mjs).
//
// The build never encodes. It reads the committed cache that
// `npm run encode:ktx2` (scripts/encode-ktx2.mjs) fills, keyed by the sha256
// of each texture's original bytes, and swaps a cached KTX2 in only when it
// pays for itself in bytes against the WebP the build would ship otherwise:
//
// - in the start group, only when the KTX2 is smaller than that WebP;
// - in a later group, when it is at most 1.25 x that WebP (KTX2 needs no
//   decode on the main thread and is 4-8 x smaller in video memory).
// A texture used by start and by a later group follows the start rule.
// KEEP_WEBP textures, textures outside the load groups' GLBs and cache misses
// keep WebP; the build logs one summary line with the counts.
//
// GLB textures are swapped before the WebP step (which leaves image/ktx2
// alone), so shared ones are written once to /textures/<hash>.ktx2 like any
// other shared texture. The light pack is made from the final files but keeps
// small WebP textures: `liteSource` hands derived-models.mjs the WebP a KTX2
// replaced. The plain-loader /media files get a `.ktx2` next to their WebP,
// listed in the load manifest's `ktx2Media`.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { KHRTextureBasisu } from "@gltf-transform/extensions";
import { listTextureSlots } from "@gltf-transform/functions";
// Must be the same sharp that @gltf-transform/functions loads (see optimize-export.mjs).
import sharp from "sharp";
import { PLAIN_LOADER_MEDIA, keepsWebP, ktx2File, mediaKey, readIndex, sha256 } from "./encode-ktx2.mjs";

export const KTX2_LATER_RATIO = 1.25;

/** The bytes rule: does a KTX2 of `ktx2Bytes` replace a WebP of `webpBytes`? */
export function prefersKtx2({ ktx2Bytes, webpBytes, inStart }) {
  return inStart ? ktx2Bytes < webpBytes : ktx2Bytes <= KTX2_LATER_RATIO * webpBytes;
}

/** The rule for a texture used by these groups: start's whenever start uses it. */
export function groupRule(groupIds, startId) {
  return groupIds.includes(startId) ? "start" : "later";
}

export const isNormalMap = texture => listTextureSlots(texture).some(slot => /normal/i.test(slot));

/**
 * The image the WebP step ships for a texture: PNG/JPEG re-encoded as WebP at
 * full resolution (colour quality 88, normal maps 95), or the original bytes
 * when WebP would not be smaller or the image is not PNG/JPEG.
 */
export async function webpOf(image, mimeType, normal) {
  if (!/^image\/(png|jpeg)$/.test(mimeType)) return { image, mimeType };
  const webp = await sharp(Buffer.from(image)).webp({ quality: normal ? 95 : 88, alphaQuality: 100, effort: 4 }).toBuffer();
  return webp.byteLength < image.byteLength ? { image: new Uint8Array(webp), mimeType: "image/webp" } : { image, mimeType };
}

/**
 * One swap per build. `groups` are the load groups (groups.json), `startId`
 * the start group's id, `outDir` the export folder.
 */
export function createKtx2Swap({ groups, startId, outDir }) {
  const index = readIndex();
  const groupOfFile = new Map();
  for (const group of groups) {
    for (const asset of [...group.assets, ...Object.values(group.variants ?? {}).flat()]) groupOfFile.set(asset.replace(/^\//, ""), group.id);
  }
  /** sha → ids of the groups whose GLBs embed it. */
  const groupsOfTexture = new Map();
  /** sha → the cached KTX2 and the WebP it replaces, or null when WebP stays. */
  const decisions = new Map();
  /** sha256 of a swapped-in KTX2 → the WebP it replaced (for the light pack). */
  const replaced = new Map();
  const counts = { ktx2: new Set(), bySize: new Set(), keep: new Set(), miss: new Set(), media: 0 };
  /** Every size decision, for .next/export-optimization.json. */
  const log = [];

  const cached = key => index[key] && existsSync(ktx2File(key)) ? readFileSync(ktx2File(key)) : null;

  return {
    /** Pre-pass: the GLB at out/`file` embeds a texture whose original bytes hash to `sha`. */
    note(file, sha) {
      const group = groupOfFile.get(file);
      if (!group) return;
      const ids = groupsOfTexture.get(sha) ?? new Set();
      ids.add(group);
      groupsOfTexture.set(sha, ids);
    },

    /**
     * Swap cached KTX2 images into `document` (out/`file`), before the WebP
     * step. `sourceHashes` maps each texture to the sha of its original bytes.
     * Only the load groups' GLBs change: other pages load GLBs without a
     * KTX2 loader. Returns the number of textures swapped.
     */
    async swapTextures(document, file, sourceHashes) {
      let swapped = 0;
      if (!groupOfFile.has(file)) return 0;
      for (const texture of document.getRoot().listTextures()) {
        const sha = sourceHashes.get(texture);
        const ids = sha && groupsOfTexture.get(sha);
        if (!ids) continue;
        if (keepsWebP(texture.getName(), texture.getURI())) { counts.keep.add(sha); continue; }
        if (!decisions.has(sha)) {
          const ktx2 = cached(sha);
          if (!ktx2) { counts.miss.add(sha); decisions.set(sha, null); continue; }
          const webp = await webpOf(texture.getImage(), texture.getMimeType(), isNormalMap(texture));
          const inStart = groupRule([...ids], startId) === "start";
          const use = prefersKtx2({ ktx2Bytes: ktx2.byteLength, webpBytes: webp.image.byteLength, inStart });
          decisions.set(sha, use ? { ktx2: new Uint8Array(ktx2), webp } : null);
          (use ? counts.ktx2 : counts.bySize).add(sha);
          log.push({ texture: texture.getName(), key: sha.slice(0, 12), groups: [...ids], rule: inStart ? "start" : "later", ktx2: ktx2.byteLength, webp: webp.image.byteLength, ktx2Used: use });
          if (use) replaced.set(sha256(ktx2), webp);
        }
        const decision = decisions.get(sha);
        if (!decision) continue;
        texture.setImage(decision.ktx2).setMimeType("image/ktx2");
        swapped++;
      }
      if (swapped) document.createExtension(KHRTextureBasisu).setRequired(true);
      return swapped;
    },

    /** The WebP a swapped-in KTX2 replaced, for the light pack's small textures. */
    liteSource(image) {
      return replaced.get(sha256(image));
    },

    /**
     * Write `.ktx2` siblings for the plain-loader /media files that pass the
     * bytes rule. Returns their public paths, for the manifest's `ktx2Media`.
     */
    swapMedia() {
      const written = [];
      for (const group of groups) {
        for (const media of [...group.assets, ...Object.values(group.variants ?? {}).flat()]) {
          if (!PLAIN_LOADER_MEDIA.includes(media)) continue;
          const file = path.join(outDir, media);
          if (!existsSync(file)) continue;
          if (keepsWebP(media)) { counts.keep.add(media); continue; }
          const webp = readFileSync(file);
          const ktx2 = cached(mediaKey(webp));
          if (!ktx2) { counts.miss.add(media); continue; }
          const use = prefersKtx2({ ktx2Bytes: ktx2.byteLength, webpBytes: webp.byteLength, inStart: group.id === startId });
          log.push({ texture: media, groups: [group.id], rule: group.id === startId ? "start" : "later", ktx2: ktx2.byteLength, webp: webp.byteLength, ktx2Used: use });
          if (!use) { counts.bySize.add(media); continue; }
          const target = media.replace(/\.webp$/, ".ktx2");
          writeFileSync(path.join(outDir, target), ktx2);
          written.push(target);
          counts.ktx2.add(media); counts.media++;
        }
      }
      return written;
    },

    /** Every size decision made so far. */
    decisions: () => log,

    /** One summary line for the build log (after swapMedia). */
    summary() {
      const miss = counts.miss.size ? `; ${counts.miss.size} cache misses kept WebP (run npm run encode:ktx2 locally)` : "; no cache misses";
      return `KTX2: ${counts.ktx2.size} textures use KTX2 (${counts.media} media), ${counts.bySize.size} kept WebP by size, ${counts.keep.size} kept by KEEP_WEBP${miss}.`;
    },
  };
}
