"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { signals, useExperience } from "./store";

/**
 * Scroll-driven camera path. The world is a sequence of "rooms" laid out
 * along -Z; keyframes map journey progress → camera position + look target.
 * Mouse adds a subtle parallax so the venue always feels alive.
 *
 * Free look: dragging on empty space rotates the view — full 360° yaw and
 * clamped pitch — so visitors can turn around and take in the cosmos.
 * Releasing eases the view back onto the authored tour. Prop drags (the
 * services cylinder, lab devices) win via `signals.sceneGrab`, and drags
 * that start over UI or an interactive prop are ignored.
 */

interface Key {
  p: number; // progress 0..1
  pos: [number, number, number];
  look: [number, number, number];
  fov?: number;
}

// Stations: stage wall z=0 · universe -40 · services -80 · stats -120
//           lab -160 · projects -200 · finale stage -250
const KEYS: Key[] = [
  { p: 0.0, pos: [0, 3.4, 30], look: [0, 5, 0], fov: 55 }, // wide on the stage
  { p: 0.12, pos: [0, 4.5, 18], look: [0, 5.5, 0], fov: 52 }, // walking in
  { p: 0.2, pos: [0, 5.5, 9], look: [0, 5.5, 0], fov: 50 }, // LED wall fills view
  { p: 0.27, pos: [0, 5.5, 4.2], look: [0, 5.5, 0], fov: 48 }, // pixel level / vault
  { p: 0.32, pos: [0, 5.5, -8], look: [0, 5.5, -40], fov: 60 }, // through the iris
  { p: 0.38, pos: [0, 4, -22], look: [0, 3, -40], fov: 58 }, // universe
  { p: 0.44, pos: [0, 3, -56], look: [0, 3, -80], fov: 55 },
  { p: 0.5, pos: [0, 3, -64], look: [0, 3, -80], fov: 55 }, // services cylinder
  { p: 0.56, pos: [0, 4, -96], look: [0, 4, -120], fov: 55 },
  { p: 0.62, pos: [0, 4.5, -104], look: [0, 5, -120], fov: 55 }, // stat pillars
  { p: 0.66, pos: [0, 4, -136], look: [0, 3.5, -160], fov: 55 },
  { p: 0.72, pos: [0, 3.5, -144], look: [0, 3.5, -160], fov: 55 }, // equipment lab
  { p: 0.76, pos: [0, 5, -174], look: [0, 4, -200], fov: 56 },
  { p: 0.83, pos: [0, 4.5, -184], look: [0, 4, -200], fov: 56 }, // projects city
  { p: 0.88, pos: [0, 4, -218], look: [0, 5, -250], fov: 55 },
  { p: 1.0, pos: [0, 3.4, -224], look: [0, 6, -250], fov: 55 }, // finale stage
];

const smooth = (t: number) => t * t * (3 - 2 * t);

const UP = new THREE.Vector3(0, 1, 0);
const tmpDir = new THREE.Vector3();
const tmpRight = new THREE.Vector3();

