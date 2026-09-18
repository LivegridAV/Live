"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { MediaEngine } from "./engine";
import { CRITICAL_MEDIA } from "../data/media";
import { useVenue } from "../systems/store";

const Ctx = createContext<MediaEngine | null>(null);

export function useMedia() {
  const engine = useContext(Ctx);
  if (!engine) throw new Error("useMedia must be used inside <MediaProvider>");
  return engine;
}

/**
 * Owns the single MediaEngine and ticks it once per frame, before the main
 * render pass. Everything that shows moving content in the venue goes through
 * here, so there is exactly one place that spends GPU time on LED content.
 */
export function MediaProvider({ children }: { children: ReactNode }) {
  const gl = useThree((s) => s.gl);
  const quality = useVenue((s) => s.quality);
  const isMobile = useVenue((s) => s.isMobile);

  const engine = useMemo(() => new MediaEngine(gl), [gl]);

  useEffect(() => {
    engine.setMobile(isMobile);
    engine.setQuality(quality);
    engine.prime(CRITICAL_MEDIA);
    return () => engine.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useEffect(() => engine.setQuality(quality), [engine, quality]);
  useEffect(() => engine.setMobile(isMobile), [engine, isMobile]);
  // The mode is *not* applied here. Switching creative direction is a cue with
  // a dip in the middle, and `systems/ShowCue` is what decides when the content
  // is allowed to change — see that file.

  useFrame((_, dt) => engine.update(Math.min(dt, 0.1)));

  return <Ctx.Provider value={engine}>{children}</Ctx.Provider>;
}

/**
 * Acquire a media texture and keep the engine informed about how much this
 * screen matters right now, based on distance from the camera and whether the
 * surface is facing it at all.
 */
export function useScreenTexture(
  id: string,
  ref: React.RefObject<THREE.Mesh | null>,
  range = 70,
) {
  const engine = useMedia();
  const texture = useMemo(() => engine.acquire(id), [engine, id]);
  const pos = useRef(new THREE.Vector3());
  const normal = useRef(new THREE.Vector3());
  const toCam = useRef(new THREE.Vector3());
  const quat = useRef(new THREE.Quaternion());

  useEffect(() => () => engine.release(id), [engine, id]);

  useFrame(({ camera }) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.getWorldPosition(pos.current);
    const d = pos.current.distanceTo(camera.position);
    if (d >= range) return; // out of range: the engine keeps it ticking slowly
    let importance = 1 - d / range;

    // Surfaces turned away from the camera still tick, just far more slowly.
    mesh.getWorldQuaternion(quat.current);
    normal.current.set(0, 0, 1).applyQuaternion(quat.current);
    toCam.current.subVectors(camera.position, pos.current).normalize();
    if (normal.current.dot(toCam.current) < -0.15) importance *= 0.12;

    engine.touch(id, importance * importance); // bias the budget toward close screens
  });

  return texture;
}
