import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

// Run after rebuilding lettering so browsers request the actual revised meshes.
const assets = ["pillar-gallery", "reception-gallery", "led-rental-2026-shell", "technical-showcase", "projection-hall-rig"];
const revisions = Object.fromEntries(assets.map(name => [name,
  createHash("sha256").update(readFileSync(`public/models/expo/${name}.glb`)).digest("hex").slice(0, 16)]));
writeFileSync("public/models/expo/signage-revisions.json", `${JSON.stringify(revisions, null, 2)}\n`);
console.log(`Stamped ${assets.length} architectural lettering assets.`);
