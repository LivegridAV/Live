import type { ShaderProgramId } from "../media/programs";
import type { PainterId } from "../media/painters";

/**
 * Active architectural screen content. Scene components name a media id;
 * this manifest owns its source, resolution, refresh rate and shared clock.
 *
 * The redesigned pillar gallery, reception, content studio, technical and
 * projection installations retain their independent media packages. The new
 * rental pavilion has its own 2026 package; retired generic booths and earlier
 * rental designs have no entries here and cannot be warmed by the venue.
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

/** Fields every kind of media shares. */
interface CommonMedia {
  /**
   * Surfaces carrying one composition name the same group and are driven from
   * one clock, so a multi-panel installation cannot drift apart or restart a
   * panel at a time. See `MediaEngine.update`.
   */
  syncGroup?: string;
  /** output trim for this surface, applied on top of the screen's own. */
  brightness?: number;
}

export interface ShaderMedia extends CommonMedia {
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

export interface CanvasMedia extends CommonMedia {
  kind: "canvas";
  painter: PainterId;
  accent?: string;
  res?: [number, number];
  fps?: number;
  /** Authored monitor feed within a shared painter family. */
  variant?: number;
  /** copy for painters that render text (pavilion headers, wayfinding, kiosks) */
  text?: { title: string; sub: string; lines?: string[] };
}

export interface VideoMedia extends CommonMedia {
  kind: "video";
  desktop: string;
  /** a smaller cut for phones — bandwidth, not quality, is the constraint */
  mobile?: string;
  poster?: string;
  /** cover (default) fills the surface; contain letterboxes it */
  fit?: "cover" | "contain";
  /**
   * Source colour space. Offline renders are usually delivered in sRGB; a
   * file already graded in linear light must say so or it arrives washed out.
   */
  colorSpace?: "srgb" | "linear";
  /** play this cut only while the stage is in the named mode */
  stageMode?: "corporate" | "festival";
}

/**
 * A graded still rendered for an architectural LED surface.
 *
 * Stills are first-class media rather than ad-hoc texture loads in scene
 * components. The engine can therefore share one GPU texture between every
 * surface carrying the same package, and the stage can exchange an entire
 * visual world on the existing show cue.
 */
export interface ImageMedia extends CommonMedia {
  kind: "image";
  desktop: string;
  mobile?: string;
  /** alternate package used by the second stage experience */
  festival?: string;
  festivalMobile?: string;
  colorSpace?: "srgb" | "linear";
  /** Geometry-preserving motion for wrapped LED artwork. */
  motion?: "ribbon" | "waterfall" | "still";
}

export type MediaDesc = ShaderMedia | CanvasMedia | VideoMedia | ImageMedia;

export const MEDIA: Record<string, MediaDesc> = {
  /* Arrival and vestibule */
  "entry-brand": { kind: "canvas", painter: "brandFascia", accent: ACCENT.brand, res: [1024, 192], fps: 12 },
  "entry-blade": { kind: "shader", program: "pillarWrap", accent: ACCENT.ice, variant: 0.3, res: [512, 640], fps: 24, syncGroup: "entry" },
  "vestibule-blade": { kind: "shader", program: "pillarWrap", accent: ACCENT.brand, variant: 0.42, res: [512, 768], fps: 30, syncGroup: "vestibule" },

  /* Shared hall wayfinding */
  "sign-services": { kind: "canvas", painter: "signServices", accent: ACCENT.brand, res: [512, 128], fps: 8 },
  "sign-arena": { kind: "canvas", painter: "signArena", accent: ACCENT.amber, res: [512, 128], fps: 8 },

  /* Redesigned four-sided pillar gallery */
  "pillar-flow": { kind: "image", desktop: "/media/pillars/ribbon-wrap.webp", mobile: "/media/pillars/ribbon-wrap-mobile.webp", brightness: 1.02, motion: "ribbon", syncGroup: "pillar-ribbons" },
  "pillar-metal": { kind: "image", desktop: "/media/pillars/ribbon-wrap.webp", mobile: "/media/pillars/ribbon-wrap-mobile.webp", brightness: 1.02, motion: "ribbon", syncGroup: "pillar-ribbons" },
  "pillar-forest": { kind: "image", desktop: "/media/pillars/forest-wrap.webp", mobile: "/media/pillars/forest-wrap-mobile.webp", brightness: 0.94, motion: "waterfall" },
  "pillar-alpine": { kind: "image", desktop: "/media/pillars/alpine-wrap.webp", mobile: "/media/pillars/alpine-wrap-mobile.webp", brightness: 0.96, motion: "still" },

  /* Redesigned reception */
  "reception-cylinder": { kind: "image", desktop: "/media/reception/cylinder-reference-art-v1.webp", brightness: .96, motion: "ribbon", syncGroup: "reception" },
  "reception-ring": { kind: "image", desktop: "/media/reception/ribbon-reference-art-v1.webp", brightness: .96, motion: "ribbon", syncGroup: "reception" },
  "reception-counter": { kind: "image", desktop: "/media/reception/counter-reference-art-v2.webp", brightness: .94, motion: "ribbon", syncGroup: "reception" },
  "reception-panorama": { kind: "image", desktop: "/media/reception/panorama-reference-art-v1.webp", brightness: .98, motion: "still" },

  /* Redesigned anamorphic content studio */
  "studio-sculpture": { kind: "image", desktop: "/media/anamorphic-stall/sculpture-master-v1.webp", brightness: .98, motion:"still" },
  "studio-chrome": { kind: "image", desktop: "/media/anamorphic-stall/chrome-orb-landscape-v1.webp", brightness:.95, motion:"still" },
  "studio-portrait": { kind: "image", desktop: "/media/anamorphic-stall/content-portrait-v1.webp", brightness:.95, motion:"still" },
  "studio-fluid": { kind: "image", desktop: "/media/anamorphic-stall/blue-silver-fluid-v1.webp", brightness:.96, motion:"waterfall" },
  "studio-forest": { kind: "image", desktop: "/media/anamorphic-stall/forest-wrap.webp", mobile: "/media/anamorphic-stall/forest-wrap-mobile.webp", brightness: 0.94, motion: "waterfall" },

  /* Redesigned technical showcase */
  "tech-engineering": { kind:"canvas",painter:"technicalEngineering",res:[1920,1080],fps:8,syncGroup:"technical" },
  "tech-show-control": { kind:"canvas",painter:"technicalShowControl",res:[1920,1080],fps:12,syncGroup:"technical" },
  "tech-live-production": { kind:"canvas",painter:"technicalLiveProduction",res:[1920,1080],fps:12,syncGroup:"technical" },
  "tech-concert": { kind:"canvas",painter:"technicalConcert",res:[1024,1248],fps:4,syncGroup:"technical" },
  "tech-workstation-av": { kind:"canvas",painter:"technicalWorkstation",variant:0,res:[1280,800],fps:12,syncGroup:"technical" },
  "tech-workstation-cues": { kind:"canvas",painter:"technicalWorkstation",variant:1,res:[1280,800],fps:12,syncGroup:"technical" },
  "tech-workstation-production": { kind:"canvas",painter:"technicalWorkstation",variant:2,res:[1280,800],fps:12,syncGroup:"technical" },
  "tech-workstation-audio": { kind:"canvas",painter:"technicalWorkstation",variant:3,res:[1280,800],fps:12,syncGroup:"technical" },

  /* New open rental pavilion — October 18 reference. */
  "rental2026-backdrop": {kind:"canvas",painter:"rental2026Backdrop",res:[2560,1440],fps:4,syncGroup:"rental2026"},
  "rental2026-flat": {kind:"canvas",painter:"rental2026Flat",res:[1024,768],fps:2},
  "rental2026-curved": {kind:"canvas",painter:"rental2026Curved",res:[1536,864],fps:2},
  "rental2026-cylinder": {kind:"canvas",painter:"rental2026Cylinder",res:[1536,768],fps:2},
  "rental2026-corner": {kind:"canvas",painter:"rental2026Corner",res:[2048,1024],fps:2},
  "rental2026-transparent": {kind:"canvas",painter:"rental2026Transparent",res:[768,768],fps:2,brightness:.95},
  "rental2026-dna": {kind:"canvas",painter:"rental2026Dna",res:[1024,1024],fps:24,syncGroup:"rental2026"},
  "rental2026-sphere": {kind:"canvas",painter:"rental2026Sphere",res:[2048,1024],fps:2},
  "rental2026-application-0": {kind:"canvas",painter:"rental2026Applications",variant:0,res:[1024,576],fps:2},
  "rental2026-application-1": {kind:"canvas",painter:"rental2026Applications",variant:1,res:[1024,576],fps:2},
  "rental2026-application-2": {kind:"canvas",painter:"rental2026Applications",variant:2,res:[1024,576],fps:2},
  "rental2026-application-3": {kind:"canvas",painter:"rental2026Applications",variant:3,res:[1024,576],fps:2},

  /* Arena approach */
  "approach-portrait": { kind: "image", desktop: "/media/final/creative-world.webp", brightness: 0.92 },

  /* Main stage */
  "stage-main": { kind: "image", desktop: "/media/final/stage-conference.webp", festival: "/media/final/stage-social.webp", brightness: 0.9, syncGroup: "stage" },
  "stage-side": { kind: "image", desktop: "/media/final/stage-conference.webp", festival: "/media/final/stage-social.webp", brightness: 0.9, syncGroup: "stage" },
  "stage-strip": {
    kind: "shader",
    program: "pillarWrap",
    festival: "pillarWrap",
    accent: ACCENT.gold,
    festivalAccent: "#b464e0",
    variant: 0.55,
    res: [256, 896],
    fps: 30,
    syncGroup: "stage",
  },
  "stage-portrait": { kind: "image", desktop: "/media/final/stage-conference.webp", festival: "/media/final/stage-social.webp", brightness: 0.9, syncGroup: "stage" },
  "stage-outer": { kind: "image", desktop: "/media/final/stage-conference.webp", festival: "/media/final/stage-social.webp", brightness: 0.9, syncGroup: "stage" },
  "stage-floor": { kind: "image", desktop: "/media/final/stage-conference.webp", festival: "/media/final/stage-social.webp", brightness: 0.9, syncGroup: "stage" },
  "stage-wing": { kind: "image", desktop: "/media/final/stage-conference.webp", festival: "/media/final/stage-social.webp", brightness: 0.9, syncGroup: "stage" },

  /* Finale */
  "finale": { kind: "shader", program: "finaleBrand", accent: ACCENT.brand, res: [1024, 448], fps: 30, syncGroup: "finale" },
  "finale-word": { kind: "canvas", painter: "wordmark", accent: ACCENT.brand, res: [768, 192], fps: 12 },
  "finale-cta": { kind: "canvas", painter: "signFinaleCta", accent: ACCENT.brand, res: [768, 176], fps: 8 },
};

export type MediaId = keyof typeof MEDIA;

/** Screens that must be live before the visitor is allowed in. */
export const CRITICAL_MEDIA = ["entry-brand", "entry-blade", "vestibule-blade"];

// Architectural displays and light projected onto the actual sculptural model.
MEDIA["projection-ceiling"] = {kind:"canvas",painter:"projectionCeiling",accent:ACCENT.gold,res:[1024,1024],fps:4,syncGroup:"projection"};
MEDIA["projection-backdrop"] = {kind:"canvas",painter:"projectionBackdrop",accent:ACCENT.gold,res:[2560,1024],fps:4,syncGroup:"projection"};
MEDIA["projection-hero"] = {kind:"canvas",painter:"projectionHero",accent:ACCENT.gold,res:[1536,864],fps:4,syncGroup:"projection"};
MEDIA["projection-kiosk"] = {kind:"canvas",painter:"projectionKiosk",accent:ACCENT.gold,res:[1024,640],fps:4,syncGroup:"projection"};
MEDIA["projection-palace-pattern"] = {kind:"canvas",painter:"projectionPalace",accent:ACCENT.gold,res:[2048,1024],fps:8,syncGroup:"projection"};
MEDIA["projection-sculpture-pattern"] = {kind:"canvas",painter:"projectionSculpture",accent:ACCENT.ice,res:[2048,1536],fps:8,syncGroup:"projection"};
MEDIA["projection-crystal-pattern"] = {kind:"canvas",painter:"projectionCrystal",accent:ACCENT.ice,res:[2048,1536],fps:8,syncGroup:"projection"};
for(let variant=0;variant<8;variant++) MEDIA[`projection-application-${variant}`] = {
  kind:"canvas",painter:"projectionApplications",accent:ACCENT.gold,res:[1024,576],fps:4,variant,syncGroup:"projection",
};