export default function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const booted = useExperience((s) => s.booted);
  const pos = useRef(new THREE.Vector3(0, 3.4, 30));
  const look = useRef(new THREE.Vector3(0, 5, 0));
  const shake = useRef(0);
  const freeLook = useRef({ yaw: 0, pitch: 0, active: false, touchActive: false, lastX: 0, lastY: 0 });
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    (window as unknown as Record<string, unknown>).__lgFreeLook = freeLook.current;
  }

  // drag-to-look listeners
  useEffect(() => {
    const l = freeLook.current;
    const down = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // touch drag scrolls the journey
      if (e.button !== 0) return;
      if (!useExperience.getState().booted) return;
      const t = e.target as HTMLElement | null;
      // over HUD / console / forms — not a look gesture
      if (t && t.closest("button, a, input, textarea, [role='button']")) return;
      // over an interactive prop (they set the cursor on hover)
      const cursor = document.body.style.cursor;
      if (cursor === "pointer" || cursor === "grab") return;
      l.active = true;
      l.lastX = e.clientX;
      l.lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!l.active) return;
      if (signals.sceneGrab) { l.active = false; return; } // a prop drag won
      // button no longer held (missed pointerup) — end the drag
      if (e.buttons === 0) { up(); return; }
      // grab-the-world convention: drag the sky down to look up
      l.yaw += (e.clientX - l.lastX) * 0.0032;
      l.pitch += (e.clientY - l.lastY) * 0.0026;
      l.pitch = Math.max(-1.25, Math.min(1.25, l.pitch));
      l.lastX = e.clientX;
      l.lastY = e.clientY;
    };
    const up = () => {
      if (!l.active) return;
      l.active = false;
      // unwind by the short way home
      l.yaw = Math.atan2(Math.sin(l.yaw), Math.cos(l.yaw));
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  // touch swipe-to-look (yaw only). A horizontal-dominant swipe turns the view;
  // a vertical swipe falls straight through to the page scroll (the journey),
  // so we never trap scrolling. Pitch stays mouse-only — it can't fight scroll.
  useEffect(() => {
    const l = freeLook.current;
    const g = { on: false, mode: "" as "" | "look" | "scroll", sx: 0, sy: 0, lx: 0, vel: 0 };
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (!useExperience.getState().booted || signals.sceneGrab) return;
      const t = e.target as HTMLElement | null;
      if (t && typeof t.closest === "function" &&
          t.closest("button, a, input, textarea, select, [role='button']")) return;
      const cur = document.body.style.cursor;
      if (cur === "pointer" || cur === "grab") return;
      g.on = true; g.mode = ""; g.vel = 0;
      g.sx = g.lx = e.touches[0].clientX;
      g.sy = e.touches[0].clientY;
    };
    const move = (e: TouchEvent) => {
      if (!g.on || e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      if (!g.mode) {
        const dx = Math.abs(x - g.sx);
        const dy = Math.abs(y - g.sy);
        if (dx < 8 && dy < 8) return; // wait until the intent is clear
        // horizontal-dominant → look; otherwise let the page scroll
        g.mode = dx > dy * 1.3 ? "look" : "scroll";
        if (g.mode === "scroll") { g.on = false; return; }
        l.touchActive = true;
      }
      if (g.mode === "look") {
        const dxm = x - g.lx;
        l.yaw += dxm * 0.005;
        g.vel = dxm;
        g.lx = x;
        if (e.cancelable) e.preventDefault(); // hold the horizontal swipe for the look
      }
    };
    const end = () => {
      if (!g.on && g.mode !== "look") { l.touchActive = false; return; }
      g.on = false;
      l.touchActive = false;
      l.yaw += g.vel * 0.02; // a little inertia
      l.yaw = Math.atan2(Math.sin(l.yaw), Math.cos(l.yaw));
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, []);

  useFrame((state, delta) => {
    const p = signals.progress;

    // find segment
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].p < p) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = smooth(
      Math.min(1, Math.max(0, (p - a.p) / Math.max(1e-5, b.p - a.p))),
    );

    pos.current.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * t,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t,
    );
    look.current.set(
      a.look[0] + (b.look[0] - a.look[0]) * t,
      a.look[1] + (b.look[1] - a.look[1]) * t,
      a.look[2] + (b.look[2] - a.look[2]) * t,
    );

    // pointer parallax — smaller once we're travelling
    const px = signals.pointerSmooth.x;
    const py = signals.pointerSmooth.y;
    pos.current.x += px * 1.4;
    pos.current.y += py * 0.7;
    look.current.x += px * 2.2;
    look.current.y += py * 1.1;

    // ── mobile/portrait recomposition (brief §26): a tall frame shows too much
    // dark void and shrinks the wall, so dolly the OPENING closer and raise it
    // a touch — an intentional mobile camera, not the desktop shot letterboxed.
    const aspect = camera.aspect;
    if (aspect < 0.85 && p < 0.14) {
      const stageAmt = 1 - smooth(THREE.MathUtils.clamp(p / 0.14, 0, 1));
      const portrait = 0.85 - aspect; // 0 at 0.85 → ~0.39 at 9:19.5
      pos.current.z -= stageAmt * portrait * 30;
      pos.current.y += stageAmt * portrait * 1.4;
    }

    // gentle breathing before boot so the dark room isn't static
    if (!booted) {
      pos.current.y += Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
    }

    // power-on shake burst (decays)
    if (shake.current > 0.001) {
      pos.current.x += (Math.random() - 0.5) * shake.current;
      pos.current.y += (Math.random() - 0.5) * shake.current;
      shake.current *= 0.92;
    }

    // free-look: rotate the view direction around the camera position
    const fl = freeLook.current;
    if (!fl.active && !fl.touchActive) {
      const decay = 1 - Math.min(1, delta * 1.8);
      fl.yaw *= decay;
      fl.pitch *= decay;
    }
    if (Math.abs(fl.yaw) > 1e-4 || Math.abs(fl.pitch) > 1e-4) {
      tmpDir.subVectors(look.current, pos.current);
      tmpDir.applyAxisAngle(UP, fl.yaw);
      tmpRight.crossVectors(tmpDir, UP).normalize();
      tmpDir.applyAxisAngle(tmpRight, fl.pitch);
      look.current.copy(pos.current).add(tmpDir);
    }

    camera.position.lerp(pos.current, 0.12);
    camera.lookAt(look.current);
    if (process.env.NODE_ENV === "development") {
      const w = window as unknown as Record<string, unknown>;
      w.__lgCam = camera;
      w.__lgScene = state.scene;
      w.__lgGl = state.gl;
    }

    const fov = (a.fov ?? 55) + ((b.fov ?? 55) - (a.fov ?? 55)) * t;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * 0.1;
      camera.updateProjectionMatrix();
    }
  });

  // shake trigger on the power-on moment (subscription cleaned up on unmount)
  useEffect(
    () =>
      useExperience.subscribe((s, prev) => {
        if (s.powered && !prev.powered) shake.current = 0.5;
      }),
    [],
  );

  return null;
}
