// Local-only KTX2 encoder for the venue's textures (`npm run encode:ktx2`).
//
// The Cloudflare build never encodes: Basis encoding takes seconds to minutes
// per texture. This script fills a committed cache, assets-cache/ktx2/, that
// the build's swap step (scripts/ktx2-swap.mjs) reads. A texture missing from
// the cache simply stays WebP in the build.
//
// Sources:
// - every texture embedded in the GLBs that src/venue/loading/groups.json
//   lists, read from public/ (the original embedded bytes, before the build
//   re-encodes them to WebP). Key: sha256 of those bytes.
// - every /media file the venue loads with a plain TextureLoader
//   (PLAIN_LOADER_MEDIA: the CC0 surface sets in venueFloor.ts and
//   technicalMaterials.ts). TextureLoader uploads with flipY, and a compressed
//   texture cannot be flipped on upload, so these are encoded Y-flipped and
//   keyed `<sha>-flipy` (wool-normal.webp is also embedded in two GLBs, where
//   glTF wants it unflipped).
//
// Modes: UASTC (RDO, Zstandard supercompression) for normal maps and for the
// names on UASTC_NAMES; ETC1S quality 128 otherwise. Colour slots
// (base colour, emissive, *-color media) are sRGB; data maps are linear.
// Every file gets a full mip chain. index.json maps each key to
// { mode, bytes }; keys already in it are skipped, so a re-run only encodes
// what is new. Delete a key (and its file) to re-encode it.
//
// ktx2-encoder is imported only when this file runs as a script, so the build
// can import the policy below (KEEP_WEBP, PLAIN_LOADER_MEDIA) without it.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CACHE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "assets-cache", "ktx2");
export const INDEX_FILE = path.join(CACHE_DIR, "index.json");

/**
 * Textures never converted: lettering, logos and signage, plus any texture
 * that failed the look check. Matched against a GLB texture's name or a
 * media path.
 */
export const KEEP_WEBP = [/logo|letter|sign|brand/i];

/** Texture names or media paths encoded as UASTC although they are not normal maps. */
export const UASTC_NAMES = [];

/** The /media files loaded by a plain TextureLoader (venueFloor.ts, technicalMaterials.ts). */
export const PLAIN_LOADER_MEDIA = ["floor", "steel", "cast", "wool"]
  .flatMap(id => ["color", "orm", "normal"].map(map => `/media/technical-showcase/materials/${id}-${map}.webp`));

const matches = (list, names) => list.some(rule => names.some(name => name && (typeof rule === "string" ? name === rule : rule.test(name))));
/** True when a texture with any of these names (GLB texture name, media path) must stay WebP. */
export const keepsWebP = (...names) => matches(KEEP_WEBP, names);

export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
/** Cache key of a plain-loader media file: encoded Y-flipped for TextureLoader's flipY. */
export const mediaKey = bytes => `${sha256(bytes)}-flipy`;
export const ktx2File = key => path.join(CACHE_DIR, `${key}.ktx2`);

/** The cache index: { [key]: { mode: "etc1s" | "uastc", bytes } }. */
export function readIndex() {
  return existsSync(INDEX_FILE) ? JSON.parse(readFileSync(INDEX_FILE, "utf8")) : {};
}

const COLOUR_SLOTS = /^(baseColorTexture|emissiveTexture|sheenColorTexture|specularColorTexture|diffuseTexture)$/;

/** How a texture is encoded, from its glTF slots or media path. */
export function encodingFor({ name, slots = [], media = false }) {
  const normal = media ? /-normal\.webp$/.test(name) : slots.some(slot => /normal/i.test(slot));
  const srgb = media ? /-color\.webp$/.test(name) : slots.some(slot => COLOUR_SLOTS.test(slot));
  if (!media && srgb && slots.some(slot => !COLOUR_SLOTS.test(slot))) throw new Error(`${name} is used as colour and as data (${slots.join(", ")})`);
  return { mode: normal || matches(UASTC_NAMES, [name]) ? "uastc" : "etc1s", srgb, normal, yFlip: media };
}

