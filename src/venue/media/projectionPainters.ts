import type { PaintCtx } from "./painters";
import { prefetchedBlob, prefetchedImage, releaseBlob } from "../loading/prefetched";

/** Only isolated content artwork is used on the physical pavilion's LED screens. */
export const PROJECTION_ART = {
  applications: "/media/projection-mapping-v6/applications.webp?v=db20ff201339fe03",
  hero: "/media/projection-mapping-v12/crystals-hero.webp?v=f389d9b923977c92",
  backdrop: "/media/projection-mapping-v7/rear-ocean-particulate.webp?v=9729ed0d32f2c4e7",
  forest: "/media/projection-mapping/forest.webp",
  sculpture: "/media/projection-mapping-v3/sculpture-caustics.webp?v=9e82788a37d59bbc",
  cosmic: "/media/projection-mapping-v7/roof-teal-particulate.webp?v=4abd8e148028aaf9",
  crystal: "/media/projection-mapping-v6/crystal-caustic.webp?v=b212720742e813b9",
} as const;

const images = new Map<string, HTMLImageElement>();
const decodedImages = new WeakSet<HTMLImageElement>();
const decoding = new Map<string, Promise<HTMLImageElement | undefined>>();
const W = 1920, H = 1080;
const TAU = Math.PI * 2;
const phase = (time: number) => (((time % 24) + 24) % 24) / 24 * TAU;
const fract = (value: number) => value - Math.floor(value);

function artwork(url: string) {
  if (typeof Image === "undefined") return undefined;
  let image = images.get(url);
  // The streamer may already hold this file decoded (load group prefetch).
  const ready = image ? undefined : prefetchedImage(url);
  if (ready) { images.set(url, ready); decodedImages.add(ready); return ready; }
  if (!image) {
    image = new Image(); image.decoding = "async"; image.crossOrigin = "anonymous";
    image.src = url; images.set(url, image);
    const requested=image;
    decoding.set(url, requested.decode().then(()=>{ decodedImages.add(requested); return requested; }).catch(() => undefined /* Local content fades in after its first decoded frame. */));
  }
  return decodedImages.has(image) && image.complete && image.naturalWidth > 0 ? image : undefined;
}

/** Artworks a painter draws (forest is in PROJECTION_ART but no painter uses it; crystal and backdrop only feed graded surfaces). */
const DRAWN = new Set<string>([PROJECTION_ART.applications, PROJECTION_ART.hero, PROJECTION_ART.sculpture, PROJECTION_ART.cosmic]);
/** Every url whose bytes the streamer keeps for a bitmap. */
export const BITMAP_SOURCES: readonly string[] = [...DRAWN, PROJECTION_ART.crystal, PROJECTION_ART.backdrop];
const bitmaps = new Map<string, ImageBitmap>();
const bitmapPending = new Map<string, Promise<ImageBitmap | undefined>>();
/** Urls with no bitmap (no bytes, or the decode failed): their painter draws the decoded image. */
const noBitmap = new Set<string>();

/**
 * An ImageBitmap decoded on a worker from the streamer's bytes (drawImage of
 * an HTMLImageElement decodes lazily on the main thread when the canvas
 * rasters: 97 ms for a 2K artwork on the first frame it was drawn). Undefined
 * when there are no bytes or the decode fails. Never rejects; the bytes are
 * dropped either way.
 */
async function makeBitmap(url: string): Promise<ImageBitmap | undefined> {
  try {
    const image = await artworkReady(url);
    const blob = prefetchedBlob(url);
    if (!image || !blob || typeof createImageBitmap === "undefined") return undefined;
    await yieldTask();
    return await createImageBitmap(blob);
  } catch { return undefined; } finally { releaseBlob(url); }
}

