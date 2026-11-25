// Post-export step for static hosting (Cloudflare Pages).
//
// Runs on the generated `out/` folder only. Source assets in `public/` are never
// modified, so the editable/protected GLBs and their fingerprint checks stay intact.
//
// 1. Prune heavy binary assets that no source file references (superseded
//    iterations such as projection-botanical-v8…v11 remain in `public/` for
//    history, but are not uploaded).
// 2. Swap in KTX2 textures from the committed local cache where they pay for
//    themselves in bytes (scripts/ktx2-swap.mjs; the build never encodes, a
//    cache miss keeps WebP). Then re-encode the remaining embedded PNG/JPEG
//    textures as WebP (EXT_texture_webp) at their original resolution —
//    colour at quality 88, normal maps at 95 — keeping a texture's original
//    bytes whenever WebP would not be smaller.
//    Compress every remaining GLB with EXT_meshopt_compression in FILTER mode.
//    FILTER mode decodes back to float attributes in the same local space, so
//    code that reads geometry, bounding boxes or node transforms is unaffected.
//    The runtime decoder is already enabled by drei's useGLTF (useMeshopt
//    defaults to true even when Draco is disabled).
//    A texture embedded identically in several GLBs is written once to
//    /textures/ and referenced from each GLB by relative URI.
// 3. Write the derived models next to the final GLBs (scripts/derived-models.mjs):
//    `<name>.lite.glb` for every non-start group GLB (the light pack, small
//    WebP textures even where the full file uses KTX2) and `<name>.lod1.glb`
//    for the visitors and the projection interior (sharing the full file's
//    /textures/, KTX2 included). Then write `.ktx2` siblings of the
//    plain-loader /media files that pass the same bytes rule.
// 4. Fail the build if any file exceeds the host's per-file limit.
// 5. Write out/models/load-manifest.json: the final transfer size of every load
//    group in src/venue/loading/groups.json (the runtime plans the opening from it),
//    each group's light pack (fetched after opening, only for the groups that
//    stream in later; not counted in any group's bytes), the lod1 models and
//    the KTX2 media. A group counts a KTX2 media file instead of its WebP, and
//    the first group (in journey order) that uses KTX2 counts the /basis/
//    transcoder.
//
// Usage: node scripts/optimize-export.mjs [--dry-run] [--no-compress]
import { readdirSync, readFileSync, statSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from "@gltf-transform/extensions";
import { reorder } from "@gltf-transform/functions";
import { LOAD_GROUPS, START_GROUP, assetsFor } from "../src/venue/loading/groups.ts";
import { PHONE_MEDIA_SCALE, phoneMediaPath, phoneMediaSources } from "../src/venue/loading/phoneMedia.ts";
import sharp from "sharp";
import { phonePath, setImageURIs, writeDerivedModels } from "./derived-models.mjs";
import { createKtx2Swap, webpOf, isNormalMap } from "./ktx2-swap.mjs";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
// sharp (WebP encoding) is imported by ktx2-swap.mjs and derived-models.mjs.
// It must be the same sharp that @gltf-transform/functions loads (via
// ndarray-pixels): two libvips builds in one process corrupt each other.

const OUT = path.resolve("out");
const MAX_FILE_BYTES = 25 * 1024 * 1024; // Cloudflare Pages per-asset limit
const MAX_FILES = 20_000;                // Cloudflare Pages files per deployment
const HEAVY = /\.(glb|gltf|bin|webp|png|jpe?g|avif|mp4|webm|mov|ktx2|hdr|exr)$/i;
const ASSET_ROOTS = ["models", "media", "brand", "videos"];
// Directories whose file names are resolved from string-literal stems in source
// (e.g. <ExpoAsset name="grand-rental-shell"/> → /models/expo/grand-rental-shell.glb).
const STEM_RESOLVED_DIRS = new Set(["models/expo/"]);
// Public JSON maps keyed by every asset name ever fingerprinted. Being listed in
// them does not mean an asset is loaded, so they are not treated as references.
const LOOKUP_MAPS = new Set(["signage-revisions.json"]);

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const compress = !args.has("--no-compress");

// groups.ts is imported as TypeScript, which needs Node's built-in type stripping.
if (!process.features.typescript) throw new Error(`optimize-export needs Node >= 22.18 (built-in TypeScript type stripping) to read src/venue/loading/groups.ts; this is Node ${process.version}. Use the version in .nvmrc (package.json engines: node >= 22.18).`);
if (!existsSync(OUT)) throw new Error("out/ not found — run `next build` first.");

function walk(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, files); else files.push(file);
  }
  return files;
}
const rel = file => path.relative(OUT, file).split(path.sep).join("/");
const mib = bytes => (bytes / 1048576).toFixed(1) + " MiB";

