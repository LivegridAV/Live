"use client";
import { Suspense, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { PAVILIONS, PARTNER_BAY } from "../data/pavilions";
import { PillarScreen, Screen } from "../three/screens";
import { ZoneGroup } from "../three/ZoneGroup";
import { useVenue } from "../systems/store";
import { ExpoAsset } from "../three/ExpoAsset";
import { prepareArchitecture } from "../three/architecturalFinish";
import layouts from "../../../public/models/expo/screen-layouts.json";

type Stand = (typeof PAVILIONS)[number] | typeof PARTNER_BAY;
type Aperture = { x: number; y: number; z: number; w: number; h: number; media: string; rotation?: number };

/** Nine authored Blender buildings. The offline source exports display
 * apertures so media stays registered with its architectural housing. */
function ExhibitionBuilding({ p }: { p: Stand }) {
  const { scene } = useGLTF(`/models/expo/${p.id}.glb`, false);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
    prepareArchitecture(clone);
    return clone;
  }, [scene]);
  const open = useVenue((s) => s.openPavilion);
  const apertures = (layouts as Record<string, Aperture[]>)[p.id];
  return (
    <group position={[p.side * 10.2, 0, p.z]} rotation={[0, -p.side * Math.PI / 2, 0]}
      scale={[['av-engineering','show-control','live-production'].includes(p.id) ? .68 : 1,1,1]}>
      <primitive object={model} dispose={null} />
      {p.id === "led-solutions" && <Screen media="entry-brand" width={6} height={0.85}
        position={[-1.4, 7.3, 1.08]} range={72} frame={false} flat brightness={1} />}
      {["spatial", "connected-events", "digital"].includes(p.id) && (
        <Screen media="entry-brand" width={5.2} height={0.78}
          position={[0, p.id === "spatial" ? 7.4 : p.id === "digital" ? 7.0 : 6.0, p.id === "digital" ? 1.05 : 1.1]}
          range={72} frame={false} flat brightness={1} />
      )}
      {apertures.map((a, i) => {
        if (a.media === "wrap") return <PillarScreen key={i} media="pillar-metal" width={1.82} depth={1.82}
          height={a.h} position={[a.x,.22,a.z-.91]} range={70} brightness={1} pitch={1.2} />;
        const media = p.id === "content-studio" ? a.media
          : p.id === "spatial" ? "curve-natural"
          : a.media === "wrap" ? "pillar-metal"
          : p.screens[i % p.screens.length];
        return <Screen key={i} media={media} width={a.w} height={a.h}
          position={[a.x, a.y, a.z]} rotation={[0,a.rotation ?? 0,0]} range={72} pitch={1.2} brightness={0.96}
          frame={false} flat />;
      })}
      <pointLight position={[0, 5.8, -2.4]} color="#ffe1b6" intensity={80} distance={15} decay={2} />
      <mesh position={[0, 3.8, 1]} onClick={(e) => { e.stopPropagation(); open(p.id); }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}>
        <planeGeometry args={[13, 7.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

export function Boulevard() {
  return <group>
    <ZoneGroup from={-106} to={-138} ahead={50} behind={25}>
      <group position={[-10.2,0,-122]} rotation={[0,Math.PI/2,0]}><ExpoAsset name="technical-wing" /></group>
    </ZoneGroup>
    {[...PAVILIONS, PARTNER_BAY].map((p) => (
      <ZoneGroup key={p.id} from={p.z + 9} to={p.z - 9} ahead={55} behind={25}>
        <Suspense fallback={null}><ExhibitionBuilding p={p} /></Suspense>
      </ZoneGroup>
    ))}
    {[-1, 1].map((side) => <mesh key={side} position={[side * 7.8, 0.013, -169]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.035, 132]} />
      <meshBasicMaterial color="#c4a270" toneMapped />
    </mesh>)}
  </group>;
}
for (const p of [...PAVILIONS, PARTNER_BAY]) useGLTF.preload(`/models/expo/${p.id}.glb`, false);
