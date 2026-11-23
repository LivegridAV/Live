"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Screen } from "../three/screens";
import { LocalPointLight } from "../three/LocalLights";
import { LightPool } from "../three/environment";
import { useVenue } from "../systems/store";
import { ExpoAsset } from "../three/ExpoAsset";
import { PLACEMENTS, PILLAR_INSTALLATION_IDS } from "../data/placements";
import layout from "../../../public/models/expo/grand-pillar-layout.json";
import { drawWordmark } from "../media/brandMarks";

/** The redesigned four-sided columns and their authored reception gallery. */
export const REFERENCE_PILLARS = [
  { id: "hero", h: 12.6, w: 2.05, media: "pillar-metal", color: "#e2bd85" },
  { id: "companion", h: 10.9, w: 1.85, media: "pillar-flow", color: "#d9bd91" },
  { id: "alpine", h: 11.2, w: 1.8, media: "pillar-alpine", color: "#b4c8dc" },
  { id: "forest", h: 8.5, w: 1.7, media: "pillar-forest", color: "#9dbdb0" },
] as const;

type Identity = (typeof REFERENCE_PILLARS)[number]["id"];

function lettering(id: Identity) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1536;
  const c = canvas.getContext("2d")!;
  const dark = id !== "alpine";
  if (dark) {
    const wash = c.createLinearGradient(0, 0, 0, 1536);
    wash.addColorStop(0, "rgba(12,17,24,0)");
    wash.addColorStop(.15, "rgba(12,17,24,.96)");
    wash.addColorStop(.75, "rgba(12,17,24,.94)");
    wash.addColorStop(1, "rgba(12,17,24,0)");
    c.fillStyle = wash;
    c.fillRect(0, 0, 768, 1536);
  }
  c.fillStyle = dark ? "#f5f4f0" : "#273440";
  c.textBaseline = "top";
  if (id === "hero") {
    c.textAlign = "center";
    drawWordmark(c, 384, 380 + 64, 128, { align: "center", ink: c.fillStyle as string, maxWidth: 668 });
    c.font = "300 72px 'Arial Narrow', Arial, sans-serif";
    c.letterSpacing = "9px";
    ["BIGGER", "BRIGHTER", "BOLDER"].forEach((line, i) => c.fillText(line, 384, 680 + i * 132));
  } else {
    c.textAlign = "left";
    c.font = `${id === "forest" ? 600 : 400} ${id === "forest" ? 88 : 74}px 'Arial Narrow', Arial, sans-serif`;
    c.letterSpacing = id === "forest" ? "3px" : "6px";
    const lines = id === "companion" ? ["FOUR", "SIDES", "ENDLESS", "POSSIBILITIES"]
      : id === "alpine" ? ["IDEAS", "IN", "EVERY", "DIMENSION"]
      : ["A", "BRIGHTER", "WORLD", "TOGETHER"];
    lines.forEach((line, i) => c.fillText(line, 95, 390 + i * 118, 600));
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function PillarLettering({ id, width, height }: { id: Identity; width: number; height: number }) {
  const texture = useMemo(() => lettering(id), [id]);
  useEffect(() => () => texture.dispose(), [texture]);
  const side = id === "hero" || id === "companion";
  const labelHeight = width * 2;
  const y = height * (id === "hero" ? .62 : id === "companion" ? .8 : id === "forest" ? .48 : .73);
  return (
    <mesh position={side ? [width / 2 + .004, y, 0] : [0, y, width / 2 + .004]}
      rotation={[0, side ? Math.PI / 2 : 0, 0]}>
      <planeGeometry args={[width, labelHeight]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
}

/** The original square-column face dimensions and continuous master-artwork UVs. */
function RedesignedColumn({ width, height, media }: { width: number; height: number; media: string }) {
  const faces = [
    { position: [0, height / 2, width / 2], rotation: 0 },
    { position: [width / 2, height / 2, 0], rotation: Math.PI / 2 },
    { position: [0, height / 2, -width / 2], rotation: Math.PI },
    { position: [-width / 2, height / 2, 0], rotation: -Math.PI / 2 },
  ];
  return <group>
    <mesh position={[0, height / 2, 0]}>
      <boxGeometry args={[width - .02, height - .02, width - .02]} />
      <meshStandardMaterial color="#070a0b" roughness={.7} metalness={.4} />
    </mesh>
    {faces.map((face, i) => <Screen key={i} media={media} width={width} height={height}
      position={face.position as [number, number, number]} rotation={[0, face.rotation, 0]}
      uv={[.5, 1, i * .5, 0]} mirrorX wrapX pitch={1.5} brightness={1} range={65} frame={false} flat />)}
  </group>;
}

export function ReferencePillars() {
  const quality = useVenue(s => s.quality);
  const gallery=PLACEMENTS.L;
  return (
    <group name="Redesigned four-sided LED pillar gallery">
      <group name="Complete shared gallery and arrival lounge" position={gallery.root} rotation={[0,gallery.yaw,0]} userData={{placementId:"L"}}>
        <ExpoAsset name="grand-pillar-gallery" revision={layout.geometry.sha256}/>
        <ExpoAsset name="grand-pillar-visitors" revision={layout.people.sha256}/>
        {/* Original shared fixtures rebased into the preserved GLB frame.
            Their .111 m outer parent datum is retained by gallery.root. */}
        <LocalPointLight position={[4,3.7,-7.2]} color="#ffd3a0" intensity={54} distance={16} decay={2}/>
        <LocalPointLight position={[-6,5.6,-3.5]} color="#e7c39a" intensity={38} distance={13} decay={2}/>
      </group>
      {REFERENCE_PILLARS.map(p => {
        const placement=PLACEMENTS[PILLAR_INSTALLATION_IDS[p.id]];
        return <group key={p.id} name={`${p.id} four-sided LED installation`} position={placement.root} rotation={[0,placement.yaw,0]} userData={{placementId:placement.id}}>
        <group position={[0,.11,0]}>
          <RedesignedColumn media={p.media} width={p.w} height={p.h} />
          <mesh position={[0, -.055, 0]}>
            <boxGeometry args={[p.w + .3, .11, p.w + .3]} />
            <meshStandardMaterial color="#0b0c0e" metalness={.7} roughness={.3} />
          </mesh>
          <mesh position={[0, p.h + .012, 0]}>
            <boxGeometry args={[p.w + .016, .024, p.w + .016]} />
            <meshStandardMaterial color="#0b0c0e" metalness={.65} roughness={.36} />
          </mesh>
          {[-1, 1].flatMap(x => [-1, 1].map(z => (
            <mesh key={`${x}:${z}`} position={[x * p.w / 2, p.h / 2, z * p.w / 2]}>
              <boxGeometry args={[.014, p.h, .014]} />
              <meshBasicMaterial color="#07090b" />
            </mesh>
          )))}
          <PillarLettering id={p.id} width={p.w} height={p.h} />
          {quality !== "low" && <LocalPointLight position={[0, 2.4, 1.3]} color={p.color} intensity={16} distance={11} decay={2} />}
          <LightPool position={[0, -.067, .4]} size={[p.w * 3.4, 5]} color={p.color} opacity={.075} />
        </group></group>;
      })}
    </group>
  );
}