async function collectSources() {
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
  const { listTextureSlots } = await import("@gltf-transform/functions");
  const { MeshoptDecoder } = await import("meshoptimizer");
  const { LOAD_GROUPS } = await import("../src/venue/loading/groups.ts");
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const sources = new Map();
  const add = (key, source) => {
    const existing = sources.get(key);
    if (existing && (existing.mode !== source.mode || existing.srgb !== source.srgb)) throw new Error(`${source.name} and ${existing.name} share bytes but need different encodings`);
    if (!existing) sources.set(key, source);
  };
  const paths = [...new Set(LOAD_GROUPS.flatMap(group => [...group.assets, ...Object.values(group.variants ?? {}).flat()]))];
  for (const asset of paths.filter(p => p.endsWith(".glb"))) {
    const document = await io.read(path.join("public", asset));
    for (const texture of document.getRoot().listTextures()) {
      const image = texture.getImage();
      if (!image || keepsWebP(texture.getName(), texture.getURI())) continue;
      add(sha256(image), { name: texture.getName() || asset, from: asset, image, ...encodingFor({ name: texture.getName(), slots: listTextureSlots(texture) }) });
    }
  }
  for (const media of PLAIN_LOADER_MEDIA) {
    if (!paths.includes(media) || keepsWebP(media)) continue;
    const image = readFileSync(path.join("public", media));
    add(mediaKey(image), { name: media, from: media, image, ...encodingFor({ name: media, media: true }) });
  }
  return sources;
}

/** Basis prints its progress to stdout; keep only this script's own lines. */
async function quietly(work) {
  const write = process.stdout.write;
  process.stdout.write = () => true;
  try { return await work(); } finally { process.stdout.write = write; }
}

async function main() {
  const { encodeToKTX2 } = await import("ktx2-encoder");
  const sharp = (await import("sharp")).default;
  const imageDecoder = async bytes => {
    const { data, info } = await sharp(Buffer.from(bytes)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { width: info.width, height: info.height, data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength) };
  };
  mkdirSync(CACHE_DIR, { recursive: true });
  const index = readIndex();
  const sources = await collectSources();
  const todo = [...sources].filter(([key]) => !index[key] || !existsSync(ktx2File(key)));
  console.log(`${sources.size} textures, ${sources.size - todo.length} cached, ${todo.length} to encode.`);
  const started = Date.now();
  for (const [i, [key, source]] of todo.entries()) {
    const t0 = Date.now();
    const options = source.mode === "uastc"
      ? { isUASTC: true, enableRDO: true, needSupercompression: true }
      : { isUASTC: false, qualityLevel: 128 };
    const ktx2 = await quietly(() => encodeToKTX2(source.image, {
      ...options, generateMipmap: true, imageDecoder,
      isNormalMap: source.normal, isPerceptual: source.srgb, isSetKTX2SRGBTransferFunc: source.srgb, isYFlip: source.yFlip,
    }));
    writeFileSync(ktx2File(key), ktx2);
    index[key] = { mode: source.mode, bytes: ktx2.byteLength };
    writeFileSync(INDEX_FILE, JSON.stringify(Object.fromEntries(Object.entries(index).sort()), null, 2) + "\n");
    console.log(`[${i + 1}/${todo.length}] ${source.mode} ${source.name} (${source.from}): ${(source.image.byteLength / 1024).toFixed(0)} → ${(ktx2.byteLength / 1024).toFixed(0)} KiB in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  const total = Object.values(index).reduce((sum, entry) => sum + entry.bytes, 0);
  console.log(`Encoded ${todo.length} in ${((Date.now() - started) / 1000).toFixed(0)} s. Cache: ${Object.keys(index).length} files, ${(total / 1048576).toFixed(1)} MiB.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
