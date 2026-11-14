/** Native projected light only. No architecture or reference-image pixels. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), sharp = require('sharp');
const { createCanvas } = require('C:/Users/VJNir/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const out = __dirname, TAU = Math.PI * 2, fract = v => v - Math.floor(v);
const manifestPath = path.join(out, 'native-asset-manifest.json');
const previousHero = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath)).hero : undefined;
const random = (x, y, seed) => fract(Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453123);
const smooth = x => x * x * (3 - 2 * x), mix = (a, b, t) => a + (b - a) * t;
function noise(u, v, cells, seed) {
  const x = u * cells, y = v * cells, ix = Math.floor(x), iy = Math.floor(y), sx = smooth(fract(x)), sy = smooth(fract(y));
  const value = (a, b) => random(((a % cells) + cells) % cells, ((b % cells) + cells) % cells, seed);
  return mix(mix(value(ix, iy), value(ix + 1, iy), sx), mix(value(ix, iy + 1), value(ix + 1, iy + 1), sx), sy);
}
function fbm(u, v, seed) {
  return noise(u, v, 4, seed) * .48 + noise(u, v, 8, seed + 1) * .26 + noise(u, v, 16, seed + 2) * .15 + noise(u, v, 32, seed + 3) * .075 + noise(u, v, 64, seed + 4) * .035;
}

// Irregular icy light patches retain generous porcelain-white areas. Their
// detailed branching discharges are drawn separately, so no rounded cell grid
// or outlines of an arch, tower or stair can appear in the content bitmap.
const W = 2048, H = 1536, field = createCanvas(W, H), c = field.getContext('2d');
const small = createCanvas(W / 2, H / 2), b = small.getContext('2d'), pixels = b.createImageData(W / 2, H / 2);
for (let y = 0; y < H / 2; y++) for (let x = 0; x < W / 2; x++) {
  const u = x / (W / 2), v = y / (H / 2);
  const warp = fbm(u, v, 87.4), cloud = fbm(u + (warp - .5) * .22, v + (warp - .5) * .16, 18.7);
  const patch = Math.max(0, Math.min(1, (cloud - .365) * 3.85));
  const amount = smooth(patch), fleck = (noise(u, v, 64, 27) - .5) * 3;
  const index = (y * W / 2 + x) * 4;
  pixels.data.set([mix(244, 62, amount) + fleck, mix(241, 134, amount) + fleck, mix(233, 213, amount) + fleck, 255], index);
}
b.putImageData(pixels, 0, 0); c.drawImage(small, 0, 0, W, H);
const paths = [];
function branch(x, y, direction, length, width, seed, depth = 0) {
  const points = [[x, y]], count = Math.ceil(length / 9); let angle = direction;
  for (let i = 0; i < count; i++) {
    const r = random(i, depth, seed), drift = Math.sin(i * .53 + seed) * .16;
    angle = mix(angle, direction + drift + (r - .5) * .90, .65);
    const step = length / count * (.80 + .40 * random(i, 4, seed));
    x += Math.cos(angle) * step; y += Math.sin(angle) * step;
    points.push([x, y]);
    if (depth < 2 && i > 4 && i < count - 4 && random(i, depth + 7, seed) > .91) {
      const sign = random(i, 11, seed) > .5 ? 1 : -1;
      branch(x, y, angle + sign * (.55 + random(i, 13, seed) * .75), length * (.12 + .18 * random(i, 16, seed)), width * .48, seed + i * 1.7 + 9, depth + 1);
    }
  }
  paths.push({ points, width });
}
for (let i = 0; i < 31; i++) {
  const x = -100 + random(i, 3, 31) * (W + 200), y = -140 + random(i, 8, 92) * H;
  branch(x, y, .95 + random(i, 4, 44) * 1.1, 260 + random(i, 7, 71) * 650, 1.2 + random(i, 9, 3) * 2.5, i * 3.47 + 8);
}
function stroke(points, width, color) {
  c.beginPath(); c.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) c.lineTo(...points[i]);
  c.lineWidth = width; c.strokeStyle = color; c.stroke();
}
c.lineJoin = 'round'; c.lineCap = 'round';
// The sculpture is about 400 screen pixels wide in the booth overview. A 1.8×
// strand gain keeps white branches readable after 2048px texture minification.
const veinScale = 1.8;
for (const item of paths) stroke(item.points, item.width * 7.5 * veinScale, 'rgba(52,144,241,.075)');
for (const item of paths) stroke(item.points, item.width * 3.4 * veinScale, 'rgba(112,193,255,.22)');
for (const item of paths) stroke(item.points, item.width * 1.6 * veinScale, 'rgba(210,240,255,.78)');
for (const item of paths) stroke(item.points, item.width * .60 * veinScale, 'rgba(248,255,255,.98)');
// A second layer of short capillary forks adds the reference's fine electrical
// branching while leaving enough quiet ivory for the actual faceted returns.
for (let i = 0; i < 170; i++) {
  const x = random(i, 18, 54) * W, y = random(i, 23, 75) * H;
  const len = 18 + random(i, 24, 91) * 48, a = random(i, 25, 3) * TAU;
  const points = [[x, y], [x + Math.cos(a) * len * .40, y + Math.sin(a) * len * .40], [x + Math.cos(a + .3) * len, y + Math.sin(a + .3) * len]];
  stroke(points, .7 * veinScale, 'rgba(231,251,255,.72)');
}

// Seamlessly periodic, noncellular teal/gold cosmic mottling. This is the
// subtle animated light layer over the isolated forest content on the canopy.
const n = 768, cosmic = createCanvas(n, n), sky = cosmic.getContext('2d'), skyPixels = sky.createImageData(n, n);
for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
  const u = x / n, v = y / n, warp = fbm(u, v, 49);
  const cloud = fbm(u + (warp - .5) * .3, v - (warp - .5) * .21, 64);
  const ridge = Math.exp(-Math.abs(fbm(u + .025 * Math.sin(v * TAU * 3), v, 109) - .52) * 38);
  const glow = Math.max(0, (cloud - .30) * 1.3), gold = Math.pow(Math.max(0, (noise(u, v, 16, 19) - .62) * 2.6), 1.8);
  const dust = random(x, y, 81) > .9985 ? 70 : 0, i = (y * n + x) * 4;
  skyPixels.data.set([2 + glow * 8 + ridge * 12 + gold * 131 + dust, 9 + glow * 91 + ridge * 77 + gold * 89 + dust, 14 + glow * 93 + ridge * 62 + gold * 28 + dust, 255], i);
}
sky.putImageData(skyPixels, 0, 0);

(async () => {
  const png = field.toBuffer('image/png');
  fs.writeFileSync(path.join(out, 'sculpture-caustics-native.png'), png);
  await sharp(png).webp({ quality: 97, effort: 6 }).toFile(path.join(out, 'sculpture-caustics.webp'));
  fs.writeFileSync(path.join(out, 'cosmic-tile-native.png'), cosmic.toBuffer('image/png'));
  await sharp(cosmic.toBuffer('image/png')).webp({ lossless: true, effort: 6 }).toFile(path.join(out, 'cosmic-tile.webp'));
  const assets = [];
  for (const name of (await fs.promises.readdir(out)).filter(name => /\.(webp|png)$/.test(name)).sort()) {
    const data = await fs.promises.readFile(path.join(out, name)), metadata = await sharp(data).metadata();
    assets.push({ file: name, width: metadata.width, height: metadata.height, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') });
  }
  await fs.promises.writeFile(manifestPath, JSON.stringify({ created: '2026-10-16', method: 'deterministic native branching electrical veins, porcelain/icy light patches and periodic teal/gold cosmic mottling; no raster reference editing or image generation', assets, ...(previousHero ? { hero: previousHero } : {}) }, null, 2));
  console.log(JSON.stringify({ branches: paths.length, assets }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
