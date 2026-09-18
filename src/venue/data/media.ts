import type { ShaderProgramId } from "../media/programs";
import type { PainterId } from "../media/painters";
import { PAVILIONS, PARTNER_BAY } from "./pavilions";
import { SERVICES } from "@/content/services";

/**
 * The media configuration system.
 *
 * Every screen in the venue names a media id; this file is the only place that
 * decides what actually plays on it. Swapping a procedural program for a real
 * looping video is a one-line change here — scene code never references a file
 * path, a resolution or a frame rate.
 *
 * Drop-in video replacement:
 *   "stage-main": { kind: "video",
 *                   desktop: "/media/stage/corporate-main.mp4",
 *                   mobile:  "/media/stage/corporate-main-720.mp4",
 *                   poster:  "/media/stage/corporate-main.jpg" }
 *
 * Suggested media folders (mirrors the zones):
 *   /public/media/{tunnel,exhibition,pillars,anamorphic,services,corporate,festival,finale}
 */

/** Natural accent palette. Teal is the brand accent; the rest are real-world tones. */
export const ACCENT = {
  brand: "#3fd6c8",
  teal: "#2f9f95",
  steel: "#8fa3b8",
  amber: "#d99a52",
  ember: "#c56a3a",
  moss: "#7ea390",
  bone: "#c8c2b4",
  violet: "#9d95c0",
  copper: "#b97f55",
  /* Content-only hues. Architecture keeps the graphite/teal grade; screens do
     not have to, and holding every loop inside one cool hue was most of why
     the LED read as dated. */
  magenta: "#d95fa8",
  indigo: "#6f76d8",
  lime: "#9fd15e",
  coral: "#e8734f",
  ice: "#8fd6e8",
  gold: "#e0b054",
} as const;

export interface ShaderMedia {
  kind: "shader";
  program: ShaderProgramId;
  /** program used while the stage is in festival mode */
  festival?: ShaderProgramId;
  accent?: string;
  festivalAccent?: string;
  /** per-screen offset so twin screens never look cloned */
  variant?: number;
  /** render-target size; defaults to 320×320, clamped by quality tier */
  res?: [number, number];
  /** target refresh rate in fps while in view */
  fps?: number;
}

export interface CanvasMedia {
  kind: "canvas";
  painter: PainterId;
  accent?: string;
  res?: [number, number];
  fps?: number;
  /** copy for painters that render text (pavilion headers, wayfinding, kiosks) */
  text?: { title: string; sub: string; lines?: string[] };
}

export interface VideoMedia {
  kind: "video";
  desktop: string;
  mobile?: string;
  poster?: string;
  /** cover (default) fills the surface; contain letterboxes it */
  fit?: "cover" | "contain";
}

export type MediaDesc = ShaderMedia | CanvasMedia | VideoMedia;

