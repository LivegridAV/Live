"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { M } from "../three/materials";
import { ProjectionSurface, Screen } from "../three/screens";
import { LightPool } from "../three/environment";
import { ReflectionStreak } from "../three/Reflection";
import { PAVILIONS, PARTNER_BAY, PAVILION_RANGE, type Pavilion } from "../data/pavilions";
import { Planter } from "./Exhibition";
import { journey } from "../systems/journey";
import { useVenue } from "../systems/store";
import { LineArray, SubStack, MovingHead, Truss } from "../three/rig";
import { ZoneGroup } from "../three/ZoneGroup";
import { ImmersiveVolume, type Surface } from "../three/ImmersiveVolume";

/**
 * A service pavilion.
 *
 * Not a card — a stall. Each has a plinth it stands on, a fascia carrying its
 * name, its own screens showing its own work, and props that make the service
 * legible before a single word is read: a control desk for show control, a
 * multiview for broadcast, LED cabinets for LED. The eight forms below share
 * one shell so the boulevard reads as one exhibition, and differ everywhere
 * else so no two stalls look cloned.
 */

const W = 10; // pavilion width along the aisle
const D = 7; // depth into the wall
const H = 4.8; // fascia height

/** How "awake" a pavilion is: 0 far away, 1 when the camera is level with it. */
function useProximity(p: number) {
  const value = useRef(0);
  useFrame((_, dt) => {
    const dist = Math.abs(journey.progress - p);
    const target = 1 - Math.min(1, dist / (PAVILION_RANGE * 2.4));
    value.current += (target - value.current) * Math.min(1, dt * 3);
  });
  return value;
}

/* ── shared props ──────────────────────────────────────── */

function Desk({ width = 4.4, z = -1.4, height = 0.96 }: { width?: number; z?: number; height?: number }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, height, 0]} material={M.graphite}>
        <boxGeometry args={[width, 0.08, 1.05]} />
      </mesh>
      <mesh position={[0, height / 2, -0.45]} material={M.charcoal}>
        <boxGeometry args={[width - 0.3, height, 0.12]} />
      </mesh>
      {/* control surface: faders and a button field, lit from underneath */}
      <mesh position={[0, height + 0.05, 0.1]} rotation={[-0.16, 0, 0]} material={M.anodised}>
        <boxGeometry args={[width * 0.52, 0.03, 0.42]} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[-width * 0.22 + i * (width * 0.048), height + 0.09, 0.18]}>
          <boxGeometry args={[0.03, 0.012, 0.11]} />
          <meshBasicMaterial color={i % 3 === 0 ? "#3f9d90" : "#2a3c3a"} toneMapped />
        </mesh>
      ))}
      <mesh position={[0, height - 0.02, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.7, 0.05]} />
        <meshBasicMaterial color="#1f4b47" toneMapped />
      </mesh>
    </group>
  );
}