/** The shared, kept bitmap of an artwork a painter draws. */
function artworkBitmap(url: string): Promise<ImageBitmap | undefined> {
  const done = bitmaps.get(url);
  if (done) return Promise.resolve(done);
  let pending = bitmapPending.get(url);
  if (!pending) {
    pending = makeBitmap(url).then(bitmap => { if (bitmap) bitmaps.set(url, bitmap); else noBitmap.add(url); return bitmap; });
    bitmapPending.set(url, pending);
  }
  return pending;
}

/** What a painter draws: the bitmap once it exists, the decoded image whenever there is none to wait for. */
function drawable(url: string): CanvasImageSource | undefined {
  const bitmap = bitmaps.get(url);
  if (bitmap) return bitmap;
  const image = artwork(url);
  if (!image) return undefined;
  if (noBitmap.has(url) || !DRAWN.has(url)) return image;
  if (!bitmapPending.has(url) && !prefetchedBlob(url)) { noBitmap.add(url); return image; }
  void artworkBitmap(url);
  return undefined;
}
const sizeOf = (source: CanvasImageSource) => "naturalWidth" in source ? { w: source.naturalWidth, h: source.naturalHeight } : { w: (source as ImageBitmap).width, h: (source as ImageBitmap).height };

/** The decoded artwork, once it is; undefined if it never decodes. Never rejects. */
function artworkReady(url: string): Promise<HTMLImageElement | undefined> {
  const ready = artwork(url);
  return ready ? Promise.resolve(ready) : decoding.get(url) ?? Promise.resolve(undefined);
}

/** Start fetching and decoding the artwork and preparing the graded surfaces, before any painter's first frame. */
export function preloadProjectionArtwork() {
  for (const url of BITMAP_SOURCES) { artwork(url); if (DRAWN.has(url)) void artworkBitmap(url); }
  backdropArtwork(); crystalArtwork();
}

/**
 * Resolves when the artwork that is already decoded has its bitmaps and the
 * graded surfaces are built, so the projection group's first shown frame has
 * its content. Never rejects and never waits on a download: an artwork that is
 * not decoded yet is not waited for (its painter draws it when it arrives).
 */
export async function prepareProjectionArtwork(): Promise<void> {
  try {
    preloadProjectionArtwork();
    const decoded = (urls: string[]) => urls.every(url => artwork(url));
    const waits: Promise<unknown>[] = [...DRAWN].filter(url => artwork(url)).map(artworkBitmap);
    if (decoded([PROJECTION_ART.backdrop])) waits.push(backdropSurface.done ?? Promise.resolve());
    if (decoded([PROJECTION_ART.crystal, PROJECTION_ART.sculpture])) waits.push(crystalSurface.done ?? Promise.resolve());
    await Promise.all(waits);
  } catch { /* a painter without its surface draws without it */ }
}

function start(p: PaintCtx, draw: (c: CanvasRenderingContext2D) => void, background = "#01050b") {
  const c = p.ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  c.fillStyle = background; c.fillRect(0, 0, p.w, p.h);
  c.scale(p.w / W, p.h / H); draw(c); c.restore();
}

function fullArtwork(p: PaintCtx, url: string, tint = 0) {
  start(p, c => {
    const source = drawable(url); if (!source) return;
    const zoom = 1.0018 + .0012 * Math.sin(phase(p.t));
    c.drawImage(source, (W - W * zoom) / 2, (H - H * zoom) / 2, W * zoom, H * zoom);
    if (tint) {
      c.fillStyle = `rgba(0,6,16,${tint})`; c.fillRect(0, 0, W, H);
    }
  });
}

/** Eight distinct application photographs, ordered down the left then right gallery. */
export function projectionApplications(p: PaintCtx) {
  const index = ((Math.round(p.variant) % 8) + 8) % 8;
  start(p, c => {
    const source = drawable(PROJECTION_ART.applications); if (!source) return;
    const { w: iw, h: ih } = sizeOf(source), sw = iw / 2, sh = ih / 4;
    c.drawImage(source, (index % 2) * sw, Math.floor(index / 2) * sh, sw, sh, 0, 0, W, H);
  });
}

