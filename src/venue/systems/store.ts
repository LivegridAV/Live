import { create } from "zustand";

/**
 * Single source of runtime truth for the venue walkthrough.
 *
 * The whole experience is driven by one number — `progress`, 0 → 1 along the
 * camera path. Everything else (which zone is active, which pavilion is in
 * range, how bright the house lights are) is derived from it, so the DOM
 * overlay and the WebGL scene can never disagree about where the visitor is.
 */

export type StageMode = "corporate" | "festival";
export type QualityTier = "low" | "medium" | "high";

export interface VenueState {
  /* ── journey ── */
  /** 0 → 1 along the full camera path. Written every frame by ScrollRig. */
  progress: number;
  /** Id of the zone the camera is currently inside. */
  zone: string;
  /** Scroll velocity, -1 → 1, used for motion-reactive lighting. */
  velocity: number;
  /** The visitor has scrolled past the walkthrough into the written content. */
  pastVenue: boolean;

  /* ── loading ── */
  loaded: boolean;
  loadPercent: number;
  /** The visitor has pressed ENTER THE EXPERIENCE. */
  entered: boolean;

  /* ── interaction ── */
  /** Slug of the pavilion whose detail panel is open, or null. */
  activePavilion: string | null;
  /** Progress value to restore to when the panel closes. */
  restoreProgress: number | null;
  stageMode: StageMode;
  /** Visitor asked for the low-motion guided route. */
  reducedMotion: boolean;
  contactOpen: boolean;
  navOpen: boolean;

  /* ── device ── */
  quality: QualityTier;
  isMobile: boolean;

  /* ── actions ── */
  setProgress: (p: number, velocity?: number) => void;
  setPastVenue: (v: boolean) => void;
  setZone: (id: string) => void;
  setLoadPercent: (p: number) => void;
  setLoaded: (v: boolean) => void;
  enter: () => void;
  openPavilion: (slug: string) => void;
  closePavilion: () => void;
  setStageMode: (m: StageMode) => void;
  setReducedMotion: (v: boolean) => void;
  setContactOpen: (v: boolean) => void;
  setNavOpen: (v: boolean) => void;
  setQuality: (q: QualityTier) => void;
  setIsMobile: (v: boolean) => void;
}

export const useVenue = create<VenueState>((set, get) => ({
  progress: 0,
  zone: "arrival",
  velocity: 0,
  pastVenue: false,
  loaded: false,
  loadPercent: 0,
  entered: false,
  activePavilion: null,
  restoreProgress: null,
  stageMode: "corporate",
  reducedMotion: false,
  contactOpen: false,
  navOpen: false,
  quality: "high",
  isMobile: false,

  setProgress: (p, velocity = 0) => set({ progress: p, velocity }),
  setPastVenue: (v) => {
    if (get().pastVenue !== v) set({ pastVenue: v });
  },
  setZone: (id) => {
    if (get().zone !== id) set({ zone: id });
  },
  setLoadPercent: (p) => set({ loadPercent: p }),
  setLoaded: (v) => set({ loaded: v }),
  enter: () => set({ entered: true }),

  openPavilion: (slug) =>
    set({ activePavilion: slug, restoreProgress: get().progress }),
  closePavilion: () => set({ activePavilion: null }),

  setStageMode: (m) => set({ stageMode: m }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setContactOpen: (v) => set({ contactOpen: v }),
  setNavOpen: (v) => set({ navOpen: v }),
  setQuality: (q) => set({ quality: q }),
  setIsMobile: (v) => set({ isMobile: v }),
}));

/** Non-reactive read for use inside useFrame (avoids re-render churn). */
export const venue = () => useVenue.getState();
