/**
 * Canvas-drawn LED content.
 *
 * Shaders are the right tool for cinematic abstraction, but a show-control cue
 * stack or a broadcast multiview has to look like a real *interface* — crisp
 * type, tally borders, running timecode. Those are painted with Canvas2D and
 * uploaded as a texture, repainted at a low frame rate because interfaces only
 * need to tick, not animate.
 */

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

const PANEL = "#0e1616";
const LINE = "#1d2b2a";
const DIM = "#5d6b69";
const BRIGHT = "#e8efee";

/* ── shared chrome ─────────────────────────────────────── */

function bg({ ctx, w, h }: PaintCtx) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0b1212");
  g.addColorStop(1, "#050909");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

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

function panel(p: PaintCtx, x: number, y: number, w: number, h: number, stroke = LINE) {
  const { ctx } = p;
  ctx.fillStyle = PANEL;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, p.h * 0.004);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function timecode(t: number) {
  const total = Math.floor(t * 25);
  const f = total % 25;
  const s = Math.floor(total / 25) % 60;
  const m = Math.floor(total / 1500) % 60;
  const hrs = Math.floor(total / 90000) % 24;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hrs)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

// A supplied stage visualization stands in for camera footage. Each monitor
// gets its own reframed view; this is an illustrative feed, not a live stream.
let cameraPlate: HTMLImageElement | undefined;
function stagePlate() {
  if (!cameraPlate && typeof Image !== "undefined") {
    cameraPlate = new Image();
    cameraPlate.decoding = "async";
    cameraPlate.src = "/media/final/broadcast-stage.png";
  }
  return cameraPlate?.complete && cameraPlate.naturalWidth ? cameraPlate : undefined;
}

/** Camera-style crops, running timecode and tally are painted independently. */
function feed(p: PaintCtx, x: number, y: number, w: number, h: number, seed: number, warm = false) {
  const { ctx, t } = p;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const plate = stagePlate();
  if (plate) {
    const zoom = 1.08 + (Math.floor(seed) % 3) * 0.23 + Math.sin(t * 0.13 + seed) * 0.025;
    const scale = Math.max(w / plate.naturalWidth, h / plate.naturalHeight) * zoom;
    const dw = plate.naturalWidth * scale, dh = plate.naturalHeight * scale;
    const pan = 0.5 + Math.sin(seed * 2.1 + t * 0.07) * 0.16;
    ctx.drawImage(plate, x - (dw - w) * pan, y - (dh - h) * 0.5, dw, dh);
    const shade = ctx.createLinearGradient(0, y + h * 0.72, 0, y + h);
    shade.addColorStop(0, "transparent"); shade.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = shade; ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, warm ? "#221408" : "#071313");
  g.addColorStop(1, warm ? "#0d0805" : "#04090b");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  for (let i = 0; i < 5; i++) {
    const ph = (t * (0.12 + i * 0.05) + seed * 0.37 + i * 0.2) % 1;
    const cx = x + w * ((Math.sin(seed + i * 2.1 + t * 0.3) * 0.5 + 0.5) * 0.8 + 0.1);
    const cy = y + h * ph;
    const r = Math.min(w, h) * (0.12 + i * 0.05);
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, warm ? "rgba(235,160,80,0.30)" : "rgba(80,190,180,0.22)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(x, y, w, h);
  }
  // horizontal sweep bar — reads as a live signal
  const by = y + h * (((t * 0.22 + seed) % 1));
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(x, by, w, Math.max(1, h * 0.012));
  ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   01 · AV Engineering
   ══════════════════════════════════════════════════════════ */

const avSignalDiagram = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "System design · single line", w * 0.05, h * 0.07, h * 0.045);

  const nodes = ["Source", "Switch", "Playback", "Process", "Output"];
  const y = h * 0.5;
  const pad = w * 0.07;
  const step = (w - pad * 2) / (nodes.length - 1);

  // links
  ctx.strokeStyle = LINE;
  ctx.lineWidth = Math.max(1, h * 0.006);
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();

  // travelling packets
  for (let i = 0; i < 4; i++) {
    const ph = ((t * 0.28 + i * 0.25) % 1);
    const px = pad + ph * (w - pad * 2);
    const grd = ctx.createRadialGradient(px, y, 0, px, y, h * 0.09);
    grd.addColorStop(0, accent);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(px - h * 0.09, y - h * 0.09, h * 0.18, h * 0.18);
    ctx.globalAlpha = 1;
  }

  nodes.forEach((n, i) => {
    const x = pad + step * i;
    const bw = w * 0.115, bh = h * 0.2;
    ctx.fillStyle = "#101a19";
    ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1, h * 0.005);
    ctx.strokeRect(x - bw / 2 + 0.5, y - bh / 2 + 0.5, bw - 1, bh - 1);
    ctx.font = `${h * 0.05}px ${SANS_OF()}`;
    ctx.fillStyle = BRIGHT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(n, x, y);
    ctx.textAlign = "left";
    label(p, String(i + 1).padStart(2, "0"), x - bw / 2, y + bh * 0.62, h * 0.035);
  });

  // redundancy path
  ctx.setLineDash([h * 0.02, h * 0.02]);
  ctx.strokeStyle = "rgba(200,140,70,0.55)";
  ctx.beginPath();
  ctx.moveTo(pad + step, y + h * 0.18);
  ctx.lineTo(pad + step * 3, y + h * 0.18);
  ctx.stroke();
  ctx.setLineDash([]);
  label(p, "Backup path", pad + step, y + h * 0.22, h * 0.032, "rgba(200,140,70,0.75)");
  label(p, timecode(t), w * 0.05, h * 0.88, h * 0.04, accent);
};