/** Actual final crystal geometry rendered for the physical kiosk displays. */
export function projectionHero(p: PaintCtx) { fullArtwork(p, PROJECTION_ART.hero); }

type Graded = { surface?: CanvasImageSource; pending?: boolean; done?: Promise<void> };
/** Yield to the event loop (a message, not a timer: review captures run on a paused clock). */
const yieldTask = () => new Promise<void>(resolve => { const channel = new MessageChannel(); channel.port1.onmessage = () => { channel.port1.close(); resolve(); }; channel.port2.postMessage(0); });
/** Rows graded per task: about 256k pixels, a few ms. */
const sliceRows = (width: number) => Math.max(1, Math.floor(262_144 / Math.max(1, width)));

/**
 * A graded copy of an artwork, prepared off the frame. Grading in the paint
 * call decoded the image, read a GPU canvas back and walked every pixel in
 * one frame (87–125 ms long tasks when the projection zone swapped in, Task
 * 6b trace). Here the sources are decoded off the main thread
 * (createImageBitmap), drawn into a CPU-backed canvas, and `grade` adjusts
 * one band of rows per task. Until it is done this returns undefined, as an
 * artwork does until it is decoded.
 */
function gradedSurface(slot: Graded, urls: string[],
  compose: (c: CanvasRenderingContext2D, layers: CanvasImageSource[], canvas: HTMLCanvasElement) => void,
  grade: (pixels: Uint8ClampedArray) => void) {
  if (slot.surface) return slot.surface;
  if (slot.pending || typeof document === "undefined" || typeof Image === "undefined") return undefined;
  slot.pending = true;
  slot.done = (async () => {
    // Never inside a paint frame: wait for the decoded images, then one step
    // per task. Bitmaps come from the streamer's bytes (a worker decodes a
    // Blob); an HTMLImageElement source would decode on the main thread.
    const sources = await Promise.all(urls.map(artworkReady));
    const first = sources[0];
    if (!first || sources.some(source => !source)) return; // never decoded: the painter keeps drawing without it
    // Shared bitmaps (decoded on a worker); the decoded image when there are no bytes.
    // Compose-only layers are not kept: closed once the surface is built (or fails).
    const temporary: ImageBitmap[] = [];
    try {
      const layers: CanvasImageSource[] = await Promise.all(urls.map(async (url, i) => {
        if (DRAWN.has(url)) return (await artworkBitmap(url)) ?? sources[i]!;
        const bitmap = await makeBitmap(url);
        if (bitmap) temporary.push(bitmap);
        return bitmap ?? sources[i]!;
      }));
      await yieldTask();
      const canvas = document.createElement("canvas"); ({ w: canvas.width, h: canvas.height } = sizeOf(layers[0]));
      const c = canvas.getContext("2d", { willReadFrequently: true });
      if (!c) { slot.surface = first; return; }
      compose(c, layers, canvas);
      const rows = sliceRows(canvas.width);
      for (let y = 0; y < canvas.height; y += rows) {
        await yieldTask();
        const band = c.getImageData(0, y, canvas.width, Math.min(rows, canvas.height - y));
        grade(band.data);
        c.putImageData(band, 0, y);
      }
      slot.surface = canvas;
    } finally { temporary.forEach(bitmap => bitmap.close()); }
  })().catch(() => { slot.surface = decodedFirst(urls[0]); });
  return undefined;
}
const decodedFirst = (url: string) => { const image = images.get(url); return image && decodedImages.has(image) ? image : undefined; };

const backdropSurface: Graded = {};
function backdropArtwork(){
  return gradedSurface(backdropSurface, [PROJECTION_ART.backdrop], (c, [source]) => c.drawImage(source,0,0), pixels => {
    for(let i=0;i<pixels.length;i+=4){
      const luma=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)*.25;
      pixels[i]=pixels[i]*.75+luma;pixels[i+1]=pixels[i+1]*.75+luma;pixels[i+2]=pixels[i+2]*.75+luma;
    }
  });
}

