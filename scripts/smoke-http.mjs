import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:4310';
const walk = dir => readdirSync(dir, {withFileTypes:true}).flatMap(entry =>
  entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const pages = walk('out').filter(file => file.endsWith('.html') && !/404|_not-found/.test(file));
const targets = new Map();
for (const file of pages) {
  const route = '/' + path.relative('out', file).replaceAll('\\', '/').replace(/index\.html$/, '').replace(/\.html$/, '');
  targets.set(route, 'GET');
  for (const match of readFileSync(file, 'utf8').matchAll(/(?:href|src)="(\/[^"\s]*)"/g)) {
    if (!match[1].startsWith('//')) targets.set(match[1].split(/[?#]/)[0], 'HEAD');
  }
}
for (const file of walk('src').filter(file => /\.tsx?$/.test(file))) {
  const source = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of source.matchAll(/["'(](\/(?:media|models|brand)\/[^"'`)${}]+\.(?:png|jpe?g|webp|mp4|webm|glb|svg))["')]/g)) targets.set(match[1], 'HEAD');
}
for (const file of walk('public/models/expo').filter(file => file.endsWith('.glb'))) targets.set('/'+path.relative('public',file).replaceAll('\\','/'), 'HEAD');
targets.set('/robots.txt', 'GET'); targets.set('/sitemap.xml', 'GET');
const queue = [...targets];
const failures = [];
let passed = 0;
await Promise.all(Array.from({length:6}, async () => {
  while (queue.length) {
    const [route, method] = queue.shift();
    try {
      const response = await fetch(new URL(route, base), {method, signal:AbortSignal.timeout(30000)});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (/\.(png|webp|glb|js|css)$/.test(route) && response.headers.get('content-type')?.includes('text/html')) throw new Error('asset returned HTML');
      await response.arrayBuffer(); passed++;
    } catch (error) { failures.push({route, error:String(error)}); }
  }
}));
console.log(JSON.stringify({base, pages:pages.length, checked:targets.size, passed, failures},null,2));
if (failures.length) process.exitCode=1;