const avLedPlan = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "LED plan · stage elevation", w * 0.05, h * 0.07, h * 0.045);

  const gx = w * 0.06, gy = h * 0.22, gw = w * 0.88, gh = h * 0.56;
  // measurement grid
  ctx.strokeStyle = "rgba(60,80,78,0.35)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 12; i++) {
    const x = gx + (gw / 12) * i;
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke();
  }
  for (let i = 0; i <= 6; i++) {
    const y = gy + (gh / 6) * i;
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
  }

  // main wall + side walls
  const blocks: [number, number, number, number, string][] = [
    [0.22, 0.08, 0.56, 0.6, "Main 16:9"],
    [0.02, 0.18, 0.16, 0.42, "Side L"],
    [0.82, 0.18, 0.16, 0.42, "Side R"],
    [0.3, 0.74, 0.4, 0.16, "Floor"],
  ];
  blocks.forEach((b, i) => {
    const x = gx + gw * b[0], y = gy + gh * b[1], bw = gw * b[2], bh = gh * b[3];
    const alive = (Math.sin(t * 0.9 + i * 1.3) * 0.5 + 0.5) * 0.35 + 0.25;
    ctx.fillStyle = `rgba(90,170,160,${alive * 0.35})`;
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1, h * 0.004);
    ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
    label(p, b[4], x + h * 0.02, y + h * 0.02, h * 0.032, BRIGHT);
  });

  label(p, "Pixel pitch confirmed after technical review", w * 0.06, h * 0.85, h * 0.033);
};

const avRackStatus = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "Rack · status", w * 0.06, h * 0.07, h * 0.05);
  const rows = ["Media server", "LED processor", "Switcher", "Converter", "Distribution", "UPS"];
  rows.forEach((r, i) => {
    const y = h * (0.2 + i * 0.125);
    panel(p, w * 0.06, y, w * 0.88, h * 0.095);
    ctx.font = `${h * 0.048}px ${SANS_OF()}`;
    ctx.fillStyle = BRIGHT;
    ctx.textBaseline = "middle";
    ctx.fillText(r, w * 0.1, y + h * 0.048);
    const ok = Math.sin(t * 1.6 + i) > -0.9;
    ctx.fillStyle = ok ? accent : "rgba(200,140,70,0.9)";
    ctx.beginPath();
    ctx.arc(w * 0.88, y + h * 0.048, h * 0.016, 0, Math.PI * 2);
    ctx.fill();
    label(p, ok ? "ok" : "arm", w * 0.74, y + h * 0.032, h * 0.032, DIM);
  });
};

