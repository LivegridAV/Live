// Measures venue load + walk against the built export. Usage:
//   node scripts/measure-venue.mjs --label <name> [--throttle fast4g|slow4g|none]
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const label = arg("label");
const throttle = arg("throttle", "none");
if (!label) { console.error("--label <name> is required"); process.exit(2); }

// bytes/s = kbps * 1000 / 8. Values come from the plan Global Constraints.
const PROFILES = {
  fast4g: { offline: false, downloadThroughput: 9000 * 1000 / 8, uploadThroughput: 1500 * 1000 / 8, latency: 60 },
  slow4g: { offline: false, downloadThroughput: 2000 * 1000 / 8, uploadThroughput: 1500 * 1000 / 8, latency: 150 },
  none: { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
};
if (!PROFILES[throttle]) { console.error(`unknown throttle ${throttle}`); process.exit(2); }

const ORIGIN = "http://127.0.0.1:4310";
const SHOTS = ["pillars", "reception", "anamorphic", "technical", "led-rental", "projection", "arena"];
const STEP = 0.02, STEP_MS = 250;
const outDir = path.resolve("reports/perf", label);
mkdirSync(path.join(outDir, "shots"), { recursive: true });

// Task 2 creates this manifest; until then there are no groups and gapFrames is 0.
const groupsFile = path.resolve("src/venue/loading/groups.json");
const groups = existsSync(groupsFile) ? JSON.parse(readFileSync(groupsFile, "utf8")) : [];

const server = spawn(process.execPath, ["scripts/serve-export.mjs"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitServer() {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(ORIGIN + "/")).ok) return; } catch {} await sleep(200); }
  throw new Error("export server did not start (is out/ built?)");
}

let browser;
try {
  await waitServer();
  browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist"] });

  async function newPage(throttled) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.clearBrowserCache");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (throttled) await cdp.send("Network.emulateNetworkConditions", PROFILES[throttle]);
    return { context, page };
  }
  const waitPerf = (page, fn) => page.waitForFunction(fn, null, { timeout: 300000, polling: 100 });

  // ---- load + walk (throttled) ----
  const { context, page } = await newPage(true);
  const t0 = Date.now();
  await page.goto(`${ORIGIN}/?perf`, { waitUntil: "commit" });
  await waitPerf(page, () => window.__venuePerf?.loaded());
  const msToOpen = Date.now() - t0;
  const transfer = await page.evaluate(() => {
    const r = performance.getEntriesByType("resource");
    return { bytes: r.reduce((a, e) => a + (e.transferSize || 0), 0), count: r.length };
  });
  const bytesBeforeOpen = transfer.bytes, requestsBeforeOpen = transfer.count;
  await waitPerf(page, () => window.__venuePerf.allReady());
  await page.evaluate(() => new Promise(res => { let n = 0; const f = () => (++n >= 60 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));

  const snapshot = await page.evaluate(() => window.__venuePerf.snapshot());
  writeFileSync(path.join(outDir, "snapshot.json"), JSON.stringify(snapshot, null, 1));
  await page.screenshot({ path: path.join(outDir, "shots", "entrance.png") });

  const walk = [];
  let gapFrames = 0;
  const steps = Math.round(1 / STEP);
  for (let i = 0; i <= steps; i++) {
    const progress = +(i * STEP).toFixed(2);
    await page.evaluate(p => window.scrollTo({ top: window.__venuePerf.scrollTop(p), behavior: "instant" }), progress);
    await sleep(STEP_MS);
    const sample = await page.evaluate(() => {
      const pose = document.querySelector("[data-render-metrics]")?.dataset.cameraPose;
      return { stats: window.__venuePerf.stats(), ready: window.__venuePerf.groupsReady(), z: pose ? JSON.parse(pose).position[2] : null };
    });
    walk.push({ progress, calls: sample.stats.calls, triangles: sample.stats.triangles });
    // Gap: the camera has passed a group switch-on z (the walk heads toward -z) but the group is not ready.
    if (sample.z != null && groups.some(g => sample.z <= g.switchOnZ && !sample.ready.includes(g.id))) gapFrames++;
  }
  const longTasksAfterOpen = await page.evaluate(() => window.__venuePerf.longTasks());
  await context.close();

  // ---- baseline shots (unthrottled; only the image matters) ----
  for (const shot of SHOTS) {
    const s = await newPage(false);
    await s.page.goto(`${ORIGIN}/?perf&camera=baseline&shot=${shot}`, { waitUntil: "commit" });
    await waitPerf(s.page, () => window.__venuePerf?.allReady());
    await s.page.evaluate(() => new Promise(res => { let n = 0; const f = () => (++n >= 60 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await s.page.screenshot({ path: path.join(outDir, "shots", `${shot}.png`) });
    await s.context.close();
  }

  const metrics = { label, throttle, bytesBeforeOpen, msToOpen, requestsBeforeOpen, walk, longTasksAfterOpen, gapFrames };
  writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 1));
  const max = k => Math.max(...walk.map(w => w[k]));
  console.log(`${label} [${throttle}] bytesBeforeOpen=${(bytesBeforeOpen / 1e6).toFixed(1)}MB msToOpen=${msToOpen} requests=${requestsBeforeOpen}`);
  console.log(`calls@0=${walk[0].calls} maxCalls=${max("calls")} tris@0=${walk[0].triangles} maxTris=${max("triangles")} longTasks=${longTasksAfterOpen.length} gapFrames=${gapFrames}`);
} finally {
  await browser?.close();
  server.kill();
}
