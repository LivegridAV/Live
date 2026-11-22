// node scripts/compare-shots.mjs <dirA> <dirB>   (each holds shots/*.png, or is itself the shots dir)
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

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
