// The p = 1 -> 0 fly-back: an instant jump from the end of the journey back to the entrance, so the
// camera flies back through every zone in a few frames. Is its heavy frame caused by streaming?
// Usage: node scripts/measure-flyback.mjs [--label final] [--runs 3]
//
// Two modes, unthrottled, 1600x900, each run on a fresh page:
//   full    ?perf&capture=1   every full group loads before opening (no streaming, no light packs)
//   stream  ?perf             the normal open-early, fill-in path; the walk starts once every group is warm
// Each run waits for allReady() + 2 s, walks p 0 -> 1 in 0.02 steps every 250 ms (the stats-walk pace),
// waits 1.5 s, jumps to p = 0 and waits 4 s. Long tasks are split into walk tasks and fly-back tasks.
// Writes reports/perf/<label>/flyback.json.
//
// --plain: for a build without the ?perf __venuePerf hook (main before the venue-speed branch).
// One mode, ?perf: long tasks come from an init-script PerformanceObserver (progress read from
// [data-render-metrics] data-camera-progress), scroll offsets from path.ts's scroll plan over the
// page's own [data-venue-track], and "ready" is the loader gone and the page scrollable (plus
// allReady() where the hook exists, so a streaming build is measured with every group warm).
// Run it from the folder whose out/ should be served (serve-export.mjs serves ./out);
// --out <dir> writes flyback.json there instead.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { register } from "node:module";

// path.ts imports extensionless TS paths; teach node to resolve them.
register(new URL("./ts-extensionless-hook.mjs", import.meta.url));
const { progressToScrollFraction } = await import("../src/venue/data/path.ts");

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const label = arg("label", "final");
const runsPerMode = Number(arg("runs", "3"));
const plain = process.argv.includes("--plain");
const MODES = plain ? { plain: "perf" } : { full: "perf&capture=1", stream: "perf" };
const ORIGIN = "http://127.0.0.1:4310";
const outDir = path.resolve(arg("out", path.join("reports/perf", label)));
mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const serveScript = path.resolve("scripts/serve-export.mjs");
const server = spawn(process.execPath, [serveScript], { stdio: "ignore" });
const here = path.dirname(fileURLToPath(import.meta.url));

/** --plain hooks: long tasks with the journey progress when they ended. */
const plainObserver = () => {
  window.__flybackTasks = [];
  new PerformanceObserver(list => {
    const progress = +(document.querySelector("[data-render-metrics]")?.dataset.cameraProgress ?? NaN);
    for (const e of list.getEntries()) window.__flybackTasks.push({ ms: Math.round(e.duration), progress });
  }).observe({ type: "longtask" });
};
const longTasks = page => page.evaluate(plain ? () => [...window.__flybackTasks] : () => window.__venuePerf.longTasks());
/** Scroll so the journey sits at p: the hook's own mapping, or path.ts's plan over the page's track. */
const scrollToP = (page, p) => plain
  ? page.evaluate(top => window.scrollTo({ top: top * Math.max(1, (document.querySelector("[data-venue-track]")?.offsetHeight ?? document.documentElement.scrollHeight) - innerHeight), behavior: "instant" }), progressToScrollFraction(p))
  : page.evaluate(p => window.scrollTo({ top: window.__venuePerf.scrollTop(p), behavior: "instant" }), p);
let browser;
const results = { label, runsPerMode, plain, served: path.resolve("out"), script: here, modes: {} };
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(ORIGIN + "/")).ok) break; } catch {} await sleep(200); }
  browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist"] });
  for (const [mode, query] of Object.entries(MODES)) {
    results.modes[mode] = { query, runs: [] };
    for (let r = 0; r < runsPerMode; r++) {
      const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      if (plain) await page.addInitScript(plainObserver);
      await page.goto(`${ORIGIN}/?${query}`, { waitUntil: "commit" });
      if (plain) {
        await page.waitForFunction(() => document.querySelector("[data-render-metrics]") && !document.querySelector("[data-venue-loading]")
          && (!window.__venuePerf || window.__venuePerf.allReady()), null, { timeout: 600000, polling: 100 });
      } else {
        await page.waitForFunction(() => window.__venuePerf?.allReady(), null, { timeout: 600000, polling: 100 });
      }
      await page.waitForFunction(() => document.body.style.overflow !== "hidden", null, { timeout: 60000 });
      await sleep(2000);
      const before = (await longTasks(page)).length;
      for (let i = 0; i <= 50; i++) {
        await scrollToP(page, +(i * 0.02).toFixed(2));
        await sleep(250);
      }
      await sleep(1500);
      const walkEnd = (await longTasks(page)).length;
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await sleep(4000);
      const tasks = await longTasks(page);
      const run = {
        walkTasks: tasks.slice(before, walkEnd),
        flyBackTasks: tasks.slice(walkEnd),
      };
      run.flyBackMaxMs = run.flyBackTasks.reduce((a, t) => Math.max(a, t.ms), 0);
      results.modes[mode].runs.push(run);
      console.log(`${mode.padEnd(6)} run ${r + 1}: walk ${JSON.stringify(run.walkTasks.map(t => `${t.ms}@${t.progress}`))}` +
        ` fly-back ${JSON.stringify(run.flyBackTasks.map(t => `${t.ms}@${t.progress}`))}`);
      await context.close();
    }
  }
} finally {
  await browser?.close();
  server.kill();
}
for (const [mode, m] of Object.entries(results.modes)) {
  const maxes = m.runs.map(r => r.flyBackMaxMs);
  m.flyBackMaxMs = maxes;
  m.flyBackTasksPerRun = m.runs.map(r => r.flyBackTasks.length);
  console.log(`${mode}: fly-back longest task per run ${maxes.join(", ")} ms; tasks per run ${m.flyBackTasksPerRun.join(", ")}`);
}
writeFileSync(path.join(outDir, "flyback.json"), JSON.stringify(results, null, 1));
