// Derived models written next to the final, compressed GLBs in out/.
//
// - `<name>.lite.glb` for every GLB of a non-start load group: the light pack
//   a zone shows until its full group is warm. Triangles simplified to 15 %
//   (error 0.02), every texture shrunk to at most 128 px and embedded (a KTX2
//   texture from the WebP it replaced, so lite files stay WebP), morph
//   targets and skins dropped. Fetched right after opening, only for the
//   groups the opening plan leaves to stream in later.
// - `<name>.lod1.glb` for every `*-visitors.glb` and the projection interior:
//   simplified to 40 % (error 0.01) for the medium and low quality tiers.
//   Textures are unchanged (KTX2 included), and shared `/textures/` files
//   stay shared, so a lod1 costs only its geometry.
//
// Node names and the node hierarchy are kept (simplify only rewrites
// primitives), so the venue places a derived model exactly like its source.
// Every derived file gets the same EXT_meshopt_compression as the rest.
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Logger, PropertyType } from "@gltf-transform/core";
import { EXTMeshoptCompression, EXTTextureWebP } from "@gltf-transform/extensions";
import { prune, reorder, simplify, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

export const LITE = { ratio: 0.15, error: 0.02, maxTexture: 128 };
export const LOD1 = { ratio: 0.40, error: 0.01 };

export const litePath = file => file.replace(/\.glb$/i, ".lite.glb");
export const lod1Path = file => file.replace(/\.glb$/i, ".lod1.glb");
const isDerived = file => /\.(lite|lod1)\.glb$/i.test(file);
/** Sources that get a lod1: every visitors file and the projection interior. */
export const wantsLod1 = file => !isDerived(file)
  && (/-visitors\.glb$/i.test(file) || /(^|\/)projection-finish-v2-blender-interior\.glb$/i.test(file));

/** Triangles a document draws (indexed or not). */
export function triangleCount(document) {
  let triangles = 0;
  for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    if (primitive.getMode() !== 4) continue; // TRIANGLES
    const indices = primitive.getIndices();
    triangles += (indices ? indices.getCount() : primitive.getAttribute("POSITION")?.getCount() ?? 0) / 3;
  }
  return triangles;
}

/** Drop morph targets, skins, and the animation channels that drove them. */
function dropMorphAndSkin(document) {
  const root = document.getRoot();
  for (const node of root.listNodes()) if (node.getSkin()) node.setSkin(null);
  for (const skin of root.listSkins()) skin.dispose();
  for (const mesh of root.listMeshes()) {
    mesh.setWeights([]);
    for (const primitive of mesh.listPrimitives()) {
      for (const target of primitive.listTargets()) { primitive.removeTarget(target); target.dispose(); }
      for (const semantic of primitive.listSemantics()) if (/^(JOINTS|WEIGHTS)_\d+$/.test(semantic)) primitive.setAttribute(semantic, null);
    }
  }
  for (const animation of root.listAnimations()) {
    for (const channel of animation.listChannels()) if (channel.getTargetPath() === "weights") channel.dispose();
    if (animation.listChannels().length === 0) animation.dispose();
  }
}

/**
 * Shrink every embedded texture to fit `max` px, in its own format. A KTX2
 * texture is shrunk from the WebP it replaced (`liteSource`), so the light
 * pack never needs the Basis transcoder.
 */
async function shrinkTextures(document, max, liteSource) {
  for (const texture of document.getRoot().listTextures()) {
    let image = texture.getImage();
    if (!image) continue;
    if (texture.getMimeType() === "image/ktx2") {
      const source = liteSource?.(image);
      if (!source) throw new Error(`lite: no WebP source for KTX2 texture "${texture.getName()}"`);
      texture.setImage(source.image).setMimeType(source.mimeType);
      image = source.image;
    }
    const resized = sharp(Buffer.from(image)).resize(max, max, { fit: "inside", withoutEnlargement: true });
    const mime = texture.getMimeType();
    const encoded = mime === "image/webp" ? resized.webp({ quality: 80, alphaQuality: 90, effort: 4 })
      : mime === "image/jpeg" ? resized.jpeg({ quality: 80 }) : resized.png({ compressionLevel: 9 });
    texture.setImage(new Uint8Array(await encoded.toBuffer()));
    texture.setURI(""); // embed it: the small copy is this file's own
  }
}

async function simplifyDocument(document, { ratio, error }) {
  await MeshoptSimplifier.ready;
  await document.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error }),
    // Unused accessors and skins only. Nodes (empty ones included), UVs
    // without a texture and extras stay: the venue reads all of them.
    prune({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.SKIN], keepLeaves: true, keepAttributes: true, keepExtras: true, keepSolidTextures: true }),
  );
}

/** Give the listed images an external `uri` in a GLB's JSON chunk (their bufferView is a 1-byte placeholder). */
export function setImageURIs(glb, uris) {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLength)));
  for (const [index, uri] of uris) {
    const image = json.images[index];
    if (json.bufferViews[image.bufferView]?.byteLength !== 1) throw new Error(`image ${index} is not a detached placeholder`);
    delete image.bufferView;
    image.uri = uri;
  }
  let text = JSON.stringify(json);
  while (Buffer.byteLength(text) % 4) text += " ";
  const jsonBytes = Buffer.from(text);
  const rest = glb.subarray(20 + jsonLength);
  const out = Buffer.alloc(20 + jsonBytes.length + rest.byteLength);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jsonBytes.length, 12); out.writeUInt32LE(0x4e4f534a, 16);
  jsonBytes.copy(out, 20); Buffer.from(rest).copy(out, 20 + jsonBytes.length);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
}

