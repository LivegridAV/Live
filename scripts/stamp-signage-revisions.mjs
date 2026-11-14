import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

// Run after rebuilding lettering so browsers request the actual revised meshes.
const assets = ["pillar-gallery", "reception-gallery", "anamorphic-stall",
  "led-rental-2026-shell", "led-rental-2026-interior", "led-rental-2026-visitors", "led-rental-2026-floor-brand",
  "technical-showcase",
  "projection-mapping-stall-v3", "projection-mapping-stall-v4", "projection-visitors-v4", "projection-hall-rig",
  "projection-mapping-stall-v5", "projection-visitors-v5",
  "projection-mapping-stall-v6", "projection-visitors-v6", "projection-botanical-v6",
  "projection-mapping-stall-v7", "projection-botanical-v7", "projection-crystals-v7",
  "projection-mapping-stall-v8", "projection-botanical-v8", "projection-interior-details-v8",
  "projection-mapping-stall-v9", "projection-crystals-v9", "projection-botanical-v9",
  "projection-mapping-stall-v10", "projection-crystals-v10", "projection-botanical-v10",
  "projection-interior-details-v10", "projection-visitors-v10", "projection-hall-rig-v10",
  "projection-projectors-v10",
  "projection-mapping-stall-v11", "projection-crystals-v11", "projection-botanical-v11",
  "projection-interior-details-v11",
  "projection-mapping-stall-v12", "projection-crystals-v12"];
const revisions = Object.fromEntries(assets.map(name => [name,
  createHash("sha256").update(readFileSync(`public/models/expo/${name}.glb`)).digest("hex").slice(0, 16)]));
writeFileSync("public/models/expo/signage-revisions.json", `${JSON.stringify(revisions, null, 2)}\n`);
console.log(`Stamped ${assets.length} architectural lettering assets.`);
