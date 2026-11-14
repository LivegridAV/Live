"use client";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { PROJECTION_ROOT, inProjectionShowcase } from "../data/projection";
import { RENTAL2026_ROOT, inRental2026 } from "../data/ledRental2026";
import { journey } from "../systems/journey";
import { GRAND, type GrandStall } from "../data/grand";
import { stallAtProgress } from "../data/stallVisits";
import { useVenue } from "../systems/store";

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
  const focus = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => lights.forEach(light => light.dispose()), [lights]);
  useFrame(({camera}) => {
    candidates.length = 0;
    // A pavilion overview is photographed across the aisle. Select fixtures
    // lighting that pavilion rather than fixtures beside the camera's back.
    const projection=inProjectionShowcase(journey.progress);
    const rental=inRental2026(journey.progress);
    const activeStall=useVenue.getState().stallVisit?.stall ?? stallAtProgress(journey.progress);
    if(activeStall)focus.set(...GRAND.placements[activeStall].root as [number,number,number]);
    else if(projection)focus.set(...PROJECTION_ROOT);
    else if(rental)focus.set(...RENTAL2026_ROOT);
    else focus.copy(camera.position);
    for (const e of sources) {
      let visible = true, projectionFixture=false,rentalFixture=false,fixtureStall:GrandStall|null=null;
      for (let p = e.light.parent; p; p = p.parent) {
        if (!p.visible) { visible = false; break; }
        if(p.userData.projectionPavilion)projectionFixture=true;
        if(p.userData.rental2026Pavilion)rentalFixture=true;
        if(p.userData.grandStall)fixtureStall=p.userData.grandStall;
      }
      if(projectionFixture)fixtureStall="projection";
      if(rentalFixture)fixtureStall="led-rental";
      if (!visible || e.light.intensity <= 0 || (activeStall&&fixtureStall!==activeStall)
        || (!activeStall&&projection&&!projectionFixture) || (!activeStall&&rental&&!rentalFixture)) continue;
      e.light.getWorldPosition(e.position);
      const distance = e.position.distanceTo(focus);
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