function Rack({ position, units = 9 }: { position: [number, number, number]; units?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.0, 0]} material={M.anodised}>
        <boxGeometry args={[0.66, 2.0, 0.85]} />
      </mesh>
      {Array.from({ length: units }, (_, i) => (
        <group key={i} position={[0, 0.22 + i * 0.19, 0.44]}>
          <mesh material={M.graphite}>
            <boxGeometry args={[0.58, 0.15, 0.03]} />
          </mesh>
          <mesh position={[0.2, 0, 0.02]}>
            <boxGeometry args={[0.04, 0.04, 0.01]} />
            <meshBasicMaterial color={i % 4 === 0 ? "#49b5a4" : "#20302e"} toneMapped />
          </mesh>
          <mesh position={[0.26, 0, 0.02]}>
            <boxGeometry args={[0.03, 0.03, 0.01]} />
            <meshBasicMaterial color={i % 3 === 0 ? "#c08a4e" : "#1e2a29"} toneMapped />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** A stack of LED cabinets — the actual product, on display. */
function CabinetStack({ position, cols = 3, rows = 2 }: { position: [number, number, number]; cols?: number; rows?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return (
          <mesh key={i} position={[(c - (cols - 1) / 2) * 0.52, 0.26 + r * 0.52, 0]} material={M.anodised}>
            <boxGeometry args={[0.5, 0.5, 0.09]} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * The counter every stand at a real exhibition has: the thing you walk up to.
 * It also gives the pavilion a front edge, which is what was missing when the
 * stalls read as alcoves rather than as stands.
 */
function Counter({ width = 3.6, z = 1.0, accent }: { width?: number; z?: number; accent: string }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.52, 0]} material={M.graphite}>
        <boxGeometry args={[width, 1.04, 0.62]} />
      </mesh>
      <mesh position={[0, 1.07, 0]} material={M.aluminium}>
        <boxGeometry args={[width + 0.14, 0.06, 0.76]} />
      </mesh>
      {/* a lit reveal under the worktop — the detail that makes joinery read */}
      <mesh position={[0, 0.9, 0.32]}>
        <planeGeometry args={[width - 0.2, 0.05]} />
        <meshBasicMaterial color={accent} toneMapped />
      </mesh>
    </group>
  );
}

/**
 * An illuminated glass block.
 *
 * Every premium technology stand in the reference photographs has these:
 * chest-height slabs of edge-lit acrylic flanking the opening, carrying a line
 * of copy. They do three things at once — they mark the threshold, they put a
 * bright soft object at human height where the stand was otherwise black, and
 * they are the one element that reads unambiguously as *expensive*. They are
 * also cheap: a translucent box and four lit edges.
 */
function GlassBlock({
  position,
  rotation = 0,
  width = 0.9,
  height = 1.35,
  accent,
}: {
  position: [number, number, number];
  rotation?: number;
  width?: number;
  height?: number;
  accent: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.04, 0]} material={M.anodised}>
        <boxGeometry args={[width + 0.12, 0.08, 0.34]} />
      </mesh>
      <mesh position={[0, height / 2 + 0.08, 0]}>
        <boxGeometry args={[width, height, 0.14]} />
        <meshPhysicalMaterial
          color="#cfe4e6"
          transparent
          opacity={0.2}
          roughness={0.28}
          metalness={0}
          envMapIntensity={0.35}
          transmission={0}
        />
      </mesh>
      {/* the lit edges — this is what makes it read as edge-lit acrylic
          rather than as a pane of grey plastic */}
      {[-1, 1].map((sy) => (
        <mesh key={`h${sy}`} position={[0, height / 2 + 0.08 + (sy * height) / 2, 0.08]}>
          <planeGeometry args={[width, 0.035]} />
          <meshBasicMaterial color={accent} toneMapped />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <mesh key={`v${sx}`} position={[(sx * width) / 2, height / 2 + 0.08, 0.08]}>
          <planeGeometry args={[0.03, height]} />
          <meshBasicMaterial color={accent} toneMapped />
        </mesh>
      ))}
      <pointLight position={[0, height * 0.6, 0.4]} intensity={4.5} distance={4} decay={2} color={accent} />
    </group>
  );
}

/** A row of operator monitors on a desk — the reference's production positions. */
function MonitorRow({
  position,
  count = 3,
  accent,
}: {
  position: [number, number, number];
  count?: number;
  accent: string;
}) {
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => {
        const x = (i - (count - 1) / 2) * 0.68;
        const yaw = -(i - (count - 1) / 2) * 0.22;
        return (
          <group key={i} position={[x, 0, 0]} rotation={[0, yaw, 0]}>
            <mesh position={[0, 0.14, 0]} material={M.anodised}>
              <cylinderGeometry args={[0.03, 0.05, 0.28, 8]} />
            </mesh>
            <mesh position={[0, 0.5, 0]} rotation={[-0.14, 0, 0]} material={M.charcoal}>
              <boxGeometry args={[0.62, 0.4, 0.03]} />
            </mesh>
            <mesh position={[0, 0.5, 0.019]} rotation={[-0.14, 0, 0]}>
              <planeGeometry args={[0.58, 0.36]} />
              <meshBasicMaterial color={accent} toneMapped transparent opacity={0.55} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * The stand's own information panel, on a pedestal, angled to the aisle. The
 * HTML detail panel is still there for accessibility and for real links, but
 * the copy now exists in the room first.
 */
function Kiosk({ id, x, accent }: { id: string; x: number; accent: string }) {
  return (
    <group position={[x, 0, 1.2]} rotation={[0, x > 0 ? -0.6 : 0.6, 0]}>
      <mesh position={[0, 0.55, 0]} material={M.charcoal}>
        <boxGeometry args={[0.92, 1.1, 0.42]} />
      </mesh>
      <mesh position={[0, 0.06, 0]} material={M.anodised}>
        <boxGeometry args={[1.02, 0.12, 0.52]} />
      </mesh>
      <mesh position={[0, 1.44, -0.12]} rotation={[-0.26, 0, 0]} material={M.anodised}>
        <boxGeometry args={[0.96, 1.26, 0.06]} />
      </mesh>
      <Screen
        media={`kiosk-${id}`}
        width={0.84}
        height={1.12}
        position={[0, 1.44, -0.06]}
        rotation={[-0.26, 0, 0]}
        pitch={1.2}
        brightness={1.25}
        range={30}
        frame={false}
      />
      <mesh position={[0, 0.14, 0.27]}>
        <planeGeometry args={[0.8, 0.04]} />
        <meshBasicMaterial color={accent} toneMapped />
      </mesh>
    </group>
  );
}

/** A small architectural maquette for the projection-mapping demonstration. */
function Maquette({ position }: { position: [number, number, number] }) {
  const blocks: [number, number, number, number, number][] = [
    [0, 0.55, 0, 1.5, 1.1],
    [-1.05, 0.38, 0.2, 0.75, 0.76],
    [1.0, 0.45, -0.15, 0.85, 0.9],
    [0, 1.25, -0.5, 0.9, 0.4],
  ];
  return (
    <group position={position}>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b[0], b[1], b[2]]} material={M.stone}>
          <boxGeometry args={[b[3], b[1] * 2, b[4]]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── the eight forms ───────────────────────────────────── */

/**
 * The immersive cube in the Spatial pavilion. Its surfaces are given in the
 * pavilion's local space; the volume itself is told where that space sits in
 * the venue so its virtual world lines up with the room the visitor sees.
 */
const roomOffset = { x: 3.2, z: 2.9 };
const ROOM_SURFACES: Surface[] = [
  { size: [3.0, 2.2], position: [2.9, 1.26, -4.7] },
  { size: [3.0, 2.2], position: [1.4, 1.26, -3.2], rotation: [0, Math.PI / 2, 0] },
  { size: [3.0, 2.2], position: [4.4, 1.26, -3.2], rotation: [0, -Math.PI / 2, 0] },
  { size: [3.0, 3.0], position: [2.9, 0.18, -3.2], rotation: [-Math.PI / 2, 0, 0] },
];

function Form({ p }: { p: Pavilion }) {
  const s = p.screens;
  switch (p.form) {
    /* 01 · AV engineering — a technical design position */
    case "console":
      return (
        <>
          <Screen media={s[0]} width={5.2} height={2.9} position={[-1.3, 2.7, -5.0]} pitch={1.5} brightness={1.4} range={38} />
          <Screen media={s[1]} width={2.6} height={1.5} position={[2.8, 2.6, -5.0]} pitch={1.5} range={38} />
          <Screen
            media={s[2]}
            width={1.3}
            height={1.7}
            position={[4.72, 2.6, -2.4]}
            rotation={[0, Math.PI / 2, 0]}
            pitch={2.6}
            range={34}
          />
          <Desk width={4.6} z={-1.6} />
          <MonitorRow position={[-0.4, 1.0, -1.25]} count={3} accent="#6f93a8" />
          <Rack position={[3.6, 0, -2.2]} />
          <LightPool position={[0, 0.16, -2.2]} size={[9, 7]} color="#6f93a8" opacity={0.1} />
        </>
      );

    /* 02 · Content studio — the most screens, deliberately */
    case "gallery":
      return (
        <>
          <Screen media={s[2]} width={6.6} height={3.5} position={[0, 2.95, -5.0]} pitch={2.6} brightness={1.55} range={40} />
          {/* A wall of work beside the hero. The reference's content stand is
              a big piece next to a *grid of small ones* — that contrast is what
              says "studio" rather than "one nice render", and each tile takes
              its own slice of one image so the block reads as a single
              composition rather than as six unrelated thumbnails. */}
          {Array.from({ length: 6 }, (_, i) => {
            const c = i % 3;
            const r = Math.floor(i / 3);
            return (
              <Screen
                key={`t${i}`}
                media={s[0]}
                width={1.12}
                height={0.66}
                position={[-4.72, 3.3 - r * 0.78, -1.4 - c * 1.24]}
                rotation={[0, Math.PI / 2, 0]}
                uv={[1 / 3, 0.5, c / 3, 1 - (r + 1) * 0.5]}
                pitch={1.9}
                brightness={1.15}
                range={32}
                frame={false}
                flat
              />
            );
          })}
          <Screen
            media={s[0]}
            width={2.4}
            height={1.4}
            position={[-3.7, 2.3, -2.6]}
            rotation={[0, 0.55, 0]}
            pitch={2.6}
            range={34}
          />
          <Screen
            media={s[1]}
            width={2.4}
            height={1.4}
            position={[3.7, 2.3, -2.6]}
            rotation={[0, -0.55, 0]}
            pitch={2.6}
            range={34}
          />
          {/* gallery plinths — the content is the exhibit */}
          {[-3.7, 3.7].map((x) => (
            <mesh key={x} position={[x, 0.75, -2.6]} material={M.charcoal}>
              <boxGeometry args={[1.5, 1.5, 0.8]} />
            </mesh>
          ))}
          <ReflectionStreak position={[0, 0.16, -2.6]} width={6} length={4.6} color="#d9a05f" opacity={0.2} />
          <LightPool position={[0, 0.16, -3]} size={[9, 6]} color="#c08a54" opacity={0.12} />
        </>
      );

    /* 03 · LED solutions — the product itself, in several geometries */
    case "rack":
      return (
        <>
          <Screen media={s[0]} width={5.0} height={2.8} position={[-1.4, 2.8, -5.0]} pitch={1.5} brightness={1.4} range={38} />
          <Screen media={s[1]} width={2.3} height={1.5} position={[2.9, 3.3, -5.0]} pitch={2.6} range={38} />
          <Screen
            media={s[2]}
            width={2.0}
            height={1.3}
            position={[-4.72, 2.4, -2.2]}
            rotation={[0, Math.PI / 2, 0]}
            pitch={2.6}
            range={34}
          />
          {/* sample cabinets, a curved sample and a floor tile */}
          <CabinetStack position={[2.6, 0.2, -1.4]} cols={3} rows={3} />
          <mesh position={[-2.4, 0.55, -1.2]} material={M.anodised}>
            <cylinderGeometry args={[1.0, 1.0, 1.0, 26, 1, true, -0.9, 1.8]} />
          </mesh>
          <mesh position={[0, 0.18, -0.3]} rotation={[-Math.PI / 2, 0, 0]} material={M.anodised}>
            <planeGeometry args={[1.6, 1.6]} />
          </mesh>
          <LightPool position={[0, 0.16, -2]} size={[9, 7]} color="#9fb4bd" opacity={0.1} />
        </>
      );

    /* 04 · Spatial — a mapped façade and a miniature immersive room */
    case "vault":
      return (
        <>
          {/* projection onto the maquette's front faces */}
          <Maquette position={[-2.6, 0.16, -2.4]} />
          <ProjectionSurface media={s[0]} width={3.4} height={2.3} position={[-2.6, 1.3, -1.55]} range={36} />
          {/* The immersive room: the entry tunnel, demonstrated at cube scale.
              It runs the same world-projected surface as the tunnel does, on
              the same shared virtual world, so the demonstration is literally
              the product rather than a picture of it — three walls and a floor
              that agree at every edge. */}
          <ImmersiveVolume
            surfaces={ROOM_SURFACES}
            pitch={1.2}
            brightness={1.0}
            accent="#5fd0c2"
            flow={4.2}
            maxLayers={5}
            boxMin={[-4.2, -1.6, -140]}
            boxMax={[4.2, 5.4, 6]}
            centreY={1.15}
            centre={[p.side * 9.2 + roomOffset.x, 0.16, p.z + roomOffset.z]}
            yaw={p.side === -1 ? Math.PI / 2 : -Math.PI / 2}
            phase={() => 0.34}
            portalZ={() => -52}
          />
          <Screen media={s[2]} width={2.2} height={1.4} position={[-3.2, 3.6, -5.0]} pitch={2.6} range={38} />
          <LightPool position={[2.9, 0.18, -3.2]} size={7} color="#4fa79c" opacity={0.18} pulse={0.4} />
        </>
      );

    /* 05 · Show control — preview, program, cues and sources */
    case "control":
      return (
        <>
          <Screen media={s[1]} width={2.5} height={1.45} position={[-1.55, 3.0, -5.0]} pitch={2.6} brightness={1.35} range={38} />
          <Screen media={s[2]} width={2.5} height={1.45} position={[1.55, 3.0, -5.0]} pitch={2.6} brightness={1.35} range={38} />
          <Screen media={s[0]} width={1.6} height={2.0} position={[4.0, 2.5, -5.0]} pitch={2.6} range={38} />
          <Screen
            media={s[3]}
            width={2.1}
            height={1.6}
            position={[-4.0, 2.4, -4.9]}
            rotation={[0, 0.25, 0]}
            pitch={2.6}
            range={38}
          />
          <Desk width={5.0} z={-1.8} />
          <MonitorRow position={[0, 1.0, -1.45]} count={4} accent="#5f8fa3" />
          {/* two operator positions, angled in */}
          {[-1.3, 1.3].map((x) => (
            <mesh key={x} position={[x, 1.28, -2.1]} rotation={[-0.32, x > 0 ? -0.2 : 0.2, 0]} material={M.anodised}>
              <boxGeometry args={[1.0, 0.58, 0.04]} />
            </mesh>
          ))}
          <Rack position={[3.9, 0, -2.6]} units={11} />
          <LightPool position={[0, 0.16, -2.4]} size={[9, 7]} color="#5f8fa3" opacity={0.1} />
        </>
      );

    /* 06 · Live production & broadcast */
    case "broadcast":
      return (
        <>
          <Screen media={s[0]} width={5.4} height={3.0} position={[-1.1, 2.8, -5.0]} pitch={1.5} brightness={1.4} range={38} />
          <Screen media={s[1]} width={2.3} height={1.35} position={[3.2, 3.6, -5.0]} pitch={2.6} range={38} />
          <Screen media={s[2]} width={2.3} height={1.5} position={[3.2, 2.0, -5.0]} pitch={2.6} range={38} />
          <Desk width={4.2} z={-1.9} />
          <MonitorRow position={[0, 1.0, -1.55]} count={3} accent="#a8705f" />
          {/* a camera on sticks, pointed at the aisle */}
          <group position={[-3.7, 0, -1.2]}>
            {[0, 1, 2].map((i) => {
              const a = (i / 3) * Math.PI * 2;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * 0.34, 0.6, Math.sin(a) * 0.34]}
                  rotation={[Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3]}
                  material={M.anodised}
                >
                  <cylinderGeometry args={[0.022, 0.03, 1.25, 6]} />
                </mesh>
              );
            })}
            <mesh position={[0, 1.34, 0]} material={M.charcoal}>
              <boxGeometry args={[0.32, 0.26, 0.62]} />
            </mesh>
            <mesh position={[0, 1.34, 0.4]} material={M.anodised}>
              <cylinderGeometry args={[0.1, 0.12, 0.3, 14]} />
            </mesh>
            <mesh position={[0, 1.5, 0.1]}>
              <boxGeometry args={[0.06, 0.05, 0.05]} />
              <meshBasicMaterial color="#c8462f" toneMapped />
            </mesh>
          </group>
          <LightPool position={[0, 0.16, -2.2]} size={[9, 7]} color="#a8705f" opacity={0.1} />
        </>
      );

    /* 07 · Connected events — the room, and everyone outside it */
    case "link":
      return (
        <>
          <Screen media={s[0]} width={4.6} height={2.6} position={[-1.8, 2.8, -5.0]} pitch={1.5} brightness={1.4} range={38} />
          <Screen media={s[1]} width={3.0} height={1.9} position={[2.9, 3.3, -4.9]} rotation={[0, -0.18, 0]} pitch={2.6} range={38} />
          <Screen media={s[2]} width={2.2} height={1.5} position={[-4.68, 2.4, -2.6]} rotation={[0, Math.PI / 2, 0]} pitch={2.6} range={34} />
          {/* a small physical stage and lectern — the "here" half of hybrid */}
          <mesh position={[0, 0.34, -1.6]} material={M.deck}>
            <boxGeometry args={[4.4, 0.36, 2.4]} />
          </mesh>
          <mesh position={[-1.1, 1.06, -1.3]} material={M.graphite}>
            <boxGeometry args={[0.6, 1.1, 0.42]} />
          </mesh>
          <mesh position={[-1.1, 1.62, -1.24]} rotation={[-0.35, 0, 0]}>
            <planeGeometry args={[0.5, 0.3]} />
            <meshBasicMaterial color="#25514c" toneMapped />
          </mesh>
          <LightPool position={[0, 0.16, -2]} size={[9, 7]} color="#6f9d8c" opacity={0.11} />
        </>
      );

    /* 08 · Digital — the web work, shown on the web */
    case "studio":
      return (
        <>
          <Screen media={s[0]} width={5.0} height={2.8} position={[-1.4, 2.8, -5.0]} pitch={2.6} brightness={1.4} range={38} />
          <Screen media={s[1]} width={1.6} height={1.9} position={[3.1, 3.2, -5.0]} pitch={2.6} range={38} />
          <Screen media={s[2]} width={2.6} height={1.5} position={[0, 1.72, -2.2]} rotation={[-0.08, 0, 0]} pitch={2.6} range={32} />
          <Desk width={4.0} z={-2.0} height={0.78} />
          {/* a second monitor on an arm, because that is what a studio looks like */}
          <mesh position={[1.9, 1.3, -2.2]} material={M.anodised}>
            <cylinderGeometry args={[0.03, 0.03, 1.0, 8]} />
          </mesh>
          <Screen
            media={s[1]}
            width={1.0}
            height={0.62}
            position={[1.9, 1.72, -2.1]}
            rotation={[0, -0.5, 0]}
            pitch={2.6}
            range={30}
          />
          <LightPool position={[0, 0.16, -2.4]} size={[9, 7]} color="#8d84b8" opacity={0.11} />
        </>
      );
  }
}

/* ── the shell every pavilion shares ───────────────────── */

export function ServicePavilion({ p }: { p: Pavilion }) {
  const prox = useProximity(p.p);
  const trim = useRef<THREE.MeshBasicMaterial>(null);
  const pool = useRef<THREE.Mesh>(null);
  const open = useVenue((s) => s.openPavilion);
  const hovered = useRef(false);

  useFrame(() => {
    const v = prox.current;
    if (trim.current) trim.current.opacity = 0.25 + v * 0.75;
  });

  // side -1 → stall on the left, its face turned toward the aisle at +X
  const rotY = p.side === -1 ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={[p.side * 9.2, 0, p.z]} rotation={[0, rotY, 0]}>
      {/* the footprint: matte deck against the hall's polished floor, with a
          lit edge all the way round, so the stand has a boundary */}
      <mesh position={[0, 0.07, -D / 2 + 1]} material={M.deck} receiveShadow>
        <boxGeometry args={[W, 0.14, D]} />
      </mesh>
      <mesh position={[0, 0.145, 1.52]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, 0.07]} />
        <meshBasicMaterial ref={trim} color={p.accent} transparent opacity={0.6} toneMapped />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={`edge${side}`}
          position={[side * (W / 2 - 0.04), 0.145, -D / 2 + 1]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.07, D]} />
          <meshBasicMaterial color={p.accent} toneMapped />
        </mesh>
      ))}

      {/* back wall + side fins */}
      <mesh position={[0, H / 2, -5.3]} material={M.graphite}>
        <boxGeometry args={[W, H, 0.3]} />
      </mesh>
      {/* A wash down the back wall and a lit slot in the soffit: without them
          a graphite stall in a dark hall reads as a hole, not a room. */}
      <LightPool
        position={[0, H / 2 - 0.4, -5.12]}
        rotation={[0, 0, 0]}
        size={[W * 1.25, H * 1.6]}
        color={p.accent}
        opacity={0.24}
        pulse={0.3}
      />
      {/* a graze down the back wall and a pool on the deck */}
      <mesh position={[0, H - 0.22, -5.1]} rotation={[0, 0, 0]}>
        <planeGeometry args={[W - 0.8, 0.08]} />
        <meshBasicMaterial color={p.accent} toneMapped />
      </mesh>
      <LightPool position={[0, 0.16, -2.4]} size={[W * 0.95, 7]} color={p.accent} opacity={0.16} />
      {/* A second, warm pool over the whole deck. The accent pool alone left
          the stall floor reading as a hole in the aisle: an accent lights an
          *object*, and a floor needs a key. */}
      <LightPool position={[0, 0.155, -1.8]} size={[W * 1.02, 8.4]} color="#b89464" opacity={0.11} />

      {/* ── stall lighting ──
          A pavilion is a room inside a room, and the hall's own ceiling is
          nine metres above it — nothing of that reaches down here. Each stall
          therefore carries its own rig: a header truss, warm downlights along
          it washing the back wall, a lit valance over the opening, and a pair
          of accent uplights in the back corners. This is what the brief means
          by more light in the service area, and it is also what makes eight
          stalls read as eight *places* rather than eight dark alcoves. */}
      <Truss length={W * 0.94} size={0.26} position={[0, 4.5, -1.2]} braceEvery={0.8} />
      {[-1, -0.34, 0.34, 1].map((f, i) => (
        <group key={`dl${i}`}>
          <mesh position={[f * W * 0.34, 4.26, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.6, 0.38]} />
            <meshBasicMaterial color="#f6d5a4" toneMapped />
          </mesh>
          <LightPool position={[f * W * 0.32, 0.17, -2.1]} size={[5.4, 6.4]} color="#b58d57" opacity={0.11} />
        </group>
      ))}
      {/* the valance over the opening, and the light it throws forward */}
      <mesh position={[0, 4.02, 1.5]} material={M.charcoal}>
        <boxGeometry args={[W * 0.98, 0.5, 0.3]} />
      </mesh>
      <mesh position={[0, 3.79, 1.66]}>
        <planeGeometry args={[W * 0.92, 0.07]} />
        <meshBasicMaterial color={p.accent} toneMapped />
      </mesh>
      <LightPool position={[0, 0.17, 1.4]} size={[W, 5]} color={p.accent} opacity={0.11} />
      {/* back-corner uplights, grazing the side walls */}
      {[-1, 1].map((side) => (
        <group key={`up${side}`}>
          <mesh position={[side * W * 0.44, 0.09, -3.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.6, 0.24]} />
            <meshBasicMaterial color="#d9b077" toneMapped />
          </mesh>
          <LightPool
            position={[side * W * 0.47, 2.2, -3.0]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            size={[5.5, 4.6]}
            color="#8a6f4c"
            opacity={0.14}
          />
        </group>
      ))}
      <mesh position={[0, H - 0.08, -2.4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 1.4, 0.12]} />
        <meshBasicMaterial color={p.accent} toneMapped />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (W / 2 - 0.15), H / 2, -2.2]} material={M.charcoal}>
            <boxGeometry args={[0.3, H, 6.4]} />
          </mesh>
          {/* a light line down the inside face of each fin */}
          <mesh
            position={[side * (W / 2 - 0.31), H / 2, -2.2]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[6.0, 0.09]} />
            <meshBasicMaterial color={p.accent} toneMapped />
          </mesh>
        </group>
      ))}

      {/* soffit over the stand, and the downlights rigged into it */}
      <mesh position={[0, H + 0.02, -2.2]} rotation={[Math.PI / 2, 0, 0]} material={M.charcoal}>
        <planeGeometry args={[W, 6.6]} />
      </mesh>
      {[-3.6, -1.2, 1.2, 3.6].map((x) =>
        [-0.6, -3.2].map((z) => (
          <mesh key={`dl${x}${z}`} position={[x, H - 0.05, z]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.38, 0.38]} />
            <meshBasicMaterial color="#eef4f5" toneMapped />
          </mesh>
        )),
      )}

      {/* ── the fascia ──
          In every one of the reference stands the header is the brightest
          object in the frame and spans the whole stand: it is how you find a
          company across a hall. This one was two-thirds the stand's width, at
          unity brightness, on an unlit beam — legible from three metres and
          invisible from thirty. It now runs nearly wall to wall, sits in a lit
          reveal, and throws light back onto its own beam. */}
      <mesh position={[0, H + 0.42, -1.6]} material={M.charcoal}>
        <boxGeometry args={[W + 0.6, 0.98, 1.0]} />
      </mesh>
      <mesh position={[0, H - 0.09, -1.08]}>
        <planeGeometry args={[W + 0.5, 0.05]} />
        <meshBasicMaterial color={p.accent} toneMapped />
      </mesh>
      <mesh position={[0, H + 0.93, -1.08]}>
        <planeGeometry args={[W + 0.5, 0.05]} />
        <meshBasicMaterial color={p.accent} toneMapped />
      </mesh>
      <Screen
        media={`sign-${p.id}`}
        width={W - 0.5}
        height={1.24}
        position={[0, H + 0.42, -1.05]}
        pitch={1.5}
        brightness={1.3}
        range={70}
        frame={false}
      />
      <LightPool
        position={[0, H + 0.42, -0.6]}
        size={[W * 1.2, 3.2]}
        color={p.accent}
        opacity={0.16}
      />
      {/* stall number, cut into the fin */}
      <mesh position={[-(W / 2 - 0.32), H - 0.5, 1.2]}>
        <planeGeometry args={[0.5, 0.06]} />
        <meshBasicMaterial color={p.accent} toneMapped />
      </mesh>

      {/* the things that make it a stand rather than a set: something to walk
          up to, and something to read from */}
      <Counter width={3.4} z={1.1} accent={p.accent} />
      {/* The threshold: edge-lit glass either side of the opening, and a
          planter at the outside corner. Both are in every reference stand, and
          together they are most of what separates a premium exhibition build
          from a black alcove with a screen in it. */}
      {[-1, 1].map((side) => (
        <GlassBlock
          key={`gb${side}`}
          position={[side * (W / 2 - 0.9), 0, 1.75]}
          rotation={-side * 0.35}
          accent={p.accent}
        />
      ))}
      <Planter position={[p.side * -(W / 2 - 0.55), 0, 0.4]} scale={0.95} seed={Number(p.no) * 7} />
      {/* The stand is rotated to face the aisle, so which way "downstream"
          points in local space flips with the side. Putting the kiosk on the
          wrong one parks it against the camera as it arrives. */}
      <Kiosk id={p.id} x={-p.side * 3.2} accent={p.accent} />

      {/* One real fixture per stall. Emissive planes light nothing — they only
          look bright — so without this the counter, the glass and the planting
          were all silhouettes. One is the budget: eight stalls on a forward
          renderer is eight more lights in every material in view. */}
      <pointLight position={[0, 3.4, -1.4]} intensity={12} distance={10} decay={2} color="#e0be8e" />

      <Form p={p} />

      {/* the whole stall front is the hit area for opening its detail panel */}
      <mesh
        position={[0, 2.4, 1.6]}
        onClick={(e) => {
          e.stopPropagation();
          open(p.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          hovered.current = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hovered.current = false;
          document.body.style.cursor = "";
        }}
        visible={false}
      >
        <planeGeometry args={[W, 5]} />
      </mesh>

      <mesh ref={pool} visible={false} />
    </group>
  );
}

