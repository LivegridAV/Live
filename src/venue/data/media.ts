import type { ShaderProgramId } from "../media/programs";
import type { PainterId } from "../media/painters";
import { PAVILIONS, PARTNER_BAY } from "./pavilions";

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
  /** copy for painters that render text (pavilion headers, wayfinding) */
  text?: { title: string; sub: string };
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
  "entry-brand": { kind: "shader", program: "signalGrid", accent: ACCENT.brand, res: [576, 96], fps: 30 },
  "entry-sign": { kind: "canvas", painter: "signWelcome", accent: ACCENT.brand, res: [512, 128], fps: 8 },
  "entry-blade": { kind: "shader", program: "pixelRain", accent: ACCENT.teal, variant: 0.3, res: [128, 384], fps: 24 },

  /* ── Tunnel: one texture, four surfaces, perfectly in sync ─ */
  "tunnel": { kind: "shader", program: "tunnelFlow", accent: ACCENT.teal, res: [192, 1024], fps: 60 },

  /* ── Hall + wayfinding ────────────────────────────────── */
  "sign-gallery": { kind: "canvas", painter: "signGallery", accent: ACCENT.brand, res: [512, 128], fps: 8 },
  "sign-services": { kind: "canvas", painter: "signServices", accent: ACCENT.brand, res: [512, 128], fps: 8 },
  "sign-arena": { kind: "canvas", painter: "signArena", accent: ACCENT.amber, res: [512, 128], fps: 8 },
  "hall-wordmark": { kind: "canvas", painter: "wordmark", accent: ACCENT.brand, res: [640, 176], fps: 12 },

  /* ── Creative LED gallery ─────────────────────────────── */
  "pillar-flow": { kind: "shader", program: "volumetric", accent: ACCENT.teal, variant: 0.1, res: [192, 448], fps: 30 },
  "pillar-metal": { kind: "shader", program: "liquidMetal", accent: ACCENT.copper, variant: 0.6, res: [192, 448], fps: 30 },
  "blade-rain": { kind: "shader", program: "pixelRain", accent: ACCENT.brand, variant: 0.8, res: [128, 448], fps: 30 },
  "cylinder-ribbon": { kind: "shader", program: "plasmaRibbon", accent: ACCENT.amber, res: [512, 192], fps: 30 },
  "ring-waves": { kind: "shader", program: "spatialWaves", accent: ACCENT.teal, res: [768, 96], fps: 30 },
  "bar-brand": { kind: "shader", program: "signalGrid", accent: ACCENT.brand, variant: 0.45, res: [640, 80], fps: 30 },
  "curve-natural": { kind: "shader", program: "naturalFlow", accent: ACCENT.moss, res: [448, 256], fps: 24 },
  "mosaic-arch": { kind: "shader", program: "architecture", accent: ACCENT.steel, res: [256, 256], fps: 20 },
  "anamorphic": { kind: "shader", program: "anamorphicVoid", accent: ACCENT.bone, res: [320, 320], fps: 24 },

  /* ── 01 · AV engineering ──────────────────────────────── */
  "av-signal-diagram": { kind: "canvas", painter: "avSignalDiagram", accent: ACCENT.teal, res: [512, 288], fps: 15 },
  "av-led-plan": { kind: "canvas", painter: "avLedPlan", accent: ACCENT.steel, res: [448, 256], fps: 10 },
  "av-rack-status": { kind: "canvas", painter: "avRackStatus", accent: ACCENT.teal, res: [320, 384], fps: 8 },

  /* ── 02 · Content studio ──────────────────────────────── */
  "content-motion": { kind: "shader", program: "liquidMetal", accent: ACCENT.amber, variant: 0.2, res: [448, 256], fps: 30 },
  "content-3d": { kind: "shader", program: "architecture", accent: ACCENT.copper, variant: 0.5, res: [256, 256], fps: 20 },
  "content-anamorphic": { kind: "shader", program: "anamorphicVoid", accent: ACCENT.amber, variant: 0.7, res: [288, 288], fps: 24 },

  /* ── 03 · LED solutions ───────────────────────────────── */
  "led-formats": { kind: "shader", program: "ledFormats", accent: ACCENT.teal, res: [448, 256], fps: 24 },
  "led-pitch": { kind: "canvas", painter: "ledPitch", accent: ACCENT.brand, res: [448, 288], fps: 8 },
  "led-install": { kind: "canvas", painter: "ledInstall", accent: ACCENT.steel, res: [384, 256], fps: 15 },

  /* ── 04 · Spatial experiences ─────────────────────────── */
  "mapping-facade": { kind: "shader", program: "mappingFacade", accent: ACCENT.amber, res: [448, 256], fps: 24 },
  "immersive-room": { kind: "shader", program: "immersiveRoom", accent: ACCENT.teal, res: [320, 320], fps: 24 },
  "mapping-warp": { kind: "shader", program: "spatialWaves", accent: ACCENT.copper, variant: 0.9, res: [320, 224], fps: 24 },

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
  "web-showreel": { kind: "shader", program: "volumetric", accent: ACCENT.violet, variant: 0.35, res: [448, 256], fps: 30 },
  "web-code": { kind: "canvas", painter: "webCode", accent: ACCENT.violet, res: [320, 320], fps: 12 },
  "web-devices": { kind: "canvas", painter: "webDevices", accent: ACCENT.violet, res: [448, 256], fps: 15 },

  /* ── Partner bay ──────────────────────────────────────── */
  "partner-bay": { kind: "canvas", painter: "partnerBay", accent: ACCENT.amber, res: [448, 320], fps: 10 },

  /* ── Arena approach ───────────────────────────────────── */
  "approach-pillar": { kind: "shader", program: "brandType", accent: ACCENT.brand, res: [160, 448], fps: 30 },
  "approach-portrait": { kind: "shader", program: "pixelRain", accent: ACCENT.amber, variant: 0.15, res: [128, 448], fps: 30 },

  /* ── Main stage: the mode switch lives here ───────────── */
  "stage-main": {
    kind: "shader",
    program: "corporatePremium",
    festival: "festivalMonument",
    accent: ACCENT.steel,
    festivalAccent: "#8f5ad6",
    res: [576, 248],
    fps: 60,
  },
  // Side screens run the same content family as the main wall — that is what a
  // real show does, and it keeps the room reading as one design.
  "stage-side": {
    kind: "shader",
    program: "corporatePremium",
    festival: "plasmaRibbon",
    accent: ACCENT.steel,
    festivalAccent: ACCENT.ember,
    variant: 0.62,
    res: [224, 416],
    fps: 30,
  },
  "stage-blade": {
    kind: "shader",
    program: "brandType",
    festival: "pixelRain",
    accent: ACCENT.bone,
    festivalAccent: "#c96a9e",
    variant: 0.55,
    res: [128, 448],
    fps: 30,
  },
  "stage-floor": {
    kind: "shader",
    program: "ledFormats",
    festival: "volumetric",
    accent: ACCENT.steel,
    festivalAccent: ACCENT.ember,
    variant: 0.7,
    res: [320, 320],
    fps: 24,
  },
  "stage-wing": {
    kind: "shader",
    program: "liquidMetal",
    festival: "immersiveRoom",
    accent: ACCENT.bone,
    festivalAccent: "#a54fb0",
    variant: 0.85,
    res: [256, 256],
    fps: 24,
  },

  /* ── Finale ───────────────────────────────────────────── */
  "finale": { kind: "shader", program: "finaleBrand", accent: ACCENT.brand, res: [576, 248], fps: 30 },
  "finale-word": { kind: "canvas", painter: "wordmark", accent: ACCENT.brand, res: [640, 176], fps: 12 },
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
    text: { title: p.headline, sub: `Pavilion ${p.no}` },
  };
}
MEDIA[`sign-${PARTNER_BAY.id}`] = {
  kind: "canvas",
  painter: "pavilionHeader",
  accent: PARTNER_BAY.accent,
  res: [576, 96],
  fps: 8,
  text: { title: PARTNER_BAY.headline, sub: "Partner bay" },
};

export type MediaId = keyof typeof MEDIA;

/** Screens that must be live before the visitor is allowed in. */
export const CRITICAL_MEDIA = ["entry-brand", "entry-sign", "entry-blade", "tunnel"];
