import type { PaintCtx } from "./painters";

/** Independent screen content for the technical showcase, never a room plate. */
export const TECHNICAL_STAGE_SOURCE = "/media/final/technical-control.png";

type Crop = readonly [number, number, number, number];
const PGM: Crop = [1398, 150, 245, 172];
const CAMERAS: readonly Crop[] = [
  [1153, 151, 116, 80], [1277, 151, 114, 80],
  [1153, 262, 116, 80], [1277, 262, 114, 80],
  [1153, 373, 116, 81], [1277, 373, 114, 81],
  [1400, 373, 117, 81], [1525, 373, 117, 81],
];
const W = 1920, H = 1080;
const C = { bg: "#05070a", panel: "#10141b", line: "#3c4652", dim: "#929ca9", white: "#f3f5f8", blue: "#77bcf2" };
const SANS = 'Arial, "Segoe UI", sans-serif';
const MONO = 'Consolas, "Courier New", monospace';
const CUES = ["Show Open", "Intro Video", "Stage Wash", "LED Content", "Camera Preset", "Speaker Track", "Ambient Look", "Reveal", "Pyro Trigger", "End Cue"];
const CUE_COLORS = ["#7cdcb0", "#7cdcb0", "#b09ce8", "#a8bcea", "#b4a2e5", "#85d9ad", "#78c8ed", "#e5ae85", "#df9d87", "#83d6b0"];

let source: HTMLImageElement | undefined;
/** Optional prewarm; otherwise the first painter call starts the shared load. */
export function preloadTechnicalArtwork() {
  if (source || typeof Image === "undefined") return;
  source = new Image();
  source.decoding = "async";
  source.crossOrigin = "anonymous";
  source.src = TECHNICAL_STAGE_SOURCE;
  void source.decode().catch(() => { /* Vector content remains a usable fallback. */ });
}
function artwork() {
  preloadTechnicalArtwork();
  return source?.complete && source.naturalWidth > 0 ? source : undefined;
}
function phase(t: number) { return ((t % 24) + 24) % 24 / 24 * Math.PI * 2; }
function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size = 24, color = C.white, mono = false, weight = 400) {
  c.fillStyle = color; c.font = `${weight} ${size}px ${mono ? MONO : SANS}`;
  c.textBaseline = "top"; c.textAlign = "left"; c.letterSpacing = "0px";
  c.fillText(s, x, y);
}
function line(c: CanvasRenderingContext2D, x: number, y: number, x2: number, y2: number, color = C.line, width = 2) {
  c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
}
function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = C.panel, stroke?: string) {
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, h - 2); }
}
function start(p: PaintCtx, draw: (c: CanvasRenderingContext2D) => void) {
  const c = p.ctx;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  c.fillStyle = C.bg; c.fillRect(0, 0, p.w, p.h);
  c.scale(p.w / W, p.h / H);
  draw(c); c.restore();
}
function timecode(t: number) {
  const frames = Math.max(0, Math.floor(t * 25)) + ((10 * 3600 + 24 * 60 + 17) * 25 + 12);
  const parts = [Math.floor(frames / 90000) % 24, Math.floor(frames / 1500) % 60, Math.floor(frames / 25) % 60, frames % 25];
  return parts.map(n => String(n).padStart(2, "0")).join(":");
}
function imageCrop(c: CanvasRenderingContext2D, crop: Crop, x: number, y: number, w: number, h: number, zoom = 1) {
  const img = artwork();
  if (!img) return false;
  const [sx, sy, sw, sh] = crop;
  const fit = Math.max(w / sw, h / sh) * zoom;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.drawImage(img, sx, sy, sw, sh, x + (w - sw * fit) / 2, y + (h - sh * fit) / 2, sw * fit, sh * fit);
  c.restore(); return true;
}
function vectorStage(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  rect(c, x, y, w, h, "#071122");
  const ph = phase(t);
  for (let i = 0; i < 9; i++) {
    const a = x + w * (.08 + i * .105), b = x + w * (.5 + Math.sin(i * .8 + ph) * .48);
    const glow = c.createLinearGradient(a, y, b, y + h * .8);
    glow.addColorStop(0, "rgba(195,222,255,.82)"); glow.addColorStop(1, "rgba(66,127,245,0)");
    c.fillStyle = glow; c.beginPath(); c.moveTo(a, y); c.lineTo(b - w * .055, y + h * .82); c.lineTo(b + w * .055, y + h * .82); c.closePath(); c.fill();
  }
  rect(c, x, y + h * .78, w, h * .22, "#03060c");
  c.fillStyle = "#03050a";
  for (let i = 0; i < 30; i++) { const cx = x + w * (i + .5) / 30, cy = y + h * (.80 + .04 * Math.sin(i * 1.7)); c.beginPath(); c.arc(cx, cy, w * .012, 0, Math.PI * 2); c.fill(); c.fillRect(cx - w * .012, cy, w * .024, h * .20); }
  const cx = x + w * .51, cy = y + h * .45;
  c.beginPath(); c.arc(cx, cy, h * .037, 0, Math.PI * 2); c.fill(); c.fillRect(cx - w * .02, cy + h * .03, w * .04, h * .19);
  line(c, cx, cy + h * .10, cx + w * .13, cy - h * .08, "#02040a", Math.max(3, w * .015));
}
function feed(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, cam = -1, tally?: string) {
  const crop = cam < 0 ? PGM : CAMERAS[cam % CAMERAS.length];
  if (!imageCrop(c, crop, x, y, w, h)) vectorStage(c, x, y, w, h, t);
  if (cam >= 0) {
    rect(c, x, y + h - 30, w, 30, "rgba(2,4,8,.86)");
    text(c, `CAM ${cam + 1}`, x + 8, y + h - 24, 18, C.white, true);
  }
  c.strokeStyle = tally ?? "#596673"; c.lineWidth = tally ? 4 : 2; c.strokeRect(x + 1, y + 1, w - 2, h - 2);
}
function header(c: CanvasRenderingContext2D, title: string, right: string) {
  text(c, title, 30, 21, 29, C.white, false, 600);
  text(c, right, 1430, 25, 20, C.dim, true); line(c, 28, 67, 1892, 67);
}
function meters(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, count: number, t: number, labels = true) {
  const ph = phase(t), gap = w / count;
  for (let i = 0; i < count; i++) {
    const bx = x + gap * (i + .27), bw = gap * .42;
    const value = .39 + .22 * Math.sin(ph * (i % 3 + 1) + i * 1.9) + .11 * Math.cos(ph * 5 + i * .9);
    rect(c, bx, y, bw, h, "#121b22", "#3a4650");
    const cells = 32;
    for (let k = 0; k < cells; k++) {
      const on = k / cells < value;
      rect(c, bx + 3, y + h - (k + 1) * h / cells + 2, bw - 6, h / cells - 3, on ? k > 28 ? "#e56e69" : k > 23 ? "#e9d576" : "#78d99a" : "#1b292b");
    }
    const peak = Math.min(.96, value + .1);
    rect(c, bx + 3, y + h * (1 - peak), bw - 6, 3, "#f0e3a8");
    if (labels) text(c, String(i + 1).padStart(2, "0"), bx - 2, y + h + 12, 19, C.dim, true);
  }
}

