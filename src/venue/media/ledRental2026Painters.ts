import { DefaultLoadingManager } from "three";
import type { PaintCtx } from "./painters";
import { drawSignalGrid, drawWordmark } from "./brandMarks";
import { prefetchedImage } from "../loading/prefetched";

/** Isolated content for the October 18 rental pavilion's actual LED surfaces. */
export const LED_RENTAL_2026_ART = {
  backdrop: "/media/led-rental-2026/backdrop.webp?v=68d0a67aa2eaa0f4",
  flat: "/media/led-rental-2026/flat.webp?v=6a9d230272054b8e",
  curved: "/media/led-rental-2026/curved.webp?v=3c59351ff6471869",
  cylinder: "/media/led-rental-2026/cylinder.webp?v=314410fc482e2920",
  corner: "/media/led-rental-2026/corner.webp?v=1c89435e62d7e14b",
  sphere: "/media/led-rental-2026/sphere.webp?v=6916f50bb17795c8",
  application0: "/media/led-rental-2026/application-0.webp?v=635220ec30407b90",
  application1: "/media/led-rental-2026/application-1.webp?v=75b5956ecfe82db3",
  application2: "/media/led-rental-2026/application-2.webp?v=34f39038d2561d05",
  application3: "/media/led-rental-2026/application-3.webp?v=0d6e4eb9db422f0d",
} as const;

const images = new Map<string, HTMLImageElement>();
const decoded = new WeakSet<HTMLImageElement>();
const W = 1920, H = 1080, TAU = Math.PI * 2;
const phase = (t: number) => (((t % 24) + 24) % 24) / 24 * TAU;

function artwork(url: string) {
  if (typeof Image === "undefined") return undefined;
  let image = images.get(url);
  // The streamer may already hold this file decoded (load group prefetch).
  const ready = image ? undefined : prefetchedImage(url);
  if (ready) { images.set(url, ready); decoded.add(ready); return ready; }
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    images.set(url, image);
    DefaultLoadingManager.itemStart(url);
    image.src = url;
    const request = image;
    void request.decode().then(() => decoded.add(request)).catch(() => {
      DefaultLoadingManager.itemError(url);
    }).finally(() => DefaultLoadingManager.itemEnd(url));
  }
  return decoded.has(image) && image.complete && image.naturalWidth > 0 ? image : undefined;
}

/** Called by the pavilion before entry; image decoding shares the model loader barrier. */
export function preloadLedRental2026Artwork() {
  for (const url of Object.values(LED_RENTAL_2026_ART)) artwork(url);
}

function start(p: PaintCtx, draw: (c: CanvasRenderingContext2D) => void, background = "#02091b") {
  const c = p.ctx;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  c.fillStyle = background;
  c.fillRect(0, 0, p.w, p.h);
  c.scale(p.w / W, p.h / H);
  draw(c);
  c.restore();
}

function fullArtwork(p: PaintCtx, url: string) {
  start(p, c => {
    const image = artwork(url);
    if (image) c.drawImage(image, 0, 0, W, H);
  });
}

function family() {
  if (typeof document === "undefined") return 'Arial, "Segoe UI", sans-serif';
  const font = getComputedStyle(document.documentElement).getPropertyValue("--font-space-grotesk").trim();
  return font ? `${font}, Arial, sans-serif` : 'Arial, "Segoe UI", sans-serif';
}

function brand(c: CanvasRenderingContext2D, y: number) {
  const fontSize = 76, emblemSize = 100, gap = 25;
  c.font = `600 ${fontSize}px ${family()}`;
  c.letterSpacing = "-2px";
  const width = c.measureText("livegridAV").width;
  const x = (W - width - emblemSize - gap) / 2;
  drawSignalGrid(c, x, y, emblemSize);
  drawWordmark(c, x + emblemSize + gap, y + emblemSize / 2, fontSize);
  c.letterSpacing = "0px";
}

