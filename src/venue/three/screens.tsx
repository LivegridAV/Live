"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScreenTexture } from "../media/MediaContext";
import { createLEDMaterial, createProjectionMaterial, type LEDOptions } from "./ledMaterial";
import { useVenue } from "../systems/store";
import { show } from "../systems/journey";

/**
 * The LED product range.
 *
 * Every screen in the venue is one of these. They all share the same material
 * and the same media pipeline, so a curved wall, a floor tile and a corner
 * illusion are the same object with different geometry — which is what makes
 * the whole gallery buildable, and maintainable.
 */

type Vec3 = [number, number, number];

interface BaseProps {
  media: string;
  position?: Vec3;
  rotation?: Vec3;
  /** pixel pitch in mm */
  pitch?: number;
  brightness?: number;
  tint?: string;
  /** metres — how far away the screen still deserves frame-rate updates */
  range?: number;
  /** show the physical frame behind the emitters */
  frame?: boolean;
  /** cast a coloured point light into the room */
  spill?: number;
  spillColor?: string;
}

/* ── shared plumbing ───────────────────────────────────── */

/**
 * `opts` describes a fixed physical panel, but it is rebuilt on every render.
 * This signature is what actually decides whether a new material is needed, so
 * the shader is compiled once per screen rather than once per frame.
 */
function ledKey(o: LEDOptions) {
  return [
    o.width, o.height, o.pitch, o.cabinet, o.brightness, o.tint, o.dot, o.doubleSided,
    o.swap, o.flip?.[0], o.flip?.[1],
    o.repeat?.[0], o.repeat?.[1], o.offset?.[0], o.offset?.[1],
  ].join("|");
}

function useLED(
  media: string,
  meshRef: React.RefObject<THREE.Mesh | null>,
  opts: LEDOptions,
  range: number,
) {
  const texture = useScreenTexture(media, meshRef, range);
  const key = ledKey(opts);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers every field of `opts`
  const material = useMemo(() => createLEDMaterial(texture, opts), [texture, key]);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

/**
 * Screens power on as the venue comes alive, and dim for the finale.
 * `override` may be a function so a screen can follow the journey frame by
 * frame (the finale crossfade) without re-rendering React sixty times a second.
 */
export type Power = number | (() => number);

/**
 * A dark LED panel is still an opaque object. Screens that crossfade — the
 * finale taking over the main wall, the contact wall taking over from the
 * finale — must leave the scene entirely when they are off, or they sit in
 * front of the wall they are fading into and black it out.
 */
function usePowerState(
  material: THREE.ShaderMaterial,
  override?: Power,
  hideRef?: React.RefObject<THREE.Object3D | null>,
) {
  const entered = useVenue((s) => s.entered);
  useFrame((_, dt) => {
    const o = typeof override === "function" ? override() : override;
    // The house dip during a stage-mode cue. It is what hides the content
    // swap: by the time the new package is loaded the panels are almost dark.
    const dip = 1 - show.cue * 0.86;
    const target = (o ?? (entered ? 1 : 0.22)) * dip;
    const u = material.uniforms.uOn;
    // Falling fast and recovering slowly reads as a rig responding to a cue.
    u.value += (target - u.value) * Math.min(1, dt * (target < u.value ? 7 : 2.4));

    if (hideRef?.current) {
      const visible = u.value > 0.015;
      if (hideRef.current.visible !== visible) hideRef.current.visible = visible;
    }
  });
}

function Spill({
  intensity,
  color,
  distance,
  offset = 1.2,
}: {
  intensity: number;
  color: string;
  distance: number;
  offset?: number;
}) {
  const quality = useVenue((s) => s.quality);
  if (quality === "low") return null;
  return (
    <pointLight
      position={[0, 0, offset]}
      intensity={intensity}
      color={color}
      distance={distance}
      decay={2}
    />
  );
}

/* ── flat panel ────────────────────────────────────────── */

export interface ScreenProps extends BaseProps {
  width: number;
  height: number;
  /** slice of the source texture: [repeatX, repeatY, offsetX, offsetY] */
  uv?: [number, number, number, number];
  /** 0..1 forced power state, or a per-frame function (finale, dark stage) */
  power?: Power;
  cabinet?: number;
  dot?: number;
  /** sample the content with u/v exchanged — long surfaces, tunnel walls */
  swap?: boolean;
  flip?: [boolean, boolean];
}

export function Screen({
  media,
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 3.9,
  brightness = 1,
  tint,
  range = 70,
  frame = true,
  spill = 0,
  spillColor = "#8fb9b2",
  uv,
  power,
  cabinet,
  dot,
  swap,
  flip,
}: ScreenProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const material = useLED(
    media,
    mesh,
    {
      width,
      height,
      pitch,
      brightness,
      tint,
      cabinet,
      dot,
      swap,
      flip,
      repeat: uv ? [uv[0], uv[1]] : [1, 1],
      offset: uv ? [uv[2], uv[3]] : [0, 0],
    },
    range,
  );
  // Only crossfading screens are allowed to disappear; a permanently dimmed
  // panel is still part of the room.
  usePowerState(material, power, typeof power === "function" ? group : undefined);

  return (
    <group ref={group} position={position} rotation={rotation}>
      {frame && (
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[width + 0.05, height + 0.05, 0.11]} />
          <meshStandardMaterial color="#0b0e0f" roughness={0.62} metalness={0.75} />
        </mesh>
      )}
      <mesh ref={mesh} material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      {spill > 0 && <Spill intensity={spill} color={spillColor} distance={Math.max(width, height) * 3.2} />}
    </group>
  );
}

