import { create } from "zustand";

export type EntranceMode = "arrival" | "calm" | "static" | "neutral";
export const useEntranceFinishes = create<{
  mode: EntranceMode; paused: boolean; reducedMotion: boolean; allowMotion: boolean; fallback:boolean;
}>(() => ({ mode: "arrival", paused: false, reducedMotion: false, allowMotion: false, fallback:false }));

/** One phase drives every LED face and both rills. No independent media clocks. */
export function createEntranceClock() {
  return { time: 0, cycles:0, gain: 1, from: 1, to: 1, blend: 2, mode: "arrival" as EntranceMode };
}
export function advanceEntranceClock(clock: ReturnType<typeof createEntranceClock>, dt: number,
  state: { mode: EntranceMode; paused: boolean; reducedMotion: boolean }, visible = true) {
  if (!visible) return;
  const d = Math.min(Math.max(dt, 0), .1);
  if (clock.mode !== state.mode) {
    clock.mode = state.mode; clock.from = clock.gain;
    clock.to = state.mode === "neutral" ? 0 : state.mode === "calm" ? .55 : 1; clock.blend = 0;
  }
  clock.blend = Math.min(2, clock.blend + d);
  const x = clock.blend / 2;
  clock.gain = clock.from + (clock.to - clock.from) * x * x * (3 - 2 * x);
  if (state.mode === "static" || state.reducedMotion) clock.time = 0;
  else if (!state.paused && state.mode !== "neutral") {
    if(clock.time+d>=24)clock.cycles++;
    clock.time = (clock.time + d) % 24;
  }
}
