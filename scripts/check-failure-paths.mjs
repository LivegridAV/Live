// The venue must still open, with no gaps, when the texture helper or the file list fails. Usage:
//   node scripts/check-failure-paths.mjs [--label final-fix] [--throttle none|fast4g|slow4g]
//
// Against the built site (scripts/serve-export.mjs, port 4310), on a fresh cold page per case:
//   normal        nothing blocked: the request log must show no /basis/ request before opening
//   no-basis      every /basis/* request is aborted (a dropped transcoder fetch)
//   no-manifest   /models/load-manifest.json is aborted (the streamer falls back to every full group,
//                 so the venue opens on them, the KTX2 ones and the transcoder included)
//   no-wasm       an init script deletes globalThis.WebAssembly before the page runs (iOS Lockdown
//                 Mode, locked-down Edge): no /basis/ request at all
// Each case loads the page once, then reloads it (the run that counts, as a returning visitor
// would), waits for the venue to open, walks p 0 -> 1 in 0.01 steps every 120 ms while an
// in-page monitor counts gap frames (a passed group showing neither its light pack nor its full
// version) and loading-cue frames, then waits until every group is warm or reported failed. Records
// page errors (uncaught exceptions and unhandled rejections: must be none), console errors (must
// match the case's expected list), the [venue] log and the /basis/ requests before and after opening.
// no-wasm cannot open (see CASES): it loads once and checks that no /basis/ request is made and
// nothing throws. --only <case[,case]> runs a subset.
// Writes reports/perf/<label>/failure-paths.json (failure-paths-<only>.json with --only). Exits 1 if any case fails.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const label = arg("label", "final-fix");
const throttle = arg("throttle", "none");
const only = arg("only", null);
const PROFILES = {
  fast4g: { offline: false, downloadThroughput: 9000 * 1000 / 8, uploadThroughput: 1500 * 1000 / 8, latency: 60 },
  slow4g: { offline: false, downloadThroughput: 2000 * 1000 / 8, uploadThroughput: 1500 * 1000 / 8, latency: 150 },
  none: { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
};
if (!PROFILES[throttle]) { console.error(`unknown throttle ${throttle}`); process.exit(2); }
const ORIGIN = "http://127.0.0.1:4310";
const groups = JSON.parse(readFileSync(path.resolve("src/venue/loading/groups.json"), "utf8"));
const outDir = path.resolve("reports/perf", label);
mkdirSync(outDir, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isBasis = url => new URL(url).pathname.startsWith("/basis/");

/** Console errors a case may show: the browser's line for a request the case blocks, and three's line for a texture that then fails. */
const BLOCKED = /^Failed to load resource: net::ERR_(FAILED|BLOCKED_BY_CLIENT)/;
const CASES = {
  normal: { expectedErrors: [] },
  "no-basis": { block: "**/basis/**", expectedErrors: [BLOCKED, /^THREE\.GLTFLoader: Couldn't load texture/] },
  // Without the manifest there is no light pack to open with: the venue opens on every full group
  // (stream.ts planOpening), so the later groups' KTX2 textures, and the transcoder, come first.
  "no-manifest": { block: "**/models/load-manifest.json*", expectedErrors: [BLOCKED], basisBeforeOpenAllowed: true },
  // Every venue GLB is EXT_meshopt_compression (optimize-export.mjs, on main as well), and drei's
  // meshopt decoder needs WebAssembly: without it no model decodes and the venue cannot open, on
  // main or here: each mounted GLB throws GLTFLoader's meshopt error (on main too). What this case
  // checks is that the transcoder is never fetched and nothing else throws.
  "no-wasm": { noWasm: true, expectOpen: false, openTimeoutMs: 120000, expectedErrors: [/WebAssembly|meshopt|Couldn't load texture/i],
    expectedPageErrors: [/THREE\.GLTFLoader: setMeshoptDecoder must be called before loading compressed files/] },
};

const server = spawn(process.execPath, ["scripts/serve-export.mjs"], { stdio: "ignore" });
let browser;
const results = { label, throttle, cases: {} };
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(ORIGIN + "/")).ok) break; } catch {} await sleep(200); }
  browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist"] });

  for (const [name, spec] of Object.entries(CASES).filter(([name]) => !only || only.split(",").includes(name))) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    const result = { ok: false, opened: false };
    results.cases[name] = result;
    try {
      if (spec.noWasm) await context.addInitScript(() => { delete globalThis.WebAssembly; });
      if (spec.block) await context.route(spec.block, route => route.abort());
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.clearBrowserCache");
      await cdp.send("Network.emulateNetworkConditions", PROFILES[throttle]);

      const pageErrors = [], consoleErrors = [], venueLog = [], requests = [];
      const openTimeout = spec.openTimeoutMs ?? 900000;
      if (spec.expectOpen === false) {
        // One load: record what happens instead of waiting for an opening that cannot come.
        page.on("pageerror", e => pageErrors.push(String(e.message ?? e).slice(0, 300)));
        page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); if (m.text().startsWith("[venue]")) venueLog.push(m.text().slice(0, 300)); });
        page.on("request", r => requests.push({ url: r.url(), at: Date.now() }));
        await page.goto(`${ORIGIN}/?perf`, { waitUntil: "commit" });
        result.wasmInPage = await page.evaluate(() => typeof WebAssembly);
        result.opened = await page.waitForFunction(() => window.__venuePerf?.loaded(), null, { timeout: openTimeout, polling: 100 }).then(() => true, () => false);
        const basis = requests.filter(r => isBasis(r.url)).map(r => r.url.replace(ORIGIN, ""));
        const models = requests.filter(r => /\/models\/.+\.glb/.test(r.url)).length;
        Object.assign(result, { basisRequests: basis, modelRequests: models, pageErrors, consoleErrors: [...new Set(consoleErrors)], venueLog,
          unexpectedErrors: consoleErrors.filter(text => !spec.expectedErrors.some(re => re.test(text))) });
        const problems = [];
        if (result.wasmInPage !== "undefined") problems.push(`WebAssembly still defined (${result.wasmInPage})`);
        if (basis.length) problems.push(`${basis.length} /basis/ requests without WebAssembly`);
        result.unexpectedPageErrors = pageErrors.filter(text => !spec.expectedPageErrors.some(re => re.test(text)));
        if (result.unexpectedPageErrors.length) problems.push(`${result.unexpectedPageErrors.length} unexpected page errors`);
        if (result.unexpectedErrors.length) problems.push(`${result.unexpectedErrors.length} unexpected console errors`);
        result.problems = problems;
        result.ok = problems.length === 0;
        result.note = result.opened ? "opened" : `did not open within ${openTimeout / 1000} s (expected: meshopt geometry needs WebAssembly, on main too)`;
      } else {

      // First load: the browser cache fills as for a visitor's first visit; then the counted reload.
      await page.goto(`${ORIGIN}/?perf`, { waitUntil: "commit" });
      await page.waitForFunction(() => window.__venuePerf?.loaded(), null, { timeout: openTimeout, polling: 100 });
      await sleep(1000);

      let openedAt = Infinity;
      page.on("pageerror", e => pageErrors.push(String(e.message ?? e).slice(0, 300)));
      page.on("console", m => {
        if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
        if (m.text().startsWith("[venue]")) venueLog.push(m.text().slice(0, 300));
      });
      page.on("request", r => requests.push({ url: r.url(), at: Date.now() }));
      const t0 = Date.now();
      await page.reload({ waitUntil: "commit" });
      result.wasmInPage = await page.evaluate(() => typeof WebAssembly);
      await page.waitForFunction(() => window.__venuePerf?.loaded(), null, { timeout: openTimeout, polling: 100 });
      openedAt = Date.now();
      result.opened = true;
      result.msToOpen = openedAt - t0;

      // Gap monitor (as in check-nav-jumps.mjs), then a short walk once the page can scroll.
      await page.evaluate(groups => {
        const m = window.__failure = { frames: 0, gapFrames: 0, gaps: [], loadingCue: 0 };
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
      await page.waitForFunction(() => document.body.style.overflow !== "hidden", null, { timeout: 60000 });
      for (let i = 0; i <= 100; i++) {
        await page.evaluate(p => window.scrollTo({ top: window.__venuePerf.scrollTop(p), behavior: "instant" }), +(i * 0.01).toFixed(2));
        await sleep(120);
      }

      // Settle: every group warm, or reported failed for good (its zone keeps the light pack).
      const failedGroups = () => groups.map(g => g.id).filter(id => venueLog.some(l => l.startsWith(`[venue] load group ${id} failed 4 times`)));
      const settleEnd = Date.now() + 600000;
      for (;;) {
        const ready = await page.evaluate(() => window.__venuePerf.groupsReady());
        if (groups.every(g => ready.includes(g.id) || failedGroups().includes(g.id))) break;
        if (Date.now() > settleEnd) { result.settleTimedOut = true; break; }
        await sleep(500);
      }
      // Walk back to the start and out again over the settled venue.
      for (let i = 100; i >= 0; i -= 4) {
        await page.evaluate(p => window.scrollTo({ top: window.__venuePerf.scrollTop(p), behavior: "instant" }), +(i * 0.01).toFixed(2));
        await sleep(120);
      }
      const monitor = await page.evaluate(() => { window.__failure.stopped = true; return window.__failure; });
      const shown = await page.evaluate(() => window.__venuePerf.groupsShown());
      const ready = await page.evaluate(() => window.__venuePerf.groupsReady());
      const basis = requests.filter(r => isBasis(r.url));
      Object.assign(result, {
        frames: monitor.frames, gapFrames: monitor.gapFrames, gaps: monitor.gaps, loadingCueFrames: monitor.loadingCue,
        groupsReady: ready, groupsShown: shown, groupsFailed: failedGroups(),
        basisBeforeOpen: basis.filter(r => r.at <= openedAt).map(r => r.url.replace(ORIGIN, "")),
        basisAfterOpen: basis.filter(r => r.at > openedAt).map(r => r.url.replace(ORIGIN, "")),
        pageErrors, consoleErrors,
        unexpectedErrors: consoleErrors.filter(text => !spec.expectedErrors.some(re => re.test(text))),
        venueWarnings: venueLog.filter(l => /failed|off for this visit|Basis/.test(l)),
      });
      const problems = [];
      if (result.gapFrames) problems.push(`${result.gapFrames} gap frames`);
      if (result.loadingCueFrames) problems.push(`${result.loadingCueFrames} loading-cue frames`);
      if (pageErrors.length) problems.push(`${pageErrors.length} page errors`);
      if (result.unexpectedErrors.length) problems.push(`${result.unexpectedErrors.length} unexpected console errors`);
      if (result.basisBeforeOpen.length && !spec.basisBeforeOpenAllowed) problems.push(`${result.basisBeforeOpen.length} /basis/ requests before opening`);
      if (spec.noWasm && basis.length) problems.push(`${basis.length} /basis/ requests without WebAssembly`);
      if (spec.noWasm && result.wasmInPage !== "undefined") problems.push(`WebAssembly still defined (${result.wasmInPage})`);
      if (groups.some(g => !shown.includes(g.id))) problems.push(`zones with nothing to show: ${groups.filter(g => !shown.includes(g.id)).map(g => g.id)}`);
      if (result.settleTimedOut) problems.push("groups neither warm nor failed after 10 min");
      result.problems = problems;
      result.ok = problems.length === 0;
      }
    } catch (e) {
      result.problems = [`run failed: ${String(e.message ?? e).split("\n")[0]}`];
    } finally {
      await context.close().catch(() => {});
    }
    if (spec.expectOpen === false) {
      console.log(`${result.ok ? "ok  " : "FAIL"} ${name.padEnd(12)} ${result.note}; WebAssembly ${result.wasmInPage}, /basis requests ${result.basisRequests?.length},` +
        ` GLB requests ${result.modelRequests}, page errors ${result.pageErrors?.length} (unexpected ${result.unexpectedPageErrors?.length}), console errors ${result.consoleErrors?.length} (unexpected ${result.unexpectedErrors?.length})` +
        `${result.consoleErrors?.length ? ` [${result.consoleErrors.slice(0, 3).join(" | ")}]` : ""}${result.problems?.length ? ` — ${result.problems.join("; ")}` : ""}`);
      continue;
    }
    console.log(`${result.ok ? "ok  " : "FAIL"} ${name.padEnd(12)} open ${((result.msToOpen ?? NaN) / 1000).toFixed(1)} s, gapFrames ${result.gapFrames}/${result.frames},` +
      ` ready ${result.groupsReady?.join(",")}, failed ${result.groupsFailed?.join(",") || "none"}, /basis before/after open ${result.basisBeforeOpen?.length}/${result.basisAfterOpen?.length},` +
      ` page errors ${result.pageErrors?.length}, console errors ${result.consoleErrors?.length} (unexpected ${result.unexpectedErrors?.length})${result.problems?.length ? ` — ${result.problems.join("; ")}` : ""}`);
  }
} finally {
  await browser?.close();
  server.kill();
}
writeFileSync(path.join(outDir, only ? `failure-paths-${only.replace(/,/g, "+")}.json` : "failure-paths.json"), JSON.stringify(results, (k, v) => v === Infinity ? null : v, 1));
const bad = Object.entries(results.cases).filter(([, r]) => !r.ok);
console.log(`${Object.keys(results.cases).length} cases, ${bad.length} failed${bad.length ? `: ${bad.map(([n]) => n).join(", ")}` : ""}`);
process.exit(bad.length ? 1 : 0);
