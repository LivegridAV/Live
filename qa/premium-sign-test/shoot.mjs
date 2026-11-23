// Full-size pictures of premium signs, before against after.
//
//   node qa/premium-sign-test/shoot.mjs --stall <id> [--before-url URL] [--after-url URL]
//
// For each stall it shoots the visit camera (front), a camera square on the
// main sign (sign) and one about 35 degrees off the sign normal at sign height
// (angle), once on the before site (default: the live site, which equals main)
// and once on the after site (default: the local export, `npm run build` then
// `node scripts/serve-export.mjs`). Pictures go to qa/premium-sign-test/<id>/.
//
// Without --stall it repeats the original spike shots of the rental sign
// (today's against ?signtest on the dev server at :3100).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const stall = option("--stall", null);
const beforeUrl = option("--before-url", "https://livegridav.com/");
const afterUrl = option("--after-url", "http://127.0.0.1:4310/");

// Sign centres and normals in venue metres, from each layout's `signage`
// anchors and its placement (src/venue/data/placements.ts). Cameras stand 8 m
// out; `angle` is 35 degrees off the normal toward the visitor's approach.
const STALLS = {
  reception: {
    front: "shot=reception&view=front",
    sign: "camera=qa&pos=18.94,4.5,-49.55&look=26.71,4.5,-51.46&fov=34",
    angle: "camera=qa&pos=21.44,4.5,-45.44&look=26.71,4.5,-51.46&fov=34",
    // The relocated far-right wall (LED / DESIGN / TECHNOLOGY / PEOPLE / IMPACT), 35 degrees off.
    "right-wall": "camera=qa&pos=11.40,7.5,-31.38&look=19.65,7.5,-34.97&fov=34",
  },
  pillars: {
    front: "shot=pillars&view=front",
    sign: "camera=qa&pos=-19.05,4.89,-45.07&look=-27.05,4.89,-45.07&fov=30",
    angle: "camera=qa&pos=-20.49,4.89,-40.48&look=-27.05,4.89,-45.07&fov=30",
  },
};

const SPIKE_VIEWS = {
  front: "camera=qa&pos=1,1.75,-86.65&look=14.2,8.8,-88.15&fov=55",
  close: "camera=qa&pos=7,4.5,-89.15&look=13.4,9.4,-89.0&fov=34",
  angle: "camera=qa&pos=7.5,8.4,-95.6&look=14.2,9.6,-88.2&fov=26",
};
// The rental stall's main fascia is the sign the owner approved from the spike:
// its three approved views, plus the visit camera, the reception desk sign and
// the outside-return logo. Placement S2: root [20, 0, -82.65], yaw -pi/2, so
// venue = (20 - z, y, -82.65 + x) for a layout point (x, y, z).
STALLS.rental = {
  ...SPIKE_VIEWS,
  visit: "shot=led-rental&view=front",
  desk: "camera=qa&pos=9.0,1.4,-75.15&look=13.55,0.75,-75.15&fov=34",
  return: "camera=qa&pos=14.0,4.2,-63.5&look=14.2,4.2,-70.74&fov=40",
};

// Content Studio (venue id "anamorphic"). Placement S1: root [-20, 0, -82.65],
// yaw +pi/2, so venue = (-20 + z, y, -82.65 - x) for a layout point (x, y, z).
// sign / angle: the portal fascia logo + wordmark (the stall's halo), 8 m out,
// angle 35 degrees toward the hall; gallery: the gallery fascia lockup; desk:
// the front reception desk wordmark; counter / left-counter: the two room
// counter wordmarks.
STALLS.anamorphic = {
  front: "shot=anamorphic&view=front",
  sign: "camera=qa&pos=-13.35,10.63,-83.75&look=-14.88,10.63,-75.9&fov=34",
  angle: "camera=qa&pos=-9.12,10.63,-81.45&look=-14.88,10.63,-75.9&fov=34",
  gallery: "camera=qa&pos=-19.09,9.59,-92.45&look=-27.01,9.59,-91.34&fov=30",
  desk: "camera=qa&pos=-12.37,1.4,-82.13&look=-13.23,0.81,-77.71&fov=40",
  counter: "camera=qa&pos=-22.11,1.4,-73.94&look=-26.11,0.8,-73.94&fov=45",
  "left-counter": "camera=qa&pos=-15.06,1.4,-76.78&look=-15.06,0.8,-72.78&fov=45",
};

if (stall && !STALLS[stall]) {
  console.error(`unknown --stall ${stall}; known: ${Object.keys(STALLS).join(", ")}`);
  process.exit(2);
}
const runs = stall
  ? [["before", beforeUrl, ""], ["after", afterUrl, ""]].map(([variant, base, flag]) => ({ variant, base, flag, views: STALLS[stall], dir: `qa/premium-sign-test/${stall}` }))
  : [["today", ""], ["premium", "signtest&"]].map(([variant, flag]) => ({ variant, base: "http://localhost:3100/", flag, views: SPIKE_VIEWS, dir: "qa/premium-sign-test" }));

const browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
for (const run of runs) {
  mkdirSync(run.dir, { recursive: true });
  for (const [name, query] of Object.entries(run.views)) {
    const page = await ctx.newPage();
    await page.goto(`${run.base}?${run.flag}perf&capture=1&${query}`);
    await page.waitForFunction(() => window.__venuePerf?.allReady?.(), null, { timeout: 240000, polling: 1000 });
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `${run.dir}/${run.variant}-${name}.png` });
    console.log("shot", run.variant, name);
    await page.close();
  }
}
await browser.close();
