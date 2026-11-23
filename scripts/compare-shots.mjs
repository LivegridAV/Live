// node scripts/compare-shots.mjs <dirA> <dirB>   (each holds shots/*.png, or is itself the shots dir)
// node scripts/compare-shots.mjs --snapshots <dirA> <dirB> [<dirA2>]   (named nodes in both snapshot.json files: same position,
//   quaternion and size within 1 mm. A group's box may only shrink: a child merged into a mesh under the model root leaves it.
//   dirA2 is a second capture of A's build: nodes that differ between A and A2 move on their own and are skipped.)
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

if (process.argv[2] === "--snapshots") {
  const [x, y, x2] = process.argv.slice(3, 6).map(d => JSON.parse(readFileSync(path.join(d, "snapshot.json"), "utf8")));
  const off = (p, q, sign = 1) => p.some((v, i) => Math.abs(v - sign * q[i]) > 0.001);
  const group = k => Object.keys(x).some(j => j.startsWith(`${k}/`));
  const differ = (m, n, k, shrinks = false) => off(m[k].position, n[k].position)
    || (shrinks ? n[k].size.some((v, i) => v > m[k].size[i] + 0.001) : off(m[k].size, n[k].size))
    || (off(m[k].quaternion, n[k].quaternion) && off(m[k].quaternion, n[k].quaternion, -1)); // q and -q are one rotation
  const animated = Object.keys(x).filter(k => x2?.[k] && differ(x, x2, k));
  const shared = Object.keys(x).filter(k => y[k] && !animated.includes(k)), moved = shared.filter(k => differ(x, y, k, group(k)));
  const shrunk = shared.filter(k => !moved.includes(k) && differ(x, y, k));
  for (const k of shrunk) console.log(`group box shrank (child merged out): ${k}: ${JSON.stringify(x[k].size)} -> ${JSON.stringify(y[k].size)}`);
  for (const k of moved) console.log(`${k}: ${JSON.stringify(x[k])} -> ${JSON.stringify(y[k])}`);
  console.log(`${shared.length} of ${Object.keys(x).length} named nodes still exist (${animated.length} animated skipped), ${moved.length} differ by more than 1 mm`);
  process.exit(moved.length ? 1 : 0);
}
const [a, b] = process.argv.slice(2);
if (!a || !b) { console.error("usage: compare-shots.mjs <a> <b>"); process.exit(2); }
const shotsDir = d => (existsSync(path.join(d, "shots")) ? path.join(d, "shots") : d);
const da = shotsDir(a), db = shotsDir(b);
const names = readdirSync(da).filter(f => f.endsWith(".png")).sort();
let fail = false;
for (const f of names) {
  if (!existsSync(path.join(db, f))) { console.log(`${f}: missing in ${b}`); fail = true; continue; }
  const [x, y] = await Promise.all([da, db].map(d => sharp(path.join(d, f)).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) { console.log(`${f}: size differs`); fail = true; continue; }
  const n = x.info.width * x.info.height;
  let sum = 0, over = 0;
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d += Math.abs(x.data[i * 3 + c] - y.data[i * 3 + c]);
    sum += d / 3;
    if (d / 3 > 24) over++;
  }
  const mean = sum / n;
  if (mean > 1.5) fail = true;
  console.log(`${f.padEnd(18)} mean=${mean.toFixed(2)}  over24=${(100 * over / n).toFixed(2)}%`);
}
process.exit(fail ? 1 : 0);
