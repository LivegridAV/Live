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
writeFileSync("public/build-info.json", JSON.stringify(info, null, 2) + "\n");
console.log("build-info:", info.shortCommit, info.branch, info.builtAt);