export const MEDIA: Record<string, MediaDesc> = {
  /* ── Arrival ──────────────────────────────────────────── */
  // The arch fascia. This has to *say the name* — an abstract brand sweep was
  // playing here, which is a fine motif and a poor sign.
  "entry-brand": { kind: "canvas", painter: "brandFascia", accent: ACCENT.brand, res: [1024, 192], fps: 12 },
  "entry-sign": { kind: "canvas", painter: "signWelcome", accent: ACCENT.brand, res: [768, 332], fps: 8 },
  "entry-blade": { kind: "shader", program: "pillarTotem", accent: ACCENT.ice, variant: 0.3, res: [160, 512], fps: 24 },

  /* ── Tunnel ───────────────────────────────────────────────
     The four-sided tunnel has no media id: it is not showing a texture at
     all. Its surfaces generate a shared virtual world from world-space
     position (see three/immersive.ts), which is what makes them continuous
     across every corner. */

  /* ── Vestibule, where the tunnel opens into the hall ──── */
  "vestibule-blade": { kind: "shader", program: "pillarTotem", accent: ACCENT.brand, variant: 0.42, res: [160, 704], fps: 30 },

  /* ── Hall + wayfinding ────────────────────────────────── */
  "sign-gallery": { kind: "canvas", painter: "signGallery", accent: ACCENT.brand, res: [512, 128], fps: 8 },
  "sign-services": { kind: "canvas", painter: "signServices", accent: ACCENT.brand, res: [512, 128], fps: 8 },
  "sign-arena": { kind: "canvas", painter: "signArena", accent: ACCENT.amber, res: [512, 128], fps: 8 },
  "hall-wordmark": { kind: "canvas", painter: "wordmark", accent: ACCENT.brand, res: [1024, 288], fps: 12 },

  /* ── Creative LED gallery ─────────────────────────────── */
  // The four-sided totems. Both run the same composed-for-a-column programme
  // — that is the point: a visitor should read "this is a designed LED pillar
  // installation", not "these are two different textures on two posts".
  "pillar-flow": { kind: "shader", program: "pillarTotem", accent: ACCENT.ice, variant: 0.1, res: [384, 1024], fps: 30 },
  // A horizontal grain motif on a vertical column resolves into stacked
  // light and dark bands — zebra, not metal. A column wants depth, so it
  // gets the raymarched structure instead.
  "pillar-metal": { kind: "shader", program: "pillarTotem", accent: ACCENT.magenta, variant: 0.62, res: [384, 1024], fps: 30 },
  "blade-rain": { kind: "shader", program: "pillarTotem", accent: ACCENT.indigo, variant: 0.8, res: [512, 640], fps: 30 },
  "cylinder-ribbon": { kind: "shader", program: "auroraSilk", accent: ACCENT.coral, res: [1024, 384], fps: 30 },
  "ring-waves": { kind: "shader", program: "prismRefract", accent: ACCENT.ice, res: [1536, 192], fps: 30 },
  // The fascia is a metre from the camera and its own header calls it
  // fine pitch. A matrix motif here contradicts the product in the same frame.
  "bar-brand": { kind: "shader", program: "auroraSilk", accent: ACCENT.magenta, variant: 0.45, res: [1024, 160], fps: 30 },
  "curve-natural": { kind: "shader", program: "auroraSilk", accent: ACCENT.lime, res: [768, 448], fps: 24 },
  // A flat slab field was reading as grey card. A lattice running into depth
  // gives the cut silhouette something worth being cut around.
  "mosaic-arch": { kind: "shader", program: "depthLattice", accent: ACCENT.indigo, res: [704, 512], fps: 24 },
  "anamorphic": { kind: "shader", program: "anamorphicVoid", accent: ACCENT.bone, res: [768, 576], fps: 24 },

  /* ── 01 · AV engineering ──────────────────────────────── */
  "av-signal-diagram": { kind: "canvas", painter: "avSignalDiagram", accent: ACCENT.teal, res: [512, 288], fps: 15 },
  "av-led-plan": { kind: "canvas", painter: "avLedPlan", accent: ACCENT.steel, res: [448, 256], fps: 10 },
  "av-rack-status": { kind: "canvas", painter: "avRackStatus", accent: ACCENT.teal, res: [320, 384], fps: 8 },

  /* ── 02 · Content studio ──────────────────────────────── */
  "content-motion": { kind: "shader", program: "prismRefract", accent: ACCENT.magenta, variant: 0.2, res: [512, 288], fps: 30 },
  "content-3d": { kind: "shader", program: "architecture", accent: ACCENT.copper, variant: 0.5, res: [256, 256], fps: 20 },
  "content-anamorphic": { kind: "shader", program: "anamorphicVoid", accent: ACCENT.amber, variant: 0.7, res: [288, 288], fps: 24 },

  /* ── 03 · LED solutions ───────────────────────────────── */
  "led-formats": { kind: "shader", program: "ledFormats", accent: ACCENT.teal, res: [448, 256], fps: 24 },
  "led-pitch": { kind: "canvas", painter: "ledPitch", accent: ACCENT.brand, res: [448, 288], fps: 8 },
  "led-install": { kind: "canvas", painter: "ledInstall", accent: ACCENT.steel, res: [384, 256], fps: 15 },

  /* ── 04 · Spatial experiences ─────────────────────────── */
  "mapping-facade": { kind: "shader", program: "mappingFacade", accent: ACCENT.amber, res: [448, 256], fps: 24 },
  "immersive-room": { kind: "shader", program: "immersiveRoom", accent: ACCENT.teal, res: [320, 320], fps: 24 },
  "mapping-warp": { kind: "shader", program: "architecture", accent: ACCENT.copper, variant: 0.9, res: [448, 320], fps: 20 },

  /* ── 05 · Show control ────────────────────────────────── */
  "sc-cues": { kind: "canvas", painter: "scCues", accent: ACCENT.teal, res: [384, 320], fps: 10 },
  "sc-preview": { kind: "canvas", painter: "scPreview", accent: ACCENT.teal, res: [320, 200], fps: 15 },
  "sc-program": { kind: "canvas", painter: "scProgram", accent: ACCENT.amber, res: [320, 200], fps: 15 },
  "sc-sources": { kind: "canvas", painter: "scSources", accent: ACCENT.steel, res: [320, 256], fps: 12 },

  /* ── 06 · Live production & broadcast ─────────────────── */
  "lp-multiview": { kind: "canvas", painter: "lpMultiview", accent: ACCENT.teal, res: [512, 288], fps: 15 },
  "lp-program": { kind: "canvas", painter: "lpProgram", accent: ACCENT.ember, res: [384, 224], fps: 15 },
  "lp-stream": { kind: "canvas", painter: "lpStream", accent: ACCENT.teal, res: [384, 256], fps: 12 },

  /* ── 07 · Connected events ────────────────────────────── */
  "ce-stage": { kind: "canvas", painter: "ceStage", accent: ACCENT.moss, res: [448, 256], fps: 15 },
  "ce-remote": { kind: "canvas", painter: "ceRemote", accent: ACCENT.moss, res: [448, 288], fps: 10 },
  "ce-map": { kind: "canvas", painter: "ceMap", accent: ACCENT.teal, res: [384, 256], fps: 15 },

  /* ── 08 · Digital ─────────────────────────────────────── */
  "web-showreel": { kind: "shader", program: "auroraSilk", accent: ACCENT.violet, variant: 0.35, res: [512, 288], fps: 30 },
  "web-code": { kind: "canvas", painter: "webCode", accent: ACCENT.violet, res: [320, 320], fps: 12 },
  "web-devices": { kind: "canvas", painter: "webDevices", accent: ACCENT.violet, res: [448, 256], fps: 15 },

  /* ── Partner bay ──────────────────────────────────────── */
  "partner-bay": { kind: "canvas", painter: "partnerBay", accent: ACCENT.amber, res: [448, 320], fps: 10 },

  /* ── Arena approach ───────────────────────────────────── */
  // The totems pass within a few metres of the camera, so whatever they play
  // is inspected at close range. A matrix motif reads as a dot grid there,
  // which is the one impression a fine-pitch venue cannot give.
  "approach-pillar": { kind: "shader", program: "pillarTotem", accent: ACCENT.gold, variant: 0.18, res: [320, 896], fps: 30 },
  "approach-portrait": { kind: "shader", program: "pixelRain", accent: ACCENT.amber, variant: 0.15, res: [192, 512], fps: 30 },

  /* ── Main stage: the mode switch lives here ───────────── */
  "stage-main": {
    kind: "shader",
    program: "prismRefract",
    festival: "festivalMonument",
    accent: ACCENT.ice,
    festivalAccent: "#b05ad6",
    res: [1024, 448],
    fps: 60,
  },
  // Side screens run the same content family as the main wall — that is what a
  // real show does, and it keeps the room reading as one design.
  "stage-side": {
    kind: "shader",
    program: "depthLattice",
    festival: "plasmaRibbon",
    accent: ACCENT.indigo,
    festivalAccent: ACCENT.ember,
    variant: 0.62,
    res: [704, 512],
    fps: 30,
  },
  // The blades carry a *slice each* of the same render as the main wall, so
  // the ten of them read as one composition continued above it rather than as
  // ten small screens doing their own thing. That is what a real show does
  // with a blade array, and it is why the mode switch transforms the whole
  // rig instead of one rectangle.
  // The vertical light strips flanking the hero canvas. Thin and full height,
  // so whatever plays here has to work as a *column* — a slice of a wide
  // render would read as a random crop.
  "stage-strip": {
    kind: "shader",
    program: "pillarTotem",
    festival: "pillarTotem",
    accent: ACCENT.gold,
    festivalAccent: "#b464e0",
    variant: 0.55,
    res: [128, 768],
    fps: 30,
  },
  // Portrait fillers: two slices of one render, so a pair reads as one image
  // split by the gap between them.
  "stage-portrait": {
    kind: "shader",
    program: "pillarTotem",
    festival: "pillarTotem",
    accent: ACCENT.magenta,
    festivalAccent: "#a86ad6",
    variant: 0.34,
    res: [384, 768],
    fps: 30,
  },
  // The canted outer clusters, upper and lower halves of one render.
  "stage-outer": {
    kind: "shader",
    program: "auroraSilk",
    festival: "festivalMonument",
    accent: ACCENT.coral,
    festivalAccent: "#9a5ad0",
    variant: 0.78,
    res: [704, 448],
    fps: 30,
  },
  "stage-floor": {
    kind: "shader",
    program: "depthLattice",
    festival: "volumetric",
    accent: ACCENT.ice,
    festivalAccent: ACCENT.ember,
    variant: 0.7,
    res: [768, 384],
    fps: 24,
  },
  "stage-wing": {
    kind: "shader",
    program: "auroraSilk",
    festival: "immersiveRoom",
    accent: ACCENT.indigo,
    festivalAccent: "#a54fb0",
    variant: 0.85,
    res: [512, 512],
    fps: 24,
  },

  /* ── Finale ───────────────────────────────────────────── */
  "finale": { kind: "shader", program: "finaleBrand", accent: ACCENT.brand, res: [896, 384], fps: 30 },
  "finale-word": { kind: "canvas", painter: "wordmark", accent: ACCENT.brand, res: [768, 192], fps: 12 },
  "finale-cta": { kind: "canvas", painter: "signFinaleCta", accent: ACCENT.brand, res: [768, 176], fps: 8 },
};

