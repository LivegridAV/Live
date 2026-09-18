import type { ShaderProgramId } from "../media/programs";
import type { PainterId } from "../media/painters";
import { PAVILIONS, PARTNER_BAY } from "./pavilions";
import { SERVICES } from "@/content/services";

/**
 * The media manifest — the one authoritative record of what plays where.
 *
 * Every screen in the venue names a media id and nothing else. No scene
 * component contains a file path, a resolution, a frame rate or a colour, so
 * re-cutting the entire visual package is an edit to this file and to nothing
 * else. That is deliberate: a venue with eighty-odd surfaces cannot be art
 * directed if the art direction is scattered through the geometry.
 *
 * ── Three kinds of media, chosen per surface ──
 *
 *   shader   a GPU programme (see media/programs.ts). Never freezes, never
 *            loops, costs no download, and is the right answer for abstract
 *            motion and for anything composed to a specific geometry.
 *   canvas   a Canvas2D painter (see media/painters.ts). The right answer for
 *            anything that has to be *read* — signage, cue lists, multiviews,
 *            stage plans — because it is real type and real UI rather than a
 *            movie of some.
 *   video    a looping file. The right answer for cinematic artwork that was
 *            rendered offline.
 *
 * ── Dropping in real artwork ──
 *
 * One line per surface, and nothing else in the codebase changes:
 *
 *   "stage-main": {
 *     kind: "video",
 *     desktop: "/media/corporate/hero-2160.mp4",
 *     mobile:  "/media/corporate/hero-720.mp4",
 *     poster:  "/media/corporate/hero.jpg",
 *     fit: "cover",
 *     brightness: 1.05,
 *     syncGroup: "stage",
 *   },
 *
 * The media families mirror the zones, so artwork can be commissioned per
 * installation and dropped in per folder:
 *
 *   /public/media/tunnel/          four-sided immersive tunnel
 *   /public/media/pillars/         four-sided totems (see the wrap note below)
 *   /public/media/cylinder/        360 degree wrap
 *   /public/media/ring/            continuous angular
 *   /public/media/bar/             fine-pitch fascia, wide
 *   /public/media/curved/          architectural radius
 *   /public/media/anamorphic/      corner illusion, rendered for the mark
 *   /public/media/content-studio/  pavilion hero + reel
 *   /public/media/corporate/       stage package A
 *   /public/media/festival/        stage package B
 *   /public/media/finale/          closing sequence
 *
 * ── Authoring notes that the geometry imposes ──
 *
 *   pillars    Artwork must be an UNWRAPPED strip: u runs once around the
 *              column as FRONT | RIGHT | BACK | LEFT and must be seamless
 *              left-to-right, because `PillarScreen` hands each face its own
 *              slice and the strip's two ends meet at a physical corner.
 *   cylinder   Same rule, one full revolution across the width.
 *   ring       Same rule, and short — the ring is 1.5 m tall and 34 m round.
 *   anamorphic Must be rendered from the viewing mark, not from the panel.
 *   blades     One wide composition; each blade takes a vertical slice.
 *
 * ── Synchronisation ──
 *
 * Surfaces carrying one composition share a `syncGroup`. The media engine
 * gives every member of a group a single master clock, so a ten-panel blade
 * array or a stage package spread over seven screens can never drift or
 * restart independently of itself.
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

export type MediaDesc = ShaderMedia | CanvasMedia | VideoMedia;

export const MEDIA: Record<string, MediaDesc> = {
  /* ── Arrival ──────────────────────────────────────────── */
  // The arch fascia. This has to *say the name* — an abstract brand sweep was
  // playing here, which is a fine motif and a poor sign.
  "entry-brand": { kind: "canvas", painter: "brandFascia", accent: ACCENT.brand, res: [1024, 192], fps: 12 },
  "entry-sign": { kind: "canvas", painter: "signWelcome", accent: ACCENT.brand, res: [768, 332], fps: 8 },
  "entry-blade": { kind: "shader", program: "pillarWrap", accent: ACCENT.ice, variant: 0.3, res: [512, 640], fps: 24, syncGroup: "entry" },

  /* ── Tunnel ───────────────────────────────────────────────
     The four-sided tunnel has no media id: it is not showing a texture at
     all. Its surfaces generate a shared virtual world from world-space
     position (see three/immersive.ts), which is what makes them continuous
     across every corner. */

  /* ── Vestibule, where the tunnel opens into the hall ──── */
  "vestibule-blade": { kind: "shader", program: "pillarWrap", accent: ACCENT.brand, variant: 0.42, res: [512, 768], fps: 30, syncGroup: "vestibule" },

  /* ── Hall + wayfinding ────────────────────────────────── */
  "sign-gallery": { kind: "canvas", painter: "signGallery", accent: ACCENT.brand, res: [512, 128], fps: 8 },
  "sign-services": { kind: "canvas", painter: "signServices", accent: ACCENT.brand, res: [512, 128], fps: 8 },
  "sign-arena": { kind: "canvas", painter: "signArena", accent: ACCENT.amber, res: [512, 128], fps: 8 },
  "hall-wordmark": { kind: "canvas", painter: "wordmark", accent: ACCENT.brand, res: [1024, 288], fps: 12 },

  /* ── Creative LED gallery ─────────────────────────────── */
  // The four-sided totems.
  //
  // `pillarWrap` is authored as an unwrapped strip that goes once around the
  // column, and `PillarScreen` hands each face its own quarter of it — so the
  // ribbons genuinely travel around the corners instead of restarting on
  // every face. The render is wide (1024) and tall (1024) because it is
  // carrying four faces' worth of image, not one.
  "pillar-flow": {
    kind: "shader", program: "pillarWrap", accent: ACCENT.ice, variant: 0.1,
    res: [1024, 1024], fps: 30, syncGroup: "pillars",
  },
  "pillar-metal": {
    kind: "shader", program: "pillarWrap", accent: ACCENT.gold, variant: 0.62,
    res: [1024, 1024], fps: 30, syncGroup: "pillars",
  },
  // The blade array is one composition cut across six panels, so it is one
  // clock: six panels each running their own copy would shear the image.
  "blade-rain": { kind: "shader", program: "chromeFlow", accent: ACCENT.indigo, variant: 0.8, res: [1024, 512], fps: 30, syncGroup: "blades" },
  // A full 360 degree wrap. `chromeFlow` is horizontally continuous enough to
  // carry it, and a cylinder is the one product where the eye can check.
  "cylinder-ribbon": { kind: "shader", program: "chromeFlow", accent: ACCENT.gold, res: [1280, 448], fps: 30, syncGroup: "cylinder" },
  // Continuous angular content on a 34 m circumference, 1.5 m tall.
  "ring-waves": { kind: "shader", program: "chromeFlow", accent: ACCENT.ice, res: [2048, 256], fps: 30, syncGroup: "ring" },
  // The fascia is a metre from the camera and its own header calls it
  // fine pitch. A matrix motif here contradicts the product in the same frame.
  "bar-brand": { kind: "shader", program: "chromeFlow", accent: ACCENT.magenta, variant: 0.45, res: [1280, 192], fps: 30, syncGroup: "bar" },
  "curve-natural": { kind: "shader", program: "auroraSilk", accent: ACCENT.lime, res: [896, 512], fps: 24, syncGroup: "curved" },
  // A flat slab field was reading as grey card. A lattice running into depth
  // gives the cut silhouette something worth being cut around.
  "mosaic-arch": { kind: "shader", program: "portalDepth", accent: ACCENT.indigo, res: [768, 576], fps: 24, syncGroup: "mosaic" },
  "anamorphic": { kind: "shader", program: "anamorphicVoid", accent: ACCENT.ice, res: [896, 640], fps: 24, syncGroup: "anamorphic" },

  /* ── 01 · AV engineering ──────────────────────────────── */
  "av-signal-diagram": { kind: "canvas", painter: "avSignalDiagram", accent: ACCENT.teal, res: [512, 288], fps: 15 },
  "av-led-plan": { kind: "canvas", painter: "avLedPlan", accent: ACCENT.steel, res: [448, 256], fps: 10 },
  "av-rack-status": { kind: "canvas", painter: "avRackStatus", accent: ACCENT.teal, res: [320, 384], fps: 8 },

  /* ── 02 · Content studio ──────────────────────────────── */
  "content-motion": { kind: "shader", program: "chromeFlow", accent: ACCENT.magenta, variant: 0.2, res: [640, 360], fps: 30 },
  "content-3d": { kind: "shader", program: "architecture", accent: ACCENT.copper, variant: 0.5, res: [256, 256], fps: 20 },
  "content-anamorphic": { kind: "shader", program: "anamorphicVoid", accent: ACCENT.amber, variant: 0.7, res: [384, 384], fps: 24 },

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
  "approach-pillar": { kind: "shader", program: "pillarWrap", accent: ACCENT.gold, variant: 0.18, res: [1024, 896], fps: 30, syncGroup: "approach" },
  "approach-portrait": { kind: "shader", program: "chromeFlow", accent: ACCENT.amber, variant: 0.15, res: [320, 640], fps: 30, syncGroup: "approach" },

  /* ── Main stage: the mode switch lives here ───────────── */
  "stage-main": {
    kind: "shader",
    program: "premiumOrbit",
    festival: "festivalMonument",
    accent: ACCENT.ice,
    festivalAccent: "#b05ad6",
    res: [1280, 576],
    fps: 60,
    syncGroup: "stage",
  },
  // Side screens run the same content family as the main wall — that is what a
  // real show does, and it keeps the room reading as one design.
  "stage-side": {
    kind: "shader",
    program: "portalDepth",
    festival: "monumentPortal",
    accent: ACCENT.indigo,
    festivalAccent: ACCENT.ember,
    variant: 0.62,
    res: [896, 576],
    fps: 30,
    syncGroup: "stage",
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
    program: "pillarWrap",
    festival: "pillarWrap",
    accent: ACCENT.gold,
    festivalAccent: "#b464e0",
    variant: 0.55,
    res: [256, 896],
    fps: 30,
    syncGroup: "stage",
  },
  // Portrait fillers: two slices of one render, so a pair reads as one image
  // split by the gap between them.
  "stage-portrait": {
    kind: "shader",
    program: "chromeFlow",
    festival: "pillarWrap",
    accent: ACCENT.magenta,
    festivalAccent: "#a86ad6",
    variant: 0.34,
    res: [512, 896],
    fps: 30,
    syncGroup: "stage",
  },
  // The canted outer clusters, upper and lower halves of one render.
  "stage-outer": {
    kind: "shader",
    program: "auroraSilk",
    festival: "monumentPortal",
    accent: ACCENT.coral,
    festivalAccent: "#9a5ad0",
    variant: 0.78,
    res: [768, 512],
    fps: 30,
    syncGroup: "stage",
  },
  "stage-floor": {
    kind: "shader",
    program: "portalDepth",
    festival: "volumetric",
    accent: ACCENT.ice,
    festivalAccent: ACCENT.ember,
    variant: 0.7,
    res: [768, 384],
    fps: 24,
    syncGroup: "stage",
  },
  "stage-wing": {
    kind: "shader",
    program: "chromeFlow",
    festival: "monumentPortal",
    accent: ACCENT.indigo,
    festivalAccent: "#a54fb0",
    variant: 0.85,
    res: [640, 512],
    fps: 24,
    syncGroup: "stage",
  },

  /* ── Finale ───────────────────────────────────────────── */
  // Every major surface in the room plays this one render at the finale, so
  // it has to be one clock or the room would not land together.
  "finale": { kind: "shader", program: "finaleBrand", accent: ACCENT.brand, res: [1024, 448], fps: 30, syncGroup: "finale" },
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
