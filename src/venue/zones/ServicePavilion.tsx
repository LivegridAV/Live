"use client";
import { Suspense } from "react";
import { ZoneGroup } from "../three/ZoneGroup";
import { ReferenceTechnical } from "./ReferenceTechnical";
import { ReferenceProjection } from "./ReferenceProjection";
import { ReferenceLedRental2026 } from "./ReferenceLedRental2026";
import { GRAND } from "../data/grand";
import { EXHIBITION_RANGES } from "../data/placements";

/** Only the retained redesigned stalls occupy the service boulevard. */
export function Boulevard() {
  return <group>
      <ZoneGroup {...EXHIBITION_RANGES.technical} ahead={58} behind={38}>
        <ReferenceTechnical />
      </ZoneGroup>
    <ZoneGroup {...EXHIBITION_RANGES.rental} ahead={58} behind={38}>
      <Suspense fallback={null}><ReferenceLedRental2026 /></Suspense>
    </ZoneGroup>
    <ZoneGroup {...EXHIBITION_RANGES.projection} ahead={58} behind={38}>
      <Suspense fallback={null}><ReferenceProjection /></Suspense>
    </ZoneGroup>
    {[-1, 1].map((side) => <mesh key={side} position={[side * 7.8, GRAND.master.floor+.005, -169]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.035, 132]} />
      <meshBasicMaterial color="#c4a270" toneMapped />
    </mesh>)}
  </group>;
}