/** White engineering linework, actual stage diagram crop, dimensions and views. */
export function technicalEngineering(p: PaintCtx) {
  start(p, c => {
    header(c, "STAGE SYSTEM / ENGINEERING", "PROJECT LG-01   REV 04");
    const img = artwork();
    if (img) c.drawImage(img, 21, 174, 658, 550, 28, 82, 1480, 808);
    else {
      const project = (x: number, y: number, z: number) => [740 + x * 32 - z * 25, 680 + x * 10 + z * 13 - y * 40];
      const box = (x: number, y: number, z: number, a: number, b: number, d: number) => {
        const pts = [[x,y,z],[x+a,y,z],[x+a,y,z+d],[x,y,z+d],[x,y+b,z],[x+a,y+b,z],[x+a,y+b,z+d],[x,y+b,z+d]].map(v => project(v[0],v[1],v[2]));
        for (const [i,j] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]) line(c,pts[i][0],pts[i][1],pts[j][0],pts[j][1],"#c4d1df",2);
      };
      box(-10,0,-7,20,.7,14); box(-8,.7,-5,16,1,7); box(-9,1.7,-5,.3,10,.3); box(8.7,1.7,-5,.3,10,.3); box(-9,11.7,-5,18,.4,9); box(-6,2,-4.9,12,6,.15);
    }
    rect(c, 1520, 84, 370, 270, "#080d14", "#4a5867");
    if (img) c.drawImage(img, 551, 179, 120, 97, 1534, 105, 342, 220);
    text(c, "ISOMETRIC / RIGGING", 1542, 329, 18, C.dim, true);
    text(c, "SYSTEM LAYERS", 1533, 391, 23, C.white, true);
    ["TRUSS", "MOVING LIGHT", "LED SURFACE", "LINE ARRAY", "STAGE DECK", "CAMERA", "SIGNAL PATH", "SAFETY ZONE"].forEach((s,i) => {
      c.strokeStyle = i === 2 ? C.blue : "#a0adba"; c.lineWidth = 2; c.strokeRect(1535, 441 + i * 45, 19, 19);
      text(c, s, 1570, 439 + i * 45, 20, i === 2 ? C.blue : C.dim, true);
    });
    line(c, 54, 903, 1478, 903, "#718599"); line(c, 54, 892, 54, 915, "#718599"); line(c, 1478, 892, 1478, 915, "#718599");
    text(c, "36.0 m / OVERALL STAGE WIDTH", 594, 915, 21, C.white, true);
    const views = ["FRONT", "SIDE L", "SIDE R", "TOP"];
    views.forEach((s,i) => { const x = 30 + i * 369; rect(c,x,955,353,101,"#0b1119","#405160"); if(img) c.drawImage(img,33+i*158,753,151,132,x+8,977,337,72); text(c,s,x+10,960,16,C.white,true); });
    text(c, "DESIGN  |  INTEGRATE  |  DELIVER", 1526, 970, 19, C.dim, true);
    text(c, "DRAWING STATUS: SHOW READY", 1526, 1009, 17, C.blue, true);
  });
}