/** Wide curved LED content with clear copy bands outside the central real model. */
export function projectionBackdrop(p: PaintCtx) {
  const c=p.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation="source-over";
  c.fillStyle="#1c2c3a";c.fillRect(0,0,p.w,p.h);c.scale(p.w/2560,p.h/1024);
  const source=backdropArtwork();
  if(source){
    const zoom=1.012,dx=3.2*Math.sin(phase(p.t)),dy=1.6*Math.cos(phase(p.t));
    c.globalCompositeOperation="screen";c.globalAlpha=.95;
    c.drawImage(source,-15+dx,-6+dy,2560*zoom,1024*zoom);
    c.globalCompositeOperation="screen";c.globalAlpha=.05;c.save();c.translate(2560,1024);c.rotate(Math.PI);
    c.drawImage(source,-15-dx,-6-dy,2560*zoom,1024*zoom);c.restore();
    c.globalAlpha=1;c.globalCompositeOperation="source-over";
  }
  const shade=c.createLinearGradient(0,0,2560,0);
  shade.addColorStop(0,"rgba(1,6,15,.32)");shade.addColorStop(.25,"rgba(1,6,15,.04)");
  shade.addColorStop(.72,"rgba(1,6,15,.02)");shade.addColorStop(1,"rgba(1,6,15,.28)");c.fillStyle=shade;c.fillRect(0,0,2560,1024);
  // The continuous curved rear LED carries fine, spaced type in its outer bands;
  // the centre remains image content behind the independent crystal geometry.
  ["FROM","IMAGINATION","TO IMMERSION"].forEach((body,i)=>text(c,body,620,200+i*80,56,"#e9eff5",300,3.5));
  line(c,620,473,686,473,"#d8e7f0",2);
  ["PROJECTION MAPPING","REAL SPACES","REAL EMOTIONS"].forEach((body,i)=>text(c,body,2160,420+i*55,28,"#e5edf5",400,1.2));
  line(c,2160,623,2241,623,"#d8e7f0",2);c.restore();
}

/** Content for actual circular/elliptical overhead surfaces, with no painted rim. */
export function projectionCeiling(p: PaintCtx) {
  start(p, c => {
    const source = drawable(PROJECTION_ART.cosmic); if (!source) return;
    c.fillStyle = "#01070d"; c.fillRect(0, 0, W, H);
    c.save(); c.translate(W / 2, H / 2); c.rotate(.012 * Math.sin(phase(p.t)));
    const dx=9*Math.sin(phase(p.t)),dy=6*Math.cos(phase(p.t));
    c.drawImage(source,-W*.515+dx,-H*.515+dy,W*1.03,H*1.03);
    c.restore();
    for (let i = 0; i < 320; i++) {
      const x = fract(i * .61803398875 + .013) * W, y = fract(i * .41421356237 + .277) * H;
      const alpha = .10 + .22 * (.5 + .5 * Math.sin(phase(p.t) + i * 2.4));
      c.fillStyle = i % 7 === 0 ? `rgba(233,204,130,${alpha.toFixed(4)})` : `rgba(153,226,221,${alpha.toFixed(4)})`;
      const radius = i % 23 === 0 ? 1.55 : .65; c.beginPath(); c.arc(x, y, radius, 0, TAU); c.fill();
    }
  });
}

function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color = "#e5eff7", weight = 400,tracking=1.2) {
  c.font = `${weight} ${size}px "Segoe UI", Arial, sans-serif`;
  c.textAlign = "left"; c.textBaseline = "top"; c.letterSpacing = `${tracking}px`;
  c.fillStyle = color; c.fillText(value, x, y);
}

function line(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 1) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}