/**
 * Each pavilion's header sign is generated from the boulevard data, so adding
 * a pavilion never means remembering to add a matching media entry.
 */
for (const p of PAVILIONS) {
  MEDIA[`sign-${p.id}`] = {
    kind: "canvas",
    painter: "pavilionHeader",
    accent: p.accent,
    res: [576, 96],
    fps: 8,
    text: { title: p.doing, sub: "We Do" },
  };
}
/** And the kiosk each pavilion explains itself from, in the room. */
for (const [p, sub] of [
  ...PAVILIONS.map((p) => [p, `We Do ${p.doing}`] as const),
  [PARTNER_BAY, "With our partners"] as const,
]) {
  MEDIA[`kiosk-${p.id}`] = {
    kind: "canvas",
    painter: "kioskInfo",
    accent: p.accent,
    res: [384, 512],
    fps: 6,
    text: {
      title: p.headline,
      sub,
      lines: p.services.map((slug) => SERVICES.find((x) => x.slug === slug)?.title ?? slug),
    },
  };
}

MEDIA[`sign-${PARTNER_BAY.id}`] = {
  kind: "canvas",
  painter: "pavilionHeader",
  accent: PARTNER_BAY.accent,
  res: [576, 96],
  fps: 8,
  // Deliberately not "We Do": sound and lighting is delivered with partners,
  // and the signage has to keep saying so.
  text: { title: PARTNER_BAY.doing, sub: "With Partners" },
};

