import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import * as THREE from "three";
import { warmScene } from "../src/venue/three/warmScene.ts";

const read = file => readFileSync(file, "utf8");
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const pages = files("out").filter(f => f.endsWith(".html") && !/404|_not-found/.test(f));
const resolves = url => {
  const route = decodeURIComponent(url.split(/[?#]/)[0]);
  return [path.join("out", route), path.join("out", `${route}.html`), path.join("out", route, "index.html")].some(existsSync);
};

test("GPU warm-up restores hidden zones and renderer state on completion, failure and cancellation", async () => {
  const scene = new THREE.Scene();
  const zone = new THREE.Group(); zone.visible = false;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  zone.add(mesh); scene.add(zone);
  const source = new THREE.PointLight(); source.visible = false; zone.add(source);
  const spot = new THREE.SpotLight(); spot.castShadow = true; spot.shadow.autoUpdate = false; scene.add(spot);
  const previous = new THREE.WebGLRenderTarget(2,2);
  let target = previous, compiled = 0, rendered = 0, disposed = false;
  const renderer = {
    compile: () => { compiled++; },
    compileAsync: () => { throw new Error("timer-based compile must not run during mutable startup"); },
    getRenderTarget: () => target,
    setRenderTarget: value => { target = value; },
    render: () => {
      rendered++;
      assert.equal(compiled, 2, "both colour-space variants are submitted before the upload draw");
      assert.equal(zone.visible, true);
      assert.equal(mesh.frustumCulled, false);
      assert.equal(source.visible, false, "virtual sources must never enter the light layout");
      assert.equal(spot.shadow.autoUpdate, true);
      assert.equal(target.width, 32);
      target.addEventListener("dispose", () => { disposed = true; });
    },
  };
  await warmScene(renderer, scene, new THREE.PerspectiveCamera());
  assert.equal(rendered, 1); assert.equal(compiled, 3, "a final pass submits anything the draw added");
  assert.equal(zone.visible, false); assert.equal(mesh.frustumCulled, true);
  assert.equal(spot.shadow.autoUpdate, false); assert.equal(target, previous); assert.equal(disposed, true);
  renderer.render = () => { throw new Error("simulated context failure"); };
  await assert.rejects(warmScene(renderer, scene, new THREE.PerspectiveCamera()), /context failure/);
  assert.equal(zone.visible, false); assert.equal(target, previous);
  const beforeCancel = rendered, compiledBeforeCancel=compiled;
  await warmScene(renderer, scene, new THREE.PerspectiveCamera(), () => true);
  assert.equal(rendered, beforeCancel, "unmounted scenes are not rendered");
  assert.equal(compiled, compiledBeforeCancel, "unmounted scenes do not start more shader work");
  renderer.compile = () => { throw new Error("simulated compile failure"); };
  await assert.rejects(warmScene(renderer, scene, new THREE.PerspectiveCamera()), /compile failure/);
  assert.equal(zone.visible, false); assert.equal(target, previous);
  mesh.geometry.dispose(); mesh.material.dispose(); previous.dispose(); spot.dispose();
});

test("a texture shared by several GLBs downloads once and reaches every model", async () => {
  const { shareTextureDownloads } = await import("../src/venue/three/sharedTextures.ts");
  const fetches = [], bitmap = { width: 4, height: 4 };
  const saved = { window: globalThis.window, fetch: globalThis.fetch, createImageBitmap: globalThis.createImageBitmap };
  globalThis.window = globalThis;
  globalThis.fetch = async url => { fetches.push(url); await new Promise(r => setTimeout(r, 20)); return { blob: async () => "blob" }; };
  globalThis.createImageBitmap = async () => bitmap;
  try {
    shareTextureDownloads();
    const loader = new THREE.ImageBitmapLoader();
    const load = url => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
    // Two stalls ask for the same atlas while it is still downloading (the
    // r185 in-flight promise used to hand the second one `undefined`).
    const [first, second, third] = await Promise.all([load("/models/expo/../../textures/a.webp"),
      load("/models/expo/../../textures/a.webp"), load("/models/expo/../../textures/a.webp")]);
    assert.equal(first, bitmap); assert.equal(second, bitmap); assert.equal(third, bitmap);
    assert.equal(await load("/models/expo/../../textures/a.webp"), bitmap, "later loads reuse the decoded image");
    assert.equal(fetches.length, 1);
    // Anything outside /textures/ is never kept in memory.
    await load("/media/other.webp"); await load("/media/other.webp");
    assert.equal(fetches.length, 3);
  } finally {
    THREE.Cache.clear(); THREE.Cache.enabled = false;
    Object.assign(globalThis, saved);
  }
});

test("exploring cannot change shader light counts or rebuild quality tiers", () => {
  for (const file of files("src/venue/zones").filter(f=>f.endsWith(".tsx"))) {
    assert.doesNotMatch(read(file), /<pointLight\b/, `${file}: use the fixed local light pool`);
  }
  assert.doesNotMatch(read("src/venue/three/screens.tsx"), /<pointLight\b/);
  assert.doesNotMatch(read("src/venue/three/environment.tsx"), /stallRef\.current\.visible\s*=/);
  assert.doesNotMatch(read("src/venue/systems/Quality.tsx"), /setQuality\(/);
  assert.match(read("src/venue/media/MediaContext.tsx"), /if \(!parent\.visible\) return/);
  assert.match(read("src/venue/media/engine.ts"), /e\.importance <= \.02 && this\.painted\.has\(e\)/);
  assert.match(read("src/venue/media/engine.ts"), /image\.decode\(\)\.then/);
  assert.match(read("src/venue/media/engine.ts"), /finally\(\(\) => THREE\.DefaultLoadingManager\.itemEnd\(source\)\)/);
  assert.match(read("src/venue/media/MediaContext.tsx"), /new MediaEngine\(gl, profile\.quality, profile\.isMobile\)/);
});

test("every exported page has valid local navigation and assets", () => {
  assert.ok(pages.length >= 45);
  for (const file of pages) {
    for (const match of read(file).matchAll(/(?:href|src)="(\/[^"\s]*)"/g)) {
      if (match[1].startsWith("//")) continue;
      assert.ok(resolves(match[1]), `${file}: missing ${match[1]}`);
    }
    assert.ok(!read(file).includes('href="#"'), `${file}: dead placeholder`);
  }
});
test("all declared local media and models are present", () => {
  for (const file of files("src").filter(f => /\.(tsx?|css)$/.test(f))) {
    for (const match of read(file).replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/["'(](\/(?:media|models|brand)\/[^"'`)${}]+\.(?:png|jpe?g|webp|mp4|webm|glb|svg))["')]/g)) {
      assert.ok(existsSync(path.join("public", match[1])), `${file}: ${match[1]}`);
    }
  }
});
test("home copy, canonical and crawlable business fallback", () => {
  const html = read("out/index.html");
  assert.match(html, /rel="canonical" href="https:\/\/livegridav.com\/?"/);
  assert.doesNotMatch(html, /noindex|Explore this pavilion|our venue|Walk through an event we built/i);
  for (const text of ["tel:+917801013919", "info@livegridav.com", "/services/av-engineering"]) assert.ok(html.includes(text));
  assert.match(read("out/robots.txt"), /sitemap/i);
  assert.match(read("out/sitemap.xml"), /https:\/\/livegridav.com\/services/);
  assert.match(read("src/app/venue.css"), /\.v-seo\s*\{\s*color: #eef3f2;/);
});
test("brand color, stage labels and continuous tunnel contract", () => {
  assert.match(read("public/brand/lockup-inverse.svg"), /#3fd6c8/i);
  const css = read("src/app/venue.css");
  assert.match(css, /\.v-nav-brand span \{ color: #3fd6c8/);
  assert.match(css, /\.v-loader-word span \{ color: #3fd6c8/);
  const stage = read("src/venue/ui/StageMode.tsx");
  assert.match(stage, /Meetings & Conferences/);
  assert.match(stage, /Celebrations & Social/);
  const tunnel = read("src/venue/zones/Tunnel.tsx");
  assert.match(tunnel, /cinematic-world/);
  assert.doesNotMatch(tunnel, /tunnel-world\.png/);
  assert.match(read("src/venue/three/cinematicWorld.ts"), /vWorld-uEye/);
});

test("entrance keeps the main fascia without a welcome board", () => {
  const arrival = read("src/venue/zones/Arrival.tsx");
  assert.match(arrival, /media="entry-brand"/);
  assert.doesNotMatch(arrival, /entry-sign/);
  assert.doesNotMatch(read("src/venue/data/media.ts"), /entry-sign/);
  assert.doesNotMatch(read("src/venue/media/painters.ts"), /WELCOME LIVEGRIDAV/);
});

test("tunnel uses the enhanced desktop and mobile panorama assets", async () => {
  const tunnel = read("src/venue/zones/Tunnel.tsx");
  for (const [suffix, width, maxBytes] of [["4k", 3840, 2_500_000], ["mobile", 1920, 800_000]]) {
    const file = `cinematic-world-v2-${suffix}.webp`;
    assert.ok(tunnel.includes(file));
    const buffer = readFileSync(`public/media/final/${file}`);
    const metadata = await sharp(buffer).metadata();
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, width / 2);
    assert.ok(buffer.length < maxBytes, `${file} exceeds its transfer budget`);
  }
});

test("tunnel panorama covers the front 180 degrees without rear repetition", () => {
  const shader = read("src/venue/three/cinematicWorld.ts");
  assert.match(shader, /PANORAMA_HORIZONTAL=PI;/);
  assert.match(shader, /PANORAMA_VERTICAL=PI\*\.5;/);
  assert.match(shader, /yaw\/PANORAMA_HORIZONTAL\+\.5/);
  assert.match(shader, /elevation\/PANORAMA_VERTICAL\+\.5/);
  assert.match(shader, /if\(front<=0\.0\) return rear;/);
  const visibleEnvironment = shader.split("vec3 environment(vec3 d) {")[1].split("vec3 sculptureReflection")[0];
  assert.doesNotMatch(visibleEnvironment, /atan\(d\.x,-d\.z\)\/\(2\.0\*PI\)/);
  assert.match(shader, /sculptureReflection\(reflect\(rd,normal\)\)/);
  assert.doesNotMatch(shader, /rd\.xz=mat2/);
  // Cardinal rays for the declared shader projection: the full image width
  // is in front, with the 2:1 asset's vertical angular span scaled equally.
  const uv = (yaw, elevation = 0) => [yaw / Math.PI + .5, elevation / (Math.PI * .5) + .5];
  assert.deepEqual(uv(-Math.PI / 2), [0, .5]);
  assert.deepEqual(uv(0), [.5, .5]);
  assert.deepEqual(uv(Math.PI / 2), [1, .5]);
  assert.deepEqual(uv(0, Math.PI / 4), [.5, 1]);
  assert.deepEqual(uv(0, -Math.PI / 4), [.5, 0]);
  assert.ok(uv(Math.PI)[0] > 1, "rear direction must not wrap into the image");
});

test("build writes a byte manifest per load group, with an opening that fits the budget", () => {
  const manifest = JSON.parse(read("out/models/load-manifest.json"));
  const groups = JSON.parse(read("src/venue/loading/groups.json"));
  assert.deepEqual(manifest.groups.map(g => g.id), groups.map(g => g.id));
  for (const group of manifest.groups) {
    assert.ok(group.bytes > 0, `${group.id} has no bytes`);
    assert.deepEqual(Object.keys(group.bytesByCondition).sort(), ["festival", "mobile"]);
    assert.ok(Array.isArray(group.lite));
  }
  assert.ok(Array.isArray(manifest.ktx2Media));
  const start = manifest.groups.find(g => g.id === "start");
  assert.ok(start.bytes <= 24 * 2 ** 20, `start is ${(start.bytes / 2 ** 20).toFixed(1)} MiB, over the 24 MiB budget`);
});

// ------------------------------------------------------------ derived models
const loadGroups = JSON.parse(read("src/venue/loading/groups.json"));
const groupGlbs = group => [...new Set([...group.assets, ...Object.values(group.variants ?? {}).flat()])].filter(p => p.endsWith(".glb"));
const nonStartGlbs = loadGroups.filter(g => g.id !== "start").flatMap(groupGlbs);
const lod1Sources = loadGroups.flatMap(groupGlbs).filter(p => /-visitors\.glb$/.test(p) || p.endsWith("/projection-finish-v2-blender-interior.glb"));
const outFile = p => path.join("out", p);
const sibling = (p, kind) => p.replace(/\.glb$/, `.${kind}.glb`);
let gltfIO;
async function readModel(p) {
  if (!gltfIO) {
    const { NodeIO } = await import("@gltf-transform/core");
    const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
    const { MeshoptDecoder } = await import("meshoptimizer");
    await MeshoptDecoder.ready;
    gltfIO = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  }
  return gltfIO.read(outFile(p));
}
/** Named nodes with their named ancestry, so the hierarchy is compared too. */
const namedNodes = document => document.getRoot().listNodes().filter(n => n.getName()).map(node => {
  const chain = [];
  for (let n = node; n; n = n.getParentNode()) chain.unshift(n.getName());
  return chain.join("/");
}).sort();
const triangles = document => document.getRoot().listMeshes().flatMap(m => m.listPrimitives())
  .reduce((sum, p) => sum + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0);

// The light pack is off the opening path (fetched after opening, only for
// groups that stream later), so its budget is 8 MiB (fix-round ruling).
test("every non-start GLB has a light-pack sibling, and the light pack fits 8 MiB", () => {
  assert.ok(nonStartGlbs.length >= 10);
  let total = 0;
  for (const p of nonStartGlbs) {
    assert.ok(existsSync(outFile(sibling(p, "lite"))), `missing ${sibling(p, "lite")}`);
    total += readFileSync(outFile(sibling(p, "lite"))).byteLength;
  }
  assert.ok(total <= 8 * 2 ** 20, `light pack is ${(total / 2 ** 20).toFixed(2)} MiB, over 8 MiB`);
});

test("every lite and lod1 model keeps its source's named nodes", async () => {
  const pairs = [...nonStartGlbs.map(p => [p, sibling(p, "lite")]), ...lod1Sources.map(p => [p, sibling(p, "lod1")])];
  for (const [source, derived] of pairs) {
    assert.ok(existsSync(outFile(derived)), `missing ${derived}`);
    assert.deepEqual(namedNodes(await readModel(derived)), namedNodes(await readModel(source)), `${derived} changed its named nodes`);
  }
});

test("each lod1 has at most 45% of its source's triangles, with its textures unchanged", async () => {
  assert.ok(lod1Sources.length >= 7);
  for (const p of lod1Sources) {
    const source = await readModel(p), lod1 = await readModel(sibling(p, "lod1"));
    assert.ok(triangles(lod1) <= 0.45 * triangles(source), `${sibling(p, "lod1")}: ${triangles(lod1)} of ${triangles(source)} triangles`);
    assert.equal(lod1.getRoot().listTextures().length, source.getRoot().listTextures().length);
  }
});

test("lite models drop morphs and skins and shrink every texture to 128 px", async () => {
  for (const p of nonStartGlbs) {
    const lite = await readModel(sibling(p, "lite"));
    assert.equal(lite.getRoot().listSkins().length, 0, `${p}: skins`);
    assert.ok(lite.getRoot().listMeshes().every(m => m.listPrimitives().every(prim => prim.listTargets().length === 0)), `${p}: morph targets`);
    for (const texture of lite.getRoot().listTextures()) {
      assert.ok(!texture.getURI(), `${p}: lite textures are embedded`);
      const { width, height } = await sharp(Buffer.from(texture.getImage())).metadata();
      assert.ok(width <= 128 && height <= 128, `${p}: ${width}x${height} texture`);
    }
  }
});

/** Transfer size of a set of out/ files plus the external textures their GLBs reference, each counted once. */
function transferSize(paths) {
  const files = new Set();
  for (const p of paths) {
    files.add(outFile(p));
    if (!p.endsWith(".glb")) continue;
    const glb = readFileSync(outFile(p));
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString("utf8"));
    for (const image of json.images ?? []) if (image.uri) files.add(path.resolve(path.dirname(outFile(p)), decodeURIComponent(image.uri)));
  }
  return [...files].reduce((sum, f) => sum + readFileSync(f).byteLength, 0);
}

test("the manifest lists each group's light pack (not counted in start) and the lod1 models", () => {
  const manifest = JSON.parse(read("out/models/load-manifest.json"));
  for (const group of loadGroups) {
    const entry = manifest.groups.find(g => g.id === group.id);
    const expected = group.id === "start" ? [] : groupGlbs(group).map(p => sibling(p, "lite"));
    assert.deepEqual([...entry.lite].sort(), expected.sort(), `${group.id} lite`);
  }
  assert.deepEqual([...manifest.lod1].sort(), lod1Sources.map(p => sibling(p, "lod1")).sort());
  const start = manifest.groups.find(g => g.id === "start");
  assert.equal(start.bytes, transferSize(loadGroups[0].assets), "start's bytes are its own files only; the light pack is fetched after opening");
});

test("lite mode and lod1 choice live in the venue's model loading", () => {
  assert.match(read("src/venue/systems/Quality.tsx"), /get\("quality"\)/, "?quality= override is read in detectQuality");
  const scene = read("src/venue/Scene.tsx");
  assert.doesNotMatch(scene, /startZ:\s*camera\.position\.z/, "the planner start is the journey's p=0 camera, not the live camera");
  assert.match(scene, /journeyStartZ\(/);
  const gate = read("src/venue/loading/LoadGroupGate.tsx");
  assert.match(gate, /<LiteGroup id=\{id\}>/, "the gate renders the zone in lite mode until it is warm");
  assert.match(gate, /unsubscribe\(\)/, "the gate stops listening to the store once its group is ready");
  assert.match(read("src/venue/three/ExpoAsset.tsx"), /useModelUrl\(/);
  assert.match(scene, /planOpening\(/, "the opening plan tells the streamer which groups stream later");
  assert.match(scene, /venueOpened\(/, "the light pack is fetched once the venue opens");
  assert.doesNotMatch(read("src/venue/loading/stream.ts"), /loadModel\(path, false, "lite"\)/, "start no longer joins the light pack");
});