/* ══════════════════════════════════════════════════════════
   03 · LED solutions
   ══════════════════════════════════════════════════════════ */

const ledPitch = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "Pitch · viewing distance", w * 0.06, h * 0.07, h * 0.045);
  const items: [string, string][] = [
    ["Fine pitch", "Close audience, camera-facing"],
    ["Standard indoor", "Ballroom and conference"],
    ["Stage / touring", "Large rooms, long throw"],
    ["Outdoor", "High brightness, weatherised"],
  ];
  items.forEach((it, i) => {
    const y = h * (0.2 + i * 0.185);
    const active = Math.floor(t * 0.4) % items.length === i;
    panel(p, w * 0.06, y, w * 0.88, h * 0.145, active ? accent : LINE);
    ctx.font = `${h * 0.055}px ${SANS_OF()}`;
    ctx.fillStyle = active ? BRIGHT : "#9fb0ae";
    ctx.textBaseline = "top";
    ctx.fillText(it[0], w * 0.1, y + h * 0.024);
    label(p, it[1], w * 0.1, y + h * 0.09, h * 0.03);
    // pitch dot density illustration
    const dx = w * 0.72, dy = y + h * 0.03, dn = 3 + i * 2;
    for (let a = 0; a < dn; a++)
      for (let b = 0; b < dn; b++) {
        ctx.fillStyle = active ? accent : "#2a3a38";
        ctx.fillRect(dx + (a * w * 0.16) / dn, dy + (b * h * 0.09) / dn, Math.max(1, w * 0.1 / dn / 2), Math.max(1, h * 0.05 / dn / 2));
      }
  });
};

const ledInstall = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "Install · geometry", w * 0.06, h * 0.07, h * 0.045);
  // panels assembling into different geometries over time
  const phase = Math.floor(t * 0.25) % 3;
  const cx = w * 0.5, cy = h * 0.56, R = Math.min(w, h) * 0.3;
  const n = 18;
  for (let i = 0; i < n; i++) {
    const f = i / n;
    let x: number, y: number, rot: number;
    if (phase === 0) { x = cx + (f - 0.5) * R * 3.0; y = cy; rot = 0; }
    else if (phase === 1) { const a = (f - 0.5) * 2.2; x = cx + Math.sin(a) * R * 1.5; y = cy - Math.cos(a) * R * 0.35 + R * 0.3; rot = a; }
    else { const a = f * Math.PI * 2; x = cx + Math.cos(a) * R; y = cy + Math.sin(a) * R * 0.5; rot = a + Math.PI / 2; }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const pw = w * 0.05, ph = h * 0.22;
    ctx.fillStyle = `rgba(80,160,152,${0.2 + 0.5 * Math.abs(Math.sin(t * 1.2 + i * 0.4))})`;
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
    ctx.restore();
  }
  label(p, ["Flat", "Curved", "Cylinder"][phase], w * 0.06, h * 0.87, h * 0.04, accent);
};

/* ══════════════════════════════════════════════════════════
   05 · Show control
   ══════════════════════════════════════════════════════════ */

const scCues = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "Cue stack", w * 0.06, h * 0.06, h * 0.05);
  label(p, timecode(t), w * 0.6, h * 0.06, h * 0.05, accent);
  const cues = ["Cue 01 · Preshow loop", "Cue 02 · Doors", "Cue 03 · Opening film", "Cue 04 · Keynote", "Cue 05 · Reveal"];
  const active = Math.floor(t * 0.22) % cues.length;
  cues.forEach((c, i) => {
    const y = h * (0.19 + i * 0.148);
    const isNext = i === (active + 1) % cues.length;
    panel(p, w * 0.06, y, w * 0.88, h * 0.115, i === active ? accent : LINE);
    if (i === active) {
      ctx.fillStyle = "rgba(90,180,170,0.12)";
      ctx.fillRect(w * 0.06, y, w * 0.88, h * 0.115);
    }
    ctx.font = `${h * 0.05}px ${SANS_OF()}`;
    ctx.fillStyle = i === active ? BRIGHT : "#8d9c9a";
    ctx.textBaseline = "middle";
    ctx.fillText(c, w * 0.1, y + h * 0.058);
    if (i === active) label(p, "go", w * 0.86, y + h * 0.04, h * 0.036, accent);
    else if (isNext) label(p, "stby", w * 0.84, y + h * 0.04, h * 0.036, "rgba(200,150,80,0.8)");
  });
};

