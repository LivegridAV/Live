/**
 * Canvas-drawn LED content.
 *
 * Shaders are the right tool for cinematic abstraction, but a show-control cue
 * stack or a broadcast multiview has to look like a real *interface* — crisp
 * type, tally borders, running timecode. Those are painted with Canvas2D and
 * uploaded as a texture, repainted at a low frame rate because interfaces only
 * need to tick, not animate.
 */

import { drawWordmark } from "./brandMarks";
import { TECHNICAL_PAINTERS } from "./technicalPainters";
import { PROJECTION_PAINTERS } from "./projectionPainters";
import { LED_RENTAL_2026_PAINTERS } from "./ledRental2026Painters";

export interface PaintCtx {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** seconds */
  t: number;
  accent: string;
  variant: number;
  /** copy supplied by the media descriptor, for signs, headers and kiosks */
  text?: { title: string; sub: string; lines?: string[] };
}

const MONO_FALLBACK = '"SFMono-Regular", "DejaVu Sans Mono", "Courier New", monospace';
const SANS_FALLBACK = 'system-ui, "Segoe UI", Helvetica, Arial, sans-serif';

/**
 * The venue's own typefaces, read off the document.
 *
 * Canvas cannot resolve a CSS custom property, so the signage was being set in
 * the system UI font while every other word on the site is Space Grotesk — two
 * different voices, one of them a browser default. Reading the computed family
 * off the page gets the real (hashed) next/font family name, and the painters
 * repaint often enough that the first frames rendered before the webfont
 * arrives are replaced within a fraction of a second.
 */
let _sans: string | null = null;
let _mono: string | null = null;
function fam(varName: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}
const SANS_OF = () => (_sans ??= fam("--font-space-grotesk", SANS_FALLBACK));
const MONO_OF = () => (_mono ??= fam("--font-space-mono", MONO_FALLBACK));

const DIM = "#5d6b69";
const BRIGHT = "#e8efee";

function label(p: PaintCtx, text: string, x: number, y: number, size: number, color = DIM, weight = 500) {
  const { ctx } = p;
  ctx.font = `${weight} ${size}px ${MONO_OF()}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  // 0.14 em of tracking on a nine-pixel label is most of a character between
  // every letter — it reads as spaced-out rather than as a caption.
  ctx.letterSpacing = `${(size * 0.09).toFixed(2)}px`;
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = "0px";
}


const makeSign =
  (title: string, sub: string) =>
  (p: PaintCtx) => {
    const { ctx, w, h, t, accent } = p;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0d1616");
    g.addColorStop(1, "#060a0a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // breathing accent bar
    const bar = 0.5 + 0.5 * Math.sin(t * 0.8);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.35 + bar * 0.5;
    ctx.fillRect(0, h * 0.5 - h * 0.006, w * (0.25 + bar * 0.2), h * 0.012);
    ctx.globalAlpha = 1;
    // Both lines are fitted rather than clipped. Signs take their copy from
    // the media descriptor, so a longer line is a content change, not a bug —
    // and a sign that runs off its own plate is worse than a smaller one.
    let ts = h * 0.22;
    ctx.font = `600 ${ts}px ${SANS_OF()}`;
    while (ctx.measureText(title).width > w * 0.88 && ts > h * 0.1) {
      ts *= 0.94;
      ctx.font = `600 ${ts}px ${SANS_OF()}`;
    }
    ctx.fillStyle = BRIGHT;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(title, w * 0.06, h * 0.46);

    let ss = h * 0.115;
    ctx.font = `600 ${ss}px ${MONO_OF()}`;
    ctx.letterSpacing = `${(ss * 0.09).toFixed(2)}px`;
    while (ctx.measureText(sub.toUpperCase()).width > w * 0.88 && ss > h * 0.05) {
      ss *= 0.94;
      ctx.font = `600 ${ss}px ${MONO_OF()}`;
      ctx.letterSpacing = `${(ss * 0.09).toFixed(2)}px`;
    }
    ctx.letterSpacing = "0px";
    label(p, sub, w * 0.06, h * 0.58, ss, accent, 600);
  };

const wordmark = (p: PaintCtx) => {
  const { ctx, w, h } = p;
  ctx.fillStyle = "#05090a";
  ctx.fillRect(0, 0, w, h);
  ctx.font = `600 ${h * 0.4}px ${SANS_OF()}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const text = "livegrid";
  const av = "AV";
  const tw = ctx.measureText(text).width;
  const aw = ctx.measureText(av).width;
  const total = tw + aw;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(text, (w - total) / 2, h * 0.5);
  ctx.fillStyle = "#3fd6c8";
  ctx.fillText(av, (w - total) / 2 + tw, h * 0.5);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
  label(p, "we turn ideas into unforgettable experiences", w * 0.5 - h * 0.86, h * 0.72, h * 0.06, DIM);
};

/**
 * The entrance fascia.
 *
 * The one surface on the whole site whose job is to say the name, so it does
 * exactly that: livegridAV, set large, tracked wide, lit from behind, with a
 * hairline rule under it. Everything else on this sign is restraint — a
 * flagship entrance says its name once and does not decorate it.
 */
const brandFascia = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0a1112");
  g.addColorStop(0.5, "#060b0c");
  g.addColorStop(1, "#040708");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // a slow wash travelling across the band, so the fascia is lit rather than printed
  const sweep = ((t * 0.06) % 1.7) - 0.35;
  const sg = ctx.createLinearGradient((sweep - 0.3) * w, 0, (sweep + 0.3) * w, 0);
  sg.addColorStop(0, "rgba(255,255,255,0)");
  sg.addColorStop(0.5, "rgba(230,240,238,0.06)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, w, h);

  const size = h * 0.46;
  ctx.font = `600 ${size}px ${SANS_OF()}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.letterSpacing = `${(size * 0.15).toFixed(2)}px`;

  const cy = h * 0.46;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f2f7f6";
  drawWordmark(ctx, w / 2, cy, size, { align: "center", ink: "#f2f7f6", letterSpacing: `${(size * 0.15).toFixed(2)}px` });
  ctx.shadowBlur = 0;
  ctx.letterSpacing = "0px";

  // hairline rule and end ticks
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(w * 0.3, h * 0.76, w * 0.4, Math.max(1, h * 0.016));
  ctx.globalAlpha = 0.5;
  ctx.fillRect(w * 0.085, h * 0.42, Math.max(1, h * 0.022), h * 0.2);
  ctx.fillRect(w * 0.9, h * 0.42, Math.max(1, h * 0.022), h * 0.2);
  ctx.globalAlpha = 1;
};

/* Only painters with active architectural screens are registered. */
export const PAINTERS = {
  ...TECHNICAL_PAINTERS,
  ...PROJECTION_PAINTERS,
  ...LED_RENTAL_2026_PAINTERS,
  wordmark,
  brandFascia,
  signServices: makeSign("What We Do", "Eight disciplines"),
  signArena: makeSign("Main arena", "This way"),
  signFinaleCta: makeSign("Let’s build your next experience", "Talk to livegridAV"),
} as const;

export type PainterId = keyof typeof PAINTERS;
