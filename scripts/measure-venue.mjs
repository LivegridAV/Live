// Measures venue load + walk against the built export. Usage:
//   node scripts/measure-venue.mjs --label <name> [--throttle fast4g|slow4g|none] [--pair | --no-pair]
//
// The venue opens before every full group has arrived (owner decision 3):
// right after opening, a fill-in walk heads down the journey at the planner's
// walking pace and records, per group, when it showed its light pack and when
// its full version. gapFrames counts frames in which the camera had passed a
// group's switch-on z while the group had neither (expected 0). Then, once
// every group is warm, the stats walk and the baseline shots run as before.
// --pair (default on Fast 4G) saves one lite/full screenshot pair from a
// standing camera to fill-in/.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const label = arg("label");
const throttle = arg("throttle", "none");
const pair = process.argv.includes("--pair") || (throttle === "fast4g" && !process.argv.includes("--no-pair"));
/** Walking pace of the fill-in walk: the opening planner's WALK_PACE_MPS. */
const WALK_PACE_MPS = 6;
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
mkdirSync(path.join(outDir, "fill-in"), { recursive: true });

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

  async function newPage(throttled, reducedMotion = "no-preference") {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, reducedMotion });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.clearBrowserCache");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (throttled) await cdp.send("Network.emulateNetworkConditions", PROFILES[throttle]);
    return { context, page };
  }
  const waitPerf = (page, fn, arg = null) => page.waitForFunction(fn, arg, { timeout: 900000, polling: 100 });
  /** Journey progress → path z, sampled finely (for walking at a pace in metres). */
  const pathTable = page => page.evaluate(() => Array.from({ length: 4001 }, (_, i) => window.__venuePerf.pathZ(i / 4000)));
  /** The first progress whose path z is at or below `z` (the walk heads toward -z); 1 past the end. */
  const progressAtZ = (table, z) => { const i = table.findIndex(v => v <= z); return i < 0 ? 1 : i / (table.length - 1); };
  const scrollToP = (page, p) => page.evaluate(p => window.scrollTo({ top: window.__venuePerf.scrollTop(p), behavior: "instant" }), p);

  /**
   * In-page monitor, every frame: per group, when it first showed its light
   * pack (lite-warm, full not yet warm), when its full version was warm, and
   * when the camera reached its switch-on z; and the frames in which a passed
   * group had neither (a gap: empty space).
   */
  const startMonitor = page => page.evaluate(groups => {
    const t0 = performance.now();
    const m = window.__fillIn = { frames: 0, gapFrames: 0, gaps: [], loadingCue: 0, timeline: {} };
    for (const g of groups) m.timeline[g.id] = { switchOnZ: g.switchOnZ, liteAt: null, fullAt: null, reachedAt: null };
    const tick = () => {
      if (m.stopped) return;
      const perf = window.__venuePerf;
      const shown = perf.groupsShown(), ready = perf.groupsReady();
      const pose = document.querySelector("[data-render-metrics]")?.dataset.cameraPose;
      const z = pose ? JSON.parse(pose).position[2] : null;
      const t = Math.round(performance.now() - t0);
      for (const g of groups) {
        const e = m.timeline[g.id];
        if (e.fullAt == null && ready.includes(g.id)) e.fullAt = t;
        if (e.liteAt == null && e.fullAt == null && shown.includes(g.id)) e.liteAt = t;
        if (e.reachedAt == null && z != null && z <= g.switchOnZ) e.reachedAt = t;
      }
      m.frames++;
      if (document.querySelector("[data-venue-loading]")) m.loadingCue++;
      const missing = z == null ? [] : groups.filter(g => z <= g.switchOnZ && !shown.includes(g.id)).map(g => g.id);
      if (missing.length) { m.gapFrames++; if (m.gaps.length < 50) m.gaps.push({ t, z: +z.toFixed(2), missing }); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, groups);
  const stopMonitor = page => page.evaluate(() => { window.__fillIn.stopped = true; return window.__fillIn; });

  // ---- load (throttled) ----
  const { context, page } = await newPage(true);
  const openingLog = [], venueLog = [];
  page.on("console", message => {
    const text = message.text();
    if (text.startsWith("[venue] opening with")) openingLog.push(text);
    if (text.startsWith("[venue]")) venueLog.push(text.slice(0, 200));
  });
  const t0 = Date.now();
  await page.goto(`${ORIGIN}/?perf`, { waitUntil: "commit" });
  await waitPerf(page, () => window.__venuePerf?.loaded());
  const msToOpen = Date.now() - t0;
  const transfer = await page.evaluate(() => {
    const r = performance.getEntriesByType("resource");
    return { bytes: r.reduce((a, e) => a + (e.transferSize || 0), 0), count: r.length };
  });
  const bytesBeforeOpen = transfer.bytes, requestsBeforeOpen = transfer.count;
  const openedAtPageMs = await page.evaluate(() => Math.round(performance.now()));

  // ---- fill-in walk: right after opening, at walking pace, while the full groups stream ----
  await startMonitor(page);
  const table = await pathTable(page);
  // The page scrolls once the loader has handed over (it holds overflow until then).
  await waitPerf(page, () => document.body.style.overflow !== "hidden");
  const walkStart = Date.now();
  let textCue = [];
  for (let p = 0, n = 0; p < 1; n++) {
    const elapsed = (Date.now() - walkStart) / 1000;
    p = progressAtZ(table, table[0] - WALK_PACE_MPS * elapsed);
    await scrollToP(page, p);
    if (n % 10 === 0) {
      // Any loading wording on screen after opening (the opening bar is [data-venue-loading]).
      // A text-node walk (no layout) and a visibility check only for matches, so the probe itself stays cheap.
      const cue = await page.evaluate(() => {
        const found = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const el = node.parentElement;
          // The ?perf-only entrance review panel has a "Loading preview" toggle; it is not a loading cue.
          if (!/\bloading\b/i.test(node.nodeValue ?? "") || !el || el.closest('script,style,noscript,[aria-label="Entrance atmosphere"]')) continue;
          if (el.getClientRects().length && getComputedStyle(el).visibility !== "hidden") found.push(node.nodeValue.trim().slice(0, 80));
        }
        return found;
      });
      if (cue.length) textCue.push({ progress: +p.toFixed(3), cue });
    }
    await sleep(100);
  }
  const fillInWalkMs = Date.now() - walkStart;
  const longTasksDuringFillIn = (await page.evaluate(() => window.__venuePerf.longTasks())).length;
  await waitPerf(page, () => window.__venuePerf.allReady());
  const msToAllReady = Date.now() - t0;
  const fillIn = await stopMonitor(page);
  const longTasksUntilAllReady = (await page.evaluate(() => window.__venuePerf.longTasks())).length;
  // Back to the start for the stats walk: an instant jump from p = 1 to 0 (the camera flies back through every zone).
  await scrollToP(page, 0);
  await sleep(2000);
  await page.evaluate(() => new Promise(res => { let n = 0; const f = () => (++n >= 60 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const longTasksAfterFlyBack = (await page.evaluate(() => window.__venuePerf.longTasks())).length;

  const snapshot = await page.evaluate(() => window.__venuePerf.snapshot());
  writeFileSync(path.join(outDir, "snapshot.json"), JSON.stringify(snapshot, null, 1));

  const walk = [];
  let gapFrames = 0;
  const steps = Math.round(1 / STEP);
  for (let i = 0; i <= steps; i++) {
    const progress = +(i * STEP).toFixed(2);
    await page.evaluate(p => window.scrollTo({ top: window.__venuePerf.scrollTop(p), behavior: "instant" }), progress);
    await sleep(STEP_MS);
    const sample = await page.evaluate(() => {
      const pose = document.querySelector("[data-render-metrics]")?.dataset.cameraPose;
      return { stats: window.__venuePerf.stats(), shown: window.__venuePerf.groupsShown(), z: pose ? JSON.parse(pose).position[2] : null };
    });
    const st = sample.stats;
    walk.push({ progress, callsMin: st.callsMin, callsMax: st.callsMax, trianglesMin: st.trianglesMin, trianglesMax: st.trianglesMax });
    // Gap: the camera has passed a group switch-on z (the walk heads toward -z) but the group has neither its light pack nor its full version.
    if (sample.z != null && groups.some(g => sample.z <= g.switchOnZ && !sample.shown.includes(g.id))) gapFrames++;
  }
  const longTasksAfterOpen = await page.evaluate(() => window.__venuePerf.longTasks());
  await context.close();
  gapFrames += fillIn.gapFrames;

  // ---- lite/full pair: a standing camera inside the last group to arrive in full ----
  let fillInPair = null;
  if (pair) {
    const target = groups.at(-2) ?? groups.at(-1); // projection: the largest full group, queued last but one
    const s = await newPage(true);
    await s.page.goto(`${ORIGIN}/?perf`, { waitUntil: "commit" });
    await waitPerf(s.page, () => window.__venuePerf?.loaded());
    const pairTable = await pathTable(s.page);
    // 46 m past switch-on: 12 m in front of the stall (switch-on is the zone start + 58 m).
    const p = progressAtZ(pairTable, target.switchOnZ - 46);
    await scrollToP(s.page, p);
    await sleep(2500);
    const state = () => s.page.evaluate(id => ({ shown: window.__venuePerf.groupsShown().includes(id), ready: window.__venuePerf.groupsReady().includes(id) }), target.id);
    await waitPerf(s.page, id => window.__venuePerf.groupsShown().includes(id), target.id);
    const lite = await state();
    await s.page.screenshot({ path: path.join(outDir, "fill-in", `${target.id}-lite.png`) });
    await waitPerf(s.page, id => window.__venuePerf.groupsReady().includes(id), target.id);
    await sleep(1500);
    await s.page.screenshot({ path: path.join(outDir, "fill-in", `${target.id}-full.png`) });
    fillInPair = { group: target.id, progress: +p.toFixed(4), liteShotWasLite: lite.shown && !lite.ready };
    await s.context.close();
  }

  // ---- shots ----
  // Deterministic: reduced motion, a fake page clock stepped one 16 ms frame at a time (so every
  // time-driven system accumulates the same amount), media time pinned, fps readout hidden.
  for (const shot of ["entrance", ...SHOTS]) {
    const s = await newPage(false, "reduce");
    await s.page.clock.install({ time: 0 });
    await s.page.goto(shot === "entrance" ? `${ORIGIN}/?perf` : `${ORIGIN}/?perf&camera=baseline&shot=${shot}`, { waitUntil: "commit" });
    await s.page.clock.pauseAt(1000);
    for (let n = 0; !(await s.page.evaluate(() => window.__venuePerf?.allReady() ?? false)); n++) {
      if (n > 100000) throw new Error(`shot ${shot} never became ready`);
      await s.page.clock.runFor(16);
      await sleep(5); // real time for network and GPU work
    }
    for (let i = 0; i < 120; i++) await s.page.clock.runFor(16);
    await s.page.evaluate(() => window.__venuePerf.freeze(1));
    for (let i = 0; i < 30; i++) await s.page.clock.runFor(16);
    await s.page.addStyleTag({ content: "[data-render-metrics]{visibility:hidden!important}" });
    await s.page.clock.runFor(16);
    await s.page.screenshot({ path: path.join(outDir, "shots", `${shot}.png`) });
    await s.context.close();
  }

  const metrics = {
    label, throttle, bytesBeforeOpen, msToOpen, requestsBeforeOpen, openingLog, msToAllReady, openedAtPageMs, venueLog,
    fillIn: { walkMs: fillInWalkMs, paceMps: WALK_PACE_MPS, frames: fillIn.frames, gapFrames: fillIn.gapFrames, gaps: fillIn.gaps,
      loadingCueFrames: fillIn.loadingCue, loadingText: textCue, longTasks: longTasksDuringFillIn, timeline: fillIn.timeline, pair: fillInPair },
    walk, longTasksAfterOpen, gapFrames,
    // Cumulative long-task counts at each phase end: fill-in walk, then until every group is warm, then the jump back to p = 0, then the stats walk (the rest).
    longTaskPhases: { fillInWalk: longTasksDuringFillIn, untilAllReady: longTasksUntilAllReady, flyBack: longTasksAfterFlyBack, statsWalk: longTasksAfterOpen.length },
  };
  writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 1));
  const max = k => Math.max(...walk.map(w => w[k]));
  const w0 = walk[0];
  console.log(`${label} [${throttle}] bytesBeforeOpen=${(bytesBeforeOpen / 1e6).toFixed(1)}MB msToOpen=${msToOpen} requests=${requestsBeforeOpen}`);
  console.log(`calls@0=${w0.callsMin}-${w0.callsMax} maxCalls=${max("callsMax")} tris@0=${w0.trianglesMin}-${w0.trianglesMax} maxTris=${max("trianglesMax")} longTasks=${longTasksAfterOpen.length} gapFrames=${gapFrames}`);
  console.log(`${openingLog.join(" | ")}`);
  console.log(`fill-in walk ${fillInWalkMs} ms: gapFrames=${fillIn.gapFrames}/${fillIn.frames} loadingCue=${fillIn.loadingCue} text=${textCue.length} allReady at ${msToAllReady} ms`);
  for (const [id, e] of Object.entries(fillIn.timeline)) console.log(`  ${id.padEnd(11)} reached ${e.reachedAt ?? "-"} ms, lite ${e.liteAt ?? "-"} ms, full ${e.fullAt ?? "-"} ms (after opening)`);
} finally {
  await browser?.close();
  server.kill();
}
