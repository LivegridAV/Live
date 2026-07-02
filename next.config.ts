import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site — the 3D experience is all client-side and there are
  // no server routes, so export to plain HTML/JS for edge hosting (Cloudflare
  // Pages). Produces an `out/` folder on `next build`.
  output: "export",

  // Static export has no image optimization server; serve images as-is.
  images: { unoptimized: true },
};

export default nextConfig;
