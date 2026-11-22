import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { LOAD_GROUPS, START_GROUP, groupForZ } from "../src/venue/loading/groups.ts";
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