// ---------------------------------------------------------------- references
// Source text plus any public text file (layout JSON, CSS, SVG) that source
// itself references — closed transitively, so stale JSON for superseded
// iterations cannot keep their GLBs alive.
const sourceText = walk(path.resolve("src"))
  .filter(f => /\.(tsx?|jsx?|mjs|css|json|md)$/.test(f))
  .map(f => readFileSync(f, "utf8"));
const publicText = walk(path.resolve("public"))
  .filter(f => /\.(json|css|svg|txt|webmanifest)$/.test(f) && !LOOKUP_MAPS.has(path.basename(f)))
  .map(f => ({ name: path.basename(f), stem: path.basename(f).replace(/\.[^.]+$/, ""), text: readFileSync(f, "utf8") }));

let corpus = sourceText.join("\n");
const mentions = (name, stem) => corpus.includes(name) || corpus.includes(`"${stem}"`) || corpus.includes(`'${stem}'`) || corpus.includes("`" + stem);
for (let changed = true; changed;) {
  changed = false;
  for (const file of publicText) {
    if (file.included || !mentions(file.name, file.stem)) continue;
    file.included = true; corpus += "\n" + file.text; changed = true;
  }
}

// Directory prefixes that source builds paths from at runtime ("/media/x/" + file,
// `/media/x/${file}`). Everything below them is kept. A runtime-built prefix that
// is not explicitly understood fails the build instead of risking a broken site.
const keepDirs = new Set();
const prefixPattern = new RegExp(`["'\`]/((?:${ASSET_ROOTS.join("|")})/[^"'\`\${}]*/)(?:["'\`]|\\$\\{)`, "g");
for (const match of corpus.matchAll(prefixPattern)) {
  const dir = match[1];
  if (!STEM_RESOLVED_DIRS.has(dir)) keepDirs.add(dir);
}

// ------------------------------------------------------------------- prune
const before = walk(OUT);
const pruned = [];
for (const file of before) {
  const r = rel(file);
  if (!HEAVY.test(r) || !ASSET_ROOTS.some(root => r.startsWith(root + "/"))) continue;
  if ([...keepDirs].some(dir => r.startsWith(dir))) continue;
  const name = path.basename(r), stem = name.replace(/\.[^.]+$/, "");
  if (mentions(name, stem)) continue;
  pruned.push({ file: r, bytes: statSync(file).size });
  if (!dryRun) rmSync(file);
}
const prunedBytes = pruned.reduce((sum, p) => sum + p.bytes, 0);
console.log(`Pruned ${pruned.length} unreferenced assets (${mib(prunedBytes)})${dryRun ? " [dry run]" : ""}.`);
console.log(`Kept runtime-built directories: ${[...keepDirs].join(", ") || "none"}`);

