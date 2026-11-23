// Mobile-emulation walk of the whole journey (the plan's in-browser walk, scripted). Usage:
//   node scripts/walk-mobile.mjs [--label final] [--cpu 4] [--throttle none|fast4g]
//
// Chrome via playwright-core at 375x812, dpr 3, touch, an Android Chrome user agent, and CDP
// Emulation.setCPUThrottlingRate (default 4x). Passes, each on a fresh cold page:
//   walk      ?perf: open; right after opening, jump to the far end with the menu's "Arena" stop and
//             back; walk the journey at the test pace (0.02 progress every 250 ms) with screenshots;
//             then every menu stop in turn (the phone layout hides the rail; the menu sheet lists the
//             same NAV_STOPS).
//   reduced   ?perf with prefers-reduced-motion: reduce: open, a few steps, two menu jumps.
//   visits    ?perf&shot=<stall>&view=front for each stall visit, then "Back to Venue".
//   inspect   ?perf&inspect=placement: waits for the inspection status to read "ready".
//   capture   ?perf&capture=1: UI hidden, full load.
// Every pass counts gap frames (a passed group showing neither light pack nor full version), frames
// with the opening bar, console errors and page errors. Writes reports/perf/<label>/mobile/walk.json
// and mobile/*.jpg. Exits 1 on any gap frame, loading cue, console error or failed check.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const label = arg("label", "final");
const cpu = Number(arg("cpu", "4"));
const throttle = arg("throttle", "none");
const onlyPass = arg("only", null);
const PROFILES = {
  fast4g: { offline: false, downloadThroughput: 9000 * 1000 / 8, uploadThroughput: 1500 * 1000 / 8, latency: 60 },
  none: { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
};
const ORIGIN = "http://127.0.0.1:4310";
const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const VISITS = ["reception", "anamorphic", "technical", "led-rental", "projection"];
const SHOT_AT = [0, 0.1, 0.2, 0.3, 0.4, 0.46, 0.54, 0.6, 0.68, 0.72, 0.8, 0.87, 0.94, 1];
const groups = JSON.parse(readFileSync(path.resolve("src/venue/loading/groups.json"), "utf8"));
const outDir = path.resolve("reports/perf", label, "mobile");
mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const server = spawn(process.execPath, ["scripts/serve-export.mjs"], { stdio: "ignore" });
let browser;
const passes = {};
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(ORIGIN + "/")).ok) break; } catch {} await sleep(200); }
  browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist"] });

  async function open(query, { reducedMotion = "no-preference", waitAll = false } = {}) {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA, reducedMotion,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.clearBrowserCache");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", PROFILES[throttle]);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
    const errors = [], venueLog = [];
    page.on("pageerror", e => errors.push(`pageerror: ${String(e.message ?? e).slice(0, 240)}`));
    page.on("console", m => {
      if (m.type() === "error") errors.push(m.text().slice(0, 240));
      if (m.text().startsWith("[venue]")) venueLog.push(m.text().slice(0, 200));
    });
    const t0 = Date.now();
    await page.goto(`${ORIGIN}/?${query}`, { waitUntil: "commit" });
    await page.waitForFunction(() => window.__venuePerf?.loaded(), null, { timeout: 900000, polling: 250 });
    const msToOpen = Date.now() - t0;
    if (waitAll) await page.waitForFunction(() => window.__venuePerf.allReady(), null, { timeout: 900000, polling: 250 });
    // Monitor every frame from opening (as measure-venue's fill-in walk).
    await page.evaluate(groups => {
      const m = window.__walk = { frames: 0, gapFrames: 0, gaps: [], loadingCue: 0 };
      const tick = () => {
        if (m.stopped) return;
        const shown = window.__venuePerf.groupsShown();
        const pose = document.querySelector("[data-render-metrics]")?.dataset.cameraPose;
        const z = pose ? JSON.parse(pose).position[2] : null;
        m.frames++;
        if (document.querySelector("[data-venue-loading]")) m.loadingCue++;
        const missing = z == null ? [] : groups.filter(g => z <= g.switchOnZ && !shown.includes(g.id)).map(g => g.id);
        if (missing.length) { m.gapFrames++; if (m.gaps.length < 30) m.gaps.push({ z: +z.toFixed(2), missing }); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, groups);
    const quality = await page.evaluate(() => ({ dpr: window.devicePixelRatio, canvas: (() => { const c = document.querySelector("canvas"); return c ? [c.width, c.height] : null; })() }));
    return { context, page, errors, venueLog, msToOpen, quality, t0 };
  }
  const shot = (s, name) => s.page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: "jpeg", quality: 72 });
  const progress = s => s.page.evaluate(() => +(document.querySelector("[data-render-metrics]")?.dataset.cameraProgress ?? NaN));
  async function settle(s, ms = 25000) {
    let last = await progress(s), still = 0;
    for (const end = Date.now() + ms; Date.now() < end && still < 4;) {
      await sleep(250);
      const now = await progress(s);
      still = Math.abs(now - last) < 0.001 ? still + 1 : 0;
      last = now;
    }
    return last;
  }
  const canScroll = s => s.page.waitForFunction(() => document.body.style.overflow !== "hidden", null, { timeout: 120000 });
  async function menuJump(s, name) {
    await s.page.getByRole("button", { name: "Open menu" }).click({ timeout: 10000 });
    await s.page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name, exact: true }).click({ timeout: 10000 });
    return settle(s);
  }
  async function close(s, extra = {}) {
    const m = await s.page.evaluate(() => { window.__walk.stopped = true; return window.__walk; });
    const tasks = await s.page.evaluate(() => window.__venuePerf.longTasks());
    await s.context.close();
    return { msToOpen: s.msToOpen, quality: s.quality, frames: m.frames, gapFrames: m.gapFrames, gaps: m.gaps, loadingCueFrames: m.loadingCue,
      longTasks: tasks.length, longestTaskMs: tasks.reduce((a, t) => Math.max(a, t.ms), 0), consoleErrors: s.errors, venueLog: s.venueLog, ...extra };
  }
  async function pass(name, fn) {
    if (onlyPass && onlyPass !== name) return;
    const t = Date.now();
    try { passes[name] = await fn(); } catch (e) { passes[name] = { failed: String(e.message ?? e).split("\n")[0] }; }
    const p = passes[name];
    console.log(`${name}: ${p.failed ? `FAILED ${p.failed}` : `open ${(p.msToOpen / 1000).toFixed(1)} s, gapFrames ${p.gapFrames}/${p.frames}, cue ${p.loadingCueFrames}, errors ${p.consoleErrors.length}, long tasks ${p.longTasks} (max ${p.longestTaskMs} ms)`} [${Math.round((Date.now() - t) / 1000)} s]`);
  }

  await pass("walk", async () => {
    const s = await open("perf");
    await canScroll(s);
    await shot(s, "walk-open");
    // Straight to the far end right after opening, then back.
    const jumpEarly = { arena: await menuJump(s, "Arena") };
    jumpEarly.shownOnArrival = await s.page.evaluate(() => window.__venuePerf.groupsShown());
    jumpEarly.readyOnArrival = await s.page.evaluate(() => window.__venuePerf.groupsReady());
    await shot(s, "walk-early-arena");
    jumpEarly.entrance = await menuJump(s, "Entrance");
    await s.page.waitForFunction(() => window.__venuePerf.allReady(), null, { timeout: 900000, polling: 250 });
    const msToAllReady = Date.now() - s.t0;
    const samples = [];
    const pending = [...SHOT_AT];
    for (let i = 0; i <= 50; i++) {
      const p = +(i * 0.02).toFixed(2);
      await s.page.evaluate(p => window.scrollTo({ top: window.__venuePerf.scrollTop(p), behavior: "instant" }), p);
      await sleep(250);
      const st = await s.page.evaluate(() => window.__venuePerf.stats());
      samples.push({ progress: p, callsMax: st.callsMax, trianglesMax: st.trianglesMax });
      while (pending.length && pending[0] <= p + 1e-9) {
        const at = pending.shift();
        await sleep(900);
        await shot(s, `walk-p${String(Math.round(at * 100)).padStart(3, "0")}`);
      }
    }
    // Every menu stop in turn.
    const stops = [];
    await s.page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await settle(s);
    await s.page.getByRole("button", { name: "Open menu" }).click();
    const names = await s.page.getByRole("dialog", { name: "Menu" }).locator("button.v-nav-link").allTextContents();
    await s.page.getByRole("button", { name: "Close", exact: true }).click();
    for (const name of names) {
      const arrived = await menuJump(s, name);
      await sleep(600);
      await shot(s, `menu-${slug(name)}`);
      stops.push({ name, arrived });
    }
    const max = k => Math.max(...samples.map(w => w[k]));
    return close(s, { jumpEarly, stops, walk: samples, callsMax: max("callsMax"), trianglesMax: max("trianglesMax"), msToAllReady });
  });

  await pass("reduced", async () => {
    const s = await open("perf", { reducedMotion: "reduce" });
    await canScroll(s);
    for (let i = 0; i <= 10; i++) {
      await s.page.evaluate(p => window.scrollTo({ top: window.__venuePerf.scrollTop(p), behavior: "instant" }), i * 0.02);
      await sleep(250);
    }
    await shot(s, "reduced-p020");
    const arena = await menuJump(s, "Arena");
    await shot(s, "reduced-arena");
    const entrance = await menuJump(s, "Entrance");
    const reducedMotion = await s.page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    return close(s, { reducedMotion, arena, entrance });
  });

  await pass("visits", async () => {
    const out = { frames: 0, gapFrames: 0, gaps: [], loadingCueFrames: 0, longTasks: 0, longestTaskMs: 0, consoleErrors: [], visits: [], msToOpen: 0 };
    for (const stall of VISITS) {
      const s = await open(`perf&shot=${stall}&view=front`);
      await settle(s);
      await sleep(800);
      const shown = await s.page.locator(".v-stall-visit").isVisible();
      await shot(s, `visit-${stall}`);
      let returned = false;
      if (shown) {
        await s.page.getByRole("button", { name: "Back to Venue" }).click({ timeout: 10000 });
        returned = await s.page.waitForFunction(() => !document.querySelector(".v-stall-visit"), null, { timeout: 20000 }).then(() => true, () => false);
        await settle(s);
        await shot(s, `visit-${stall}-back`);
      }
      const r = await close(s, { stall });
      out.visits.push({ stall, msToOpen: r.msToOpen, visitBarShown: shown, returnedToVenue: returned, gapFrames: r.gapFrames, errors: r.consoleErrors.length });
      out.frames += r.frames; out.gapFrames += r.gapFrames; out.gaps.push(...r.gaps); out.loadingCueFrames += r.loadingCueFrames;
      out.longTasks += r.longTasks; out.longestTaskMs = Math.max(out.longestTaskMs, r.longestTaskMs); out.consoleErrors.push(...r.consoleErrors);
      out.msToOpen = Math.max(out.msToOpen, r.msToOpen);
      if (!shown || !returned) out.failedChecks = [...(out.failedChecks ?? []), `${stall}: bar ${shown}, back ${returned}`];
    }
    return out;
  });

  await pass("inspect", async () => {
    const s = await open("perf&inspect=placement", { waitAll: true });
    const state = await s.page.waitForFunction(() => document.querySelector("[data-placement-inspection]")?.dataset.placementInspection === "ready", null, { timeout: 120000 })
      .then(() => "ready", async () => s.page.evaluate(() => document.querySelector("[data-placement-inspection]")?.dataset.placementInspection ?? "missing"));
    await shot(s, "inspect");
    return close(s, { inspection: state, failedChecks: state === "ready" ? undefined : [`inspection ${state}`] });
  });

  await pass("capture", async () => {
    const s = await open("perf&capture=1", { waitAll: true });
    await sleep(1500);
    const hidden = await s.page.evaluate(() => document.querySelector(".venue")?.dataset.capture === "true");
    await shot(s, "capture");
    return close(s, { uiHidden: hidden, failedChecks: hidden ? undefined : ["capture mode did not hide the UI"] });
  });
} finally {
  await browser?.close();
  server.kill();
}
writeFileSync(path.join(outDir, "walk.json"), JSON.stringify({ label, cpu, throttle, viewport: "375x812@3", passes }, null, 1));
const bad = Object.entries(passes).filter(([, p]) => p.failed || p.gapFrames || p.loadingCueFrames || p.consoleErrors?.length || p.failedChecks?.length);
for (const [name, p] of bad) console.log(`problem in ${name}: ${JSON.stringify({ failed: p.failed, gapFrames: p.gapFrames, cue: p.loadingCueFrames, errors: p.consoleErrors, checks: p.failedChecks })}`);
process.exit(bad.length ? 1 : 0);