const makeFeedPanel =
  (title: string, tally: "preview" | "program" | "none", warm = false) =>
  (p: PaintCtx) => {
    const { ctx, w, h, accent } = p;
    bg(p);
    const m = h * 0.06;
    feed(p, m, m * 1.9, w - m * 2, h - m * 3.4, p.variant + 1, warm);
    const col = tally === "program" ? "#c8462f" : tally === "preview" ? "#3fa08f" : LINE;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(2, h * 0.012);
    ctx.strokeRect(m, m * 1.9, w - m * 2, h - m * 3.4);
    label(p, title, m, m * 0.5, h * 0.062, tally === "none" ? DIM : col);
    label(p, timecode(p.t), w - m - h * 0.34, m * 0.5, h * 0.05, accent);
  };

const scSources = (p: PaintCtx) => {
  const { ctx, w, h, accent } = p;
  bg(p);
  const names = ["Source 01", "Source 02", "Source 03", "Source 04"];
  const m = h * 0.045;
  const cw = (w - m * 3) / 2, ch = (h - m * 3) / 2;
  names.forEach((n, i) => {
    const x = m + (i % 2) * (cw + m);
    const y = m + Math.floor(i / 2) * (ch + m);
    feed(p, x, y, cw, ch, i * 3 + 1, i === 2);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
    label(p, n, x + h * 0.02, y + ch - h * 0.06, h * 0.038, i === 1 ? accent : DIM);
  });
};

/* ══════════════════════════════════════════════════════════
   06 · Live production & broadcast
   ══════════════════════════════════════════════════════════ */

const lpMultiview = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  const m = h * 0.035;
  const cols = 3, rows = 2;
  const cw = (w - m * (cols + 1)) / cols;
  const ch = (h - m * (rows + 2.2)) / rows;
  const live = Math.floor(t * 0.3) % 6;
  for (let i = 0; i < cols * rows; i++) {
    const x = m + (i % cols) * (cw + m);
    const y = m * 2.2 + Math.floor(i / cols) * (ch + m);
    feed(p, x, y, cw, ch, i + 2, i === 4);
    const isLive = i === live;
    ctx.strokeStyle = isLive ? "#c8462f" : LINE;
    ctx.lineWidth = isLive ? Math.max(2, h * 0.01) : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
    label(p, `Cam ${String(i + 1).padStart(2, "0")}`, x + h * 0.016, y + ch - h * 0.055, h * 0.036, isLive ? "#e8836f" : DIM);
  }
  label(p, "Multiview", m, m * 0.5, h * 0.05, accent);
  label(p, timecode(t), w - m - h * 0.3, m * 0.5, h * 0.045, DIM);
};

const lpStream = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "Stream · health", w * 0.06, h * 0.07, h * 0.05);
  ctx.fillStyle = "#c8462f";
  ctx.beginPath();
  ctx.arc(w * 0.87, h * 0.095, h * 0.022, 0, Math.PI * 2);
  ctx.fill();
  label(p, "live", w * 0.9, h * 0.075, h * 0.042, "#e8836f");

  // bitrate graph
  const gx = w * 0.06, gy = h * 0.28, gw = w * 0.88, gh = h * 0.4;
  panel(p, gx, gy, gw, gh);
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) {
    const f = i / 60;
    const v = 0.5 + 0.28 * Math.sin(t * 1.4 + f * 9) + 0.12 * Math.sin(t * 3.1 + f * 21);
    const x = gx + gw * f;
    const y = gy + gh * (1 - v);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1.5, h * 0.007);
  ctx.stroke();
  ctx.lineTo(gx + gw, gy + gh);
  ctx.lineTo(gx, gy + gh);
  ctx.closePath();
  ctx.fillStyle = "rgba(80,170,158,0.12)";
  ctx.fill();

  ["Encoder", "Redundant", "Archive"].forEach((s, i) => {
    label(p, `${s}  ·  ok`, w * 0.06 + i * w * 0.31, h * 0.78, h * 0.036, DIM);
  });
};