// ---------------------------------------------------------------- compress
const report = { pruned, compressed: [], sharedTextures: [], derived: [], ktx2Media: [] };
const ktx2 = createKtx2Swap({ groups: LOAD_GROUPS, startId: START_GROUP, outDir: OUT });
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
if (compress) {
  const glbs = walk(OUT).filter(f => f.toLowerCase().endsWith(".glb"));

  // Textures embedded byte-for-byte in more than one GLB (the licensed avatar
  // atlases repeat in every stall's visitors file; finish maps repeat across
  // interiors). Each is written once to /textures/ (named by content hash, so
  // it can be cached for good; see public/_headers) and referenced by URI,
  // so the browser downloads and caches it once instead of once per stall.
  const textureFiles = new Map();
  for (const file of glbs) {
    const document = await io.read(file);
    const hashes = new Set(document.getRoot().listTextures().map(texture => texture.getImage()).filter(Boolean).map(contentHash));
    for (const hash of hashes) { textureFiles.set(hash, (textureFiles.get(hash) ?? 0) + 1); ktx2.note(rel(file), hash); }
  }
  const shared = new Set([...textureFiles].filter(([, count]) => count > 1).map(([hash]) => hash));
  const sharedWritten = new Map();

  let saved = 0, textureSaved = 0, ktx2Textures = 0;
  for (const file of glbs) {
    const original = statSync(file).size;
    const document = await io.read(file);
    const used = document.getRoot().listExtensionsUsed().map(e => e.extensionName);
    if (used.includes("EXT_meshopt_compression") || used.includes("KHR_draco_mesh_compression")) continue;
    const sourceHashes = new Map(document.getRoot().listTextures().map(texture => [texture, texture.getImage() ? contentHash(texture.getImage()) : null]));
    ktx2Textures += await ktx2.swapTextures(document, rel(file), sourceHashes);
    textureSaved += await texturesToWebP(document);
    await document.transform(reorder({ encoder: MeshoptEncoder, target: "size" }));
    document.createExtension(EXTMeshoptCompression).setRequired(true)
      .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

    // Detach shared images and record the URI to patch into the GLB's JSON
    // afterwards. The writer pairs image data with images by position, so a
    // detached image keeps a 1-byte placeholder whose bufferView the patch
    // then disconnects (an unused bufferView is valid glTF).
    const externalImages = new Map();
    document.getRoot().listTextures().forEach((texture, index) => {
      const hash = sourceHashes.get(texture);
      if (!hash || !shared.has(hash)) return;
      const extension = { "image/webp": "webp", "image/ktx2": "ktx2", "image/jpeg": "jpg" }[texture.getMimeType()] ?? "png";
      const target = `textures/${hash.slice(0, 20)}.${extension}`;
      if (!sharedWritten.has(target)) {
        sharedWritten.set(target, texture.getImage().byteLength);
        if (!dryRun) { mkdirSync(path.join(OUT, "textures"), { recursive: true }); writeFileSync(path.join(OUT, target), texture.getImage()); }
      }
      externalImages.set(index, path.posix.relative(path.posix.dirname(rel(file)), target));
      texture.setImage(new Uint8Array(1));
    });

    let output = await io.writeBinary(document);
    if (externalImages.size) output = setImageURIs(output, externalImages);
    if (output.byteLength >= original) continue;
    if (!dryRun) writeFileSync(file, output);
    saved += original - output.byteLength;
    report.compressed.push({ file: rel(file), before: original, after: output.byteLength, sharedImages: externalImages.size });
  }
  const sharedBytes = [...sharedWritten.values()].reduce((sum, bytes) => sum + bytes, 0);
  report.sharedTextures = [...sharedWritten.keys()];
  console.log(`Compressed ${report.compressed.length} GLBs, saving ${mib(saved)} (of which textures ${mib(textureSaved)})${dryRun ? " [dry run]" : ""}.`);
  console.log(`Shared ${sharedWritten.size} textures used by several GLBs (${mib(sharedBytes)} written once).`);
  console.log(`KTX2 swapped into ${ktx2Textures} GLB texture slots.`);
}

function contentHash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Re-encode PNG/JPEG textures as WebP at full resolution (ktx2-swap's webpOf); returns bytes saved. */
async function texturesToWebP(document) {
  let saved = 0, converted = 0;
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage();
    if (!image || !/^image\/(png|jpeg)$/.test(texture.getMimeType())) continue;
    const webp = await webpOf(image, texture.getMimeType(), isNormalMap(texture));
    if (webp.mimeType !== "image/webp") continue;
    texture.setImage(webp.image).setMimeType("image/webp");
    saved += image.byteLength - webp.image.byteLength;
    converted++;
  }
  if (converted) document.createExtension(EXTTextureWebP).setRequired(true);
  return saved;
}

