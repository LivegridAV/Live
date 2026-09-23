import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";

// Also stamp hosts configured to invoke `next build` directly rather than npm.
if (process.env.NODE_ENV === "production") {
  execFileSync(process.execPath, ["scripts/gen-build-info.mjs"], { stdio: "inherit" });
}

const nextConfig: NextConfig = {
  // Fully static site — the 3D experience is all client-side and there are
  // no server routes, so export to plain HTML/JS for edge hosting (Cloudflare
  // Pages). Produces an `out/` folder on `next build`.
  output: "export",

  // Static export has no image optimization server; serve images as-is.
  images: { unoptimized: true },
};

export default nextConfig;
