"use client";
import { useMemo, useRef, useState } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { audio } from "../audio";
import { EquipmentInfo, signals, THEMES, useExperience } from "../store";

/**
 * Scene 6 — the equipment lab. Signal-chain hardware floats in
 * anti-gravity. Grab any device to spin it 360°, click it for specs;
 * the glowing signal path between devices pulses in order.
 */

const CENTER = new THREE.Vector3(0, 3.5, -160);

interface Device extends EquipmentInfo {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
}

const DEVICES: Device[] = [
  {
    id: "mediaserver", name: "Media Server", role: "Playback & effects engine",
    pos: [-6.5, 1.5, 0], size: [1.6, 0.5, 1.4], color: "#1b2624",
    specs: [["GPU", "Dual RTX pipeline"], ["Layers", "32 × 4K"], ["Codec", "NotchLC / HAP"], ["Sync", "Genlock + timecode"]],
  },
  {
    id: "watchout2", name: "Watchout Server", role: "Show control & timeline",
    pos: [-3.4, 3.2, -1], size: [1.7, 0.5, 1.5], color: "#151f1d",
    specs: [["Displays", "8 × 4K60"], ["Failover", "Hot backup"], ["Control", "DMX / OSC / TCP"], ["Shows", "Frame-accurate"]],
  },
  {
    id: "processor", name: "LED Processor", role: "Pixel-perfect scaling",
    pos: [-0.2, 1.2, 0.5], size: [1.5, 0.45, 1.3], color: "#182220",
    specs: [["Capacity", "10.4M px"], ["Latency", "<1 frame"], ["Inputs", "12G-SDI · HDMI 2.1"], ["HDR", "HDR10 / HLG"]],
  },
  {
    id: "switcher", name: "Video Switcher", role: "Live program mixing",
    pos: [3, 3.4, -0.5], size: [1.8, 0.5, 1.2], color: "#1b2422",
    specs: [["M/Es", "4 mix effects"], ["Inputs", "20 × 4K"], ["Keyers", "16 layers"], ["Aux", "12 outputs"]],
  },
  {
    id: "controller", name: "LED Controller", role: "Wall mapping & drive",
    pos: [6.2, 1.8, 0.3], size: [1.4, 0.4, 1.2], color: "#141d1b",
    specs: [["Ports", "16 × RJ45"], ["Pixels", "6.5M per unit"], ["Cabinets", "Auto-mapped"], ["Backup", "Loop redundancy"]],
  },
  {
    id: "converter", name: "Signal Converter", role: "Any format, anywhere",
    pos: [1.5, 5.6, 0.8], size: [0.9, 0.35, 0.9], color: "#1d2725",
    specs: [["I/O", "SDI ↔ HDMI ↔ NDI"], ["Range", "4K60 4:4:4"], ["Distance", "100 m over fiber"], ["Latency", "Zero-frame"]],
  },
];