/** Mountain lake with a higher horizon, fine stars and sharp reference wording. */
export function rental2026Backdrop(p: PaintCtx) {
  start(p, c => {
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#023974"); sky.addColorStop(.65, "#1160ac"); sky.addColorStop(1, "#081529");
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    const image = artwork(LED_RENTAL_2026_ART.backdrop);
    if (image) {
      // Extend the clean source's top edge; the higher reference horizon must
      // not introduce a flat colour band across the LED's upper sky.
      c.save(); c.translate(0, H * .135); c.scale(1, -1);
      c.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight * .135, 0, 0, W, H * .135 + 1);
      c.restore();
      c.drawImage(image, 0, H * .135, W, H);
    }
    const veil = c.createLinearGradient(0, 0, 0, H * .62);
    veil.addColorStop(0, "rgba(0,24,70,.16)"); veil.addColorStop(1, "rgba(0,30,80,0)");
    c.fillStyle = veil; c.fillRect(0, 0, W, H * .62);
    // Fixed star positions never shimmer or drift relative to the geometry.
    for (let i = 0; i < 580; i++) {
      const x = ((i * 123.47 + i * i * 7.91) % 1900) + 10;
      const y = ((i * 73.91 + i * i * 1.37) % 540) + 4;
      if (y > 350 && (x < 400 || x > 1580)) continue;
      c.globalAlpha = .16 + (i % 7) * .055;
      c.fillStyle = i % 4 ? "#b9e9ff" : "#fff6e0";
      const radius = i % 31 === 0 ? 1.7 : .65;
      c.fillRect(x, y, radius, radius);
    }
    c.globalAlpha = 1;
    // Layout is authored for this 10.6 × 7.5m opening. Keep vector lettering
    // proportionate on the taller physical screen while media fills it.
    const letterAspect = (10.6 / 7.5) / (W / H);
    c.save(); c.translate(0, H * .215); c.scale(1, letterAspect);
    brand(c, 0); c.restore();
    c.fillStyle = "#fbfdff"; c.textAlign = "center"; c.textBaseline = "top";
    c.font = `500 66px ${family()}`; c.letterSpacing = "10px";
    for (const [copy, y] of [["SPACES CHANGE.", H * .395], ["POSSIBILITIES DON'T.", H * .485]] as const) {
      c.save(); c.translate(W / 2, y); c.scale(1, letterAspect); c.fillText(copy, 0, 0); c.restore();
    }
    c.letterSpacing = "0px";
  });
}

export function rental2026Flat(p: PaintCtx) { fullArtwork(p, LED_RENTAL_2026_ART.flat); }
export function rental2026Curved(p: PaintCtx) { fullArtwork(p, LED_RENTAL_2026_ART.curved); }
export function rental2026Corner(p: PaintCtx) { fullArtwork(p, LED_RENTAL_2026_ART.corner); }

/** Two mirrored copies close the cylinder's full 360-degree seam. */
export function rental2026Cylinder(p: PaintCtx) {
  start(p, c => {
    const image = artwork(LED_RENTAL_2026_ART.cylinder);
    if (!image) return;
    c.drawImage(image, 0, 0, W / 2, H);
    c.save(); c.translate(W, 0); c.scale(-1, 1);
    c.drawImage(image, 0, 0, W / 2, H); c.restore();
  });
}

/** Black gaps are the transparency mask; only the white diode mesh emits. */
export function rental2026Transparent(p: PaintCtx) {
  start(p, c => {
    const cols = 76, rows = 76, dx = W / cols, dy = H / rows;
    c.lineWidth = .8; c.strokeStyle = "rgba(181,195,210,.2)"; c.beginPath();
    for (let i = 0; i <= cols; i++) { c.moveTo(i * dx, 0); c.lineTo(i * dx, H); }
    for (let i = 0; i <= rows; i++) { c.moveTo(0, i * dy); c.lineTo(W, i * dy); }
    c.stroke(); c.fillStyle = "#c6d3df";
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      c.fillRect((x + .32) * dx, (y + .32) * dy, dx * .36, dy * .36);
    }
  }, "#000000");
}

/** Electric cyan, blue and pink parallel filaments on the real rotating ribbon. */
export function rental2026Dna(p: PaintCtx) {
  start(p, c => {
    const t = phase(p.t), g = c.createLinearGradient(0, H, W, 0);
    g.addColorStop(0, "#001758"); g.addColorStop(.24, "#005bfa");
    g.addColorStop(.47, "#172bd5"); g.addColorStop(.70, "#ca0099"); g.addColorStop(1, "#fa209d");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // These bands remain distinct after minification onto a small LED module;
    // dense white filaments averaged into a pale wash on the actual model.
    for (let i = -18; i < 45; i++) {
      const x = i * 88 + Math.sin(t) * 14;
      c.lineWidth = i % 3 ? 31 : 45;
      c.strokeStyle = "rgba(0,5,68,.86)";
      c.beginPath(); c.moveTo(x - 170, H + 80); c.lineTo(x + 1080, -80); c.stroke();
      c.lineWidth = i % 4 ? 8 : 15;
      c.strokeStyle = i % 5 < 3 ? "#12d5ff" : "#fb39cb";
      c.beginPath(); c.moveTo(x - 184, H + 80); c.lineTo(x + 1066, -80); c.stroke();
      c.lineWidth = 2.2; c.strokeStyle = "rgba(140,246,255,.82)";
      c.beginPath(); c.moveTo(x - 189, H + 80); c.lineTo(x + 1061, -80); c.stroke();
    }
  });
}

