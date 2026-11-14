import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const out = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
for (const name of ['applications', 'hero', 'forest']) {
  await sharp(path.join(out, `${name}-original.png`)).webp({ quality: 93, effort: 6 }).toFile(path.join(out, `${name}.webp`));
}
const assets = [];
for (const file of (await fs.readdir(out)).filter(v => /\.(png|webp)$/.test(v)).sort()) {
  const bytes = await fs.readFile(path.join(out, file)), metadata = await sharp(bytes).metadata();
  assets.push({ file, width: metadata.width, height: metadata.height, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
await fs.writeFile(path.join(out, 'asset-manifest.json'), JSON.stringify({ created: '2026-10-16', assets }, null, 2));
console.log(JSON.stringify(assets.filter(v => v.file.endsWith('.webp')), null, 2));
