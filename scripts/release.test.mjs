import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

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