/** Reference cue stack: ten fixed rows, restrained category colours and GO tile. */
export function technicalShowControl(p: PaintCtx) {
  start(p, c => {
    header(c, "CUES / TIMELINE / AUTOMATION", "MAIN STAGE    PLAYBACK A");
    const active = Math.floor((((p.t % 24) + 24) % 24) / 4) + 1;
    text(c,"CUE",38,91,22,C.dim,true); text(c,"DESCRIPTION",156,91,22,C.dim,true); text(c,"DURATION",772,91,22,C.dim,true); text(c,"TIMELINE",1045,91,22,C.dim,true);
    CUES.forEach((s,i) => {
      const y = 139 + i * 71;
      rect(c,29,y,1296,65,i === active ? "#1c2c3a" : i % 2 ? "#0d1117" : "#080c12");
      text(c,String(i+1).padStart(2,"0"),47,y+17,27,C.white,true);
      text(c,s,155,y+16,29,C.white);
      text(c,`00:${String(12+(i*7)%45).padStart(2,"0")}`,780,y+20,22,C.dim,true);
      const bw = Math.min(320,150 + ((i * 113 + 71) % 290));
      rect(c,955,y+19,335,25,"#232c36"); rect(c,955,y+19,bw,25,CUE_COLORS[i]);
      line(c,1295,y,1295,y+65,"#3a424c",1);
    });
    rect(c,1350,89,539,192,"#151c24","#697582");
    text(c,"GO",1380,105,109,C.white); text(c,"NEXT CUE READY",1592,131,21,C.dim,true);
    rect(c,1350,295,539,87,"#111821","#4d5b68"); text(c,timecode(p.t),1380,311,44,C.white,true);
    feed(c,1350,400,539,354,p.t,-1,"#788b9f");
    text(c,"PROGRAM PREVIEW",1364,765,21,C.dim,true);
    rect(c,1350,809,539,55,"#111a21"); text(c,"SYNC",1365,823,19,C.dim,true); text(c,"LOCKED  /  25 FPS",1480,823,21,"#8edab1",true);
    rect(c,29,880,1296,170,"#090d12","#39434e"); text(c,"MASTER TIMELINE",44,892,20,C.dim,true);
    const trackNames=["LIGHTING","VIDEO","AUDIO","CAMERA","AUTOMATION"];
    trackNames.forEach((s,i)=>{ const y=925+i*23; text(c,s,46,y,16,C.dim,true); rect(c,225,y+2,1066,14,"#1b252e"); for(let j=0;j<4;j++) rect(c,225+j*267+((i*39)%85),y+2,110+((i+j)*37)%130,14,["#7f9dce","#a198cf","#83b293","#b8ac8b","#8e9cab"][i]); });
    const play = 225 + (((p.t % 24) + 24) % 24) / 24 * 1066; line(c,play,919,play,1048,"#e6edf4",3);
    text(c,"OUTPUT",1355,905,19,C.dim,true); text(c,"A / B",1680,905,19,C.white,true);
    text(c,"SYSTEM HEALTH",1355,948,19,C.dim,true); text(c,"NOMINAL",1650,948,19,"#8edab1",true);
    text(c,"AUTO-FOLLOW ENABLED",1355,1000,18,C.dim,true);
  });
}

