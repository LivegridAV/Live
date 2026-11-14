// Writes public/build-info.json at build time so any deployment's exact
// commit/branch is verifiable (brief §43/§71). Not shown to normal visitors.
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

function git(cmd, fallback) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

// Cloudflare Pages provides these env vars during the build.
const commit =
  process.env.CF_PAGES_COMMIT_SHA || git("rev-parse HEAD", "unknown");
const branch =
  process.env.CF_PAGES_BRANCH || git("rev-parse --abbrev-ref HEAD", "unknown");

const info = {
  commit,
  shortCommit: commit.slice(0, 7),
  branch,
  builtAt: new Date().toISOString(),
};

mkdirSync("public", { recursive: true });
// Next loads its configuration in multiple build workers. On Windows a brief
// overlapping open can lock this shared metadata file; retry only those errors.
const content = JSON.stringify(info, null, 2) + "\n";
const pause = new Int32Array(new SharedArrayBuffer(4));
for (let attempt = 0; ; attempt++) {
  try {
    writeFileSync("public/build-info.json", content);
    break;
  } catch (error) {
    if (attempt >= 7 || !["UNKNOWN", "EBUSY", "EPERM", "EACCES"].includes(error.code)) throw error;
    Atomics.wait(pause, 0, 0, 50 * (attempt + 1));
  }
}
console.log("build-info:", info.shortCommit, info.branch, info.builtAt);
