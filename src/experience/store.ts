"use client";
import {
  useEffect as reactUseEffect,
  useState as reactUseState,
} from "react";
import { create } from "zustand";

/**
 * Global experience state.
 *
 * Discrete UI state lives in zustand (re-renders are fine there).
 * Continuous per-frame values (scroll progress, pointer) live in
 * `signals` below as plain mutable refs so the render loop can read
 * them without triggering React renders.
 */

export type ColorTheme = "signal" | "cyber" | "ember";

export interface EquipmentInfo {
  id: string;
  name: string;
  role: string;
  specs: [string, string][];
}

interface ExperienceState {
  /** Venue has been powered on by the visitor (click on the pulse). */
  powered: boolean;
  /** Boot animation finished — scroll unlocked. */
  booted: boolean;

  /* ── Stage control panel ────────────────────────────── */
  lasers: boolean;
  smoke: boolean;
  stageLights: boolean;
  audienceLights: boolean;
  ledContent: number; // cycles LED wall programs
  theme: ColorTheme;

  /* ── Interactions ───────────────────────────────────── */
  specCard: EquipmentInfo | null;
  activeService: number | null;
  activeProject: number | null;
  activeDemo: number | null; // naked-eye 3D demo playing in universe
  fireworksBurst: number; // increment to launch a burst

  /* ── System ─────────────────────────────────────────── */
  audioOn: boolean;
  musicOn: boolean;
  cyberMode: boolean;
  showCredits: boolean;
  quality: "high" | "low";

  powerOn: () => void;
  finishBoot: () => void;
  toggle: (key: "lasers" | "smoke" | "stageLights" | "audienceLights" | "audioOn" | "musicOn") => void;
  cycleLedContent: () => void;
  setTheme: (t: ColorTheme) => void;
  setSpecCard: (e: EquipmentInfo | null) => void;
  setActiveService: (i: number | null) => void;
  setActiveProject: (i: number | null) => void;
  setActiveDemo: (i: number | null) => void;
  launchFireworks: () => void;
  setCyberMode: (on: boolean) => void;
  setShowCredits: (on: boolean) => void;
  setQuality: (q: "high" | "low") => void;
}

export const useExperience = create<ExperienceState>((set) => ({
  powered: false,
  booted: false,

  lasers: true,
  smoke: true,
  stageLights: true,
  audienceLights: true,
  ledContent: 0,
  theme: "signal",

  specCard: null,
  activeService: null,
  activeProject: null,
  activeDemo: null,
  fireworksBurst: 0,

  audioOn: true,
  musicOn: false,
  cyberMode: false,
  showCredits: false,
  quality: "high",

  powerOn: () => set({ powered: true }),
  finishBoot: () => set({ booted: true }),
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<ExperienceState>),
  cycleLedContent: () => set((s) => ({ ledContent: (s.ledContent + 1) % 4 })),
  setTheme: (theme) => set({ theme }),
  setSpecCard: (specCard) => set({ specCard }),
  setActiveService: (activeService) => set({ activeService }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setActiveDemo: (activeDemo) => set({ activeDemo }),
  launchFireworks: () => set((s) => ({ fireworksBurst: s.fireworksBurst + 1 })),
  setCyberMode: (cyberMode) =>
    set({ cyberMode, theme: cyberMode ? "cyber" : "signal" }),
  setShowCredits: (showCredits) => set({ showCredits }),
  setQuality: (quality) => set({ quality }),
}));

/* ── Per-frame mutable signals (never trigger React renders) ── */
export const signals = {
  /** Smoothed scroll progress 0..1 across the whole journey. */
  progress: 0,
  /** Raw (unsmoothed) scroll progress. */
  rawProgress: 0,
  /** Pointer in NDC (-1..1), smoothed for camera parallax. */
  pointer: { x: 0, y: 0 },
  pointerSmooth: { x: 0, y: 0 },
  /** Seconds since the venue powered on (0 while dark). */
  poweredAt: 0,
  /** A scene prop (cylinder, lab device…) owns the current drag. */
  sceneGrab: false,
};

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const w = window as unknown as Record<string, unknown>;
  w.__lgSignals = signals;
  w.__lgStore = useExperience;
}

/* ── Theme palettes used by materials + shaders ── */
export const THEMES: Record<
  ColorTheme,
  { accent: string; glow: string; deep: string; warm: string }
> = {
  signal: { accent: "#1fa093", glow: "#3fd6c8", deep: "#0a1411", warm: "#e8b84a" },
  cyber: { accent: "#a04ae8", glow: "#e84ad4", deep: "#120a18", warm: "#4ad4e8" },
  ember: { accent: "#e86a2a", glow: "#ffb35c", deep: "#181008", warm: "#3fd6c8" },
};

/* ── Chapter map: where each scene lives in scroll space ── */
export const CHAPTERS = {
  stage: [0.0, 0.12],
  approach: [0.12, 0.24],
  vault: [0.24, 0.32],
  universe: [0.32, 0.44],
  services: [0.44, 0.56],
  stats: [0.56, 0.66],
  lab: [0.66, 0.76],
  projects: [0.76, 0.86],
  finale: [0.86, 1.0],
} as const;

export type ChapterKey = keyof typeof CHAPTERS;

/** 0 → 1 within a chapter, clamped. */
export function chapterT(progress: number, key: ChapterKey): number {
  const [a, b] = CHAPTERS[key];
  return Math.min(1, Math.max(0, (progress - a) / (b - a)));
}

/**
 * React state that flips when scroll progress enters/leaves [from, to].
 * Needed for drei <Html> content: DOM isn't frustum-culled, so labels
 * from far rooms would bleed through every scene without this.
 */
export function useChapterActive(from: number, to: number): boolean {
  const [active, setActive] = reactUseState(
    () => signals.progress >= from && signals.progress <= to,
  );
  reactUseEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = signals.progress;
      const now = p >= from && p <= to;
      setActive((prev) => (prev === now ? prev : now));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  return active;
}