/** Floating device with drag-to-rotate + click-for-specs. */
function DeviceBox({ device, index }: { device: Device; index: number }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const drag = useRef({ on: false, x: 0, y: 0, moved: 0 });
  const rot = useRef({ x: 0, y: 0, vx: 0, vy: 0.2 });
  const setSpecCard = useExperience((s) => s.setSpecCard);
  const th = THEMES[useExperience((s) => s.theme)];

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    // anti-gravity bob
    group.current.position.y =
      device.pos[1] + Math.sin(t * 0.7 + index * 1.8) * 0.25;
    // free spin with inertia; drag overrides
    const r = rot.current;
    if (!drag.current.on) {
      r.vy *= 1 - Math.min(1, delta * 0.8);
      if (Math.abs(r.vy) < 0.15) r.vy = 0.15;
      r.vx *= 1 - Math.min(1, delta * 2);
    }
    r.y += r.vy * delta;
    r.x += r.vx * delta;
    group.current.rotation.set(r.x, r.y, 0);
    group.current.scale.lerp(
      new THREE.Vector3().setScalar(hovered ? 1.15 : 1), 0.1,
    );
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    signals.sceneGrab = true; // the device owns this drag, not free-look
    drag.current = { on: true, x: e.clientX, y: e.clientY, moved: 0 };
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d.on) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.moved += Math.abs(dx) + Math.abs(dy);
    d.x = e.clientX; d.y = e.clientY;
    rot.current.y += dx * 0.012;
    rot.current.x += dy * 0.01;
    rot.current.vy = dx * 0.6;
    rot.current.vx = dy * 0.4;
  };
  const onUp = () => {
    if (drag.current.on && drag.current.moved < 6) {
      audio.click(undefined, 1.3);
      setSpecCard(device);
    }
    drag.current.on = false;
    signals.sceneGrab = false;
  };

  return (
    <group
      position={[device.pos[0], device.pos[1], CENTER.z + device.pos[2]]}
      scale={1.7}
    >
      <group ref={group}>
        <mesh
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); audio.blip(1.2); document.body.style.cursor = "grab"; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          <boxGeometry args={device.size} />
          <meshStandardMaterial
            color={device.color}
            metalness={0.85}
            roughness={0.3}
            emissive={hovered ? th.glow : "#000"}
            emissiveIntensity={hovered ? 0.12 : 0}
          />
        </mesh>
        {/* faceplate: glowing ports strip */}
        <mesh position={[0, 0, device.size[2] / 2 + 0.005]}>
          <planeGeometry args={[device.size[0] * 0.8, device.size[1] * 0.4]} />
          <meshBasicMaterial color={th.accent} toneMapped={false} transparent opacity={hovered ? 0.9 : 0.45} />
        </mesh>
        {/* rack ears */}
        <mesh position={[-device.size[0] / 2 - 0.04, 0, 0]}>
          <boxGeometry args={[0.08, device.size[1] * 1.15, device.size[2] * 0.9]} />
          <meshStandardMaterial color="#2c3835" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[device.size[0] / 2 + 0.04, 0, 0]}>
          <boxGeometry args={[0.08, device.size[1] * 1.15, device.size[2] * 0.9]} />
          <meshStandardMaterial color="#2c3835" metalness={0.9} roughness={0.3} />
        </mesh>
      </group>
      {hovered && (
        <Html center distanceFactor={12} position={[0, 1.1, 0]} style={{ pointerEvents: "none" }}>
          <div className="lg-label">
            <span className="lg-label-name">{device.name}</span>
            <span className="lg-label-role">{device.role}</span>
            <span className="lg-label-hint">drag to spin · click for specs</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/** Pulsing signal path connecting the chain in order. */
function SignalPath() {
  const line = useRef<THREE.Line>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const th = THEMES[useExperience((s) => s.theme)];

  const curve = useMemo(() => {
    const pts = DEVICES.map(
      (d) => new THREE.Vector3(d.pos[0], d.pos[1], CENTER.z + d.pos[2]),
    );
    return new THREE.CatmullRomCurve3(pts);
  }, []);

  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)),
    [curve],
  );

  useFrame((state) => {
    if (pulse.current) {
      // a bright packet travels the signal chain end-to-end
      const t = (state.clock.elapsedTime * 0.18) % 1;
      curve.getPointAt(t, pulse.current.position);
      (pulse.current.material as THREE.MeshBasicMaterial).color.set(th.glow);
    }
    if (line.current) {
      (line.current.material as THREE.LineBasicMaterial).color.set(th.accent);
    }
  });

  return (
    <group>
      {/* @ts-expect-error three line vs svg line typing */}
      <line ref={line} geometry={geometry}>
        <lineBasicMaterial color="#1fa093" transparent opacity={0.5} toneMapped={false} />
      </line>
      <mesh ref={pulse}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color="#3fd6c8" toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Lab() {
  const th = THEMES[useExperience((s) => s.theme)];
  return (
    <group>
      {DEVICES.map((d, i) => (
        <DeviceBox key={d.id} device={d} index={i} />
      ))}
      <SignalPath />
      {/* lab volume: faint wireframe room */}
      <mesh position={[0, 4, CENTER.z]}>
        <boxGeometry args={[20, 10, 10]} />
        <meshBasicMaterial color={th.accent} wireframe transparent opacity={0.06} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 6, CENTER.z + 4]} intensity={26} color="#bfe8e2" distance={26} />
    </group>
  );
}