/** The relative URIs of a GLB file's external images, by image index. */
function externalImageURIs(file) {
  const glb = readFileSync(file);
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString("utf8"));
  return new Map((json.images ?? []).map((image, index) => [index, image.uri]).filter(([, uri]) => uri && !uri.startsWith("data:")));
}

/**
 * Serialize with meshopt compression, as optimize-export does. Images that
 * were external in `source` (shared /textures/ files) stay external when
 * `keepExternal` is set; otherwise every image is embedded.
 */
async function writeCompressed(io, document, source, { compress, keepExternal }) {
  if (compress) {
    await document.transform(reorder({ encoder: MeshoptEncoder, target: "size" }));
    document.createExtension(EXTMeshoptCompression).setRequired(true)
      .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
  }
  const external = keepExternal ? externalImageURIs(source) : new Map();
  const textures = document.getRoot().listTextures();
  for (const index of external.keys()) textures[index].setImage(new Uint8Array(1));
  let output = await io.writeBinary(document);
  if (external.size) output = setImageURIs(output, external);
  return output;
}

/**
 * Snap float positions and UVs to a power-of-two grid: 2^-14 of each
 * accessor's largest coordinate (under 1 mm on a 12 m booth), 1/4096 for UVs.
 * The values stay float32 in the same local space (node transforms are not
 * touched, unlike KHR_mesh_quantization), but their low mantissa bits become
 * zero, which the meshopt vertex codec stores in far fewer bytes.
 */
function snapAttributes(document) {
  const seen = new Set();
  for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    for (const semantic of primitive.listSemantics()) {
      const accessor = primitive.getAttribute(semantic);
      const array = accessor.getArray();
      if (seen.has(accessor) || !(array instanceof Float32Array) || !(semantic === "POSITION" || /^TEXCOORD_\d+$/.test(semantic))) continue;
      seen.add(accessor);
      let largest = 0;
      for (const value of array) largest = Math.max(largest, Math.abs(value));
      const step = semantic === "POSITION" ? 2 ** (Math.ceil(Math.log2(Math.max(largest, 2 ** -20))) - 14) : 1 / 4096;
      for (let i = 0; i < array.length; i++) array[i] = Math.round(array[i] / step) * step;
      accessor.setArray(array);
    }
  }
}

/** Make a lite document from a source document (in place). */
export async function makeLite(document, liteSource) {
  dropMorphAndSkin(document);
  await simplifyDocument(document, LITE);
  snapAttributes(document);
  await shrinkTextures(document, LITE.maxTexture, liteSource);
  const root = document.getRoot();
  for (const extension of root.listExtensionsUsed()) if (extension.extensionName === "KHR_texture_basisu") extension.dispose();
  if (root.listTextures().some(texture => texture.getMimeType() === "image/webp")) document.createExtension(EXTTextureWebP).setRequired(true);
}

/** Make a lod1 document from a source document (in place). */
export async function makeLod1(document) {
  await simplifyDocument(document, LOD1);
}

/**
 * Write every derived model for the load groups into `outDir`.
 * Returns the public paths of the lite files per group, the lod1 paths, and
 * a per-file report. `liteSource(ktx2Bytes)` returns the WebP image a KTX2
 * texture replaced ({ image, mimeType }), for the light pack.
 */
export async function writeDerivedModels({ io, outDir, groups, startId, compress = true, dryRun = false, liteSource }) {
  const lite = Object.fromEntries(groups.map(group => [group.id, []]));
  const lod1 = [], files = [];
  const glbsOf = group => [...new Set([...group.assets, ...Object.values(group.variants ?? {}).flat()])].filter(p => p.toLowerCase().endsWith(".glb"));
  const jobs = [];
  for (const group of groups) for (const asset of glbsOf(group)) {
    if (group.id !== startId) jobs.push({ group: group.id, asset, kind: "lite" });
    if (wantsLod1(asset)) jobs.push({ group: group.id, asset, kind: "lod1" });
  }
  for (const job of jobs) {
    const source = path.join(outDir, job.asset);
    const document = (await io.read(source)).setLogger(new Logger(Logger.Verbosity.WARN));
    const before = triangleCount(document);
    if (job.kind === "lite") await makeLite(document, liteSource); else await makeLod1(document);
    const output = await writeCompressed(io, document, source, { compress, keepExternal: job.kind === "lod1" });
    const target = job.kind === "lite" ? litePath(job.asset) : lod1Path(job.asset);
    if (!dryRun) writeFileSync(path.join(outDir, target), output);
    if (job.kind === "lite") lite[job.group].push(target); else if (!lod1.includes(target)) lod1.push(target);
    files.push({ kind: job.kind, file: target, source: job.asset, bytes: output.byteLength, sourceBytes: statSync(source).size, triangles: triangleCount(document), sourceTriangles: before });
  }
  return { lite, lod1, files };
}
