"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

type Emitter = { light: THREE.PointLight; position: THREE.Vector3; score: number };
const Registry = createContext<Set<Emitter> | null>(null);

/** Local fixtures are candidates, not additional shader lights. Zone visibility
 * must never change NUM_POINT_LIGHTS and compile a whole new venue mid-scroll. */
export function LocalPointLight(props: ThreeElements["pointLight"]) {
  const sources = useContext(Registry);
  const ref = useRef<THREE.PointLight>(null);
  useEffect(() => {
    if (!sources || !ref.current) return;
    const emitter = { light: ref.current, position: new THREE.Vector3(), score: 0 };
    sources.add(emitter);
    return () => { sources.delete(emitter); };
  }, [sources]);
  return <pointLight {...props} ref={ref} visible={false} />;
}

/** Six nearby fixtures retain the authored colours, falloff and positions.
 * Unused slots stay registered at zero intensity, so the shader layout is fixed. */
export function LocalLightPool({ children }: { children: ReactNode }) {
  const sources = useMemo(() => new Set<Emitter>(), []);
  const lights = useMemo(() => Array.from({length:6}, () => new THREE.PointLight(0xffffff, 0, 1, 2)), []);
  const candidates = useMemo(() => [] as Emitter[], []);
  useEffect(() => () => lights.forEach(light => light.dispose()), [lights]);
  useFrame(({camera}) => {
    candidates.length = 0;
    for (const e of sources) {
      let visible = true;
      for (let p = e.light.parent; p; p = p.parent) if (!p.visible) { visible = false; break; }
      if (!visible || e.light.intensity <= 0) continue;
      e.light.getWorldPosition(e.position);
      const distance = e.position.distanceTo(camera.position);
      if (e.light.distance > 0 && distance > e.light.distance + 18) continue;
      e.score = e.light.intensity / Math.max(4, distance * distance);
      candidates.push(e);
    }
    candidates.sort((a,b) => b.score-a.score);
    lights.forEach((light,i) => {
      const e = candidates[i];
      light.intensity = e?.light.intensity ?? 0;
      if (!e) return;
      light.position.copy(e.position);
      light.color.copy(e.light.color);
      light.distance = e.light.distance;
      light.decay = e.light.decay;
    });
  }, -1);
  return <Registry.Provider value={sources}>
    {lights.map(light => <primitive key={light.uuid} object={light} />)}
    {children}
  </Registry.Provider>;
}