/** Blue camera multiview plus a dedicated status strip and audio mixer. */
export function technicalLiveProduction(p: PaintCtx) {
  start(p, c => {
    header(c,"LIVE CAMERAS / PROGRAM","1080p50   SDI / IP");
    // The reference has two hero program feeds above a smaller camera grid.
    // Keep the audio mixer in its own narrow lower-right strip, rather than
    // replacing the camera grid with a full-width bank of meters.
    feed(c,30,91,235,213,p.t,0);
    feed(c,30,319,235,213,p.t,4);
    feed(c,279,91,554,441,p.t,-1,"#d9e1eb");
    rect(c,279,496,554,36,"rgba(2,4,8,.88)"); text(c,"CAM 1 / STAGE",290,504,22,C.white,true);
    feed(c,847,91,563,441,p.t,2,"#d9e1eb");
    for(let i=0;i<6;i++) {
      const x=30+(i%3)*328, y=554+Math.floor(i/3)*250;
      feed(c,x,y,314,236,p.t,i+2);
    }
    rect(c,1435,91,454,949,"#0d1219","#536373");
    rect(c,1463,117,395,88,"#7e2027","#dd7275"); text(c,"ON AIR",1491,126,65,"#fff5f2",false,600);
    ["STAGE","SCREENS","STREAM","AUDIENCE","EVERYWHERE"].forEach((s,i)=>text(c,s,1476,248+i*58,29,C.white));
    line(c,1463,562,1856,562); text(c,"PGM",1471,586,22,C.dim,true); text(c,timecode(p.t),1470,628,33,C.white,true);
    text(c,"VIDEO",1470,714,20,C.dim,true); text(c,"LOCKED",1674,714,22,"#8bd9ae",true);
    text(c,"AUDIO",1470,760,20,C.dim,true); text(c,"-18 LUFS",1663,760,22,C.white,true);
    text(c,"NETWORK",1470,807,20,C.dim,true); text(c,"ONLINE",1674,807,22,"#8bd9ae",true);
    text(c,"REC",1470,884,23,"#ed7775",true); text(c,"00:42:18",1600,884,26,C.white,true);
    text(c,"CAPTURE / SWITCH / STREAM",1470,982,17,C.dim,true);
    rect(c,1028,554,382,486,"#090e14","#40505e");
    text(c,"AUDIO MIX",1042,567,23,C.white,true);
    const names=["V","G","D","K","T","FX","A","AU","M"];
    names.forEach((s,i)=>text(c,s,1045+i*39.5,608,14,C.dim,true));
    meters(c,1040,638,355,344,names.length,p.t,false);
    text(c,"-36   -24   -12    0",1045,1005,17,C.dim,true);
  });
}

function audioWorkstation(p: PaintCtx) {
  start(p,c=>{
    header(c,"AUDIO / MIX ENGINE","MAIN STAGE   48 kHz / 24 BIT");
    text(c,"INPUT CHANNELS",35,94,22,C.dim,true);
    meters(c,45,179,1740,628,16,p.t,false);
    for(let i=0;i<16;i++) {
      const x=45+i*108.75, fader=.35+.14*Math.sin(i*2.2);
      text(c,String(i+1).padStart(2,"0"),x+19,131,23,C.white,true);
      rect(c,x+24,850,46,122,"#1b242f"); line(c,x+47,860,x+47,961,"#5f6c79",3); rect(c,x+16,849+fader*110,63,21,"#a5adb6","#e2e6ea");
      text(c,i===0?"VOX":i<4?"MIC":i<10?"LINE":"AUX",x+11,990,18,C.dim,true);
    }
    text(c,"MASTER",1773,94,22,C.white,true); meters(c,1782,179,92,628,2,p.t,false);
    text(c,"-18 LUFS",1765,867,21,C.white,true); text(c,"SHOW READY",1765,995,17,"#8bd9ae",true);
  });
}

/** Workstation variants: 0 engineering, 1 cues, 2 multiview, 3 audio. */
export function technicalWorkstation(p: PaintCtx) {
  const variants=[technicalEngineering,technicalShowControl,technicalLiveProduction,audioWorkstation];
  variants[((Math.floor(p.variant)%variants.length)+variants.length)%variants.length](p);
}

/** Clean portrait concert content. Physical stall lettering is rendered elsewhere. */
export function technicalConcert(p: PaintCtx) {
  const c=p.ctx;
  c.save(); c.setTransform(1,0,0,1,0,0); c.globalAlpha=1;
  if(!imageCrop(c,PGM,0,0,p.w,p.h)) vectorStage(c,0,0,p.w,p.h,p.t);
  const shade=c.createLinearGradient(0,p.h*.65,0,p.h);
  shade.addColorStop(0,"rgba(1,4,9,0)"); shade.addColorStop(1,"rgba(1,4,9,.32)");
  c.fillStyle=shade;c.fillRect(0,0,p.w,p.h);c.restore();
}

export const TECHNICAL_PAINTERS = { technicalEngineering, technicalShowControl, technicalLiveProduction, technicalWorkstation, technicalConcert };

export const TECHNICAL_MEDIA_SPECS = {
  technicalEngineering: { res: [1920,1080], fps: 8 },
  technicalShowControl: { res: [1920,1080], fps: 12 },
  technicalLiveProduction: { res: [1920,1080], fps: 12 },
  technicalWorkstation: { res: [1280,800], fps: 12 },
  technicalConcert: { res: [768,1280], fps: 4 },
} as const;
