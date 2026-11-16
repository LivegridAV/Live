// Post-export step for static hosting (Cloudflare Pages).
//
// Runs on the generated `out/` folder only. Source assets in `public/` are never
// modified, so the editable/protected GLBs and their fingerprint checks stay intact.
//
// 1. Prune heavy binary assets that no source file references (superseded
//    iterations such as projection-botanical-v8…v11 remain in `public/` for
//    history, but are not uploaded).
// 2. Re-encode embedded PNG/JPEG textures as WebP (EXT_texture_webp) at their
//    original resolution — colour at quality 88, normal maps at 95 — keeping a
//    texture's original bytes whenever WebP would not be smaller.
//    Compress every remaining GLB with EXT_meshopt_compression in FILTER mode.
//    FILTER mode decodes back to float attributes in the same local space, so
//    code that reads geometry, bounding boxes or node transforms is unaffected.
//    The runtime decoder is already enabled by drei's useGLTF (useMeshopt
//    defaults to true even when Draco is disabled).
// 3. Fail the build if any file exceeds the host's per-file limit.
//
// Usage: node scripts/optimize-export.mjs [--dry-run] [--no-compress]
import { readdirSync, readFileSync, statSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from "@gltf-transform/extensions";
import { reorder, listTextureSlots } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
// Must be the same sharp that @gltf-transform/functions loads (via
// ndarray-pixels): two libvips builds in one process corrupt each other.
import sharp from "sharp";

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
const report = { pruned, compressed: [] };
if (compress) {
  await MeshoptEncoder.ready; await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
  let saved = 0, textureSaved = 0;
  for (const file of walk(OUT).filter(f => f.toLowerCase().endsWith(".glb"))) {
    const original = statSync(file).size;
    const document = await io.read(file);
    const used = document.getRoot().listExtensionsUsed().map(e => e.extensionName);
    if (used.includes("EXT_meshopt_compression") || used.includes("KHR_draco_mesh_compression")) continue;
    textureSaved += await texturesToWebP(document);
    await document.transform(reorder({ encoder: MeshoptEncoder, target: "size" }));
    document.createExtension(EXTMeshoptCompression).setRequired(true)
      .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
    const output = await io.writeBinary(document);
    if (output.byteLength >= original) continue;
    if (!dryRun) writeFileSync(file, output);
    saved += original - output.byteLength;
    report.compressed.push({ file: rel(file), before: original, after: output.byteLength });
  }
  console.log(`Compressed ${report.compressed.length} GLBs, saving ${mib(saved)} (of which textures ${mib(textureSaved)})${dryRun ? " [dry run]" : ""}.`);
}

/** Re-encode PNG/JPEG textures as WebP at full resolution; returns bytes saved. */
async function texturesToWebP(document) {
  let saved = 0, converted = 0;
  for (const texture of document.getRoot().listTextures()) {
    const image = texture.getImage();
    if (!image || !/^image\/(png|jpeg)$/.test(texture.getMimeType())) continue;
    const normal = listTextureSlots(texture).some(slot => /normal/i.test(slot));
    const webp = await sharp(Buffer.from(image))
      .webp({ quality: normal ? 95 : 88, alphaQuality: 100, effort: 4 })
      .toBuffer();
    if (webp.byteLength >= image.byteLength) continue;
    texture.setImage(new Uint8Array(webp)).setMimeType("image/webp");
    saved += image.byteLength - webp.byteLength;
    converted++;
  }
  if (converted) document.createExtension(EXTTextureWebP).setRequired(true);
  return saved;
}

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