let globeImage: HTMLCanvasElement | undefined;

/** Great-circle routes are unwrapped before painting, including the map seam. */
function globeRoutes(c: CanvasRenderingContext2D, width: number, height: number) {
  const hubs = [
    [-74,40.7], [-.12,51.5], [77.2,28.6], [103.8,1.3],
    [139.7,35.7], [151.2,-33.9], [-118.2,34.1], [-46.6,-23.6],
  ];
  const vector = ([lon, lat]: number[]) => {
    const a=lon*Math.PI/180,b=lat*Math.PI/180;
    return [Math.cos(b)*Math.cos(a),Math.sin(b),Math.cos(b)*Math.sin(a)];
  };
  const edges = [[0,1],[1,2],[2,3],[3,4],[3,5],[6,4],[0,7]];
  for (const [a,b] of edges) {
    const v=vector(hubs[a]),w=vector(hubs[b]);
    const omega=Math.acos(Math.min(1,Math.max(-1,v.reduce((sum,n,i)=>sum+n*w[i],0))));
    const points: number[][]=[];
    for(let i=0;i<=80;i++) {
      const t=i/80,sa=Math.sin((1-t)*omega)/Math.sin(omega),sb=Math.sin(t*omega)/Math.sin(omega);
      const xyz=v.map((n,j)=>n*sa+w[j]*sb);
      let x=(Math.atan2(xyz[2],xyz[0])/TAU+.5)*width;
      const y=(.5-Math.asin(Math.min(1,Math.max(-1,xyz[1])))/Math.PI)*height;
      if(points.length) {
        const previous=points[points.length-1][0];
        while(x-previous>width/2)x-=width;
        while(previous-x>width/2)x+=width;
      }
      points.push([x,y]);
    }
    for(const offset of [-width,0,width]) {
      for(const [lineWidth,colour] of [[24,"rgba(3,145,255,.18)"],[10,"rgba(55,208,255,.45)"],[4,"rgba(222,253,255,.95)"]] as const) {
        c.lineWidth=lineWidth;c.strokeStyle=colour;c.beginPath();
        points.forEach(([x,y],i)=>i?c.lineTo(x+offset,y):c.moveTo(x+offset,y));c.stroke();
      }
    }
  }
  for(const [lon,lat] of hubs) {
    const x=(lon/360+.5)*width,y=(.5-lat/180)*height;
    const glow=c.createRadialGradient(x,y,0,x,y,15);
    glow.addColorStop(0,"rgba(255,250,217,.95)");glow.addColorStop(.18,"rgba(167,247,255,.9)");glow.addColorStop(1,"rgba(0,130,255,0)");
    c.fillStyle=glow;c.fillRect(x-15,y-15,30,30);
  }
}

export function rental2026Sphere(p: PaintCtx) {
  start(p, c => {
    const image = artwork(LED_RENTAL_2026_ART.sphere);
    if (!image) return;
    if (!globeImage) {
      globeImage = document.createElement("canvas"); globeImage.width = 2048; globeImage.height = 1024;
      const g = globeImage.getContext("2d")!; g.drawImage(image, 0, 0, 2048, 1024);
      // Preserve the approved NASA map's coastlines, terrain, ice and cloud
      // detail. Thresholding land into flat green polygons erased those details
      // and produced thick false coastal borders on the miniature sphere.
      g.save();g.globalCompositeOperation="screen";
      g.fillStyle="rgba(0,44,112,.18)";g.fillRect(0,0,2048,1024);g.restore();
      g.strokeStyle="rgba(120,203,255,.12)";g.lineWidth=1;
      for(let x=0;x<2048;x+=2048/24){g.beginPath();g.moveTo(x,0);g.lineTo(x,1024);g.stroke();}
      for(let y=0;y<1024;y+=1024/12){g.beginPath();g.moveTo(0,y);g.lineTo(2048,y);g.stroke();}
      globeRoutes(g,2048,1024);
    }
    c.drawImage(globeImage, 0, 0, W, H);
  });
}

/** Corporate events, live experiences, brand activations, retail / showrooms. */
export function rental2026Applications(p: PaintCtx) {
  const urls = [LED_RENTAL_2026_ART.application0, LED_RENTAL_2026_ART.application1,
    LED_RENTAL_2026_ART.application2, LED_RENTAL_2026_ART.application3];
  fullArtwork(p, urls[Math.max(0, Math.min(3, Math.round(p.variant)))]);
}

export const LED_RENTAL_2026_PAINTERS = {
  rental2026Backdrop, rental2026Flat, rental2026Curved, rental2026Cylinder,
  rental2026Corner, rental2026Transparent, rental2026Dna, rental2026Sphere,
  rental2026Applications,
} as const satisfies Record<string, (p: PaintCtx) => void>;
