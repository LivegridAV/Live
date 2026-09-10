"use client";
import { create } from "zustand";

/** The five immersive worlds (brief §3). Order = spatial travel order. */
export const WORLDS = [
  { id: "anamorphic", index: "01", title: "Anamorphic Stage", kind: "HERO EXPERIENCE",
    heroLines: ["WE TURN IDEAS", "INTO UNFORGETTABLE", "EXPERIENCES"],
    cta: "EXPLORE OUR WORLD",
    tags: ["Anamorphic Content", "LED Stages", "Live Production", "Immersive Experiences"] },
  { id: "corporate", index: "02", title: "Corporate Experience", kind: "HERO EXPERIENCE",
    heroLines: ["EVENTS", "THAT INSPIRE", "PROGRESS"],
    cta: "STEP INSIDE",
    tags: ["Immersive Stage", "3D Content", "Live Production", "Hybrid Events"] },
  { id: "festival", index: "03", title: "Music Festival Vibes", kind: "HERO EXPERIENCE",
    heroLines: ["MUSIC", "PEOPLE", "VISUALS TOGETHER"],
    cta: "FEEL THE ENERGY",
    tags: ["Festivals", "Clubs & Pubs", "Live Visuals", "Interactive Stage"] },
  { id: "social", index: "04", title: "Social Event Magic", kind: "HERO EXPERIENCE",
    heroLines: ["MOMENTS", "THAT LIVE", "FOREVER"],
    cta: "EXPLORE SCENE",
    tags: ["LED Stages", "3D Environments", "Anamorphic Content", "Floor LED"] },
  { id: "installation", index: "05", title: "360° Interactive Stage", kind: "HERO EXPERIENCE",
    heroLines: ["EXPLORE", "CREATE", "EXPERIENCE"],
    cta: "ENTER 360°",
    tags: ["Drag to Look Around", "Use Mouse / Touch", "Explore Hotspots", "Discover Our Services"] },
] as const;

export type WorldId = (typeof WORLDS)[number]["id"];
export type Quality = "ultra" | "high" | "balanced" | "mobile";

type State = {
  world: number;              // index into WORLDS
  transitioning: boolean;
  quality: Quality;
  muted: boolean;
  loaded: boolean;            // asset/first-frame ready
  explore: number;           // 0..1 drag-explore position within a world
  reducedMotion: boolean;
  setWorld: (i: number) => void;
  next: () => void;
  prev: () => void;
  setQuality: (q: Quality) => void;
  setMuted: (m: boolean) => void;
  setLoaded: (b: boolean) => void;
  setExplore: (v: number) => void;
  setReducedMotion: (b: boolean) => void;
};

export const useWorld = create<State>((set, get) => ({
  world: 0,
  transitioning: false,
  quality: "high",
  muted: true,
  loaded: false,
  explore: 0.5,
  reducedMotion: false,
  setWorld: (i) => {
    const n = Math.max(0, Math.min(WORLDS.length - 1, i));
    if (n === get().world) return;
    set({ transitioning: true, world: n, explore: 0.5 });
    window.setTimeout(() => set({ transitioning: false }), 1200);
  },
  next: () => get().setWorld(get().world + 1),
  prev: () => get().setWorld(get().world - 1),
  setQuality: (q) => set({ quality: q }),
  setMuted: (m) => set({ muted: m }),
  setLoaded: (b) => set({ loaded: b }),
  setExplore: (v) => set({ explore: Math.max(0, Math.min(1, v)) }),
  setReducedMotion: (b) => set({ reducedMotion: b }),
}));

/** Pick a render quality tier from device signals (brief §21). */
export function detectQuality(): Quality {
  if (typeof window === "undefined") return "high";
  const mobile = window.matchMedia("(max-width: 767px)").matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile) return "mobile";
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const dpr = window.devicePixelRatio || 1;
  if (mem >= 8 && cores >= 8 && dpr >= 1.5 && window.innerWidth >= 2200) return "ultra";
  if (mem >= 8 && cores >= 6) return "high";
  return "balanced";
}

export const QUALITY_DPR: Record<Quality, [number, number]> = {
  ultra: [1, 2],
  high: [1, 1.75],
  balanced: [1, 1.4],
  mobile: [1, 1.25],
};
