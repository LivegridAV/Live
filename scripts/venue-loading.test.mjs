import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { LOAD_GROUPS, START_GROUP, assetsFor, groupForZ } from "../src/venue/loading/groups.ts";
import { groupsBeforeOpening, nextToFetch, WALK_PACE_MPS, SAFETY_MARGIN_S } from "../src/venue/loading/plan.ts";

const GROUPS = [
  { id: "start", switchOnZ: 21, bytes: 20e6 },
  { id: "a", switchOnZ: -60, bytes: 5e6 },
  { id: "b", switchOnZ: -140, bytes: 10e6 },
];

test("planner constants", () => {
  assert.equal(WALK_PACE_MPS, 6);
  assert.equal(SAFETY_MARGIN_S, 4);
});

test("9 Mbps: later groups stream in behind the visitor", () => {
  // a arrives 4.4 s after opening, reached at 13.5 s; b arrives 13.3 s, reached 26.8 s.
  assert.deepEqual(groupsBeforeOpening({ bytesPerSecond: 1_125_000, groups: GROUPS, startZ: 21 }), ["start"]);
});

test("4 Mbps: a misses its deadline and loads before opening, b streams", () => {
  // a would arrive at 10 s against 9.5 s; b alone then arrives at 20 s against 22.8 s.
  assert.deepEqual(groupsBeforeOpening({ bytesPerSecond: 500_000, groups: GROUPS, startZ: 21 }), ["start", "a"]);
});

test("2 Mbps: every group loads before opening", () => {
  // b alone would arrive at 40 s against 22.8 s.
  assert.deepEqual(groupsBeforeOpening({ bytesPerSecond: 250_000, groups: GROUPS, startZ: 21 }), ["start", "a", "b"]);
});

test("when only the last group fails, the list extends to include it", () => {
  // At 1 MB/s: a arrives 5 s (+4 margin = 9 s) against 13.5 s, fine;
  // a then b arrives 25 s (+4 = 29 s) against 26.8 s, so b fails and the list
  // must extend through b.
  const groups = [
    { id: "start", switchOnZ: 21, bytes: 20e6 },
    { id: "a", switchOnZ: -60, bytes: 5e6 },
    { id: "b", switchOnZ: -140, bytes: 20e6 },
  ];
  assert.deepEqual(groupsBeforeOpening({ bytesPerSecond: 1e6, groups, startZ: 21 }), ["start", "a", "b"]);
});

test("pace and margin are overridable", () => {
  // At walking pace 1 m/s, a is reached at 81 s, so even 2 Mbps streams both.
  assert.deepEqual(groupsBeforeOpening({ bytesPerSecond: 250_000, groups: GROUPS, startZ: 21, paceMps: 1, marginS: 0 }), ["start"]);
});

test("nextToFetch honours priority, then journey order", () => {
  const groups = [{ id: "start" }, { id: "a" }, { id: "b" }];
  const none = new Set();
  assert.equal(nextToFetch(groups, new Set(["start"]), none, "b"), "b");
  assert.equal(nextToFetch(groups, new Set(["start"]), none), "a");
  assert.equal(nextToFetch(groups, new Set(["start"]), new Set(["b"]), "b"), "a");
  assert.equal(nextToFetch(groups, new Set(["start"]), new Set(["a"])), "b");
  assert.equal(nextToFetch(groups, new Set(["start", "a", "b"]), none, "b"), undefined);
});

test("groupForZ maps the start camera to the start group", () => {
  assert.equal(START_GROUP, "start");
  assert.equal(LOAD_GROUPS[0].id, START_GROUP);
  assert.equal(groupForZ(21).id, "start");
  assert.equal(groupForZ(500).id, "start");
  for (const group of LOAD_GROUPS) assert.equal(groupForZ(group.switchOnZ).id, group.id);
  assert.equal(groupForZ(-1000).id, LOAD_GROUPS.at(-1).id);
});

test("groups.json is plain JSON in journey order", () => {
  const json = JSON.parse(readFileSync("src/venue/loading/groups.json", "utf8"));
  assert.deepEqual(json.map(g => g.id), LOAD_GROUPS.map(g => g.id));
  for (let i = 1; i < json.length; i++) {
    assert.ok(json[i].switchOnZ < json[i - 1].switchOnZ, `${json[i].id} switches on after ${json[i - 1].id}`);
  }
  for (const group of json) {
    assert.equal(typeof group.id, "string");
    assert.equal(typeof group.switchOnZ, "number");
    assert.ok(Array.isArray(group.assets) && group.assets.length > 0, `${group.id} has assets`);
  }
});