// ---------------------------------------------------------- derived models
// From the final files, so they inherit the WebP textures and the shared
// /textures/ references; each derived file is meshopt-compressed in turn.
const derived = await writeDerivedModels({ io, outDir: OUT, groups: LOAD_GROUPS, startId: START_GROUP, compress, dryRun, liteSource: image => ktx2.liteSource(image) });
report.derived = derived.files;
{
  const liteBytes = derived.files.filter(f => f.kind === "lite").reduce((sum, f) => sum + f.bytes, 0);
  const phoneBytes = derived.files.filter(f => f.kind === "phone").reduce((sum, f) => sum + f.bytes, 0);
  console.log(`Derived ${derived.files.length} models: light pack ${mib(liteBytes)} in ${derived.files.filter(f => f.kind === "lite").length} files, ${derived.lod1.length} lod1, ${derived.phone.length} phone copies (${mib(phoneBytes)}, plus ${derived.phoneTextures.length} shared phone textures)${dryRun ? " [dry run]" : ""}.`);
  for (const f of derived.files) console.log(`  ${f.file}: ${(f.bytes / 1024).toFixed(0)} KiB, ${f.triangles} of ${f.sourceTriangles} triangles`);
}

// ------------------------------------------------------------- phone media
// `<name>.phone.webp` at PHONE_MEDIA_SCALE of the width and height for every
// load-group screen image phoneMediaSources lists (src/venue/loading/phoneMedia.ts).
// Phones always load this file, so one is written even when it would not be
// smaller (then with the original bytes).
const phoneMedia = [];
{
  let saved = 0;
  for (const source of phoneMediaSources(LOAD_GROUPS)) {
    const file = path.join(OUT, source);
    if (!existsSync(file)) throw new Error(`phone media: load group image missing from out/: ${source}`);
    const original = readFileSync(file);
    const { width, height } = await sharp(original).metadata();
    const scaled = await sharp(original)
      .resize(Math.max(1, Math.round(width * PHONE_MEDIA_SCALE)), Math.max(1, Math.round(height * PHONE_MEDIA_SCALE)))
      .webp({ quality: 82, alphaQuality: 90, effort: 5 }).toBuffer();
    const bytes = scaled.byteLength < original.byteLength ? scaled : original;
    if (!dryRun) writeFileSync(path.join(OUT, phoneMediaPath(source)), bytes);
    saved += original.byteLength - bytes.byteLength;
    phoneMedia.push(phoneMediaPath(source));
  }
  console.log(`Phone media: ${phoneMedia.length} half-size screen images written, ${mib(saved)} lighter than their full files${dryRun ? " [dry run]" : ""}.`);
}

// -------------------------------------------------------------- KTX2 media
const ktx2Media = dryRun ? [] : ktx2.swapMedia();
report.ktx2Media = ktx2Media;
report.ktx2 = ktx2.decisions();
console.log(`KTX2 media written next to their WebP: ${ktx2Media.length ? ktx2Media.join(", ") : "none"}.`);
console.log(ktx2.summary());

// ------------------------------------------------------------ host limits
const after = walk(OUT);
const oversized = after.map(f => ({ file: rel(f), bytes: statSync(f).size })).filter(f => f.bytes > MAX_FILE_BYTES);
const total = after.reduce((sum, f) => sum + statSync(f).size, 0);
console.log(`Export: ${after.length} files, ${mib(total)}; largest allowed file ${mib(MAX_FILE_BYTES)}.`);
writeFileSync(path.resolve(".next", "export-optimization.json"), JSON.stringify(report, null, 2));
if (!dryRun && oversized.length) {
  throw new Error("Files exceed the 25 MiB hosting limit:\n" + oversized.map(f => `  ${f.file} (${mib(f.bytes)})`).join("\n"));
}
if (after.length > MAX_FILES) throw new Error(`Export has ${after.length} files; host limit is ${MAX_FILES}.`);

// ---------------------------------------------------------- load manifest
/** Files a GLB pulls in besides itself: external images named by relative URI. */
function externalImages(file) {
  const glb = readFileSync(file);
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString("utf8"));
  return (json.images ?? []).map(image => image.uri).filter(uri => uri && !uri.startsWith("data:"))
    .map(uri => path.resolve(path.dirname(file), decodeURIComponent(uri)));
}

/** True when a GLB embeds a KTX2 image. */
function embedsKtx2(file) {
  const glb = readFileSync(file);
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString("utf8"));
  return (json.images ?? []).some(image => image.mimeType === "image/ktx2");
}

