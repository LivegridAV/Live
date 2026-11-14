"use client";
import { Screen } from "../three/screens";
import { Haze } from "../three/rig";
import { useVenue } from "../systems/store";
import { ZoneGroup } from "../three/ZoneGroup";
import { ReferenceReception } from "./ReferenceReception";
import { ReferenceAnamorphic } from "./ReferenceAnamorphic";
import { ReferencePillars } from "./ReferencePillars";
import { Aisle } from "./Exhibition";
import { EXHIBITION_RANGES, PLACEMENTS } from "../data/placements";

/** Retained redesigned installations and their shared exhibition hall. */

/* ── the hall reveal ───────────────────────────────────── */

function HallReveal() {
  return <group>
    {([{ z: PLACEMENTS.S1.root[2]+24, media: "sign-services" }]).map(sign =>
      <Screen key={sign.z} media={sign.media} width={3.5} height={.7}
        position={[-18.65, 3.4, sign.z]} rotation={[0, Math.PI / 2, 0]}
        pitch={1.5} brightness={1} range={50} frame={false} />)}
  </group>;
}

/* ── zone root ─────────────────────────────────────────── */

export function Gallery() {
  const quality = useVenue((s) => s.quality);
  return (
    <group>
      {/* The immersive entrance opens directly into the exhibition hall. */}
      <Aisle from={-40} to={-65} />
      <ZoneGroup {...EXHIBITION_RANGES.pillars} ahead={70} behind={26}>
        <ReferencePillars />
      </ZoneGroup>
      <HallReveal />
      {/* Visible through the open entrance as the destination of the arrival route. */}
      <ZoneGroup {...EXHIBITION_RANGES.reception} ahead={110} behind={26}>
        <ReferenceReception />
      </ZoneGroup>
      <ZoneGroup {...EXHIBITION_RANGES.anamorphic} ahead={58} behind={38}>
        <ReferenceAnamorphic />
      </ZoneGroup>
      {quality !== "low" && (
        <Haze count={9} area={[40, 8, 54]} position={[0, 5.5, -68]} color="#7f9aa4" opacity={0.009} scale={15} seed={2} />
      )}
    </group>
  );
}