test("every group asset exists under public/ and none appears twice", () => {
  const seen = new Map();
  for (const group of LOAD_GROUPS) {
    for (const asset of group.assets) {
      assert.match(asset, /^\/(models|media)\/[^?#]+\.(glb|webp|jpg|png)$/, `${asset} is a public path without a query`);
      assert.ok(existsSync(path.join("public", asset)), `${asset} exists under public/`);
      assert.ok(!seen.has(asset), `${asset} is in both ${seen.get(asset)} and ${group.id}`);
      seen.set(asset, group.id);
    }
  }
});

test("stall switch-on z follows the zone gates (from + ahead)", async () => {
  const { EXHIBITION_RANGES } = await import("../src/venue/data/placements.ts");
  // ahead values from Gallery.tsx / ServicePavilion.tsx; arena from Arena.tsx Approach gate.
  const expected = {
    rental: EXHIBITION_RANGES.rental.from + 58,
    anamorphic: EXHIBITION_RANGES.anamorphic.from + 58,
    technical: EXHIBITION_RANGES.technical.from + 58,
    projection: EXHIBITION_RANGES.projection.from + 58,
    arena: -214 + 79.5 + 46,
  };
  for (const [id, z] of Object.entries(expected)) {
    const group = LOAD_GROUPS.find(g => g.id === id);
    assert.ok(group, `${id} group exists`);
    // Rounded toward +z (switching on marginally early) to two decimals.
    assert.ok(group.switchOnZ >= z && group.switchOnZ - z < 0.01, `${id}: ${group.switchOnZ} vs ${z}`);
  }
});

test("no usable bandwidth estimate loads every group before opening", () => {
  for (const bytesPerSecond of [0, -1, NaN]) {
    assert.deepEqual(groupsBeforeOpening({ bytesPerSecond, groups: GROUPS, startZ: 21 }), ["start", "a", "b"], `bytesPerSecond ${bytesPerSecond}`);
  }
});

const variantPaths = group => Object.values(group.variants ?? {}).flat();

test("every variant exists under public/ and every replacement names a base asset", () => {
  for (const group of LOAD_GROUPS) {
    const variants = variantPaths(group);
    for (const asset of variants) {
      assert.match(asset, /^\/(models|media)\/[^?#]+\.(glb|webp|jpg|png)$/, `${asset} is a public path without a query`);
      assert.ok(existsSync(path.join("public", asset)), `${asset} exists under public/`);
    }
    for (const [variant, base] of Object.entries(group.replaces ?? {})) {
      assert.ok(variants.includes(variant), `${group.id}: replacing ${variant} is a variant`);
      assert.ok(group.assets.includes(base), `${group.id}: replaced ${base} is a base asset`);
    }
  }
});

test("assetsFor swaps the mobile pillar wraps in for the desktop ones", () => {
  const group = LOAD_GROUPS.find(g => g.assets.includes("/media/pillars/ribbon-wrap.webp"));
  assert.ok(group, "a group holds the pillar wraps");
  const desktop = assetsFor(group, new Set());
  assert.deepEqual(desktop, [...group.assets]);
  const mobile = assetsFor(group, new Set(["mobile"]));
  for (const wrap of ["ribbon", "forest", "alpine"]) {
    assert.ok(mobile.includes(`/media/pillars/${wrap}-wrap-mobile.webp`), `${wrap} mobile wrap`);
    assert.ok(!mobile.includes(`/media/pillars/${wrap}-wrap.webp`), `${wrap} desktop wrap dropped`);
  }
  assert.ok(mobile.includes("/models/entrance/entrance-refined.glb"), "unreplaced base assets stay");
  const arena = LOAD_GROUPS.find(g => g.id === "arena");
  const festival = assetsFor(arena, new Set(["festival"]));
  assert.ok(festival.includes("/media/final/stage-social.webp") && festival.includes("/media/final/stage-conference.webp"),
    "festival adds its stage package beside the default one");
});

/** Files under src/venue that are never mounted by Scene, with the reason. */
const UNMOUNTED = {
  "src/venue/zones/Tunnel.tsx": "Tunnel (and the ImmersiveVolume it renders) is not mounted by Scene.tsx or any zone",
  "src/venue/three/TechnicalContactShadow.tsx": "TechnicalContactShadow is never rendered; ReferenceTechnical uses ProjectionContactShadow",
};

test("every /media and .glb literal the mounted venue references is in exactly one group", () => {
  const sources = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? sources(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name).replaceAll("\\", "/")] : []);
  const referenced = new Set();
  for (const file of sources("src/venue")) {
    if (file.startsWith("src/venue/loading/") || UNMOUNTED[file]) continue;
    const code = readFileSync(file, "utf8");
    for (const [, url] of code.matchAll(/["'`](\/(?:media|models)\/[^"'`?#$]+\.(?:webp|jpg|jpeg|png|glb))/g)) referenced.add(url);
    for (const [, name] of code.matchAll(/(?:<ExpoAsset\s+name=|expoAssetUrl\()["']([^"']+)["']/g)) referenced.add(`/models/expo/${name}.glb`);
  }
  const listed = LOAD_GROUPS.flatMap(g => [...g.assets, ...variantPaths(g)]);
  assert.equal(new Set(listed).size, listed.length, "no asset is listed twice across assets and variants");
  const missing = [...referenced].filter(url => !listed.includes(url));
  assert.deepEqual(missing, [], "referenced but not in any group");
  assert.ok(referenced.size >= 40, `scan found ${referenced.size} literals`);
});

// ---- streamer (Task 4) ----

const { startStreaming, RETRY_DELAYS_MS, MAX_IN_FLIGHT } = await import("../src/venue/loading/streamer.ts");

/** A fetchGroup whose calls are recorded and settled by the test. */
function fakeFetcher(clock) {
  const calls = [];
  let inFlight = 0, maxInFlight = 0;
  const fetchGroup = id => new Promise((resolve, reject) => {
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    const done = fn => value => { inFlight--; fn(value); };
    calls.push({ id, at: clock.now, resolve: done(resolve), reject: done(reject) });
  });
  return { calls, fetchGroup, maxInFlight: () => maxInFlight, pending: id => calls.filter(c => c.id === id).at(-1) };
}

const manifestOf = ids => ({ groups: ids.map(id => ({ id, bytes: 1e6, bytesByCondition: { mobile: 1e6, festival: 1e6 }, lite: [] })), ktx2Media: [] });

/** Run a streamer against a stubbed manifest fetch, with mocked timers and a fake clock. */
async function withStreamer(t, ids, body, extra = {}) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const clock = { now: 0 };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => manifestOf(ids) });
  const fake = fakeFetcher(clock);
  const events = [];
  const handle = startStreaming({
    manifestUrl: "/models/load-manifest.json",
    fetchGroup: fake.fetchGroup,
    now: () => clock.now,
    onReady: id => events.push(["ready", id]),
    onFailed: id => events.push(["failed", id]),
    ...extra,
  });
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
  const advance = async ms => { clock.now += ms; t.mock.timers.tick(ms); await flush(); };
  try {
    await flush();
    await body({ handle, fake, events, flush, advance, clock });
  } finally {
    handle.stop();
    globalThis.fetch = realFetch;
    t.mock.timers.reset();
  }
}

test("streamer constants", () => {
  assert.equal(MAX_IN_FLIGHT, 2);
  assert.deepEqual(RETRY_DELAYS_MS, [1000, 3000, 9000]);
});

test("streamer: start runs alone, then at most 2 groups are in flight", async t => {
  await withStreamer(t, ["start", "a", "b", "c", "d"], async ({ fake, flush }) => {
    assert.deepEqual(fake.calls.map(c => c.id), ["start"], "start downloads alone");
    fake.pending("start").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a", "b"]);
    fake.pending("a").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a", "b", "c"]);
    fake.pending("b").resolve(); fake.pending("c").resolve(); await flush();
    fake.pending("d").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a", "b", "c", "d"]);
    assert.equal(fake.maxInFlight(), 2);
  });
});

test("streamer: prioritize(b) makes b the next group started", async t => {
  await withStreamer(t, ["start", "a", "b", "c"], async ({ handle, fake, flush }) => {
    handle.prioritize("c");
    handle.prioritize("b");
    fake.pending("start").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "b", "a"]);
  });
});

test("streamer: a group that rejects twice is retried after 1 s and 3 s and ends ready", async t => {
  await withStreamer(t, ["start", "a"], async ({ fake, events, flush, advance }) => {
    fake.pending("start").resolve(); await flush();
    fake.pending("a").reject(new Error("offline")); await flush();
    await advance(999);
    assert.equal(fake.calls.filter(c => c.id === "a").length, 1, "no retry before 1 s");
    await advance(1);
    assert.equal(fake.calls.filter(c => c.id === "a").length, 2, "first retry at +1 s");
    fake.pending("a").reject(new Error("offline")); await flush();
    await advance(2999);
    assert.equal(fake.calls.filter(c => c.id === "a").length, 2, "no second retry before 3 s");
    await advance(1);
    assert.equal(fake.calls.filter(c => c.id === "a").length, 3, "second retry at +3 s");
    fake.pending("a").resolve(); await flush();
    assert.deepEqual(fake.calls.filter(c => c.id === "a").map(c => c.at), [0, 1000, 4000]);
    assert.deepEqual(events, [["ready", "start"], ["ready", "a"]]);
  });
});

test("streamer: a group that rejects 4 times is reported failed and not retried again", async t => {
  await withStreamer(t, ["start", "a", "b"], async ({ fake, events, flush, advance }) => {
    fake.pending("start").resolve(); await flush();
    fake.pending("b").resolve(); await flush();
    for (const delay of [1000, 3000, 9000]) {
      fake.pending("a").reject(new Error("404")); await flush();
      await advance(delay);
    }
    fake.pending("a").reject(new Error("404")); await flush();
    assert.deepEqual(events.filter(e => e[1] === "a"), [["failed", "a"]]);
    await advance(120_000);
    assert.equal(fake.calls.filter(c => c.id === "a").length, 4, "initial attempt plus three retries, then no more");
  });
});

test("streamer: bandwidth is the bytes per second of finished fetches", async t => {
  await withStreamer(t, ["start", "a"], async ({ handle, fake, flush, clock }) => {
    assert.equal(handle.bandwidth(), 0, "nothing finished yet");
    clock.now += 4000;
    fake.pending("start").resolve(); await flush();
    assert.equal(handle.bandwidth(), 1e6 / 4, "manifest bytes over the fetch time");
  });
  // A measure hook (Resource Timing in the browser) replaces the streamer's own estimate.
  await withStreamer(t, ["start", "a"], async ({ handle, fake, flush }) => {
    fake.pending("start").resolve(); await flush();
    assert.equal(handle.bandwidth(), 3e6);
  }, { measure: () => ({ bytes: 6e6, startMs: 1000, endMs: 3000 }) });
});

test("streamer: held groups wait until released, then stream in journey order", async t => {
  await withStreamer(t, ["start", "a", "b", "c"], async ({ handle, fake, flush }) => {
    handle.hold(["a", "b", "c"]);
    fake.pending("start").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start"], "nothing starts while held");
    handle.prioritize("c"); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start"], "priority does not override a hold");
    handle.release(["a"]); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a"]);
    handle.release(["b", "c"]); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a", "c"], "the prioritized group goes next, still at most 2 in flight");
  });
});

test("streamer: stop() starts nothing more", async t => {
  await withStreamer(t, ["start", "a"], async ({ handle, fake, flush }) => {
    handle.stop();
    fake.pending("start").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start"]);
  });
});

// ---- model variants (Task 5) ----

const { chooseModelVariant, variantUrl, variantPath } = await import("../src/venue/loading/modelVariants.ts");

test("variant URLs keep the revision query", () => {
  assert.equal(variantUrl("/models/expo/a.glb?v=abc-1", "lite"), "/models/expo/a.lite.glb?v=abc-1");
  assert.equal(variantUrl("/models/expo/a.glb", "lod1"), "/models/expo/a.lod1.glb");
  assert.equal(variantUrl("/models/expo/a.glb?v=1", "full"), "/models/expo/a.glb?v=1");
  assert.equal(variantPath("/models/expo/a.glb", "lite"), "/models/expo/a.lite.glb");
});

test("lite mode loads a group's lite model and never its full file", () => {
  const manifest = {
    groups: [{ id: "start", lite: [] }, { id: "rental", lite: ["/models/expo/grand-rental-finish-v2-shell.lite.glb"] }],
    lod1: ["/models/expo/grand-rental-finish-v2-visitors.lod1.glb"],
  };
  const start = LOAD_GROUPS.find(g => g.id === START_GROUP);
  const startFiles = new Set([...start.assets, ...variantPaths(start)]);
  const choose = (path, lite, quality, m = manifest) => chooseModelVariant(path, { lite, quality, manifest: m, startFiles });
  assert.equal(choose("/models/expo/grand-rental-finish-v2-shell.glb", true, "high"), "lite");
  // A non-start file without a lite model (or before the manifest) is not drawn at all.
  assert.equal(choose("/models/expo/grand-rental-finish-v2-interior.glb", true, "high"), "none");
  assert.equal(choose("/models/expo/grand-rental-finish-v2-shell.glb", true, "high", null), "none");
  // A start file is already in memory: lite mode shows it as the venue does elsewhere.
  assert.equal(choose("/models/expo/grand-rental-finish-v2-visitors.glb", true, "high"), "full");
  assert.equal(choose("/models/expo/grand-rental-finish-v2-visitors.glb", true, "medium"), "lod1");
});

test("lod1 replaces the full file below high quality when the manifest lists it", () => {
  const manifest = { groups: [], lod1: ["/models/expo/x-visitors.lod1.glb"] };
  const choose = (path, quality, m = manifest) => chooseModelVariant(path, { lite: false, quality, manifest: m, startFiles: new Set() });
  assert.equal(choose("/models/expo/x-visitors.glb", "high"), "full");
  assert.equal(choose("/models/expo/x-visitors.glb", "medium"), "lod1");
  assert.equal(choose("/models/expo/x-visitors.glb", "low"), "lod1");
  assert.equal(choose("/models/expo/y-shell.glb", "medium"), "full");
  assert.equal(choose("/models/expo/x-visitors.glb", "medium", null), "full");
});
