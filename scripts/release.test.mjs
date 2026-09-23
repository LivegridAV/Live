import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const read = file => readFileSync(file, "utf8");
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const pages = files("out").filter(f => f.endsWith(".html") && !/404|_not-found/.test(f));
const resolves = url => {
  const route = decodeURIComponent(url.split(/[?#]/)[0]);
  return [path.join("out", route), path.join("out", `${route}.html`), path.join("out", route, "index.html")].some(existsSync);
};

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
