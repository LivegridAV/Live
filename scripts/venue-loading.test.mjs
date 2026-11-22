import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { LOAD_GROUPS, START_GROUP, assetsFor, groupForZ } from "../src/venue/loading/groups.ts";
import { groupsBeforeOpening, liteBeforeOpening, nextToFetch, WALK_PACE_MPS, SAFETY_MARGIN_S } from "../src/venue/loading/plan.ts";

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

// ---- open early, fill in (Task 6b) ----

const LITE = [
  { id: "a", switchOnZ: -8.64, liteBytes: 1.3e6 },
  { id: "b", switchOnZ: -12.65, liteBytes: 1.5e6 },
  { id: "c", switchOnZ: -48.27, liteBytes: 1.1e6 },
];

test("liteBeforeOpening at 9 Mbps: the lite packs that would arrive late load before opening", () => {
  // a needs 1.16 s against a deadline of (8 + 8.64) / 6 - 4 = -1.23 s: late. b
  // is late too. c then arrives 0.98 s after opening, against 5.4 s.
  assert.deepEqual(liteBeforeOpening({ bytesPerSecond: 1_125_000, groups: LITE, startZ: 8 }), ["a", "b"]);
});

test("liteBeforeOpening: a negative deadline is missed at any speed", () => {
  assert.deepEqual(liteBeforeOpening({ bytesPerSecond: 30_000_000, groups: LITE, startZ: 8 }), ["a", "b"]);
});

test("liteBeforeOpening: no usable bandwidth estimate waits for every lite pack", () => {
  for (const bytesPerSecond of [0, -1, NaN]) {
    assert.deepEqual(liteBeforeOpening({ bytesPerSecond, groups: LITE, startZ: 8 }), ["a", "b", "c"], `bytesPerSecond ${bytesPerSecond}`);
  }
});

test("liteBeforeOpening: a pack loaded before opening leaves the queue behind it", () => {
  // At 1 MB/s from z 30: a arrives 1 s (+4) against 6.4 s, fine; b alone would take
  // 4 s after a, 9 s against 6.9 s: late, so it loads before opening; c then queues
  // behind a only: 2 s (+4) against 10.5 s. Only b is pulled in.
  const groups = [
    { id: "a", switchOnZ: -8.4, liteBytes: 1e6 },
    { id: "b", switchOnZ: -11.4, liteBytes: 4e6 },
    { id: "c", switchOnZ: -33, liteBytes: 1e6 },
  ];
  assert.deepEqual(liteBeforeOpening({ bytesPerSecond: 1e6, groups, startZ: 30 }), ["b"]);
  assert.deepEqual(liteBeforeOpening({ bytesPerSecond: 1e6, groups, startZ: 30, paceMps: 1, marginS: 0 }), []);
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

test("streamer: items() orders the queue (light packs before full groups)", async t => {
  const items = manifest => [manifest.groups[0], ...manifest.groups.slice(1).map(g => ({ id: `${g.id}.lite`, bytes: 1 })), ...manifest.groups.slice(1)];
  await withStreamer(t, ["start", "a", "b"], async ({ fake, flush }) => {
    fake.pending("start").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a.lite", "b.lite"]);
    fake.pending("a.lite").resolve(); fake.pending("b.lite").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a.lite", "b.lite", "a", "b"]);
  }, { items });
});

test("streamer: prioritize([x, y]) starts x then y ahead of the queue, not ahead of running fetches", async t => {
  await withStreamer(t, ["start", "a", "b", "c", "d"], async ({ handle, fake, flush }) => {
    fake.pending("start").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a", "b"]);
    handle.prioritize(["d", "c"]); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a", "b"], "in-flight downloads are not pre-empted");
    fake.pending("a").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a", "b", "d"]);
    fake.pending("b").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "a", "b", "d", "c"]);
  });
});

