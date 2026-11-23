import * as THREE from "three";

/**
 * Static mesh merging: fewer draw calls per frame, in every pass (screen,
 * shadow map, the entrance water and floor reflections all redraw the same
 * meshes).
 *
 * Meshes under `root` that can be drawn together (same material instance, the
 * same vertex attribute layout, shadow flags, layers, render order and
 * culling) are baked into one geometry in `root`'s local space and mounted
 * directly under `root`. They also share one ZoneGroup by construction: the
 * callers pass a model or group built in code, and ZoneGroup only wraps JSX
 * above such roots, so a merge never spans two zone gates. Meshes that share
 * one geometry and material at least `instanceMin` times become one
 * InstancedMesh instead. Merging by
 * the material instance keeps every onBeforeCompile patch and every material
 * that code tunes later (media, LED, finishes) intact.
 *
 * Never merged: skinned meshes, morph targets, objects with their own
 * onBeforeRender, mirrored transforms, hidden objects, anything under a node an
 * animation clip moves (callers put the asset's clips on `root.animations`),
 * and anything `keep` accepts (it is asked about every node, so keeping a
 * group keeps its whole subtree).
 *
 * The source geometries are not touched (they belong to the loader's cache);
 * new geometries and instance buffers are marked `userData.mergedStatic` for
 * disposeMergedStatic().
 */
export type MergeOptions = { keep?: (object: THREE.Object3D) => boolean; instanceMin?: number };

