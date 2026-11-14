"use client";
import { Suspense, useEffect } from "react";
import { ExpoAsset, expoAssetUrl } from "../three/ExpoAsset";
import { Screen } from "../three/screens";
import { LocalPointLight } from "../three/LocalLights";
import { LightPool } from "../three/environment";
import { TECHNICAL_ROOT, TECHNICAL_ROTATION } from "../data/technical";
import { useVenue } from "../systems/store";
import { preloadTechnicalArtwork } from "../media/technicalPainters";
import { ProjectionContactShadow } from "../three/ProjectionContactShadow";
import layout from "../../../public/models/expo/grand-technical-shape-v3-layout.json";
import hall from "../../../public/models/expo/technical-reference-hall-rig-v3.json";

type Aperture = {
  id: string; x: number; y: number; z: number; w: number; h: number;
  rotation: number[]; mediaHint: string;
};
const apertures = layout.apertures as Aperture[];
const services: Record<string, string> = {
  "av-drafting": "av-engineering", "show-cues": "show-control", "live-multiview": "live-production",
};

/** Authored geometry and independent live displays share exported apertures. */
export function ReferenceTechnical() {
  const open = useVenue(s => s.openPavilion);
  useEffect(() => preloadTechnicalArtwork(), []);
  return <group position={TECHNICAL_ROOT} rotation={TECHNICAL_ROTATION} userData={{grandStall:"technical"}} name="Engineering, show control and live production">
    <ExpoAsset name="technical-reference-hall-rig-v3" revision={hall.asset.sha256}/>
    <ExpoAsset name="grand-technical-shape-v3-shell" revision={layout.assets["grand-technical-shape-v3-shell"].sha256}/>
    <ExpoAsset name="grand-technical-shape-v3-interior" revision={layout.assets["grand-technical-shape-v3-interior"].sha256}/>
    <ExpoAsset name="grand-technical-shape-v3-visitors" revision={layout.assets["grand-technical-shape-v3-visitors"].sha256}/>
    <Suspense fallback={null}><ProjectionContactShadow boothUrl={expoAssetUrl("grand-technical-shape-v3-interior",layout.assets["grand-technical-shape-v3-interior"].sha256)} visitorsUrl={expoAssetUrl("grand-technical-shape-v3-visitors",layout.assets["grand-technical-shape-v3-visitors"].sha256)} width={24} depth={16} floorHeight={.12}/></Suspense>
    {apertures.map(a => {
      const service = services[a.id];
      return <group key={a.id} position={[a.x, a.y, a.z]} rotation={a.rotation as [number, number, number]}
        onClick={service ? e => { e.stopPropagation(); open(service); } : undefined}
        onPointerOver={service ? () => { document.body.style.cursor = "pointer"; } : undefined}
        onPointerOut={service ? () => { document.body.style.cursor = ""; } : undefined}>
        <Screen media={a.mediaHint==="tech-tower-ribbon"?"pillar-flow":a.mediaHint} width={a.w} height={a.h} range={100} brightness={.94} pitch={1.2} frame={false} flat />
      </group>;
    })}
    <LocalPointLight position={[-7.5, 4.7, -2.8]} color="#c4d2e5" intensity={23} distance={11} decay={2} />
    <LocalPointLight position={[0, 4.7, -2.8]} color="#d1d9e5" intensity={22} distance={11} decay={2} />
    <LocalPointLight position={[7.5, 4.7, -2.8]} color="#c4d2e5" intensity={23} distance={11} decay={2} />
    <LocalPointLight position={[0, 4.8, 4.4]} color="#ffe6c7" intensity={46} distance={12} decay={2} />
    <LocalPointLight position={[-8, 4.8, 4.5]} color="#ffe6c7" intensity={35} distance={10} decay={2} />
    <LightPool position={[0, .13, 2]} size={[23, 10]} color="#ddd7cb" opacity={.06} />
  </group>;
}
