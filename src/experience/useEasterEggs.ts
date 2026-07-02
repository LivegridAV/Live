"use client";
import { useEffect, useRef } from "react";
import { audio } from "./audio";
import { useExperience } from "./store";

const KONAMI = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a",
];

/**
 * Secret layer:
 *  Konami code → cyber mode · L → lasers · S → smoke · M → music
 *  double-click anywhere → fireworks (5-click logo credits live in the HUD)
 */
export function useEasterEggs() {
  const buffer = useRef<string[]>([]);

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const s = useExperience.getState();
      if (!s.booted) return;

      // konami buffer
      buffer.current = [...buffer.current, e.key].slice(-KONAMI.length);
      if (KONAMI.every((k, i) => buffer.current[i]?.toLowerCase() === k.toLowerCase())) {
        buffer.current = [];
        s.setCyberMode(!s.cyberMode);
        audio.powerOn();
      }

      const key = e.key.toLowerCase();
      if (key === "l") { s.toggle("lasers"); audio.blip(1.6); }
      if (key === "s") { s.toggle("smoke"); audio.blip(0.8); }
      if (key === "m") { s.toggle("musicOn"); audio.blip(1.2); }
    };

    const onDoubleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("button, a, input, textarea, form")) return;
      const s = useExperience.getState();
      if (!s.booted) return;
      s.launchFireworks();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("dblclick", onDoubleClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dblclick", onDoubleClick);
    };
  }, []);
}
