/**
 * Builds the share image every page uses when a link is posted to WhatsApp,
 * LinkedIn, X or Facebook: src/app/opengraph-image.jpg (+ twitter-image.jpg).
 *
 * Rendered with Next's own image renderer and the official Space Grotesk 600
 * font, because sharp cannot read the font embedded in the brand SVGs.
 * Run: node scripts/make-share-image.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ImageResponse } from "next/dist/compiled/@vercel/og/index.node.js";

// Next's renderer loads its own copy of sharp; a second copy in the same
// process crashes libvips, so the JPEG step uses Next's copy too.
const sharp = createRequire(import.meta.resolve("next/package.json"))("sharp");

const W = 1200;
const H = 630;
const INK = "#0b1213";
const AQUA = "#3fd6c8";
const DIM = "#1f2c2b";
// the signal-grid logo, lit cells per row (same pattern as the brand lockup)
const GRID = [
  [0, 0, 0, 1, 0],
  [0, 1, 0, 1, 1],
  [0, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1],
];

const el = (type, style, children) => ({ type, props: { style, children } });
const cell = 52;
const gap = 10;

const grid = el(
  "div",
  { display: "flex", flexDirection: "column", gap },
  GRID.map((row) =>
    el(
      "div",
      { display: "flex", gap },
      row.map((on) =>
        el("div", {
          width: cell,
          height: cell,
          borderRadius: 11,
          background: on ? AQUA : DIM,
          boxShadow: on ? `0 0 22px ${AQUA}66` : "none",
        }),
      ),
    ),
  ),
);

const words = el("div", { display: "flex", flexDirection: "column", marginLeft: 64 }, [
  el("div", { display: "flex", fontSize: 104, letterSpacing: -3, lineHeight: 1 }, [
    el("span", { color: "#f2f7f6" }, "livegrid"),
    el("span", { color: AQUA }, "AV"),
  ]),
  el("div", { display: "flex", marginTop: 26, fontSize: 34, color: "#c9d6d3" }, "LED screens, AV & live event production"),
  el("div", { display: "flex", marginTop: 14, fontSize: 26, color: "#7f9592" }, "Delhi-based · working across India"),
]);

const root = el(
  "div",
  {
    width: W,
    height: H,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `radial-gradient(ellipse at 30% 45%, #12302d 0%, ${INK} 62%)`,
    fontFamily: "Space Grotesk",
  },
  [grid, words],
);

const font = readFileSync("assets/blender/entrance-refinement/Official-SpaceGrotesk-600.ttf");
const res = new ImageResponse(root, {
  width: W,
  height: H,
  fonts: [{ name: "Space Grotesk", data: font, weight: 600, style: "normal" }],
});
const png = Buffer.from(await res.arrayBuffer());
const jpg = await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
for (const name of ["opengraph-image", "twitter-image"]) {
  writeFileSync(`src/app/${name}.jpg`, jpg);
  writeFileSync(`src/app/${name}.alt.txt`, "livegridAV — LED screens, AV and live event production. Delhi-based, working across India.");
}
console.log(`share image ${W}x${H}, ${(jpg.length / 1024).toFixed(0)} KiB`);
