const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');
const { createCanvas, Image: NativeImage } = require('C:/Users/VJNir/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root = process.cwd(), loaded = [], cache = new Map();
class LocalImage extends NativeImage { set src(url) { super.src = fs.readFileSync(path.join(root, 'public', url)); loaded.push(this.decode()); } }
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const sandbox = { exports: {}, Image: LocalImage, document: { createElement: () => createCanvas(300, 150) }, console, performance, require: id => load(path.join(path.dirname(file), id + '.ts')) };
  vm.runInNewContext(code, sandbox); cache.set(file, sandbox.exports); return sandbox.exports;
}
const m = load(path.join(root, 'src/venue/media/projectionPainters.ts'));
const jobs = [
  ...['architecture', 'stage', 'product', 'interactive'].map((name, i) => ['application-' + name, m.projectionApplications, 1024, 576, i]),
  ['hero', m.projectionHero, 1536, 864, 0], ['backdrop', m.projectionBackdrop, 1536, 864, 0],
  ['ceiling', m.projectionCeiling, 1024, 1024, 0], ['kiosk', m.projectionKiosk, 1024, 640, 0],
  ['palace-pattern', m.projectionPalace, 2048, 1024, 0],
];
(async () => {
  const out = path.join(root, 'qa/projection-mapping'); await fs.promises.mkdir(out, { recursive: true }); m.preloadProjectionArtwork();
  for (const [, paint, w, h, variant] of jobs) { const c = createCanvas(w, h); paint({ ctx: c.getContext('2d'), w, h, t: 4, accent: '#24d8c3', variant }); }
  await Promise.all(loaded);
  const results = [];
  for (const [name, paint, w, h, variant] of jobs) {
    const canvas = createCanvas(w, h), args = { ctx: canvas.getContext('2d'), w, h, t: 4, accent: '#24d8c3', variant };
    paint(args); const start = performance.now(); for (let i = 0; i < 5; i++) paint(args); const warmMs = (performance.now() - start) / 5;
    const png = canvas.toBuffer('image/png'); fs.writeFileSync(path.join(out, name + '.png'), png); await sharp(png).jpeg({ quality: 93 }).toFile(path.join(out, name + '.jpg'));
    paint({ ...args, t: 0 }); const a = canvas.toBuffer('image/png'); paint({ ...args, t: 24 }); const b = canvas.toBuffer('image/png');
    results.push({ name, w, h, warmMs: +warmMs.toFixed(2), period24Exact: a.equals(b) });
  }
  fs.writeFileSync(path.join(out, 'canvas-qa.json'), JSON.stringify(results, null, 2)); console.log(JSON.stringify(results, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
