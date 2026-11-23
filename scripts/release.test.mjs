import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import * as THREE from "three";
import { warmScene } from "../src/venue/three/warmScene.ts";
import { wordmarkProblems, checkSignedAsset, SIGNED_ASSETS } from "./brand-check.mjs";

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
const glbJson = file => { const glb = readFileSync(file); return JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString("utf8")); };
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

/**
 * Transfer size of a set of out/ files plus the external textures their GLBs
 * reference, each counted once. A media file the manifest lists in
 * ktx2Media is fetched as its .ktx2 instead.
 */
function transferFiles(paths, ktx2Media = []) {
  const files = new Set();
  for (const p of paths) {
    const ktx2 = p.replace(/\.webp$/, ".ktx2");
    files.add(outFile(ktx2Media.includes(ktx2) ? ktx2 : p));
    if (!p.endsWith(".glb")) continue;
    for (const image of glbJson(outFile(p)).images ?? []) if (image.uri) files.add(path.resolve(path.dirname(outFile(p)), decodeURIComponent(image.uri)));
  }
  return [...files];
}
const sizeOf = list => list.reduce((sum, f) => sum + readFileSync(f).byteLength, 0);
const usesKtx2 = list => list.some(f => f.endsWith(".ktx2") || (f.endsWith(".glb") && (glbJson(f).images ?? []).some(image => image.mimeType === "image/ktx2")));
const BASIS_FILES = ["basis_transcoder.js", "basis_transcoder.wasm"].map(f => path.join("out", "basis", f));

test("the manifest lists each group's light pack (not counted in start) and the lod1 models", () => {
  const manifest = JSON.parse(read("out/models/load-manifest.json"));
  for (const group of loadGroups) {
    const entry = manifest.groups.find(g => g.id === group.id);
    const expected = group.id === "start" ? [] : groupGlbs(group).map(p => sibling(p, "lite"));
    assert.deepEqual([...entry.lite].sort(), expected.sort(), `${group.id} lite`);
  }
  assert.deepEqual([...manifest.lod1].sort(), lod1Sources.map(p => sibling(p, "lod1")).sort());
});

test("each group's bytes are its own files, KTX2 media in place of their WebP, and the transcoder in the first group using KTX2", () => {
  const manifest = JSON.parse(read("out/models/load-manifest.json"));
  let transcoderCounted = false;
  for (const group of loadGroups) {
    const own = transferFiles(group.assets, manifest.ktx2Media);
    const withTranscoder = !transcoderCounted && usesKtx2(own);
    transcoderCounted ||= withTranscoder;
    const expected = sizeOf(own) + (withTranscoder ? sizeOf(BASIS_FILES) : 0);
    assert.equal(manifest.groups.find(g => g.id === group.id).bytes, expected, `${group.id} bytes (light pack excluded${withTranscoder ? ", transcoder included" : ""})`);
  }
  assert.ok(transcoderCounted, "no group uses KTX2");
});

