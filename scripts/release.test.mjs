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

test("GPU warm-up waits for compilation and restores hidden zones / renderer state", async () => {
  const scene = new THREE.Scene();
  const zone = new THREE.Group(); zone.visible = false;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  zone.add(mesh); scene.add(zone);
  const source = new THREE.PointLight(); source.visible = false; zone.add(source);
  const spot = new THREE.SpotLight(); spot.castShadow = true; spot.shadow.autoUpdate = false; scene.add(spot);
  const previous = new THREE.WebGLRenderTarget(2,2);
  let target = previous, compiled = 0, rendered = 0, disposed = false;
  const renderer = {
    compileAsync: async () => { compiled++; },
    getRenderTarget: () => target,
    setRenderTarget: value => { target = value; },
    render: () => {
      rendered++;
      assert.equal(compiled, 1);
      assert.equal(zone.visible, true);
      assert.equal(mesh.frustumCulled, false);
      assert.equal(source.visible, false, "virtual sources must never enter the light layout");
      assert.equal(spot.shadow.autoUpdate, true);
      assert.equal(target.width, 32);
      target.addEventListener("dispose", () => { disposed = true; });
    },
  };
  await warmScene(renderer, scene, new THREE.PerspectiveCamera());
  assert.equal(rendered, 1); assert.equal(compiled, 2);
  assert.equal(zone.visible, false); assert.equal(mesh.frustumCulled, true);
  assert.equal(spot.shadow.autoUpdate, false); assert.equal(target, previous); assert.equal(disposed, true);
  renderer.render = () => { throw new Error("simulated context failure"); };
  await assert.rejects(warmScene(renderer, scene, new THREE.PerspectiveCamera()), /context failure/);
  assert.equal(zone.visible, false); assert.equal(target, previous);
  const beforeCancel = rendered;
  await warmScene(renderer, scene, new THREE.PerspectiveCamera(), () => true);
  assert.equal(rendered, beforeCancel, "unmounted scenes are not rendered");
  mesh.geometry.dispose(); mesh.material.dispose(); previous.dispose(); spot.dispose();
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
  for (const text of ["tel:+917801013919", "livegridav@gmail.com", "/services/av-engineering"]) assert.ok(html.includes(text));
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