/**
 * Transfer size of a set of assets; a file shared between them counts once.
 * A media file with a KTX2 sibling in `ktx2Media` is fetched as that sibling.
 */
function transferBytes(assets) {
  const files = new Set();
  for (const listed of assets) {
    const sibling = listed.replace(/\.webp$/, ".ktx2");
    const asset = ktx2Media.includes(sibling) ? sibling : listed;
    const file = path.join(OUT, asset);
    if (!existsSync(file)) throw new Error(`load group asset missing from out/: ${asset}`);
    files.add(file);
    if (asset.toLowerCase().endsWith(".glb")) {
      for (const image of externalImages(file)) {
        if (!existsSync(image)) throw new Error(`${asset} references missing texture ${rel(image)}`);
        files.add(image);
      }
    }
  }
  const usesKtx2 = [...files].some(file => file.endsWith(".ktx2") || (file.endsWith(".glb") && embedsKtx2(file)));
  return { bytes: [...files].reduce((sum, file) => sum + statSync(file).size, 0), files: [...files], usesKtx2 };
}

/** The Basis transcoder (public/basis/), fetched once, with the first KTX2 file. */
const BASIS_FILES = ["basis_transcoder.js", "basis_transcoder.wasm"].map(file => path.join(OUT, "basis", file));

function writeLoadManifest() {
  // A group's light pack is not part of its bytes: it is counted on its own
  // (liteBytes), since a group may open on its light pack alone.
  // The first group (journey order) that uses KTX2 also fetches the transcoder.
  const transcoderGroup = LOAD_GROUPS.findIndex(group => transferBytes(assetsFor(group, new Set())).usesKtx2);
  if (transcoderGroup >= 0 && !BASIS_FILES.every(file => existsSync(file))) throw new Error("KTX2 is used but out/basis/ has no Basis transcoder (public/basis/).");
  const transcoderBytes = transcoderGroup >= 0 ? BASIS_FILES.reduce((sum, file) => sum + statSync(file).size, 0) : 0;
  // `phone`: the group as phones fetch it. Phones always have a mobile frame,
  // so it starts from the mobile files; every GLB is swapped for its phone
  // copy and every listed screen image for its phone copy.
  const phoneSources = new Set(phoneMediaSources(LOAD_GROUPS));
  const filesFor = (group, conditions) => conditions.has("phone")
    ? assetsFor(group, new Set(["mobile"])).map(asset => asset.toLowerCase().endsWith(".glb") ? phonePath(asset)
      : phoneSources.has(asset) ? phoneMediaPath(asset) : asset)
    : assetsFor(group, conditions);
  const groupBytes = (group, i, conditions) => transferBytes(filesFor(group, conditions)).bytes + (i === transcoderGroup ? transcoderBytes : 0);
  // The light pack's size: what the opening planner (liteBeforeOpening) and
  // the opening bar count for a group that opens on its light pack.
  const liteBytes = paths => dryRun ? 0 : paths.reduce((sum, p) => sum + statSync(path.join(OUT, p)).size, 0);
  const manifest = {
    groups: LOAD_GROUPS.map((group, i) => {
      const lite = derived.lite[group.id] ?? [];
      return {
        id: group.id,
        bytes: groupBytes(group, i, new Set()),
        bytesByCondition: Object.fromEntries(["mobile", "festival", "phone"].map(c => [c, groupBytes(group, i, new Set([c]))])),
        lite,
        liteBytes: liteBytes(lite),
      };
    }),
    lod1: derived.lod1,
    phone: derived.phone,
    ktx2Media,
  };
  if (!dryRun) writeFileSync(path.join(OUT, "models", "load-manifest.json"), JSON.stringify(manifest, null, 2));
  for (const g of manifest.groups) console.log(`  ${g.id}: ${mib(g.bytes)} (mobile ${mib(g.bytesByCondition.mobile)}, festival ${mib(g.bytesByCondition.festival)}, phone ${mib(g.bytesByCondition.phone)}); light pack ${mib(g.liteBytes)} in ${g.lite.length} files`);
  console.log(`Load manifest written for ${manifest.groups.length} groups.`);
}
writeLoadManifest();