/* ── curved wall ───────────────────────────────────────── */

export interface CurvedScreenProps extends BaseProps {
  radius: number;
  /** arc in radians */
  arc: number;
  height: number;
  /** face the concave side (true) or the convex side */
  inward?: boolean;
  segments?: number;
}

export function CurvedScreen({
  media,
  radius,
  arc,
  height,
  inward = true,
  segments = 48,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 5.2,
  brightness = 1,
  tint,
  range = 70,
  spill = 0,
  spillColor = "#8fb9b2",
}: CurvedScreenProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useLED(
    media,
    mesh,
    { width: radius * arc, height, pitch, brightness, tint, cabinet: 0.5, doubleSided: true },
    range,
  );
  usePowerState(material);

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={mesh} material={material} rotation={[0, inward ? 0 : Math.PI, 0]}>
        <cylinderGeometry
          args={[radius, radius, height, segments, 1, true, -arc / 2, arc]}
        />
      </mesh>
      {spill > 0 && (
        <pointLight position={[0, 0, 0]} intensity={spill} color={spillColor} distance={radius * 4} decay={2} />
      )}
    </group>
  );
}

/* ── full cylinder ─────────────────────────────────────── */

export function CylinderScreen({
  media,
  radius,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 6.9,
  brightness = 1,
  tint,
  range = 70,
  spill = 0,
  spillColor = "#c49a62",
  segments = 56,
}: BaseProps & { radius: number; height: number; segments?: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useLED(
    media,
    mesh,
    { width: 2 * Math.PI * radius, height, pitch, brightness, tint, cabinet: 0.5 },
    range,
  );
  usePowerState(material);

  return (
    <group position={position} rotation={rotation}>
      {/* rigging cap + base so the cylinder reads as a hung product */}
      <mesh position={[0, height / 2 + 0.06, 0]}>
        <cylinderGeometry args={[radius + 0.04, radius + 0.04, 0.12, segments]} />
        <meshStandardMaterial color="#0d1112" roughness={0.5} metalness={0.85} />
      </mesh>
      <mesh position={[0, -height / 2 - 0.06, 0]}>
        <cylinderGeometry args={[radius + 0.04, radius + 0.04, 0.12, segments]} />
        <meshStandardMaterial color="#0d1112" roughness={0.5} metalness={0.85} />
      </mesh>
      <mesh ref={mesh} material={material}>
        <cylinderGeometry args={[radius, radius, height, segments, 1, true]} />
      </mesh>
      {spill > 0 && (
        <pointLight intensity={spill} color={spillColor} distance={radius * 8} decay={2} />
      )}
    </group>
  );
}

/* ── suspended ring ────────────────────────────────────── */

export function RingScreen({
  media,
  radius,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 8,
  brightness = 1.1,
  tint,
  range = 90,
  spill = 0,
  spillColor = "#7fb3aa",
  segments = 64,
  inward = false,
}: BaseProps & { radius: number; height: number; segments?: number; inward?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useLED(
    media,
    mesh,
    { width: 2 * Math.PI * radius, height, pitch, brightness, tint, cabinet: 0.6, doubleSided: true },
    range,
  );
  usePowerState(material);

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={mesh} material={material} rotation={[0, inward ? Math.PI : 0, 0]}>
        <cylinderGeometry args={[radius, radius, height, segments, 1, true]} />
      </mesh>
      {/* hang points */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * radius, height / 2 + 1.6, Math.sin(a) * radius]}>
            <cylinderGeometry args={[0.018, 0.018, 3.2, 6]} />
            <meshStandardMaterial color="#14181a" roughness={0.45} metalness={0.9} />
          </mesh>
        );
      })}
      {spill > 0 && <pointLight intensity={spill} color={spillColor} distance={radius * 6} decay={2} />}
    </group>
  );
}

/* ── LED pillar (four-sided column) ────────────────────── */

