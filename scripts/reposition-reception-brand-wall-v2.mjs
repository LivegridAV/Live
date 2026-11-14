/** Rigidly relocate the existing reception sign without round-tripping its GLB.
 * Only native POSITION float slots change. Normals, UVs, indices, materials,
 * textures and every other assembly are preserved byte for byte.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = path.join(root, "public/models/expo");
const reportRoot = path.join(root, "reports/reception-brand-wall-20261019");
const sourceName = "grand-reception.glb";
const targetName = "grand-reception-brand-wall-v2.glb";
const manifestName = "grand-reception-brand-wall-v2-layout.json";
const source = fs.readFileSync(path.join(assetRoot, sourceName));
const sourceSha = sha(source);
const layout = JSON.parse(fs.readFileSync(path.join(assetRoot, "grand-reception-layout.json"), "utf8"));
assert.equal(sourceSha, layout.geometry.sha256, "Unexpected source reception geometry");
assert.equal(source.readUInt32LE(0), 0x46546c67);
assert.equal(source.readUInt32LE(4), 2);
assert.equal(source.readUInt32LE(8), source.length);

const chunks = [];
for (let offset = 12; offset < source.length;) {
  const length = source.readUInt32LE(offset);
  chunks.push({ type: source.readUInt32LE(offset + 4), bytes: source.subarray(offset + 8, offset + 8 + length) });
  offset += 8 + length;
}
const jsonChunk = chunks.find(c => c.type === 0x4e4f534a);
const binaryChunk = chunks.find(c => c.type === 0x004e4942);
assert.ok(jsonChunk && binaryChunk);
const gltf = JSON.parse(jsonChunk.bytes.toString("utf8"));
const binary = Buffer.from(binaryChunk.bytes);
const originalBinary = Buffer.from(binaryChunk.bytes);
const delta = [2.054403305053711, 0, .8193845748901367];
const originalPivot = layout.assemblies.right.position.map(Math.fround);
const newPivot = originalPivot.map((v, i) => Math.fround(v + delta[i]));
const yaw = layout.assemblies.right.rotation_y;
const axis = [Math.cos(yaw), 0, -Math.sin(yaw)];
const normal = [Math.sin(yaw), 0, Math.cos(yaw)];
const allowedMaterials = new Set(["Reception | matte charcoal panel", "Reception | porcelain brand lettering"]);
const allowedBytes = new Set();
const changedAccessors = new Set();
const movedBefore = [], movedAfter = [], allAfter = [], changes = [], meshProof = [];
let moved = 0, unchanged = 0, triangles = 0;

function sha(buffer) { return createHash("sha256").update(buffer).digest("hex"); }
function accessorInfo(index) {
  const accessor = gltf.accessors[index], view = gltf.bufferViews[accessor.bufferView];
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
  const bytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
  assert.ok(components && bytes && !accessor.sparse);
  return { accessor, components, bytes, offset: (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0), stride: view.byteStride ?? components * bytes };
}
function readAccessor(index, buffer = binary) {
  const info = accessorInfo(index), read = { 5121: "readUInt8", 5123: "readUInt16LE", 5125: "readUInt32LE", 5126: "readFloatLE" }[info.accessor.componentType];
  return Array.from({ length: info.accessor.count }, (_, i) => Array.from({ length: info.components }, (_, c) => buffer[read](info.offset + i * info.stride + c * info.bytes)));
}
function bounds(points) {
  return points.reduce((result, point) => {
    point.forEach((value, i) => { result.min[i] = Math.min(result.min[i], value); result.max[i] = Math.max(result.max[i], value); });
    return result;
  }, { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
}
function inside(p) {
  const d = p.map((v, i) => v - originalPivot[i]);
  const x = d[0] * axis[0] + d[2] * axis[2];
  const z = d[0] * normal[0] + d[2] * normal[2];
  return Math.abs(x) <= 1.01 && Math.abs(z) <= .14 && p[1] >= .1199 && p[1] <= 11.13;
}

for (const node of gltf.nodes) {
  if (node.mesh === undefined) continue;
  assert.ok(!node.matrix && !node.translation && !node.rotation && !node.scale, "Expected baked native identity transforms");
  for (const primitive of gltf.meshes[node.mesh].primitives) {
    assert.equal(primitive.mode ?? 4, 4, "Only native triangle geometry is expected");
    const material = gltf.materials[primitive.material].name;
    const role = node.extras?.grandRole ?? "interior";
    const positions = readAccessor(primitive.attributes.POSITION, originalBinary);
    const indices = readAccessor(primitive.indices, originalBinary).map(v => v[0]);
    const selected = new Set();
    if (role === "interior" && allowedMaterials.has(material)) {
      const parents = positions.map((_, i) => i);
      const find = i => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
      for (let i = 0; i < indices.length; i += 3) {
        parents[find(indices[i])] = find(indices[i + 1]);
        parents[find(indices[i + 2])] = find(indices[i + 1]);
      }
      const components = new Map();
      positions.forEach((_, i) => { const component = find(i); if (!components.has(component)) components.set(component, []); components.get(component).push(i); });
      for (const component of components.values()) if (component.every(i => inside(positions[i]))) for (const i of component) selected.add(i);
    }
    let selectedTriangles = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const count = indices.slice(i, i + 3).filter(v => selected.has(v)).length;
      assert.ok(count === 0 || count === 3, "Selection would cut a neighbouring triangle");
      if (count === 3) selectedTriangles++;
    }
    const info = accessorInfo(primitive.attributes.POSITION);
    assert.equal(info.accessor.componentType, 5126);
    for (const i of selected) {
      movedBefore.push(positions[i]);
      for (const c of [0, 2]) {
        const offset = info.offset + i * info.stride + c * 4;
        binary.writeFloatLE(positions[i][c] + delta[c], offset);
        for (let b = 0; b < 4; b++) allowedBytes.add(offset + b);
      }
    }
    const after = readAccessor(primitive.attributes.POSITION);
    for (let i = 0; i < positions.length; i++) {
      const expected = positions[i].map((v, c) => selected.has(i) ? Math.fround(v + delta[c]) : v);
      assert.deepEqual(after[i], expected);
      if (selected.has(i)) movedAfter.push(after[i]);
      allAfter.push(after[i]);
    }
    if (selected.size) {
      const expected = material === "Reception | matte charcoal panel" ? 96 : 7514;
      assert.equal(selected.size, expected, "The existing panel or complete glyph assembly changed");
      info.accessor.min = bounds(after).min;
      info.accessor.max = bounds(after).max;
      changedAccessors.add(primitive.attributes.POSITION);
      changes.push({ mesh: node.name, vertices: selected.size, faces: selectedTriangles });
    }
    for (const [semantic, accessor] of Object.entries(primitive.attributes)) if (semantic !== "POSITION") {
      assert.deepEqual(readAccessor(accessor), readAccessor(accessor, originalBinary), `${semantic} changed`);
    }
    assert.deepEqual(readAccessor(primitive.indices), readAccessor(primitive.indices, originalBinary), "Topology changed");
    moved += selected.size; unchanged += positions.length - selected.size; triangles += indices.length / 3;
    meshProof.push({ material, role, vertices: positions.length, translatedVertices: selected.size, triangles: indices.length / 3, otherPositionsNormalsUVsAndIndicesPreserved: true });
  }
}
assert.equal(moved, 7610);
assert.equal(unchanged, 130043);
assert.equal(triangles, 183596);
let changedByteCount = 0;
for (let i = 0; i < binary.length; i++) if (binary[i] !== originalBinary[i]) { assert.ok(allowedBytes.has(i), "A non-POSITION binary byte changed"); changedByteCount++; }
const encodedJson = Buffer.from(JSON.stringify(gltf), "utf8");
const paddedJson = Buffer.alloc(Math.ceil(encodedJson.length / 4) * 4, 0x20);
encodedJson.copy(paddedJson);
const outputChunks = chunks.map(c => ({ type: c.type, bytes: c === jsonChunk ? paddedJson : c === binaryChunk ? binary : c.bytes }));
const target = Buffer.alloc(12 + outputChunks.reduce((n, c) => n + 8 + c.bytes.length, 0));
target.writeUInt32LE(0x46546c67, 0); target.writeUInt32LE(2, 4); target.writeUInt32LE(target.length, 8);
let offset = 12;
for (const chunk of outputChunks) { target.writeUInt32LE(chunk.bytes.length, offset); target.writeUInt32LE(chunk.type, offset + 4); chunk.bytes.copy(target, offset + 8); offset += 8 + chunk.bytes.length; }
fs.writeFileSync(path.join(assetRoot, targetName), target);
const sourceJson = JSON.parse(jsonChunk.bytes.toString("utf8"));
const normalizedJson = structuredClone(gltf);
for (const i of changedAccessors) {
  normalizedJson.accessors[i].min = sourceJson.accessors[i].min;
  normalizedJson.accessors[i].max = sourceJson.accessors[i].max;
}
assert.deepEqual(normalizedJson, sourceJson, "Only position accessor extrema may change in the JSON");
const fit = layout.assemblies.panorama;
const theta = Math.PI + fit.rotation_y - 1.48 / 2;
const endpoint = [fit.position[0] + Math.sin(theta) * 9 * fit.scale[0], fit.position[2] + Math.cos(theta) * 9 * fit.scale[0]];
layout.version = "reception-brand-wall-v2-20261019";
layout.geometry = { file: targetName, bytes: target.length, sha256: sha(target), bounds: bounds(allAfter), triangles };
layout.assemblies.right.position = newPivot;
const audit = { sourceFile: sourceName, sourceSha256: sourceSha, targetFile: targetName, targetSha256: layout.geometry.sha256,
  ledRightEndpointXZ: endpoint, jointMetres: .03, originalPivot, newPivot, translation: delta, yawUnchanged: yaw,
  scaleUnchanged: layout.assemblies.right.scale, movedBoundsBefore: bounds(movedBefore), movedBoundsAfter: bounds(movedAfter),
  changedMeshes: changes, translatedVertices: moved, unchangedVertices: unchanged, trianglesUnchanged: triangles,
  allOtherVerticesPreserved: true, sourceFilePreserved: sha(fs.readFileSync(path.join(assetRoot, sourceName))) === sourceSha,
  exportMethod: "Direct original GLB POSITION byte patch; no mesh/material/image roundtrip" };
layout.brandingWallRelocation = audit;
fs.writeFileSync(path.join(assetRoot, manifestName), JSON.stringify(layout, null, 2) + "\n");
fs.mkdirSync(reportRoot, { recursive: true });
fs.writeFileSync(path.join(reportRoot, "geometry-check.json"), JSON.stringify(audit, null, 2) + "\n");
const proof = { status: "pass", method: "Decoded original accessors and native triangle components; exact binary comparison outside permitted POSITION floats",
  sourceSha256: sourceSha, targetSha256: sha(target), nativeVertices: moved + unchanged, translatedVertices: moved,
  otherVerticesPreserved: unchanged, translation: delta, triangles, normalsUVsIndicesMaterialsTexturesByteExact: true,
  jsonChangesLimitedToPositionAccessorExtrema: true, binaryBytesChanged: changedByteCount,
  earlierBlenderRoundtripRejected: "Preserved triangle positions and UVs but altered foliage normals; final artifact uses original binary normals unchanged.", meshes: meshProof };
fs.writeFileSync(path.join(reportRoot, "export-check.json"), JSON.stringify(proof, null, 2) + "\n");
console.log(JSON.stringify({ status: proof.status, translatedVertices: moved, preservedVertices: unchanged, triangles, sha256: sha(target), bytes: target.length }));
