"use client";
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createSample, samplePath } from "../data/path";
import { journey } from "./journey";
import { venue } from "./store";

/**
 * The camera walk.
 *
 * Scroll sets where along the path the camera is; everything else here exists
 * so it behaves like a camera an operator is holding rather than a value being
 * interpolated — a slow idle drift when the visitor stops, a little parallax
 * from the pointer, and a lean into the direction of travel.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const sample = useMemo(() => createSample(), []);
  const smoothPos = useRef(new THREE.Vector3(0, 2.35, 21));
  const smoothLook = useRef(new THREE.Vector3(0, 4.1, -1));
  const drift = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const started = useRef(false);

  useFrame((state, dt) => {
    const d = Math.min(0.1, dt);
    const s = venue();
    samplePath(journey.progress, sample);

    // Idle drift — the room keeps breathing when the visitor stops scrolling.
    const t = state.clock.elapsedTime;
    const idleAmount = Math.min(1, journey.idle / 1.2) * (s.reducedMotion ? 0.2 : 1);
    drift.current.set(
      Math.sin(t * 0.21) * 0.16 * idleAmount,
      Math.sin(t * 0.17 + 1.3) * 0.09 * idleAmount,
      Math.sin(t * 0.13 + 2.1) * 0.1 * idleAmount,
    );

    // Pointer parallax, damped and scaled down on touch devices.
    const par = s.isMobile || s.reducedMotion ? 0 : 1;
    const px = journey.pointerX * 0.34 * par;
    const py = -journey.pointerY * 0.18 * par;

    tmp.current.copy(sample.pos).add(drift.current);
    tmp.current.x += px;
    tmp.current.y += py;

    // Portrait correction. The path is composed for a wide frame; on a phone
    // the same position leaves the subject small and the frame half empty, so
    // the camera dollies in toward what it is looking at rather than the story
    // being rebuilt for mobile.
    // Portrait correction. The path is composed for a wide frame, and a narrow
    // one needs opposite treatment depending on the shot: a close subject has
    // to be approached to fill the frame, while a wide establishing shot has to
    // be backed away from or the arena simply becomes a wall. The camera's own
    // distance to what it is looking at tells us which kind of shot this is.
    const aspect = size.width / Math.max(1, size.height);
    const narrow = THREE.MathUtils.clamp((1.25 - aspect) / 0.8, 0, 1);
    if (narrow > 0) {
      const dist = tmp.current.distanceTo(sample.look);
      if (dist > 0.5) {
        const establishing = dist > 16 || (journey.progress > 0.575 && journey.progress < 0.81);
        const move = establishing
          ? -Math.min(dist * 0.6 * narrow, 26)
          : Math.min(dist * 0.22 * narrow, 3.2);
        tmp.current.lerp(sample.look, move / dist);
        // The service hall is 38 m wide. A portrait establishing dolly must
        // not pass through its opposite wall or put the camera behind a stand.
        if (journey.progress > 0.575 && journey.progress < 0.81) {
          tmp.current.x = THREE.MathUtils.clamp(tmp.current.x, -16.8, 16.8);
        }
      }
    }

    const follow = started.current ? Math.min(1, d * 6.5) : 1;
    started.current = true;
    smoothPos.current.lerp(tmp.current, follow);

    tmp.current.copy(sample.look);
    tmp.current.x += px * 1.6 + drift.current.x * 0.5;
    tmp.current.y += py * 1.2;
    smoothLook.current.lerp(tmp.current, follow);

    camera.position.copy(smoothPos.current);
    camera.lookAt(smoothLook.current);

    // A subtle roll into the direction of travel; it reads as momentum.
    const lean = THREE.MathUtils.clamp(journey.velocity * 0.9, -0.05, 0.05);
    camera.rotation.z += lean * (s.reducedMotion ? 0.2 : 1);

    // Widen a little on narrow frames so walls and trusses are not clipped.
    const fovTarget = sample.fov * (1 + narrow * 0.17);
    if (Math.abs(camera.fov - fovTarget) > 0.01) {
      camera.fov += (fovTarget - camera.fov) * Math.min(1, d * 5);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