/** A functional-looking, sharp show-control UI for the real inclined touchscreens. */
export function projectionKiosk(p: PaintCtx) {
  start(p, c => {
    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0b1824"); bg.addColorStop(1, "#02070e"); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    text(c, "LIVEGRID AV", 62, 48, 35, "#f0f9ff", 600);
    text(c, "PROJECTION DESIGN  /  SHOW CONTROL", 62, 105, 23, "#8eb5c9");
    text(c, "3 PROJECTORS ONLINE", 1440, 61, 21, "#58e2c2", 600);
    line(c, 60, 157, 1860, 157, "#31495b", 2);
    const hero = drawable(PROJECTION_ART.hero);
    c.fillStyle = "#000409"; c.fillRect(62, 196, 1118, 629);
    if (hero) c.drawImage(hero, 62, 196, 1118, 629);
    c.strokeStyle = "#497787"; c.lineWidth = 2; c.strokeRect(62, 196, 1118, 629);
    text(c, "CRYSTAL LIGHT SCULPTURE", 83, 776, 20, "#d9f4ff", 600);
    const rows = ["MODEL ALIGNMENT", "SURFACE BLEND", "LIGHT CALIBRATION", "SHOW TIMELINE"];
    rows.forEach((value, index) => {
      const y = 210 + index * 135;
      c.fillStyle = "#102334"; c.fillRect(1230, y, 624, 99);
      c.strokeStyle = "#305367"; c.lineWidth = 1; c.strokeRect(1230, y, 624, 99);
      text(c, `${String(index + 1).padStart(2, "0")}  ${value}`, 1257, y + 26, 25, "#dbeef7", 500);
      c.fillStyle = index === 3 ? "#67eac4" : "#5fb0cc";
      c.beginPath(); c.arc(1815, y + 48, 6, 0, TAU); c.fill();
    });
    text(c, "SYNCHRONIZED OUTPUT", 1233, 782, 22, "#5ab0b7");
    for (let i = 0; i < 3; i++) {
      c.fillStyle = "#193b4a"; c.fillRect(1233 + i * 208, 824, 189, 34);
      text(c, String(i + 1).padStart(2, "0"), 1313 + i * 208, 832, 17, "#9af2d9", 600);
    }
    line(c, 62, 901, 1854, 901, "#31495b", 2);
    const cursor = .5 + .3 * Math.sin(phase(p.t));
    c.fillStyle = "#173341"; c.fillRect(62, 945, 1410, 20);
    c.fillStyle = "#40b4bb"; c.fillRect(62, 945, 1410 * cursor, 20);
    text(c, "CRYSTALS / LIGHT & SPACE", 62, 993, 23, "#80a3b5");
    c.fillStyle = "#1c4948"; c.fillRect(1535, 932, 319, 98);
    text(c, "EXPLORE", 1615, 964, 29, "#ddfff3", 600);
  });
}

/**
 * Native-generated icy branching light for the genuine arch/stair sculpture.
 * The runtime registers this field to the current model's exact authored domain.
 * The bitmap is prepared by
 * prepare-native-artwork.cjs; no arch, stair or building is painted into this field.
 * Runtime work is one cached image draw with a bounded, exactly 24-second drift.
 */
export function projectionSculpture(p: PaintCtx) {
  const c = p.ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  c.fillStyle = "#eef1f3"; c.fillRect(0, 0, p.w, p.h);
  const source = drawable(PROJECTION_ART.sculpture);
  if (source) {
    const zoom = 1.025, dx = .007 * Math.sin(phase(p.t)), dy = .006 * Math.cos(phase(p.t));
    c.drawImage(source, p.w * ((1 - zoom) / 2 + dx), p.h * ((1 - zoom) / 2 + dy), p.w * zoom, p.h * zoom);
  }
  c.restore();
}

const crystalSurface: Graded = {};
function crystalArtwork() {
  return gradedSurface(crystalSurface, [PROJECTION_ART.crystal, PROJECTION_ART.sculpture], (c, [source, branching], canvas) => {
    c.drawImage(source,0,0);
    // The reference mixes sparse branching blue-white light with the denser
    // refracted field. Both are registered to the real model's shared domain.
    c.globalAlpha=.80;c.drawImage(branching,0,0,canvas.width,canvas.height);c.globalAlpha=1;
  }, pixels => {
    // Grade only blue troughs once. White vein cores and champagne light keep
    // their source values, making the existing fine branches read at a distance.
    for(let i=0;i<pixels.length;i+=4){
      const blue=Math.max(0,Math.min(1,(pixels[i+2]-pixels[i]-12)/120));
      const amount=.12*blue;
      pixels[i]*=1-amount*.92;pixels[i+1]*=1-amount*.85;pixels[i+2]*=1-amount*.60;
    }
  });
}

