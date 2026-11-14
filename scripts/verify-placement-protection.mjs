/** Read-only application verification. Writes one placement-report JSON only. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = path.join(root, 'reports/placement-implementation/20261019-coordinate-layout');
const outputFile = path.join(reportDir, 'final-protection-check.json');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const json = file => JSON.parse(read(file).toString('utf8'));
const baseline = json('reports/placement-implementation/20261019-coordinate-layout/protected-venue-measurements.json');
const registry = json('reports/placement-implementation/20261019-coordinate-layout/baseline-current.json');
const assemblies = json('reports/placement-implementation/20261019-coordinate-layout/measured-assemblies.json');
const checks = [];
function check(id, passed, details) {
  const result = { id, status: passed ? 'PASS' : 'FAIL', ...details };
  checks.push(result);
  return result;
}
function removeOnce(source, expression, replacement, label) {
  const count = source.split(expression).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one occurrence, found ${count}`);
  return source.replace(expression, replacement);
}
function reconstruct(file, snapshotName, kind) {
  const current = read(file);
  const snapshot = fs.readFileSync(path.join(reportDir, 'baseline', snapshotName));
  let source = current.toString('utf8');
  // Keep all source text and whitespace except the two explicitly admitted changes.
  // Select only the actual newline spelling; do not trim or reformat either input.
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  if (kind === 'scene') {
    source = removeOnce(source,
      `import { PlacementInspection, placementInspectionEnabled } from "./systems/PlacementInspection";${newline}`,
      '', 'Scene diagnostic import');
    source = removeOnce(source,
      '{placementInspectionEnabled()?<PlacementInspection />:<CameraRig />}',
      '<CameraRig />', 'Scene camera opt-in');
  } else {
    source = removeOnce(source,
      `import { placementInspectionEnabled } from "../systems/PlacementInspection";${newline}`,
      '', 'ZoneGroup diagnostic import');
    source = removeOnce(source,
      `    if(placementInspectionEnabled()){g.visible=true;return;}${newline}`,
      '', 'ZoneGroup diagnostic-only visibility gate');
  }
  const reconstructed = Buffer.from(source, 'utf8');
  const exact = reconstructed.equals(snapshot);
  const normal = source.replaceAll('\r\n', '\n') === snapshot.toString('utf8').replaceAll('\r\n', '\n');
  return check(`protected-exception:${file}`, exact || normal, {
    file, comparison: exact ? 'EXACT BYTES' : normal ? 'EXACT TEXT AFTER CRLF-ONLY NORMALIZATION' : 'MISMATCH',
    baselineSnapshot: path.relative(root, path.join(reportDir, 'baseline', snapshotName)).replaceAll('\\', '/'),
    baselineSha256: sha(snapshot), currentSha256: sha(current), reconstructedSha256: sha(reconstructed),
    onlyAdmittedChanges: kind === 'scene'
      ? ['Diagnostic module import', 'Opt-in inspection component otherwise original CameraRig']
      : ['Diagnostic enabled-function import', 'Explicit inspection-only visibility override otherwise original gating'],
  });
}

check('protected-dependency-manifest-count', baseline.fingerprints.length === 33, {
  expected: 33, actual: baseline.fingerprints.length,
});
const exceptionFiles = new Set(['src/venue/Scene.tsx', 'src/venue/three/ZoneGroup.tsx']);
for (const entry of baseline.fingerprints) {
  if (exceptionFiles.has(entry.file)) continue;
  const current = read(entry.file);
  check(`protected-bytes:${entry.file}`, current.length === entry.bytes && sha(current) === entry.sha256, {
    file: entry.file, beforeSha256: entry.sha256, afterSha256: sha(current),
    beforeBytes: entry.bytes, afterBytes: current.length,
  });
}
for (const [file, snapshot, kind] of [
  ['src/venue/Scene.tsx', 'Scene.tsx.snapshot', 'scene'],
  ['src/venue/three/ZoneGroup.tsx', 'ZoneGroup.tsx.snapshot', 'zone'],
]) {
  try { reconstruct(file, snapshot, kind); }
  catch (error) { check(`protected-exception:${file}`, false, { file, error: String(error) }); }
}

const cameraSource = read('src/venue/data/path.ts').toString('utf8');
const cameraStart = cameraSource.indexOf('/* ── Arena approach and portal');
const protectedCameraSource = cameraSource.slice(cameraStart, cameraSource.indexOf('];', cameraStart) + 2);
const arenaFrames = [...protectedCameraSource.matchAll(/\{ p: ([\d.]+), pos: \[([^\]]+)\], look: \[([^\]]+)\], fov: ([\d.]+) \}/g)]
  .map(match => ({ p: Number(match[1]), position: match[2].split(',').map(Number), look: match[3].split(',').map(Number), fov: Number(match[4]) }));
check('protected-arena-camera-source', cameraStart >= 0 && sha(protectedCameraSource) === baseline.fixedArena.protectedCamera.sourceSha256, {
  beforeSha256: baseline.fixedArena.protectedCamera.sourceSha256,
  afterSha256: sha(protectedCameraSource), scope: 'Arena approach through contact settle, p>=0.812',
});
check('protected-arena-camera-keyframes', sha(JSON.stringify(arenaFrames)) === baseline.fixedArena.protectedCamera.keyframesSha256, {
  beforeSha256: baseline.fixedArena.protectedCamera.keyframesSha256,
  afterSha256: sha(JSON.stringify(arenaFrames)), count: arenaFrames.length,
});

const uniqueAssets = new Set(assemblies.assets.map(asset => asset.file));
check('assembly-asset-manifest-unique', uniqueAssets.size === assemblies.assets.length, {
  manifestRecords: assemblies.assets.length, uniqueFiles: uniqueAssets.size,
});
for (const entry of assemblies.assets) {
  const current = read(entry.file);
  check(`assembly-asset:${entry.file}`, current.length === entry.bytes && sha(current) === entry.sha256, {
    file: entry.file, beforeSha256: entry.sha256, afterSha256: sha(current),
    beforeBytes: entry.bytes, afterBytes: current.length,
  });
}
for (const [file, beforeSha256] of Object.entries(registry.sourceFingerprintsSha256)) {
  const afterSha256 = sha(read(file));
  check(`placement-source:${file}`, beforeSha256 === afterSha256, { file, beforeSha256, afterSha256 });
}

for (const zone of Object.values(registry.zones)) {
  if (zone.id === 'L') {
    check('registry:arrival-lounge-not-fabricated', zone.changed === false && zone.currentRootWorld === null, {
      currentRootWorld: null, finalRootWorld: null, note: zone.currentStatus,
    });
    continue;
  }
  const before = zone.currentRootWorld ?? zone.currentColumnRootWorld;
  const after = zone.finalRootWorld ?? zone.finalColumnRootWorld;
  const positionEqual = JSON.stringify(before) === JSON.stringify(after);
  const yawEqual = zone.finalYawRadians === undefined || zone.currentYawRadians === zone.finalYawRadians;
  check(`registry:${zone.id}`, positionEqual && yawEqual && zone.changed === false && zone.requested.status === 'NOT APPLIED', {
    id: zone.id, beforeRootWorld: before, afterRootWorld: after,
    yawBefore: zone.currentYawRadians, yawAfter: zone.finalYawRadians ?? zone.currentYawRadians,
    requestedStatus: zone.requested.status,
  });
}
check('registry:no-relocation-applied', registry.finalRegistryEqualsBaseline === true && registry.noPlacementsApplied === true, {
  finalRegistryEqualsBaseline: registry.finalRegistryEqualsBaseline,
  noPlacementsApplied: registry.noPlacementsApplied,
  evidenceScope: 'Registry declarations plus independent hashes of all placement source inputs and measured assembly assets.',
});

const inspectionSource = read('src/venue/systems/PlacementInspection.tsx').toString('utf8');
const enabled = inspectionSource.match(/export function placementInspectionEnabled\(\) \{\s*return ([^;]+);\s*\}/);
check('inspection:explicit-query-opt-in-source', !!enabled, {
  expected: 'A side-effect-free enabled function selecting only inspect=placement',
});
if (enabled) {
  for (const [search, expected] of [[undefined, false], ['', false], ['?shot=projection', false], ['?shot=arena', false], ['?inspect=wrong', false], ['?inspect=Placement', false], ['?inspect=placement', true]]) {
    const context = { URLSearchParams, ...(search === undefined ? {} : { location: { search } }) };
    const actual = vm.runInNewContext(`Boolean(${enabled[1]})`, context, { timeout: 1000 });
    check(`inspection:query:${search ?? 'no-location'}`, actual === expected, { search: search ?? null, expected, actual });
  }
}

const failed = checks.filter(result => result.status === 'FAIL');
const result = {
  schema: 'livegrid-placement-final-protection-check-v1', generatedAt: new Date().toISOString(),
  status: failed.length ? 'FAIL' : 'PASS',
  scope: 'Protection and no-relocation source/asset verification only. Does not mark rejected placement targets implemented or certify visual/clearance acceptance.',
  applicationFilesWrittenByThisScript: [],
  baselineSources: ['protected-venue-measurements.json', 'measured-assemblies.json', 'baseline-current.json', 'baseline/Scene.tsx.snapshot', 'baseline/ZoneGroup.tsx.snapshot'],
  counts: { protectedDependencies: baseline.fingerprints.length, protectedStrictComparisons: baseline.fingerprints.length - exceptionFiles.size,
    diagnosticExceptionReconstructions: exceptionFiles.size, assemblyAssets: assemblies.assets.length,
    registryEntries: Object.keys(registry.zones).length, arenaCameraFrames: arenaFrames.length,
    checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  resultMeaning: failed.length ? 'At least one protected dependency, assembly asset, normal-route source or registry invariant changed unexpectedly.'
    : 'Protected dependencies and original normal-route source are preserved; all measured assembly assets and placement inputs are unchanged; requested relocations remain unapplied.',
  checks,
  limitations: ['This verifier is numerical/source evidence; browser captures are separately required.',
    'Diagnostic view deliberately alters camera, visibility, clipping and fog only under inspect=placement. It is not a normal visitor view.',
    'Fit gate remains FAIL for the literal requested layout and alternatives remain PROPOSED — NOT APPLIED.'],
};
fs.writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, ...result.counts, report: path.relative(root, outputFile).replaceAll('\\', '/'), failures: failed.map(entry => entry.id) }, null, 2));
process.exitCode = failed.length ? 1 : 0;
