// Nav jumps and stall visits right after opening, on a cold cache. Usage:
//   node scripts/check-nav-jumps.mjs [--label final] [--throttle fast4g|slow4g|none] [--only jumps|visits]
//
// For every progress-rail stop (the HUD nav jumps) and every stall visit (?shot=<stall>&view=front),
// a fresh throttled page opens the venue and, the moment the page can scroll, clicks that rail stop
// (or, for a visit, the visit camera is already standing at the stall). An in-page monitor then runs
// every frame until every group is warm, counting gap frames: frames in which the camera has passed
// a group's switch-on z while that group shows neither its light pack nor its full version (empty
// space; expected 0). It also counts frames with the opening bar ([data-venue-loading]) on screen,
// records console errors, the order full groups arrived in after the jump, and one screenshot on
// arrival and one once full detail is in. Writes reports/perf/<label>/nav-jumps.json (nav-jumps-<only>.json with --only) and
// nav-jumps/*.jpg. Exits 1 if any run had gap frames, a loading cue, a console error or a missed stop.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const label = arg("label", "final");
const throttle = arg("throttle", "fast4g");
const only = arg("only", "all");
const PROFILES = {
  fast4g: { offline: false, downloadThroughput: 9000 * 1000 / 8, uploadThroughput: 1500 * 1000 / 8, latency: 60 },
  slow4g: { offline: false, downloadThroughput: 2000 * 1000 / 8, uploadThroughput: 1500 * 1000 / 8, latency: 150 },
  none: { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
};
if (!PROFILES[throttle]) { console.error(`unknown throttle ${throttle}`); process.exit(2); }
const ORIGIN = "http://127.0.0.1:4310";
/** The stall visits (src/venue/data/stallVisits.ts STALL_VISITS keys). */
const VISITS = ["reception", "anamorphic", "technical", "led-rental", "projection"];
const groups = JSON.parse(readFileSync(path.resolve("src/venue/loading/groups.json"), "utf8"));
/** groups.ts groupForZ: the last group whose switch-on z the point has passed. */
const groupForZ = z => { let found = groups[0]; for (const g of groups) { if (z <= g.switchOnZ) found = g; else break; } return found; };
const outDir = path.resolve("reports/perf", label);
mkdirSync(path.join(outDir, "nav-jumps"), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const server = spawn(process.execPath, ["scripts/serve-export.mjs"], { stdio: "ignore" });
let browser;
const runs = [];
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(ORIGIN + "/")).ok) break; } catch {} await sleep(200); }
  browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist"] });

  async function openCold(query) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.clearBrowserCache");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", PROFILES[throttle]);
    const errors = [], venueLog = [];
    page.on("pageerror", e => errors.push(`pageerror: ${String(e.message ?? e).slice(0, 200)}`));
    page.on("console", m => {
      if (m.type() === "error") errors.push(m.text().slice(0, 200));
      if (m.text().startsWith("[venue]")) venueLog.push(m.text().slice(0, 200));
    });
    const t0 = Date.now();
    await page.goto(`${ORIGIN}/?${query}`, { waitUntil: "commit" });
    await page.waitForFunction(() => window.__venuePerf?.loaded(), null, { timeout: 900000, polling: 100 });
    const msToOpen = Date.now() - t0;
    return { context, page, errors, venueLog, msToOpen };
  }

  /** Same monitor as measure-venue's fill-in walk. */
  const startMonitor = page => page.evaluate(groups => {
    const t0 = performance.now();
    const m = window.__jump = { frames: 0, gapFrames: 0, gaps: [], loadingCue: 0, liteAt: {}, fullAt: {}, tasksAtStart: window.__venuePerf.longTasks().length };
    const tick = () => {
      if (m.stopped) return;
      const perf = window.__venuePerf, shown = perf.groupsShown(), ready = perf.groupsReady();
      const pose = document.querySelector("[data-render-metrics]")?.dataset.cameraPose;
      const z = pose ? JSON.parse(pose).position[2] : null;
      const t = Math.round(performance.now() - t0);
      for (const g of groups) {
        if (m.fullAt[g.id] == null && ready.includes(g.id)) m.fullAt[g.id] = t;
        if (m.liteAt[g.id] == null && m.fullAt[g.id] == null && shown.includes(g.id)) m.liteAt[g.id] = t;
      }
      m.frames++;
      if (document.querySelector("[data-venue-loading]")) m.loadingCue++;
      const missing = z == null ? [] : groups.filter(g => z <= g.switchOnZ && !shown.includes(g.id)).map(g => g.id);
      if (missing.length) { m.gapFrames++; if (m.gaps.length < 30) m.gaps.push({ t, z: +z.toFixed(2), missing }); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, groups);

  /** Wait until the camera's journey progress has settled (moved < 0.001 over 1 s), up to `ms`. */
  async function settle(page, ms = 20000) {
    const read = () => page.evaluate(() => +(document.querySelector("[data-render-metrics]")?.dataset.cameraProgress ?? NaN));
    let last = await read(), still = 0;
    for (const end = Date.now() + ms; Date.now() < end && still < 4;) {
      await sleep(250);
      const now = await read();
      still = Math.abs(now - last) < 0.001 ? still + 1 : 0;
      last = now;
    }
    return last;
  }

  async function finish(run, s, shotName) {
    run.arrivedProgress = await settle(s.page);
    run.arrivedZ = await s.page.evaluate(() => +JSON.parse(document.querySelector("[data-render-metrics]").dataset.cameraPose).position[2].toFixed(2));
    // The group groupForZ picks where the camera came to rest (the one a jump there prioritizes).
    run.targetGroup = groupForZ(run.arrivedZ).id;
    run.arrivedShown = await s.page.evaluate(() => window.__venuePerf.groupsShown());
    run.arrivedReady = await s.page.evaluate(() => window.__venuePerf.groupsReady());
    await s.page.screenshot({ path: path.join(outDir, "nav-jumps", `${shotName}-arrival.jpg`), type: "jpeg", quality: 70 });
    await s.page.waitForFunction(() => window.__venuePerf.allReady(), null, { timeout: 900000, polling: 100 });
    await sleep(1000);
    await s.page.screenshot({ path: path.join(outDir, "nav-jumps", `${shotName}-full.jpg`), type: "jpeg", quality: 70 });
    const m = await s.page.evaluate(() => { window.__jump.stopped = true; return window.__jump; });
    const tasks = await s.page.evaluate(() => window.__venuePerf.longTasks());
    const after = tasks.slice(m.tasksAtStart);
    Object.assign(run, {
      msToOpen: s.msToOpen, frames: m.frames, gapFrames: m.gapFrames, gaps: m.gaps, loadingCueFrames: m.loadingCue,
      liteAt: m.liteAt, fullAt: m.fullAt,
      fullOrderAfterJump: Object.entries(m.fullAt).filter(([, t]) => t > 0).sort((a, b) => a[1] - b[1]).map(([id]) => id),
      longTasks: after.length, longestTaskMs: after.reduce((a, t) => Math.max(a, t.ms), 0),
      consoleErrors: s.errors, venueLog: s.venueLog,
    });
    await s.context.close();
    const ok = run.gapFrames === 0 && run.loadingCueFrames === 0 && run.consoleErrors.length === 0 && !run.missed;
    console.log(`${ok ? "ok  " : "FAIL"} ${run.kind.padEnd(5)} ${run.name.padEnd(22)} open ${(run.msToOpen / 1000).toFixed(1)} s, target ${run.targetGroup}` +
      ` full +${run.fullAt[run.targetGroup] ?? "?"} ms, gapFrames ${run.gapFrames}/${run.frames}, cue ${run.loadingCueFrames}, errors ${run.consoleErrors.length},` +
      ` long tasks ${run.longTasks} (max ${run.longestTaskMs} ms), full order ${run.fullOrderAfterJump.join(">")}`);
    runs.push(run);
  }

  /** One cold run; a run that throws (a timeout, say) is recorded as missed instead of ending the check. */
  async function attempt(base, start) {
    const run = { ...base, missed: false, consoleErrors: [] };
    let s;
    try {
      const [opened, shotName] = await start(run);
      s = opened;
      await finish(run, s, shotName);
    } catch (e) {
      run.missed = `run failed: ${String(e.message ?? e).split("\n")[0]}`;
      if (s) run.consoleErrors = s.errors;
      await s?.context.close().catch(() => {});
      console.log(`FAIL ${run.kind.padEnd(5)} ${run.name}: ${run.missed}`);
      runs.push(run);
    }
  }

  if (only !== "visits") {
    // The rail's own labels, read from the page (NAV_STOPS in src/venue/data/zones.ts).
    const probe = await openCold("perf");
    await probe.page.waitForFunction(() => document.body.style.overflow !== "hidden");
    const stops = await probe.page.$$eval('nav[aria-label="Jump to a part of the experience"] button', bs => bs.map(b => b.getAttribute("aria-label")));
    await probe.context.close();
    console.log(`rail stops: ${stops.join(", ")}`);
    for (const name of stops) {
      await attempt({ kind: "jump", name }, async run => {
        const s = await openCold("perf");
        await s.page.waitForFunction(() => document.body.style.overflow !== "hidden");
        await startMonitor(s.page);
        const button = s.page.locator('nav[aria-label="Jump to a part of the experience"]').getByRole("button", { name, exact: true });
        try { await button.click({ timeout: 5000 }); } catch (e) { run.missed = `click failed: ${e.message.split("\n")[0]}`; }
        return [s, `jump-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`];
      });
    }
  }
  if (only !== "jumps") {
    for (const stall of VISITS) {
      await attempt({ kind: "visit", name: stall }, async () => {
        const s = await openCold(`perf&shot=${stall}&view=front`);
        await startMonitor(s.page);
        return [s, `visit-${stall}`];
      });
    }
  }
} finally {
  await browser?.close();
  server.kill();
}
writeFileSync(path.join(outDir, only === "all" ? "nav-jumps.json" : `nav-jumps-${only}.json`), JSON.stringify({ label, throttle, runs }, null, 1));
const bad = runs.filter(r => r.gapFrames || r.loadingCueFrames || r.consoleErrors.length || r.missed);
console.log(`${runs.length} runs, ${bad.length} with gap frames, a loading cue, console errors or a missed stop`);
process.exit(bad.length ? 1 : 0);