/** Blue, white and champagne light projected onto actual faceted crystal geometry. */
export function projectionCrystal(p: PaintCtx) {
  const c=p.ctx;c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation="source-over";
  c.fillStyle="#ecedf0";c.fillRect(0,0,p.w,p.h);
  const source=crystalArtwork();
  if(source){const zoom=1.018,dx=.004*Math.sin(phase(p.t)),dy=.003*Math.cos(phase(p.t));c.drawImage(source,p.w*((1-zoom)/2+dx),p.h*((1-zoom)/2+dy),p.w*zoom,p.h*zoom);}
  c.restore();
}

const PALACE_W = 2048, PALACE_H = 1024;
let palaceSurface: HTMLCanvasElement | undefined;

function pointedArch(c: CanvasRenderingContext2D, x: number, base: number, width: number, height: number) {
  const spring = base - height * .47, top = base - height;
  c.beginPath(); c.moveTo(x - width / 2, base); c.lineTo(x - width / 2, spring);
  c.bezierCurveTo(x - width / 2, top + height * .21, x - width * .18, top + height * .06, x, top);
  c.bezierCurveTo(x + width * .18, top + height * .06, x + width / 2, top + height * .21, x + width / 2, spring);
  c.lineTo(x + width / 2, base); c.closePath();
}

/** A geometry-independent rosette of luminous tessellation, not a palace silhouette. */
function rosette(c: CanvasRenderingContext2D, x: number, y: number, radius: number, count: number, color: string) {
  c.save(); c.translate(x, y); c.strokeStyle = color; c.lineWidth = 1.35;
  for (let i = 0; i < count; i++) {
    c.save(); c.rotate(i / count * TAU); c.beginPath(); c.moveTo(0, -radius);
    c.quadraticCurveTo(radius * .32, -radius * .27, 0, radius * .30);
    c.quadraticCurveTo(-radius * .32, -radius * .27, 0, -radius); c.stroke(); c.restore();
  }
  c.restore();
}

