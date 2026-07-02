"use client";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { signals, useExperience } from "./store";

/**
 * Scroll-driven camera path. The world is a sequence of "rooms" laid out
 * along -Z; keyframes map journey progress → camera position + look target.
 * Mouse adds a subtle parallax so the venue always feels alive.
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

export default function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const booted = useExperience((s) => s.booted);
  const pos = useRef(new THREE.Vector3(0, 3.4, 30));
  const look = useRef(new THREE.Vector3(0, 5, 0));
  const shake = useRef(0);

  useFrame((state) => {
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

  // expose a shake trigger via the store subscription (power-on moment)
  useRef(
    useExperience.subscribe((s, prev) => {
      if (s.powered && !prev.powered) shake.current = 0.5;
    }),
  );

  return null;
}
