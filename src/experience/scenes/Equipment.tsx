"use client";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { audio } from "../audio";
import { EquipmentInfo, THEMES, useExperience } from "../store";

/**
 * Hover hotspots on the stage gear. Hovering floats a glass label;
 * clicking opens the full spec card (DOM overlay, see SpecCard.tsx).
 * Everything stays inside the 3D scene — no page navigation.
 */

export const EQUIPMENT: (EquipmentInfo & { pos: [number, number, number] })[] = [
  {
    id: "watchout",
    name: "Watchout Server",
    role: "Multi-display production server",
    pos: [-1.8, 1.6, 21],
    specs: [
      ["Outputs", "8 × 4K60 synchronized"],
      ["Timeline", "Frame-accurate playback"],
      ["Redundancy", "Hot backup, auto failover"],
      ["Use", "Corporate shows · mapping"],
    ],
  },
  {
    id: "novastar",
    name: "NovaStar Processor",
    role: "LED image processor",
    pos: [1.8, 1.6, 21],
    specs: [
      ["Capacity", "10.4M pixels per unit"],
      ["Latency", "< 1 frame end-to-end"],
      ["Scaling", "Pixel-perfect any input"],
      ["HDR", "HDR10 / HLG pipeline"],
    ],
  },
  {
    id: "vj",
    name: "VJ Console",
    role: "Live visuals performance rig",
    pos: [0, 1.6, 21],
    specs: [
      ["Software", "Resolume Arena"],
      ["Layers", "16 live-mixed layers"],
      ["Sync", "BPM + timecode locked"],
      ["Output", "Direct to LED processor"],
    ],
  },
  {
    id: "linearray",
    name: "Line Array",
    role: "Flown PA system",
    pos: [-9.2, 8.5, 0.6],
    specs: [
      ["Hang", "8-box J-curve per side"],
      ["SPL", "142 dB peak"],
      ["Coverage", "Predicted in ArrayCalc"],
      ["Subs", "Cardioid ground stack"],
    ],
  },
  {
    id: "movinghead",
    name: "Moving Head Rig",
    role: "Automated lighting fixtures",
    pos: [6, 12.1, 0],
    specs: [
      ["Fixtures", "8 × beam/spot hybrid"],
      ["Control", "Art-Net, 4 universes"],
      ["Speed", "540° pan in 1.2 s"],
      ["Note", "They're following your cursor"],
    ],
  },
  {
    id: "ledwall",
    name: "Main LED Wall",
    role: "P3.9 outdoor LED canvas",
    pos: [7.5, 9.5, 0.3],
    specs: [
      ["Size", "19.2 × 10.8 m"],
      ["Pitch", "3.9 mm true pixel"],
      ["Brightness", "5000 nits outdoor"],
      ["Refresh", "3840 Hz camera-safe"],
    ],
  },
];

function Hotspot({
  item,
}: {
  item: (typeof EQUIPMENT)[number];
}) {
  const [hovered, setHovered] = useState(false);
  const ring = useRef<THREE.Mesh>(null);
  const setSpecCard = useExperience((s) => s.setSpecCard);
  const powered = useExperience((s) => s.powered);

  useFrame((state) => {
    if (!ring.current) return;
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 3 + item.pos[0]) * 0.15;
    ring.current.scale.setScalar(hovered ? 1.5 : pulse);
    const mat = ring.current.material as THREE.MeshBasicMaterial;
    const th = THEMES[useExperience.getState().theme];
    mat.color.set(hovered ? th.glow : th.accent);
    mat.opacity = powered ? (hovered ? 1 : 0.65) : 0;
  });

  if (!powered) return null;

  return (
    <group position={item.pos}>
      <mesh
        ref={ring}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          audio.blip(1.3);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          audio.click(undefined, 1.4);
          setSpecCard(item);
        }}
      >
        <ringGeometry args={[0.12, 0.2, 24]} />
        <meshBasicMaterial transparent opacity={0.65} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {hovered && (
        <Html center distanceFactor={14} style={{ pointerEvents: "none" }}>
          <div className="lg-label">
            <span className="lg-label-name">{item.name}</span>
            <span className="lg-label-role">{item.role}</span>
            <span className="lg-label-hint">click for specs</span>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function Equipment() {
  return (
    <group>
      {EQUIPMENT.map((item) => (
        <Hotspot key={item.id} item={item} />
      ))}
    </group>
  );
}