/**
 * Stand headers in the creative gallery. Generated the same way the pavilion
 * signs are, so a new installation needs one line rather than two files.
 */
const STAND_LABELS: [string, string, string, string][] = [
  ["pillars", "LED Pillars", "Four-sided columns", ACCENT.teal],
  ["blades", "Vertical Blades", "One image, six panels", ACCENT.brand],
  ["cylinder", "Cylindrical LED", "Seamless 360 degree wrap", ACCENT.amber],
  ["ring", "Suspended Ring", "Continuous angular mapping", ACCENT.teal],
  ["bar", "LED Bar", "Fine-pitch fascia", ACCENT.brand],
  ["curved", "Curved LED", "Architectural radius", ACCENT.moss],
  ["mosaic", "Creative Shapes", "Modules cut to a silhouette", ACCENT.steel],
  ["anamorphic", "Anamorphic Corner", "Depth beyond the screen plane", ACCENT.bone],
];
for (const [id, title, sub, accent] of STAND_LABELS) {
  MEDIA[`stand-${id}`] = {
    kind: "canvas",
    painter: "pavilionHeader",
    accent,
    res: [576, 96],
    fps: 8,
    text: { title, sub },
  };
}

export type MediaId = keyof typeof MEDIA;

/** Screens that must be live before the visitor is allowed in. */
export const CRITICAL_MEDIA = ["entry-brand", "entry-sign", "entry-blade", "vestibule-blade"];