/* ── the sound & lighting partner bay ──────────────────── */

export function PartnerBay() {
  const open = useVenue((s) => s.openPavilion);
  const quality = useVenue((s) => s.quality);
  const p = PARTNER_BAY;
  // The bay sits on the right-hand side of the boulevard, facing the aisle.
  const rotY = -Math.PI / 2;

  return (
    <group position={[p.side * 9.6, 0, p.z]} rotation={[0, rotY, 0]}>
      {/* deliberately a bay, not a stall: open truss goalpost, no back wall */}
      <mesh position={[0, 0.07, -2]} material={M.deck}>
        <boxGeometry args={[11, 0.14, 8]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 4.8, 3.2, -2]} material={M.steel}>
          <boxGeometry args={[0.32, 6.4, 0.32]} />
        </mesh>
      ))}
      <Truss length={9.6} size={0.34} position={[0, 6.5, -2]} braceEvery={0.7} />

      <Screen
        media={`sign-${p.id}`}
        width={5.6}
        height={0.95}
        position={[0, 5.55, -1.6]}
        pitch={1.5}
        range={46}
        frame={false}
      />
      <Screen media="partner-bay" width={3.4} height={2.4} position={[3.0, 2.6, -4.6]} pitch={1.5} range={38} frame={false} />
      <Kiosk id={p.id} x={-3.4} accent={p.accent} />

      {/* representative PA and lighting — silhouettes, no brands, and nothing
          claimed as owned stock: this is what a partner brings to site */}
      <LineArray position={[-3.6, 6.1, -2.4]} boxes={7} />
      <LineArray position={[3.6, 6.1, -2.4]} boxes={5} />
      <SubStack position={[-4.2, 0.14, -4.6]} count={3} />
      {/* stage monitors, angled back toward the performer position */}
      {[-1.6, 0.2, 2.0].map((x) => (
        <mesh key={`wedge${x}`} position={[x, 0.36, -3.4]} rotation={[0.42, 0, 0]} material={M.anodised}>
          <boxGeometry args={[0.78, 0.42, 0.56]} />
        </mesh>
      ))}
      {/* a floor package on bases as well as the flown rig */}
      {[-3.0, 3.0].map((x) => (
        <mesh key={`base${x}`} position={[x, 0.24, -0.6]} material={M.charcoal}>
          <boxGeometry args={[0.6, 0.2, 0.6]} />
        </mesh>
      ))}
      {quality !== "low" &&
        [-2.4, -0.8, 0.8, 2.4].map((x, i) => (
          <MovingHead key={x} position={[x, 6.2, -2]} seed={i * 1.7} reach={7} color="#e3c08a" intensity={0.8} />
        ))}
      {quality === "high" &&
        [-3.0, 3.0].map((x, i) => (
          <MovingHead
            key={`fl${x}`}
            position={[x, 0.36, -0.6]}
            seed={i * 2.9 + 5}
            reach={6.5}
            color="#d9b0e0"
            intensity={0.7}
            hanging={false}
            beamAngle={0.07}
          />
        ))}
      {/* lighting console on a small desk */}
      <mesh position={[1.6, 0.95, -0.4]} material={M.graphite}>
        <boxGeometry args={[1.7, 0.06, 0.8]} />
      </mesh>
      <mesh position={[1.6, 1.02, -0.4]} rotation={[-0.2, 0, 0]} material={M.anodised}>
        <boxGeometry args={[1.5, 0.05, 0.55]} />
      </mesh>

      <LightPool position={[0, 0.16, -2]} size={[11, 9]} color="#c08a54" opacity={0.12} pulse={0.4} />

      <mesh
        position={[0, 2.6, 2.2]}
        onClick={(e) => {
          e.stopPropagation();
          open(p.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
        visible={false}
      >
        <planeGeometry args={[11, 5.5]} />
      </mesh>
    </group>
  );
}

/* ── the boulevard ─────────────────────────────────────── */

export function Boulevard() {
  return (
    <group>
      {/* One stall is ~30 meshes; gating each means the four in front of the
          visitor are drawn and the other five are free. */}
      {PAVILIONS.map((p) => (
        <ZoneGroup key={p.id} from={p.z + 8} to={p.z - 8} ahead={58} behind={26}>
          <ServicePavilion p={p} />
        </ZoneGroup>
      ))}
      <ZoneGroup from={PARTNER_BAY.z + 8} to={PARTNER_BAY.z - 8} ahead={58} behind={26}>
        <PartnerBay />
      </ZoneGroup>
      {/* the aisle itself: a centre light line running the length of it */}
      <mesh position={[0, 0.016, -164]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, 120]} />
        <meshBasicMaterial color="#1d3a39" toneMapped />
      </mesh>
    </group>
  );
}