/* ══════════════════════════════════════════════════════════
   07 · Connected events
   ══════════════════════════════════════════════════════════ */

const ceRemote = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "Remote participants", w * 0.05, h * 0.06, h * 0.05);
  const m = h * 0.04;
  const cols = 4, rows = 3;
  const cw = (w - m * (cols + 1)) / cols;
  const ch = (h - m * (rows + 2.2)) / rows;
  for (let i = 0; i < cols * rows; i++) {
    const x = m + (i % cols) * (cw + m);
    const y = m * 2.2 + Math.floor(i / cols) * (ch + m);
    feed(p, x, y, cw, ch, i * 1.7 + 4);
    const speaking = Math.floor(t * 0.5) % (cols * rows) === i;
    ctx.strokeStyle = speaking ? accent : LINE;
    ctx.lineWidth = speaking ? Math.max(2, h * 0.009) : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
  }
};

const ceMap = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "One event · every audience", w * 0.05, h * 0.07, h * 0.045);
  const cx = w * 0.5, cy = h * 0.58;
  // hub
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(cx, cy, h * 0.03, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + t * 0.06;
    const r = Math.min(w, h) * (0.24 + 0.1 * Math.sin(i * 2.1));
    const x = cx + Math.cos(a) * r * 1.5;
    const y = cy + Math.sin(a) * r * 0.62;
    ctx.strokeStyle = "rgba(90,160,152,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    // travelling pulse
    const ph = (t * 0.35 + i * 0.11) % 1;
    const px = cx + (x - cx) * ph, py = cy + (y - cy) * ph;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(px, py, h * 0.009, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8ea3a0";
    ctx.beginPath();
    ctx.arc(x, y, h * 0.014, 0, Math.PI * 2);
    ctx.fill();
  }
};

/* ══════════════════════════════════════════════════════════
   08 · Digital
   ══════════════════════════════════════════════════════════ */

const webDevices = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "Web · every screen", w * 0.05, h * 0.07, h * 0.045);
  const frames: [number, number, number, number][] = [
    [0.06, 0.22, 0.5, 0.52],
    [0.6, 0.3, 0.16, 0.36],
    [0.79, 0.34, 0.15, 0.28],
  ];
  frames.forEach((f, i) => {
    const x = w * f[0], y = h * f[1], fw = w * f[2], fh = h * f[3];
    ctx.fillStyle = "#0c1413";
    ctx.fillRect(x, y, fw, fh);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = Math.max(1, h * 0.004);
    ctx.strokeRect(x + 0.5, y + 0.5, fw - 1, fh - 1);
    // chrome bar
    ctx.fillStyle = "#16211f";
    ctx.fillRect(x, y, fw, h * 0.035);
    // content lines scrolling
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y + h * 0.035, fw, fh - h * 0.035); ctx.clip();
    const off = ((t * 14 + i * 40) % (fh));
    for (let k = 0; k < 12; k++) {
      const ly = y + fh - off + k * h * 0.06;
      const lw = fw * (0.3 + 0.55 * Math.abs(Math.sin(k * 1.7 + i)));
      ctx.fillStyle = k % 4 === 0 ? accent : "rgba(150,170,168,0.28)";
      ctx.fillRect(x + fw * 0.06, ly, lw, h * 0.014);
    }
    ctx.restore();
  });
};

const webCode = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  const lines = 16;
  const off = (t * 0.6) % 1;
  for (let i = 0; i < lines; i++) {
    const y = h * (0.06 + ((i + off) % lines) * 0.058);
    const indent = [0, 1, 2, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 1, 2, 0][i % 16];
    const lw = w * (0.18 + 0.5 * Math.abs(Math.sin(i * 2.3 + 1.1)));
    ctx.fillStyle = "rgba(60,80,78,0.5)";
    ctx.font = `${h * 0.035}px ${MONO_OF()}`;
    ctx.fillText(String(i + 1).padStart(2, "0"), w * 0.03, y + h * 0.03);
    ctx.fillStyle = i % 5 === 0 ? accent : "rgba(140,160,158,0.35)";
    ctx.fillRect(w * 0.1 + indent * w * 0.035, y, lw, h * 0.016);
  }
  label(p, "Built in the browser", w * 0.03, h * 0.93, h * 0.036, accent);
};