test("lite mode and lod1 choice live in the venue's model loading", () => {
  assert.match(read("src/venue/systems/Quality.tsx"), /get\("quality"\)/, "?quality= override is read in detectQuality");
  const scene = read("src/venue/Scene.tsx");
  // The opening plan runs in the warm-up's hook (Task 6b).
  const opening = read("src/venue/loading/useOpeningPlan.ts");
  assert.match(scene, /useOpeningPlan\(full\)/);
  assert.doesNotMatch(opening, /startZ:\s*camera\.position\.z/, "the planner start is the journey's p=0 camera, not the live camera");
  assert.match(opening, /journeyStartZ\(/);
  assert.match(opening, /liteBeforeOpening\(/, "normal visits open on the entrance and the late light packs");
  const gate = read("src/venue/loading/LoadGroupGate.tsx");
  assert.match(gate, /<LiteGroup id=\{id\}>/, "the gate renders the zone in lite mode until it is warm");
  assert.match(gate, /unsubscribe\(\)/, "the gate stops listening to the store once its group is ready");
  assert.match(read("src/venue/three/ExpoAsset.tsx"), /useModelUrl\(/);
  assert.match(opening, /planOpening\(/, "the opening plan tells the streamer what streams before opening");
  assert.match(scene, /venueOpened\(/, "the rest of the venue streams once it opens");
  assert.doesNotMatch(read("src/venue/loading/stream.ts"), /loadModel\(path, false, "lite"\)/, "start no longer joins the light pack");
});

// ------------------------------------------------------------------- KTX2
// KTX2 textures come from the committed local cache (npm run encode:ktx2);
// the build only swaps them in. See scripts/ktx2-swap.mjs.

test("the KTX2 swap keeps a texture's WebP unless the KTX2 is small enough for its group", async () => {
  const { prefersKtx2, KTX2_LATER_RATIO } = await import("./ktx2-swap.mjs");
  assert.equal(KTX2_LATER_RATIO, 1.25);
  // start: never, however small (the opening must not need the transcoder).
  assert.equal(prefersKtx2({ ktx2Bytes: 1, webpBytes: 100, inStart: true }), false);
  assert.equal(prefersKtx2({ ktx2Bytes: 99, webpBytes: 100, inStart: true }), false);
  assert.equal(prefersKtx2({ ktx2Bytes: 100, webpBytes: 100, inStart: true }), false);
  // later groups: up to 1.25 x the WebP.
  assert.equal(prefersKtx2({ ktx2Bytes: 125, webpBytes: 100, inStart: false }), true);
  assert.equal(prefersKtx2({ ktx2Bytes: 126, webpBytes: 100, inStart: false }), false);
});

test("a texture shared by start and a later group follows the start rule", async () => {
  const { groupRule } = await import("./ktx2-swap.mjs");
  assert.equal(groupRule(["technical", "start"], "start"), "start");
  assert.equal(groupRule(["technical", "projection"], "start"), "later");
});

test("every texture in the exported GLBs is WebP, KTX2 or kept by KEEP_WEBP", async () => {
  const { keepsWebP } = await import("./encode-ktx2.mjs");
  let ktx2 = 0;
  for (const file of files("out").filter(f => f.endsWith(".glb"))) {
    const json = glbJson(file);
    for (const [index, texture] of (json.textures ?? []).entries()) {
      const source = texture.extensions?.KHR_texture_basisu?.source ?? texture.extensions?.EXT_texture_webp?.source ?? texture.source;
      const image = json.images[source];
      const mime = image.mimeType ?? (image.uri?.endsWith(".ktx2") ? "image/ktx2" : image.uri?.endsWith(".webp") ? "image/webp" : "other");
      if (mime === "image/ktx2") {
        ktx2++;
        assert.ok(texture.extensions?.KHR_texture_basisu, `${file} texture ${index}: KTX2 image without KHR_texture_basisu`);
        assert.ok(json.extensionsRequired?.includes("KHR_texture_basisu"), `${file}: KHR_texture_basisu not required`);
        continue;
      }
      assert.ok(mime === "image/webp" || keepsWebP(image.name, texture.name, image.uri), `${file} texture ${index} (${image.name ?? image.uri}) is ${mime}`);
    }
  }
  assert.ok(ktx2 > 0, "no GLB texture uses KTX2");
});

// Final review, Important 1a: the opening never waits for the Basis transcoder.
test("the start group uses no KTX2: its GLBs (every variant, lod1 and lite) and media stay WebP", () => {
  const manifest = JSON.parse(read("out/models/load-manifest.json"));
  const start = loadGroups.find(g => g.id === "start");
  const files = [...new Set([...start.assets, ...Object.values(start.variants ?? {}).flat()])];
  for (const p of files.filter(f => f.endsWith(".glb"))) {
    for (const variant of [outFile(p), outFile(sibling(p, "lod1")), outFile(sibling(p, "lite"))].filter(existsSync)) {
      const json = glbJson(variant);
      assert.ok(!json.extensionsUsed?.includes("KHR_texture_basisu"), `${variant} uses KTX2`);
      for (const image of json.images ?? []) assert.ok(image.mimeType !== "image/ktx2" && !image.uri?.endsWith(".ktx2"), `${variant}: ${image.name ?? image.uri} is KTX2`);
    }
  }
  for (const p of files.filter(f => f.endsWith(".webp"))) {
    assert.ok(!manifest.ktx2Media.includes(p.replace(/\.webp$/, ".ktx2")), `${p} is listed in ktx2Media`);
  }
  assert.ok(!usesKtx2(transferFiles(start.assets, manifest.ktx2Media)), "start transfers a KTX2 file");
});

test("only the venue's load-group GLBs (and their lod1) use KTX2: other pages have no KTX2 loader", () => {
  const venue = new Set(loadGroups.flatMap(groupGlbs).flatMap(p => [outFile(p), outFile(sibling(p, "lod1"))]).map(f => path.resolve(f)));
  for (const file of files("out").filter(f => f.endsWith(".glb"))) {
    if (venue.has(path.resolve(file))) continue;
    assert.ok(!glbJson(file).extensionsUsed?.includes("KHR_texture_basisu"), `${file} uses KTX2 outside the venue`);
  }
});

test("lite models keep embedded WebP textures, never KTX2", () => {
  for (const p of nonStartGlbs) {
    const json = glbJson(outFile(sibling(p, "lite")));
    assert.ok(!json.extensionsUsed?.includes("KHR_texture_basisu"), `${sibling(p, "lite")} uses KTX2`);
  }
});

test("KTX2 media sit next to their WebP and follow the group rule", async () => {
  const { prefersKtx2 } = await import("./ktx2-swap.mjs");
  const manifest = JSON.parse(read("out/models/load-manifest.json"));
  const start = new Set(loadGroups[0].assets);
  for (const ktx2 of manifest.ktx2Media) {
    const webp = ktx2.replace(/\.ktx2$/, ".webp");
    assert.match(ktx2, /^\/media\/.+\.ktx2$/);
    assert.ok(existsSync(outFile(webp)) && existsSync(outFile(ktx2)), `${ktx2} or its WebP missing`);
    const ktx2Bytes = readFileSync(outFile(ktx2)).byteLength, webpBytes = readFileSync(outFile(webp)).byteLength;
    assert.ok(prefersKtx2({ ktx2Bytes, webpBytes, inStart: start.has(webp) }), `${ktx2}: ${ktx2Bytes} B against ${webpBytes} B WebP`);
  }
});

// Owner decision 3: the venue opens once the entrance is ready, at its
// current size (20 MiB needs lighter models, which were not chosen).
test("start fits 24 MiB", () => {
  const start = JSON.parse(read("out/models/load-manifest.json")).groups.find(g => g.id === "start");
  assert.ok(start.bytes <= 24 * 2 ** 20, `start is ${(start.bytes / 2 ** 20).toFixed(1)} MiB, over 24 MiB`);
});

test("every non-start group lists liteBytes: the size of its lite files", () => {
  const manifest = JSON.parse(read("out/models/load-manifest.json"));
  for (const group of manifest.groups) {
    const sum = group.lite.reduce((total, p) => total + statSync(path.join("out", p)).size, 0);
    assert.equal(group.liteBytes, sum, `${group.id} liteBytes`);
    if (group.id !== "start") assert.ok(group.liteBytes > 0, `${group.id} has a light pack`);
  }
});

test("the Basis transcoder is served from /basis/ with a cache rule", () => {
  for (const file of ["basis_transcoder.js", "basis_transcoder.wasm"]) {
    assert.ok(existsSync(path.join("out", "basis", file)), `out/basis/${file} missing`);
    assert.deepEqual(readFileSync(path.join("public", "basis", file)), readFileSync(path.join("node_modules/three/examples/jsm/libs/basis", file)), `public/basis/${file} differs from three's copy`);
  }
  assert.match(read("public/_headers"), /^\/basis\/\*\r?\n\s+Cache-Control: /m);
});

test("the Cloudflare build never imports ktx2-encoder", () => {
  for (const file of ["scripts/optimize-export.mjs", "scripts/ktx2-swap.mjs", "scripts/derived-models.mjs", "scripts/prepare-export.mjs"]) {
    assert.doesNotMatch(read(file), /ktx2-encoder/, `${file} mentions ktx2-encoder`);
  }
  // encode-ktx2.mjs exports the policy the build reads; the encoder itself is only loaded when it runs as a script.
  assert.doesNotMatch(read("scripts/encode-ktx2.mjs"), /^import[^;]*["']ktx2-encoder["']/m);
});

test("every useGLTF call and plain venue texture load goes through textureLoading", () => {
  const sites = ["src/venue/three/ExpoAsset.tsx", "src/venue/zones/EntranceP01.tsx", "src/venue/zones/HallDressing.tsx",
    "src/venue/zones/ReferenceProjection.tsx", "src/venue/three/ProjectionContactShadow.tsx", "src/venue/three/TechnicalContactShadow.tsx", "src/venue/loading/stream.ts"];
  for (const file of sites) {
    const source = read(file);
    const calls = [...source.matchAll(/useGLTF\(([^;]*?)\)\s*[;,]/g)].map(m => m[1]).concat([...source.matchAll(/readGLTF\(([^;]*?)\);/g)].map(m => m[1]));
    assert.ok(calls.length > 0, `${file}: no useGLTF call found`);
    for (const call of calls) assert.match(call, /gltfExtender\(|configureGltfLoader/, `${file}: useGLTF(${call}) does not pass configureGltfLoader`);
  }
  for (const file of ["src/venue/three/venueFloor.ts", "src/venue/three/technicalMaterials.ts"]) {
    assert.doesNotMatch(read(file), /new THREE\.TextureLoader\(\)/, `${file} still loads with a plain TextureLoader`);
    assert.match(read(file), /loadVenueTexture\(/);
  }
});

// Fix round 1: no texture re-upload or deck rebuild when the venue textures arrive.
test("cloned venue textures never re-upload their shared image, and the deck is never rebuilt for its maps", () => {
  // three r185: clone() bumps the shared Source (a full re-upload); cloneShared undoes that.
  const base = new THREE.Texture({ width: 4, height: 4 }); base.needsUpdate = true;
  const sourceVersion = base.source.version;
  assert.ok(base.clone() && base.source.version > sourceVersion, "r185 clone() marks the shared image for upload");
  const cloneShared = texture => { const version = texture.source.version; const copy = texture.clone(); texture.source.version = version; return copy; };
  const again = base.source.version, copy = cloneShared(base);
  assert.ok(copy.version > 0, "the clone is bound");
  assert.equal(copy.source, base.source);
  assert.equal(base.source.version, again, "cloneShared leaves the shared image alone");
  const loading = read("src/venue/three/textureLoading.ts");
  assert.match(loading, /const version = texture\.source\.version;\s*const copy = texture\.clone\(\) as T;\s*texture\.source\.version = version;/, "textureLoading's cloneShared is the function above");
  assert.match(loading, /return base\.then\(cloneShared\)/);
  for (const file of ["src/venue/three/venueFloor.ts", "src/venue/three/technicalMaterials.ts", "src/venue/three/ProjectionFloor.tsx"]) {
    assert.doesNotMatch(read(file), /\b(result|t)\.needsUpdate\s*=\s*true|\.clone\(\)/, `${file} re-marks a shared texture for upload`);
  }
  const floor = read("src/venue/three/ProjectionFloor.tsx");
  assert.match(floor, /\}, \[resolution, polygonXZ,\s*tint\]\);/, "the deck's target and material do not depend on the stone maps");
  assert.match(floor, /material\.map = stone\.colour/, "the stone maps are swapped on the existing material");
});

// Final review, Important 3: Cloudflare Pages builds with the .nvmrc version,
// and optimize-export needs Node's built-in type stripping (>= 22.18).
test("the build's Node version is pinned exactly and meets the engines floor", () => {
  const pin = read(".nvmrc").trim();
  assert.match(pin, /^\d+\.\d+\.\d+$/, `.nvmrc "${pin}" is not an exact version`);
  assert.equal(JSON.parse(read("package.json")).engines?.node, ">=22.18");
  const [major, minor] = pin.split(".").map(Number);
  assert.ok(major > 22 || (major === 22 && minor >= 18), `.nvmrc ${pin} is older than 22.18`);
  assert.match(read("scripts/optimize-export.mjs"), /needs Node >= 22\.18[^\n]*process\.version/, "the guard names the requirement and the running version");
});

test("brand check flags every wrong spelling and passes the real wordmark", () => {
  assert.deepEqual(wordmarkProblems("livegridAV"), []);
  for (const wrong of ["LivegridAV", "livegrid AV", "LIVEGRID AV"]) {
    assert.notDeepEqual(wordmarkProblems(wrong), [], wrong);
  }
  assert.deepEqual(wordmarkProblems("PEOPLE TECHNOLOGY"), []);
});

test("every signed asset passes the brand check", () => {
  for (const entry of SIGNED_ASSETS) assert.deepEqual(checkSignedAsset(entry), [], entry.layout);
});

const SIGN_MATERIALS = [
  "Premium Sign | ivory lit face", "Premium Sign | aqua lit face",
  "Premium Sign | brushed champagne return", "Premium Sign | polished champagne edge",
  "Premium Sign | frosted aqua cell", "Premium Sign | dim signal cell", "Premium Sign | aqua halo",
];

test("premium sign materials are styled the same in every stall", async () => {
  const { register } = await import("node:module");
  register(new URL("./ts-extensionless-hook.mjs", import.meta.url));
  const { isPremiumSignMaterial, stylePremiumSign } = await import("../src/venue/three/premiumSignMaterials.ts");
  const authored = {
    "brushed champagne return": [.9, .30], "polished champagne edge": [1.0, .10],
  };
  const styled = Object.fromEntries(SIGN_MATERIALS.map(name => {
    assert.ok(isPremiumSignMaterial(name), name);
    const key = name.replace("Premium Sign | ", "");
    const [metalness, roughness] = authored[key] ?? [0, .5];
    const material = new THREE.MeshStandardMaterial({ name, metalness, roughness, envMapIntensity: 1 });
    stylePremiumSign(material);
    return [key, material];
  }));
  assert.equal(isPremiumSignMaterial("Rental | champagne trim"), false);
  assert.equal(isPremiumSignMaterial("Premium Sign"), false);
  // Champagne keeps the GLB's own values: no rental rule restyles it.
  for (const [key, [metalness, roughness]] of Object.entries(authored)) {
    assert.equal(styled[key].metalness, metalness, key);
    assert.equal(styled[key].roughness, roughness, key);
    assert.equal(styled[key].envMapIntensity, 1, key);
  }
  // Exactly what prepareArchitecture gave them on the spike path: the plain grain, no installation frame.
  for (const key of Object.keys(styled)) {
    assert.equal(styled[key].customProgramCacheKey(), "architectural-finish-v4-false-false-false-false-false", key);
    assert.equal(typeof styled[key].onBeforeCompile, "function", key);
  }
  const shader = { uniforms: {}, vertexShader: "#include <common> #include <begin_vertex>", fragmentShader: "#include <common> #include <roughnessmap_fragment> #include <color_fragment>" };
  styled["polished champagne edge"].onBeforeCompile(shader);
  assert.match(shader.vertexShader, /vFinishPosition = \(modelMatrix \* vec4\(position,1\.0\)\)\.xyz/);
  assert.doesNotMatch(shader.fragmentShader, /uFinishBaselineToWorldRotation/);
  assert.equal(styled["aqua halo"].transparent, true);
  assert.equal(styled["aqua halo"].depthWrite, false);
  assert.equal(styled["dim signal cell"].depthWrite, true);
  assert.equal(styled["dim signal cell"].transparent, false);
  assert.equal(styled["frosted aqua cell"].depthWrite, true);
  // Lit faces and cells keep the emissive the GLB gave them; a second stall's pass changes nothing.
  const lit = new THREE.MeshStandardMaterial({ name: SIGN_MATERIALS[0], emissive: new THREE.Color("#123456"), emissiveIntensity: .6 });
  stylePremiumSign(lit); stylePremiumSign(lit);
  assert.equal(lit.emissive.getHexString(), "123456");
  assert.equal(lit.emissiveIntensity, .6);
});

test("every stall material pass hands sign materials to stylePremiumSign", () => {
  for (const file of ["rental2026Materials", "architecturalFinish", "projectionMaterials", "technicalMaterials"]) {
    const source = read(`src/venue/three/${file}.ts`);
    assert.match(source, /isPremiumSignMaterial\(/, file);
    assert.match(source, /stylePremiumSign\(/, file);
  }
  assert.equal((read("src/venue/three/projectionMaterials.ts").match(/isPremiumSignMaterial\(/g) ?? []).length, 2, "both projection passes");
});

test("the canvas signal grid lights 18 cells in the brand pattern", async () => {
  const { register } = await import("node:module");
  register(new URL("./ts-extensionless-hook.mjs", import.meta.url));
  const { signalGridCells } = await import("../src/venue/media/brandMarks.ts");
  const cells = signalGridCells();
  assert.equal(cells.length, 25);
  assert.equal(cells.filter(c => c.lit).length, 18);
  for (let row = 0; row < 5; row++) assert.equal(cells.find(c => c.col === 3 && c.row === row).lit, true);
  for (let row = 0; row < 5; row++) assert.equal(cells.find(c => c.col === 0 && c.row === row).lit, row >= 3);
});

test("no screen or source file spells the brand wrong", () => {
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
  const bad = [];
  for (const file of files("src/venue").filter(f => /\.tsx?$/.test(f))) {
    for (const m of strip(read(file)).matchAll(/(["'`])((?:\.|(?!\1).)*)\1/g)) {
      const problems = wordmarkProblems(m[2]);
      if (problems.length) bad.push(`${file}: ${problems.join("; ")}`);
    }
  }
  assert.deepEqual(bad, []);
});