function palaceArtwork() {
  if (palaceSurface) return palaceSurface;
  if (typeof document === "undefined") return undefined;
  const canvas = document.createElement("canvas"); canvas.width = PALACE_W; canvas.height = PALACE_H;
  const c = canvas.getContext("2d"); if (!c) return undefined;
  c.fillStyle = "#070d20"; c.fillRect(0, 0, PALACE_W, PALACE_H);
  // Wide projections contain light texture everywhere, including physical returns and domes.
  const field = c.createLinearGradient(0, 0, 0, PALACE_H);
  field.addColorStop(0, "#b16c20"); field.addColorStop(.22, "#eab755"); field.addColorStop(.35, "#72552b");
  field.addColorStop(.50, "#0c2c78"); field.addColorStop(.82, "#12429b"); field.addColorStop(1, "#4c421f");
  c.fillStyle = field; c.fillRect(0, 0, PALACE_W, PALACE_H);
  // Fine multi-scale gilded vegetal tracery and cool faceted shards follow the light field.
  for (let row = 0; row < 17; row++) for (let col = 0; col < 37; col++) {
    const x = col * 58 + (row % 2) * 29, y = row * 66;
    const alpha = .18 + .12 * Math.sin(col * 3.14 + row * 1.8);
    rosette(c, x, y, 24 + 5 * Math.sin(col + row), 6, `rgba(250,220,128,${alpha.toFixed(3)})`);
  }
  for (let i = 0; i < 240; i++) {
    const x = ((i * 313.643) % PALACE_W), y = ((i * 89.831) % PALACE_H);
    c.strokeStyle = i % 4 ? "rgba(255,218,125,.22)" : "rgba(186,239,255,.33)"; c.lineWidth = .75;
    c.beginPath(); c.moveTo(x, y - 11); c.lineTo(x + 8, y); c.lineTo(x, y + 11); c.lineTo(x - 8, y); c.closePath(); c.stroke();
  }
  // Arched blue projected fields align to the actual model's portal and lateral bays.
  // Coordinates match the authored 11.70 m × 5.75 m projection domain exactly.
  const arches = [[1024, 984.82, 358.84, 530.72], [476.09, 984.82, 227.56, 411.38], [1571.91, 984.82, 227.56, 411.38], [131.28, 984.82, 136.53, 327.68], [1916.72, 984.82, 136.53, 327.68]];
  for (const [x, base, width, height] of arches) {
    c.save(); pointedArch(c, x, base, width, height); c.clip();
    const g = c.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
    g.addColorStop(0, "#2b92c6"); g.addColorStop(.15, "#164ea5"); g.addColorStop(.50, "#041a48");
    g.addColorStop(.85, "#164ea5"); g.addColorStop(1, "#2b92c6"); c.fillStyle = g; c.fillRect(x - width / 2, base - height, width, height);
    for (let row = 0; row < 9; row++) for (let col = -2; col <= 2; col++) {
      rosette(c, x + col * width * .20 + (row % 2) * width * .10, base - row * height / 9, width * .11, 8, "rgba(159,233,255,.75)");
    }
    c.strokeStyle = "#bbefff"; c.lineWidth = 2.4;
    for (let i = 0; i < 12; i++) {
      const yy = base - height + i * height / 11;
      c.beginPath(); c.moveTo(x, yy - 35); c.lineTo(x + width * .16, yy); c.lineTo(x, yy + 35); c.lineTo(x - width * .16, yy); c.closePath(); c.stroke();
    }
    c.restore();
    for (let ring = 0; ring < 4; ring++) {
      pointedArch(c, x, base, width + ring * 15, height + ring * 13);
      c.strokeStyle = ring % 2 ? "#fff0b7" : "#e2ab4c"; c.lineWidth = ring === 1 ? 5 : 2; c.stroke();
    }
  }
  // A crystalline light motif occupies the genuine recessed central gateway surface.
  // Its blue-white facets are show content; the portal depth comes from the palace mesh.
  c.save(); pointedArch(c, 1024, 984.82, 358.84, 530.72); c.clip();
  const glow = c.createRadialGradient(1024, 650, 8, 1024, 650, 250);
  glow.addColorStop(0, "rgba(160,239,255,.72)"); glow.addColorStop(.22, "rgba(27,173,244,.42)"); glow.addColorStop(1, "rgba(9,67,139,0)");
  c.fillStyle = glow; c.fillRect(805, 435, 438, 550);
  const crystal = [[1024, 496], [1104, 653], [1024, 810], [944, 653]];
  const facets = [[0, 1, [1024, 653]], [1, 2, [1024, 653]], [2, 3, [1024, 653]], [3, 0, [1024, 653]]] as const;
  for (let i = 0; i < facets.length; i++) {
    const [a, b, center] = facets[i], first = crystal[a], second = crystal[b];
    c.beginPath(); c.moveTo(first[0], first[1]); c.lineTo(second[0], second[1]); c.lineTo(center[0], center[1]); c.closePath();
    c.fillStyle = ["rgba(154,241,255,.72)", "rgba(50,141,248,.48)", "rgba(25,78,201,.55)", "rgba(98,210,255,.40)"][i]; c.fill();
    c.strokeStyle = "rgba(217,253,255,.97)"; c.lineWidth = 2; c.stroke();
  }
  for (let i = 0; i < 22; i++) {
    const angle = i / 22 * TAU, radius = 92 + (i % 5) * 22;
    const x = 1024 + Math.cos(angle) * radius, y = 653 + Math.sin(angle) * radius * 1.4;
    c.strokeStyle = "rgba(180,237,255,.66)"; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(1024 + Math.cos(angle) * 26, 653 + Math.sin(angle) * 38);
    c.lineTo(1024 + Math.cos(angle + .16) * radius * .50, 653 + Math.sin(angle + .16) * radius * .70);
    c.lineTo(x, y); c.stroke();
  }
  c.restore();
  // Cornice bands are aligned light cues; all silhouette, arches and ribs remain real mesh.
  for (const y of [317, 351, 905, 970, 1000]) {
    line(c, 0, y, PALACE_W, y, "#f5ce7a", y === 1000 ? 8 : 3);
    line(c, 0, y + 8, PALACE_W, y + 8, "#ac6b24", 2);
  }
  for (const x of [63, 202, 362, 590, 796, 1252, 1458, 1686, 1846, 1985]) {
    const g = c.createLinearGradient(x - 12, 0, x + 12, 0);
    g.addColorStop(0, "#6d491f"); g.addColorStop(.48, "#ffe4a1"); g.addColorStop(.58, "#fff4cf"); g.addColorStop(1, "#795220");
    c.fillStyle = g; c.fillRect(x - 12, 368, 24, 633);
  }
  // Fine gold crown lattices read as projected pattern when the true dome normals turn.
  for (const [x, y, radius] of [[1024, 166, 210], [476.09, 325.7, 125], [1571.91, 325.7, 125], [131.28, 442, 72], [1916.72, 442, 72]]) {
    rosette(c, x, y, radius, 16, "rgba(255,236,176,.86)");
    rosette(c, x, y, radius * .66, 12, "rgba(120,209,252,.58)");
  }
  palaceSurface = canvas; return canvas;
}