/* ══════════════════════════════════════════════════════════
   Partner bay
   ══════════════════════════════════════════════════════════ */

const partnerBay = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  bg(p);
  label(p, "Sound & lighting", w * 0.06, h * 0.1, h * 0.075, BRIGHT);
  label(p, "Delivered with trusted production partners", w * 0.06, h * 0.26, h * 0.042, accent);
  const rows = ["Line array & subs", "Stage monitoring", "Moving heads & beams", "Wash & key lighting", "Lighting console", "Truss & rigging"];
  rows.forEach((r, i) => {
    const y = h * (0.4 + i * 0.09);
    const lit = (Math.sin(t * 1.1 + i * 0.7) * 0.5 + 0.5);
    ctx.fillStyle = `rgba(200,150,80,${0.25 + lit * 0.5})`;
    ctx.fillRect(w * 0.06, y + h * 0.02, h * 0.012, h * 0.03);
    ctx.font = `${h * 0.042}px ${SANS_OF()}`;
    ctx.fillStyle = "#b9c6c4";
    ctx.textBaseline = "top";
    ctx.fillText(r, w * 0.11, y + h * 0.012);
  });
  label(p, "Specified by us · supplied by partners", w * 0.06, h * 0.94, h * 0.032);
};

/* ══════════════════════════════════════════════════════════
   Wayfinding / signage
   ══════════════════════════════════════════════════════════ */

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
 * exactly that: LIVEGRID AV, set large, tracked wide, lit from behind, with a
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
  ctx.fillText("LIVEGRID AV", w / 2, cy);
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

/**
 * A pavilion's own header sign. The copy comes from the media descriptor, so
 * eight stalls share one painter and still each say their own name.
 */
const pavilionHeader = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  const title = p.text?.title ?? "livegridAV";
  const sub = p.text?.sub ?? "";

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#0c1414");
  g.addColorStop(1, "#060909");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // a slow light wipe across the header, so it is never a static plate
  const sweep = ((t * 0.09) % 1.6) - 0.3;
  const sg = ctx.createLinearGradient((sweep - 0.25) * w, 0, (sweep + 0.25) * w, 0);
  sg.addColorStop(0, "rgba(255,255,255,0)");
  sg.addColorStop(0.5, "rgba(255,255,255,0.05)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, w, h);

  // The rule and the text share one left margin. They did not before: the
  // rule sat at 0.05w and the type at 0.10w, so the two lines were indented
  // off a mark that was not there.
  const x = w * 0.075;
  ctx.fillStyle = accent;
  ctx.fillRect(w * 0.035, h * 0.26, h * 0.05, h * 0.48);

  // Title, shrunk to fit rather than clipped — pavilion names vary in length.
  let size = h * 0.3;
  const fit = () => (ctx.font = `600 ${size}px ${SANS_OF()}`);
  fit();
  while (ctx.measureText(title).width > w * 0.84 && size > h * 0.13) {
    size *= 0.94;
    fit();
  }
  // Two lines, set as a block and centred in the plate, rather than two
  // independent baselines that happened to nearly collide.
  const subSize = h * 0.125;
  ctx.fillStyle = BRIGHT;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(title, x, sub ? h * 0.48 : h * 0.62);
  if (sub) label(p, sub, x, h * 0.585, subSize, accent, 600);
};

/* ── pavilion kiosk ────────────────────────────────────── */

/**
 * The information panel that belongs to the stand rather than to the browser.
 *
 * A pavilion used to explain itself through a rectangular card floating beside
 * the 3D view, which is the exact "web page with a render behind it" feeling
 * the venue exists to avoid. The same copy painted onto a physical kiosk in
 * the room reads as signage — and the HTML panel can then be what it should
 * be: the accessible, selectable, linkable version of what is already on the
 * wall, opened on demand.
 */
