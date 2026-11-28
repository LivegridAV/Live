import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";

// The lead webhook falls back to its default URL (below) only when
// NEXT_PUBLIC_LEAD_WEBHOOK_URL is unset: an empty value is kept, and both lead
// forms would then post the visitor's details to the page itself. Refuse that
// combination here, before anything is built.
const leadWebhookOverride = process.env.NEXT_PUBLIC_LEAD_WEBHOOK_URL;
if (process.env.NEXT_PUBLIC_LEAD_WEBHOOK_ENABLED === "true" && leadWebhookOverride !== undefined && leadWebhookOverride.trim() === "") {
  throw new Error(
    'NEXT_PUBLIC_LEAD_WEBHOOK_ENABLED is "true" but NEXT_PUBLIC_LEAD_WEBHOOK_URL is set to an empty value. ' +
      "Remove NEXT_PUBLIC_LEAD_WEBHOOK_URL to use the default endpoint, or set it to the webhook's URL.",
  );
}

// Also stamp hosts configured to invoke `next build` directly rather than npm.
if (process.env.NODE_ENV === "production") {
  execFileSync(process.execPath, ["scripts/gen-build-info.mjs"], { stdio: "inherit" });
}

// The lead forms post only when NEXT_PUBLIC_LEAD_WEBHOOK_ENABLED is "true".
// The endpoint is resolved here, at build time, and inlined as
// process.env.LEAD_WEBHOOK_URL, so a build with the webhook off publishes no
// intake address in the browser bundle. (Restart `next dev` after changing
// either variable: this file is read when the server starts.)
const leadWebhookUrl =
  process.env.NEXT_PUBLIC_LEAD_WEBHOOK_ENABLED === "true"
    ? process.env.NEXT_PUBLIC_LEAD_WEBHOOK_URL ?? "https://n8n.livegridav.com/webhook/livegridav-lead-capture"
    : "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  env: { LEAD_WEBHOOK_URL: leadWebhookUrl },
  // Fully static site — the 3D experience is all client-side and there are
  // no server routes, so export to plain HTML/JS for edge hosting (Cloudflare
  // Pages). Produces an `out/` folder on `next build`.
  output: "export",

  // Static export has no image optimization server; serve images as-is.
  images: { unoptimized: true },
};

export default nextConfig;