test("streamer: a dropped item is never fetched", async t => {
  await withStreamer(t, ["start", "a", "b", "c"], async ({ handle, fake, events, flush }) => {
    handle.drop(["a"]);
    fake.pending("start").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "b", "c"]);
    handle.prioritize("a"); await flush();
    fake.pending("b").resolve(); fake.pending("c").resolve(); await flush();
    assert.deepEqual(fake.calls.map(c => c.id), ["start", "b", "c"]);
    assert.ok(!events.some(e => e[1] === "a"), "a is neither ready nor failed");
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

// ---- static mesh merging (Task 7) ----

const THREE = await import("three");
const { mergeStaticMeshes } = await import("../src/venue/three/mergeStatic.ts");

/** A root (itself moved, so "root local space" is not world space) holding boxes under rotated, scaled groups. */
function boxes(n, materials, { shareGeometry = false } = {}) {
  const root = new THREE.Group();
  root.position.set(3, -1, 7); root.rotation.y = .4;
  const shared = new THREE.BoxGeometry(1, 2, 3);
  for (let i = 0; i < n; i++) {
    const holder = new THREE.Group();
    holder.position.set(i * 2.5, i % 3, -i); holder.rotation.set(i * .3, i * .7, 0); holder.scale.setScalar(1 + i * .1);
    const mesh = new THREE.Mesh(shareGeometry ? shared : new THREE.BoxGeometry(1 + i * .1, 2, 3), materials[i % materials.length]);
    mesh.position.set(0, .5, 0); mesh.name = `box ${i}`;
    holder.add(mesh); root.add(holder);
  }
  root.updateMatrixWorld(true);
  return root;
}
const drawObjects = root => { const out = []; root.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
const worldBox = root => { root.updateMatrixWorld(true); return new THREE.Box3().setFromObject(root, true); };
const near = (a, b, eps = 1e-6) => a.distanceTo(b) <= eps;

test("mergeStaticMeshes: 10 boxes sharing one material become one draw object with the same world bounds", () => {
  const root = boxes(10, [new THREE.MeshStandardMaterial()]);
  const before = worldBox(root);
  assert.deepEqual(mergeStaticMeshes(root), { before: 10, after: 1 });
  const meshes = drawObjects(root);
  assert.equal(meshes.length, 1);
  assert.equal(meshes[0].parent, root);
  const after = worldBox(root);
  assert.ok(near(before.min, after.min) && near(before.max, after.max), `${JSON.stringify(before)} vs ${JSON.stringify(after)}`);
});

test("mergeStaticMeshes: two materials give two draw objects", () => {
  const root = boxes(10, [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()]);
  assert.deepEqual(mergeStaticMeshes(root), { before: 10, after: 2 });
  assert.equal(new Set(drawObjects(root).map(m => m.material)).size, 2);
});

test("mergeStaticMeshes: a SkinnedMesh is left untouched", () => {
  const material = new THREE.MeshStandardMaterial();
  const root = boxes(4, [material]);
  const skinned = new THREE.SkinnedMesh(new THREE.BoxGeometry(), material);
  const bone = new THREE.Bone();
  skinned.add(bone); skinned.bind(new THREE.Skeleton([bone]));
  root.add(skinned);
  const geometry = skinned.geometry;
  assert.deepEqual(mergeStaticMeshes(root), { before: 5, after: 2 });
  assert.equal(skinned.parent, root);
  assert.equal(skinned.geometry, geometry);
});

test("mergeStaticMeshes: a kept name survives as its own mesh", () => {
  const root = boxes(10, [new THREE.MeshStandardMaterial()]);
  const kept = root.getObjectByName("box 3");
  const world = kept.matrixWorld.clone();
  assert.deepEqual(mergeStaticMeshes(root, { keep: o => o.name === "box 3" }), { before: 10, after: 2 });
  assert.equal(root.getObjectByName("box 3"), kept);
  root.updateMatrixWorld(true);
  assert.ok(kept.matrixWorld.equals(world));
});

test("mergeStaticMeshes: 6 meshes sharing geometry and material become one InstancedMesh", () => {
  const root = boxes(6, [new THREE.MeshStandardMaterial()], { shareGeometry: true });
  const worlds = drawObjects(root).map(m => m.matrixWorld.clone());
  assert.deepEqual(mergeStaticMeshes(root), { before: 6, after: 1 });
  const [instanced] = drawObjects(root);
  assert.ok(instanced.isInstancedMesh);
  assert.equal(instanced.count, 6);
  root.updateMatrixWorld(true);
  const m = new THREE.Matrix4();
  worlds.forEach((world, i) => {
    instanced.getMatrixAt(i, m);
    m.premultiply(instanced.matrixWorld);
    // Instance matrices are stored as float32.
    m.elements.forEach((e, k) => assert.ok(Math.abs(e - world.elements[k]) < 1e-6, `instance ${i} element ${k}: ${e} vs ${world.elements[k]}`));
  });
});

test("mergeStaticMeshes: meshes under a clip-animated node, hidden meshes and morph targets stay as they are", () => {
  const root = boxes(8, [new THREE.MeshStandardMaterial()]);
  const [a, b, c] = ["box 0", "box 1", "box 2"].map(name => root.getObjectByName(name));
  a.parent.name = "spinner";
  root.animations = [new THREE.AnimationClip("spin", 1, [new THREE.NumberKeyframeTrack("spinner.rotation[y]", [0, 1], [0, 1])])];
  b.visible = false;
  c.geometry.morphAttributes.position = [c.geometry.attributes.position.clone()];
  assert.deepEqual(mergeStaticMeshes(root), { before: 8, after: 4 });
  for (const mesh of [a, b, c]) assert.ok(drawObjects(root).includes(mesh), mesh.name);
});

test("mergeStaticMeshes: quantized (normalized int16) and interleaved attributes are baked as world floats", () => {
  const material = new THREE.MeshStandardMaterial(), root = new THREE.Group();
  const expected = [];
  for (let i = 0; i < 2; i++) {
    const geometry = new THREE.BufferGeometry();
    // KHR_mesh_quantization: int16 normalized positions, the node scale restores metres.
    geometry.setAttribute("position", new THREE.BufferAttribute(new Int16Array([0, 0, 0, 32767, 0, 0, 0, -32767, 0]), 3, true));
    const normals = new THREE.InterleavedBuffer(new Float32Array([0, 0, 1, 9, 0, 0, 1, 9, 0, 0, 1, 9]), 4);
    geometry.setAttribute("normal", new THREE.InterleavedBufferAttribute(normals, 3, 0));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(2 + i); mesh.position.x = i * 10;
    root.add(mesh);
    mesh.updateMatrixWorld(true);
    for (let v = 0; v < 3; v++) expected.push(new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, v).applyMatrix4(mesh.matrixWorld));
  }
  assert.deepEqual(mergeStaticMeshes(root), { before: 2, after: 1 });
  const { position, normal } = drawObjects(root)[0].geometry.attributes;
  assert.ok(position.array instanceof Float32Array && !position.normalized);
  expected.forEach((point, v) => assert.ok(near(point, new THREE.Vector3().fromBufferAttribute(position, v)), `vertex ${v}`));
  for (let v = 0; v < 6; v++) assert.deepEqual([normal.getX(v), normal.getY(v), normal.getZ(v)], [0, 0, 1]);
});

const { prepareBeforeWarm, preparedWithin } = await import("../src/venue/three/warmScene.ts");
const mergeStaticSoon = root => prepareBeforeWarm(root, () => mergeStaticMeshes(root));

test("prepareBeforeWarm merges in a later task; preparedWithin waits for roots inside a subtree; cancel skips", async () => {
  const material = new THREE.MeshStandardMaterial();
  const zone = new THREE.Group(), a = boxes(4, [material]), b = boxes(4, [material]);
  zone.add(a, b);
  mergeStaticSoon(a);
  const cancel = mergeStaticSoon(b);
  cancel();
  assert.equal(drawObjects(a).length, 4, "not inside the calling task");
  await preparedWithin(zone);
  assert.equal(drawObjects(a).length, 1);
  assert.equal(drawObjects(b).length, 4);
  await preparedWithin(zone); // nothing left: resolves at once
});

test("preparedWithin: cancelling a pending root releases a warm-up waiting on it", async () => {
  const zone = new THREE.Group(), root = boxes(3, [new THREE.MeshStandardMaterial()]);
  zone.add(root);
  const cancel = mergeStaticSoon(root);
  const settled = preparedWithin(zone);
  cancel();
  await settled;
  assert.equal(drawObjects(root).length, 3);
});