const kioskInfo = (p: PaintCtx) => {
  const { ctx, w, h, t, accent } = p;
  const title = p.text?.title ?? "livegridAV";
  const sub = p.text?.sub ?? "";
  const lines = p.text?.lines ?? [];

  bg(p);
  ctx.fillStyle = accent;
  ctx.fillRect(w * 0.08, h * 0.12, w * 0.055, h * 0.012);

  label(p, sub, w * 0.08, h * 0.17, h * 0.042, accent);

  // Title, wrapped rather than clipped — headlines vary a lot in length.
  let size = h * 0.115;
  ctx.font = `600 ${size}px ${SANS_OF()}`;
  const words = title.split(" ");
  const rows: string[] = [];
  let row = "";
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (ctx.measureText(next).width > w * 0.84 && row) {
      rows.push(row);
      row = word;
    } else {
      row = next;
    }
  }
  if (row) rows.push(row);
  while (rows.length > 3 && size > h * 0.06) {
    size *= 0.92;
    ctx.font = `600 ${size}px ${SANS_OF()}`;
    rows.length = 3;
  }
  // Wrapping only ever breaks *between* words, so a single long one — and
  // "Engineering" is one — still ran off the plate. Shrink until the widest
  // row fits, which is the only thing that can rescue an unbreakable word.
  let guard = 0;
  while (guard++ < 24) {
    ctx.font = `600 ${size}px ${SANS_OF()}`;
    const widest = rows.reduce((m, r) => Math.max(m, ctx.measureText(r).width), 0);
    if (widest <= w * 0.84 || size <= h * 0.05) break;
    size *= 0.94;
  }
  ctx.fillStyle = BRIGHT;
  ctx.textBaseline = "top";
  rows.forEach((r, i) => ctx.fillText(r, w * 0.08, h * 0.25 + i * size * 1.14));

  // The services this pavilion covers, as a ruled list.
  const top = h * 0.25 + rows.length * size * 1.14 + h * 0.06;
  ctx.font = `${h * 0.05}px ${SANS_OF()}`;
  lines.slice(0, 4).forEach((line, i) => {
    const y = top + i * h * 0.095;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, y - h * 0.018);
    ctx.lineTo(w * 0.92, y - h * 0.018);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(w * 0.08, y + h * 0.018, h * 0.02, h * 0.02);
    ctx.fillStyle = DIM;
    ctx.fillText(line, w * 0.13, y);
  });

  // A quietly pulsing prompt, so the kiosk reads as interactive.
  const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.6));
  ctx.globalAlpha = pulse;
  label(p, "Touch for detail", w * 0.08, h * 0.88, h * 0.042, accent);
  ctx.globalAlpha = 1;
};

/* ── registry ──────────────────────────────────────────── */

export const PAINTERS = {
  pavilionHeader,
  kioskInfo,
  avSignalDiagram,
  avLedPlan,
  avRackStatus,
  ledPitch,
  ledInstall,
  scCues,
  scPreview: makeFeedPanel("Preview", "preview"),
  scProgram: makeFeedPanel("Program", "program", true),
  scSources,
  lpMultiview,
  lpProgram: makeFeedPanel("Program", "program", true),
  lpStream,
  ceRemote,
  ceMap,
  ceStage: makeFeedPanel("Main room", "none"),
  webDevices,
  webCode,
  partnerBay,
  wordmark,
  brandFascia,
  signServices: makeSign("What We Do", "Eight disciplines"),
  signArena: makeSign("Main arena", "This way"),
  signGallery: makeSign("Creative LED", "Gallery"),
  signWelcome: (p: PaintCtx) => {
    const { ctx, w, h } = p;
    ctx.fillStyle = "#081011";
    ctx.fillRect(0, 0, w, h);
    ctx.font = `500 ${h * 0.37}px ${SANS_OF()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("WELCOME LIVEGRIDAV", w / 2, h / 2, w * 0.91);
    ctx.textAlign = "left";
  },
  signFinaleCta: makeSign("Let’s build your next experience", "Talk to livegridAV"),
} as const;

export type PainterId = keyof typeof PAINTERS;
