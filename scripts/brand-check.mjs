// Brand check for stall signage: spelling of the wordmark and leftover old emblem
// materials. Each rebuilt stall appends its entry to SIGNED_ASSETS (paths are
// relative to the repository root); the CLI exits 1 if any entry has problems.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Only the correct wordmark is exactly "livegridAV". A lone lowercase "livegrid"
// is allowed (the AV may be a separate run); every other spelling is wrong.
export function wordmarkProblems(text) {
  const problems = [];
  for (const m of String(text).matchAll(/livegrid(\s*)(av)?/gi)) {
    if (m[0] === "livegridAV" || m[0] === "livegrid") continue;
    problems.push(`wrong brand spelling "${m[0]}" (use "livegridAV")`);
  }
  return problems;
}

export function glbMaterialNames(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB file");
  const length = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error("first GLB chunk is not JSON");
  const json = JSON.parse(buf.subarray(20, 20 + length).toString("utf8"));
  return (json.materials ?? []).map(m => m.name ?? "");
}

// Materials used only by the old wrong emblems (and the old Technical "AV" text).
// Left out on purpose because other surfaces share them:
//  - "... fine livegrid teal perimeter reveal" (cove/reveal lighting)
//  - "Projection Finish V2 | mint cyan illuminated emblem" (also the slogan lettering, shell.py:212)
//  - "LED Rental | porcelain brand lettering" (all porcelain lettering)
export const OLD_EMBLEM_MATERIALS = [
  "LED Rental 2026 | illuminated teal brand emblem",
  "LED Rental 2026 | illuminated livegrid teal folded emblem",
  "Projection Finish V2 | illuminated livegrid teal folded emblem",
  "Technical | faceted ice blue metallic emblem",
  "Technical | emblem pale blue facet",
  "Technical | emblem dark blue facet",
];

export const REQUIRED_SIGN_MATERIAL = "Premium Sign | brushed champagne return";

/** @type {{layout: string, glbs: string[], halo: 0|1}[]} */
export const SIGNED_ASSETS = [
  { layout: "public/models/expo/grand-reception-brand-wall-v2-layout.json", glbs: ["public/models/expo/grand-reception-brand-wall-v2.glb"], halo: 0 },
  { layout: "public/models/expo/grand-pillar-layout.json", glbs: ["public/models/expo/grand-pillar-gallery.glb"], halo: 0 },
  { layout: "public/models/expo/grand-rental-finish-v2-layout.json", glbs: ["public/models/expo/grand-rental-finish-v2-shell.glb", "public/models/expo/grand-rental-finish-v2-interior.glb"], halo: 1 },
  { layout: "public/models/expo/grand-anamorphic-shape-v3-layout.json", glbs: ["public/models/expo/grand-anamorphic-shape-v3-shell.glb", "public/models/expo/grand-anamorphic-shape-v3-interior.glb"], halo: 1 },
  { layout: "public/models/expo/grand-technical-shape-v3-layout.json", glbs: ["public/models/expo/grand-technical-shape-v3-shell.glb", "public/models/expo/grand-technical-shape-v3-interior.glb"], halo: 1 },
  { layout: "public/models/expo/projection-finish-v2-blender-layout.json", glbs: ["public/models/expo/projection-finish-v2-blender-shell.glb", "public/models/expo/projection-finish-v2-blender-interior.glb"], halo: 1 },
];

export function checkSignedAsset(entry) {
  const problems = [];
  const where = entry.layout;
  let layout;
  try {
    layout = JSON.parse(readFileSync(path.resolve(root, entry.layout), "utf8"));
  } catch (error) {
    return [`${where}: cannot read layout (${error.message})`];
  }
  const signage = Array.isArray(layout.signage) ? layout.signage : [];
  if (!signage.length) problems.push(`${where}: signage array is missing or empty`);
  for (const sign of signage) {
    for (const p of wordmarkProblems(sign.body ?? "")) problems.push(`${where}: sign "${sign.body}": ${p}`);
  }
  const count = kind => signage.filter(s => s.kind === kind).length;
  if (!count("wordmark")) problems.push(`${where}: no signage of kind "wordmark"`);
  if (!count("emblem")) problems.push(`${where}: no signage of kind "emblem"`);
  if (count("halo") !== entry.halo) problems.push(`${where}: expected ${entry.halo} halo sign(s), found ${count("halo")}`);
  for (const glb of entry.glbs) {
    let names;
    try {
      names = glbMaterialNames(readFileSync(path.resolve(root, glb)));
    } catch (error) {
      problems.push(`${glb}: cannot read GLB (${error.message})`);
      continue;
    }
    for (const old of OLD_EMBLEM_MATERIALS) {
      if (names.includes(old)) problems.push(`${glb}: still uses old emblem material "${old}"`);
    }
    if (!names.includes(REQUIRED_SIGN_MATERIAL)) problems.push(`${glb}: missing material "${REQUIRED_SIGN_MATERIAL}"`);
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = SIGNED_ASSETS.flatMap(checkSignedAsset);
  for (const p of problems) console.error(p);
  console.log(problems.length ? `brand check: ${problems.length} problem(s)` : `brand check: ${SIGNED_ASSETS.length} signed asset(s) ok`);
  process.exit(problems.length ? 1 : 0);
}
