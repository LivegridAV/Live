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
