/** Convert only the isolated render of the current genuine GLB, never a booth reference. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), sharp = require('sharp');
const out = __dirname, input = path.join(out, 'sculpture-hero-render-final.png');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
(async () => {
  if (!fs.existsSync(input)) throw new Error('Final model-rendered hero PNG is not ready.');
  const info = await sharp(input).metadata();
  if (info.width !== 1600 || info.height !== 900) throw new Error('Final sculpture hero must preserve the full-model 1600×900 framing.');
  await sharp(input).webp({ quality: 95, effort: 6 }).toFile(path.join(out, 'sculpture-hero.webp'));
  const manifestPath = path.join(out, 'native-asset-manifest.json'), manifest = JSON.parse(fs.readFileSync(manifestPath));
  manifest.assets = [];
  for (const file of fs.readdirSync(out).filter(file => /\.(webp|png)$/.test(file)).sort()) {
    const data = fs.readFileSync(path.join(out, file)), metadata = await sharp(data).metadata();
    manifest.assets.push({ file, width: metadata.width, height: metadata.height, bytes: data.length, sha256: hash(data) });
  }
  manifest.hero = {
    source: 'sculpture-hero-render-final.png',
    geometry: '/models/expo/projection-sculpture.glb',
    geometrySHA256: hash(fs.readFileSync(path.resolve(out, '../../models/expo/projection-sculpture.glb'))),
    lightFieldSHA256: hash(fs.readFileSync(path.join(out, 'sculpture-caustics.webp'))),
    method: 'Actual final sculpture mesh rendered in Blender against native navy cosmic material, ivory returns and native branching-vein projection; no reference pixels.',
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify(manifest.assets.find(asset => asset.file === 'sculpture-hero.webp'), null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