export function PillarScreen({
  media,
  width,
  height,
  depth,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 5.2,
  brightness = 1,
  tint,
  range = 80,
  spill = 0,
  spillColor = "#84b5ad",
}: BaseProps & { width: number; height: number; depth: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useLED(media, mesh, { width, height, pitch, brightness, tint, cabinet: 0.5 }, range);
  usePowerState(material);

  // Four faces from one box: the wrap makes the content run continuously
  // around the column, the way a real four-sided totem is mapped.
  return (
    <group position={position} rotation={rotation}>
      {/* base plate */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[width + 0.12, 0.12, depth + 0.12]} />
        <meshStandardMaterial color="#0c1011" roughness={0.55} metalness={0.75} />
      </mesh>
      {/* the LED column itself, standing on the plate */}
      <mesh ref={mesh} material={material} position={[0, 0.12 + height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
      </mesh>
      {/* top cap */}
      <mesh position={[0, 0.12 + height + 0.06, 0]}>
        <boxGeometry args={[width + 0.1, 0.12, depth + 0.1]} />
        <meshStandardMaterial color="#0c1011" roughness={0.5} metalness={0.8} />
      </mesh>
      {spill > 0 && (
        <pointLight position={[0, height * 0.55, 0]} intensity={spill} color={spillColor} distance={height * 2.4} decay={2} />
      )}
    </group>
  );
}

/* ── anamorphic 90° corner ─────────────────────────────── */

/**
 * Two panels folded at 90°, each carrying half of a single image rendered from
 * the viewer's position. The fold supplies the geometry the illusion needs, so
 * from the intended standing point the content reads as a volume cut into the
 * building rather than a picture stuck on it.
 */
export function CornerScreen({
  media,
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 2.9,
  brightness = 1.05,
  range = 70,
  spill = 0,
  spillColor = "#b9ab93",
}: BaseProps & { width: number; height: number }) {
  return (
    <group position={position} rotation={rotation}>
      {/* left leaf — runs away from the corner along -X */}
      <Screen
        media={media}
        width={width}
        height={height}
        uv={[0.5, 1, 0, 0]}
        position={[-width / 2, height / 2, 0]}
        pitch={pitch}
        brightness={brightness}
        range={range}
        spill={spill}
        spillColor={spillColor}
      />
      {/* right leaf — folds back along -Z */}
      <Screen
        media={media}
        width={width}
        height={height}
        uv={[0.5, 1, 0.5, 0]}
        position={[0, height / 2, -width / 2]}
        rotation={[0, Math.PI / 2, 0]}
        pitch={pitch}
        brightness={brightness}
        range={range}
      />
      {/* floor return, so the volume looks like it stands on something */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-width / 2, 0.01, -width / 2]} receiveShadow>
        <planeGeometry args={[width * 1.6, width * 1.6]} />
        <meshStandardMaterial color="#0a0d0e" roughness={0.32} metalness={0.2} />
      </mesh>
    </group>
  );
}

/* ── LED bar counter ───────────────────────────────────── */

export function BarScreen({
  media,
  width,
  height = 1.05,
  depth = 0.7,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 3.9,
  brightness = 0.95,
  range = 50,
  spill = 1.4,
  spillColor = "#7fd3c6",
}: BaseProps & { width: number; height?: number; depth?: number }) {
  return (
    <group position={position} rotation={rotation}>
      {/* worktop */}
      <mesh position={[0, height + 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.18, 0.06, depth + 0.16]} />
        <meshStandardMaterial color="#15181a" roughness={0.28} metalness={0.65} />
      </mesh>
      {/* carcass */}
      <mesh position={[0, height / 2, -0.06]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#0a0d0e" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* LED fascia */}
      <Screen
        media={media}
        width={width}
        height={height - 0.14}
        position={[0, (height - 0.14) / 2 + 0.06, depth / 2 - 0.05]}
        pitch={pitch}
        brightness={brightness}
        range={range}
        frame={false}
        spill={spill}
        spillColor={spillColor}
      />
      {/* back bar shelf catches the spill */}
      <mesh position={[0, height + 0.5, -depth * 0.9]}>
        <boxGeometry args={[width * 0.9, 0.04, 0.3]} />
        <meshStandardMaterial color="#12161a" roughness={0.4} metalness={0.7} />
      </mesh>
    </group>
  );
}

/* ── projection surface ────────────────────────────────── */

export function ProjectionSurface({
  media,
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  brightness = 0.9,
  range = 80,
}: BaseProps & { width: number; height: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useScreenTexture(media, mesh, range);
  const material = useMemo(() => createProjectionMaterial(texture, brightness), [texture, brightness]);
  useEffect(() => () => material.dispose(), [material]);
  usePowerState(material);
  return (
    <mesh ref={mesh} material={material} position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}