const TRANSFORMED = new Set(["position", "normal", "tangent"]);
type Attribute = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
const interleaved = (attribute: Attribute): attribute is THREE.InterleavedBufferAttribute => (attribute as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute === true;
const rawArray = (attribute: Attribute) => interleaved(attribute) ? attribute.data.array : attribute.array;

/** Names and flags venue code reads after a model is prepared: those nodes stay their own objects. */
export function readByVenueCode(object: THREE.Object3D) {
  const data = object.userData;
  return !!(data.grandRole === "overhead" || data.grandRole === "section-wall" || data.grandOverhead
    || data.projectionOverhead || data.ledRentalOverhead || data.venuePlanarReflection
    || data.rental2026Pavilion || data.projectionPavilion
    || object.name === "Reflective L-shaped basin water");
}

function drawCount(root: THREE.Object3D) {
  let n = 0;
  root.traverse(object => { if ((object as THREE.Mesh).isMesh) n++; });
  return n;
}

/** Nodes the clips on `root.animations` drive. */
function animatedNodes(root: THREE.Object3D) {
  const nodes = new Set<THREE.Object3D>();
  for (const clip of root.animations) for (const track of clip.tracks) {
    const { nodeName } = THREE.PropertyBinding.parseTrackName(track.name);
    const node = (nodeName ? THREE.PropertyBinding.findNode(root, nodeName) : root) as THREE.Object3D | null;
    if (node) nodes.add(node);
  }
  return nodes;
}

function hasOwnHook(object: THREE.Object3D) {
  return object.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender
    || object.onAfterRender !== THREE.Object3D.prototype.onAfterRender;
}

function layoutKey(geometry: THREE.BufferGeometry) {
  const names = Object.keys(geometry.attributes).sort();
  return names.map(name => {
    const attribute = geometry.attributes[name] as Attribute, array = rawArray(attribute);
    // Baked attributes come out as plain floats, so their source type does not matter.
    return TRANSFORMED.has(name) ? `${name}:${attribute.itemSize}` : `${name}:${attribute.itemSize}:${array.constructor.name}:${attribute.normalized}`;
  }).join(",") + (geometry.index ? "|indexed" : "|soup");
}

type Candidate = { mesh: THREE.Mesh; matrix: THREE.Matrix4 };

function mergeable(mesh: THREE.Mesh) {
  const geometry = mesh.geometry;
  return mesh.constructor === THREE.Mesh && !Array.isArray(mesh.material) && mesh.children.length === 0
    && !!geometry.attributes.position && Object.keys(geometry.morphAttributes).length === 0
    && geometry.drawRange.start === 0 && geometry.drawRange.count === Infinity && !hasOwnHook(mesh);
}

/** glTF's normalized integer types and the factor that maps them back to [-1, 1] or [0, 1]. */
const NORMALIZED = new Map<unknown, [number, boolean]>([[Int8Array, [1 / 127, true]], [Uint8Array, [1 / 255, false]],
  [Int16Array, [1 / 32767, true]], [Uint16Array, [1 / 65535, false]], [Int32Array, [1 / 2147483647, true]], [Uint32Array, [1 / 4294967295, false]]]);

/** Where an attribute's components sit (plain or interleaved) and how to read them as floats. */
function strided(attribute: Attribute) {
  const plain = !interleaved(attribute);
  const array = plain ? attribute.array : attribute.data.array;
  const normalized = attribute.normalized ? NORMALIZED.get(array.constructor) : undefined;
  return { array, stride: plain ? attribute.itemSize : attribute.data.stride, offset: plain ? 0 : attribute.offset,
    scale: normalized?.[0] ?? 1, signed: normalized?.[1] ?? false };
}

/** Writes the candidate's position, normal or tangent into out at o, baked by its matrix. */
function bakeVectors(name: string, attribute: Attribute, matrix: THREE.Matrix4, out: Float32Array, o: number) {
  const { array: a, stride, offset, scale, signed } = strided(attribute), size = attribute.itemSize, n = attribute.count, e = matrix.elements;
  if (name === "position") {
    for (let i = 0, k = offset; i < n; i++, k += stride, o += size) {
      let x = a[k] * scale, y = a[k + 1] * scale, z = a[k + 2] * scale;
      if (signed) { x = Math.max(x, -1); y = Math.max(y, -1); z = Math.max(z, -1); }
      out[o] = e[0] * x + e[4] * y + e[8] * z + e[12];
      out[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      out[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
    return;
  }
  // Normals by the normal matrix, tangents (xyz) by the matrix's rotation and
  // scale, both renormalized (so a quantized source needs no clamping).
  const m = name === "normal" ? new THREE.Matrix3().getNormalMatrix(matrix).elements : new THREE.Matrix3().setFromMatrix4(matrix).elements;
  for (let i = 0, k = offset; i < n; i++, k += stride, o += size) {
    const x = a[k], y = a[k + 1], z = a[k + 2];
    const rx = m[0] * x + m[3] * y + m[6] * z, ry = m[1] * x + m[4] * y + m[7] * z, rz = m[2] * x + m[5] * y + m[8] * z;
    const length = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    out[o] = rx / length; out[o + 1] = ry / length; out[o + 2] = rz / length;
    if (size === 4) out[o + 3] = signed ? Math.max(a[k + 3] * scale, -1) : a[k + 3] * scale;
  }
}

/** One geometry, in the root's space, holding every candidate's triangles. */
function bake(candidates: Candidate[]) {
  const first = candidates[0].mesh.geometry;
  const names = Object.keys(first.attributes);
  const vertices = candidates.reduce((n, c) => n + c.mesh.geometry.attributes.position.count, 0);
  const merged = new THREE.BufferGeometry();
  for (const name of names) {
    const source = first.attributes[name] as Attribute;
    const itemSize = source.itemSize;
    if (TRANSFORMED.has(name)) {
      const out = new Float32Array(vertices * itemSize);
      let o = 0;
      for (const { mesh, matrix } of candidates) {
        const attribute = mesh.geometry.attributes[name] as Attribute;
        bakeVectors(name, attribute, matrix, out, o);
        o += attribute.count * itemSize;
      }
      merged.setAttribute(name, new THREE.BufferAttribute(out, itemSize));
      continue;
    }
    const Type = rawArray(source).constructor as new (length: number) => THREE.TypedArray;
    const out = new Type(vertices * itemSize);
    let o = 0;
    for (const { mesh } of candidates) {
      const attribute = mesh.geometry.attributes[name] as Attribute;
      if (interleaved(attribute)) {
        const { data, offset } = attribute;
        for (let i = 0; i < attribute.count; i++) for (let c = 0; c < itemSize; c++) out[o++] = data.array[i * data.stride + offset + c];
      } else {
        out.set(attribute.array.subarray(0, attribute.count * itemSize), o);
        o += attribute.count * itemSize;
      }
    }
    merged.setAttribute(name, new THREE.BufferAttribute(out, itemSize, source.normalized));
  }
  if (first.index) {
    const total = candidates.reduce((n, c) => n + c.mesh.geometry.index!.count, 0);
    const index = vertices > 65535 ? new Uint32Array(total) : new Uint16Array(total);
    let o = 0, base = 0;
    for (const { mesh } of candidates) {
      const source = mesh.geometry.index!.array;
      for (let i = 0; i < source.length; i++) index[o++] = source[i] + base;
      base += mesh.geometry.attributes.position.count;
    }
    merged.setIndex(new THREE.BufferAttribute(index, 1));
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  merged.userData.mergedStatic = true;
  return merged;
}

function copyDrawState(target: THREE.Mesh, source: THREE.Mesh) {
  target.castShadow = source.castShadow;
  target.receiveShadow = source.receiveShadow;
  target.layers.mask = source.layers.mask;
  target.renderOrder = source.renderOrder;
  target.frustumCulled = source.frustumCulled;
}

export function mergeStaticMeshes(root: THREE.Object3D, opts: MergeOptions = {}): { before: number; after: number } {
  const keep = opts.keep ?? (() => false), instanceMin = opts.instanceMin ?? 4;
  const before = drawCount(root);
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const animated = animatedNodes(root);
  const buckets = new Map<string, Candidate[]>();
  const ids = new Map<object, number>();
  const id = (value: object) => { let n = ids.get(value); if (n === undefined) ids.set(value, n = ids.size); return n; };
  const visit = (object: THREE.Object3D) => {
    if (keep(object) || animated.has(object) || (object !== root && !object.visible)) return;
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mergeable(mesh)) {
      const matrix = toRoot.clone().multiply(mesh.matrixWorld);
      if (matrix.determinant() > 0) {
        const material = mesh.material as THREE.Material;
        const key = [id(material), layoutKey(mesh.geometry), mesh.castShadow, mesh.receiveShadow, mesh.layers.mask,
          mesh.renderOrder, mesh.frustumCulled].join("|");
        let bucket = buckets.get(key);
        if (!bucket) buckets.set(key, bucket = []);
        bucket.push({ mesh, matrix });
      }
    }
    for (const child of object.children) visit(child);
  };
  visit(root);

  const emptied = new Set<THREE.Object3D>();
  const detach = (mesh: THREE.Mesh) => { const parent = mesh.parent; if (parent) { parent.remove(mesh); emptied.add(parent); } };
  for (const bucket of buckets.values()) {
    const byGeometry = new Map<THREE.BufferGeometry, Candidate[]>();
    for (const candidate of bucket) {
      const list = byGeometry.get(candidate.mesh.geometry);
      if (list) list.push(candidate); else byGeometry.set(candidate.mesh.geometry, [candidate]);
    }
    const rest: Candidate[] = [];
    for (const [geometry, list] of byGeometry) {
      if (list.length < instanceMin) { rest.push(...list); continue; }
      const source = list[0].mesh;
      const instanced = new THREE.InstancedMesh(geometry, source.material, list.length);
      list.forEach((candidate, i) => instanced.setMatrixAt(i, candidate.matrix));
      instanced.instanceMatrix.needsUpdate = true;
      copyDrawState(instanced, source);
      instanced.name = `${source.name || "mesh"} · ${list.length} instances`;
      instanced.userData.mergedStatic = true;
      instanced.computeBoundingSphere();
      list.forEach(candidate => detach(candidate.mesh));
      root.add(instanced);
    }
    if (rest.length < 2) continue;
    const source = rest[0].mesh;
    const merged = new THREE.Mesh(bake(rest), source.material);
    copyDrawState(merged, source);
    merged.name = `${(source.material as THREE.Material).name || "mesh"} · ${rest.length} merged`;
    rest.forEach(candidate => detach(candidate.mesh));
    root.add(merged);
  }
  // Drop the plain nodes merging left empty (never the root, a kept node or an animated one).
  for (let node of emptied) {
    while (node !== root && node.children.length === 0 && !(node as THREE.Mesh).isMesh && !keep(node) && !animated.has(node) && node.parent) {
      const parent: THREE.Object3D = node.parent;
      parent.remove(node);
      node = parent;
    }
  }
  return { before, after: drawCount(root) };
}

/** Frees what mergeStaticMeshes created under root (merged geometries and instance buffers). */
export function disposeMergedStatic(root: THREE.Object3D) {
  root.traverse(object => {
    if ((object as THREE.InstancedMesh).isInstancedMesh && object.userData.mergedStatic) (object as THREE.InstancedMesh).dispose();
    else if ((object as THREE.Mesh).isMesh && (object as THREE.Mesh).geometry.userData.mergedStatic) (object as THREE.Mesh).geometry.dispose();
  });
}