/**
 * A native decorative light field projected over the actual 3D palace.
 * Front projection domain: x = -5.85..5.85 m, y = 1.65..7.40 m.
 * This contains luminous filigree, not photographic architectural geometry.
 */
export function projectionPalace(p: PaintCtx) {
  const c = p.ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.fillStyle = "#020716"; c.fillRect(0, 0, p.w, p.h);
  const source = palaceArtwork(); if (source) c.drawImage(source, 0, 0, p.w, p.h);
  const shimmer = .015 + .012 * Math.sin(phase(p.t));
  c.globalCompositeOperation = "screen"; c.fillStyle = `rgba(78,151,240,${shimmer.toFixed(5)})`; c.fillRect(0, 0, p.w, p.h);
  // Sparse small sparkles use periodic trigonometry; first and final frames are identical.
  for (let i = 0; i < 36; i++) {
    const x = (((i * .61803398875) % 1) * .96 + .02) * p.w;
    const y = (((i * .41421356237) % 1) * .90 + .05) * p.h;
    const a = .12 + .17 * (.5 + .5 * Math.sin(phase(p.t) + i * 2.64));
    c.fillStyle = `rgba(214,244,255,${a.toFixed(4)})`; c.fillRect(x, y, p.w / 900, p.h / 450);
  }
  c.restore();
}

export const PROJECTION_PAINTERS = {
  projectionApplications, projectionHero, projectionBackdrop, projectionCeiling, projectionKiosk, projectionPalace, projectionSculpture,projectionCrystal,
} as const satisfies Record<string, (p: PaintCtx) => void>;

export const PROJECTION_CANVAS_SPECS = {
  projectionApplications: { width: 1024, height: 576, fps: 4 },
  projectionHero: { width: 1536, height: 864, fps: 4 },
  projectionBackdrop: { width: 2560, height: 1024, fps: 4 },
  projectionCeiling: { width: 1024, height: 1024, fps: 4 },
  projectionKiosk: { width: 1024, height: 640, fps: 4 },
  projectionPalace: { width: 2048, height: 1024, fps: 8 },
  projectionSculpture: { width: 2048, height: 1536, fps: 8 },
  projectionCrystal: { width: 2048, height: 1536, fps: 8 },
} as const;
