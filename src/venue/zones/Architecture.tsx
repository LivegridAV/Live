"use client";
import { useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { ExpoAsset } from "../three/ExpoAsset";
import { M } from "../three/materials";
import { Truss } from "../three/rig";
import { ZoneGroup } from "../three/ZoneGroup";
import { LightPool } from "../three/environment";
import { useVenue } from "../systems/store";
import { stoneSurface } from "../three/stoneSurface";

/**
 * The building.
 *
 * Everything the visitor walks through is one continuous structure: a plaza,
 * an entrance, a long exhibition hall and an arena, joined end to end along
 * -Z. Long surfaces are cut into segments so the frustum can actually reject
 * them — a single 210 m wall is never off-screen as far as the culler is
 * concerned, and that alone costs more than the geometry ever will.
 */

/* ── venue dimensions (metres) ─────────────────────────── */
export const V = {
  hall: { x: 19, y: 15, from: -26, to: -238 },
  arena: { x: 44, y: 34, from: -244, to: -380 },
  plaza: { from: 46, to: -1 },
} as const;

function segments(from: number, to: number, size: number) {
  const out: { z: number; len: number }[] = [];
  const total = Math.abs(to - from);
  const n = Math.ceil(total / size);
  const len = total / n;
  for (let i = 0; i < n; i++) out.push({ z: from - len * (i + 0.5), len });
  return out;
}

/* ── ground ────────────────────────────────────────────── */

export function Ground() {
  const quality = useVenue((s) => s.quality);
  const stone = useMemo(() => stoneSurface(), []);
  const hallSegs = useMemo(() => segments(V.hall.from + 6, V.hall.to, 36), []);
  const arenaSegs = useMemo(() => segments(V.arena.from + 6, V.arena.to, 40), []);

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, -200]}>
        <planeGeometry args={[88, 360]} />
        <MeshReflectorMaterial color="#919397" map={stone.colour} roughnessMap={stone.roughness}
          metalness={0.19} roughness={0.32}
          resolution={quality === "high" ? 1024 : 512} blur={quality === "low" ? [0, 0] : [180, 65]}
          mixBlur={0.75} mixStrength={2.2} mirror={0.8} depthScale={0}
          minDepthThreshold={0.85} maxDepthThreshold={1} />
      </mesh>
      {/* exterior plaza */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, (V.plaza.from + V.plaza.to) / 2]}
        material={M.stone}
        receiveShadow
      >
        <planeGeometry args={[90, V.plaza.from - V.plaza.to]} />
      </mesh>

      {/* hall floor — polished, so the screens streak across it */}
      {hallSegs.map((s, i) => (
        <mesh key={`h${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, s.z]} material={M.floor}>
          <planeGeometry args={[V.hall.x * 2, s.len]} />
        </mesh>
      ))}

      {/* arena floor */}
      {arenaSegs.map((s, i) => (
        <mesh key={`a${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, s.z]} material={M.floor}>
          <planeGeometry args={[V.arena.x * 2, s.len]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── exhibition hall shell ─────────────────────────────── */

/**
 * The hall is built in chunks rather than as one long room, and each chunk is
 * gated on the camera's position. Without that, standing at the entrance
 * submits every wall, column and truss of a 212 m hall that is entirely hidden
 * behind the façade — three.js culls by frustum, and a corridor is exactly the
 * shape that defeats it.
 */
export function HallShell() {
  return <group>{Array.from({ length: 8 }, (_, i) => {
    const z = -39.25 - i * 26.5;
    return <ZoneGroup key={i} from={z + 13.25} to={z - 13.25} ahead={68} behind={28}>
      <group position={[0, 0, z]} scale={[1, 1, 26.5 / 26]}>
        <ExpoAsset name="hall-bay" />
      </group>
    </ZoneGroup>;
  })}</group>;
}

/* ── arena shell ───────────────────────────────────────── */

export function ArenaShell() {
  const quality = useVenue((s) => s.quality);
  const wall = useMemo(() => segments(V.arena.from, V.arena.to, 56), []);
  const trusses = useMemo(() => {
    const out: number[] = [];
    for (let z = V.arena.from - 14; z > V.arena.to + 10; z -= 18) out.push(z);
    return out;
  }, []);

  return (
    <ZoneGroup from={V.arena.from} to={V.arena.to} ahead={70} behind={40}>
      {wall.map((s, i) =>
        [-1, 1].map((side) => (
          <mesh
            key={`aw${i}${side}`}
            position={[side * V.arena.x, V.arena.y / 2, s.z]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            material={M.concrete}
          >
            <planeGeometry args={[s.len, V.arena.y]} />
          </mesh>
        )),
      )}

      {/* Architectural lighting. The hall learned this lesson already: a room
          this size cannot be lit by fixtures with physical falloff, so the
          building carries its own light. Without it the arena reveal is a
          stage floating in black. */}
      {wall.map((seg, i) =>
        [-1, 1].map((side) => (
          <group key={`al${i}${side}`}>
            {/* a full-height slot every bay */}
            {[0.22, 0.5, 0.78].map((f) => (
              <mesh
                key={f}
                position={[side * (V.arena.x - 0.12), 7.4, seg.z + (f - 0.5) * seg.len]}
                rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
              >
                <planeGeometry args={[0.18, 12.4]} />
                <meshBasicMaterial color="#6d8a8e" toneMapped />
              </mesh>
            ))}
            {/* a warm architectural wash at mid height between the slots —
                the side walls of a room this wide are most of what the eye
                sees in peripheral vision, and unlit they read as nothing */}
            <LightPool
              position={[side * (V.arena.x - 0.3), 6.2, seg.z]}
              rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
              size={[seg.len * 0.9, 13]}
              color="#8a6f4c"
              opacity={0.1}
            />
            {/* a low wash along the base of the wall */}
            <mesh
              position={[side * (V.arena.x - 0.1), 0.12, seg.z]}
              rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            >
              <planeGeometry args={[seg.len, 0.12]} />
              <meshBasicMaterial color="#2c5651" toneMapped />
            </mesh>
            <LightPool
              position={[side * (V.arena.x - 5), 0.05, seg.z]}
              size={[12, seg.len * 0.8]}
              color="#5c757e"
              opacity={0.06}
            />
          </group>
        )),
      )}

      {/* House lighting used to hang at thirty-one metres, above the top of
          every frame. The ceiling in `zones/Arena` carries it now, at a height
          the camera can see. What is left here is the light on the *floor*,
          which is what gives the room its foreground. */}
      {trusses.map((z) => (
        <LightPool
          key={`fl${z}`}
          position={[0, 0.045, z]}
          size={[70, 26]}
          color="#8a6f4c"
          opacity={0.05}
        />
      ))}

      {/* back wall behind the stage */}
      <mesh position={[0, V.arena.y / 2, V.arena.to]} material={M.concrete}>
        <planeGeometry args={[V.arena.x * 2, V.arena.y]} />
      </mesh>

      {/* roof */}
      {wall.map((s, i) => (
        <mesh key={`ac${i}`} position={[0, V.arena.y, s.z]} rotation={[Math.PI / 2, 0, 0]} material={M.void}>
          <planeGeometry args={[V.arena.x * 2, s.len]} />
        </mesh>
      ))}

      {/* roof grid */}
      {quality !== "low" &&
        trusses.map((z) => (
          <Truss key={`at${z}`} length={V.arena.x * 2 - 6} size={0.52} position={[0, V.arena.y - 2.4, z]} braceEvery={1.4} />
        ))}

      {/* high-level cove down each side wall, so a thirty-four metre room has
          a top edge the eye can find */}
      {wall.map((s, i) =>
        [-1, 1].map((side) => (
          <mesh
            key={`ac${i}${side}`}
            position={[side * (V.arena.x - 0.1), 14.8, s.z]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[s.len, 0.3]} />
            <meshBasicMaterial color="#7d9498" toneMapped />
          </mesh>
        )),
      )}

    </ZoneGroup>
  );
}

/* ── the joint between hall and arena ──────────────────── */

export function ArenaPortal({ z = -241 }: { z?: number }) {
  const h = 11;
  const w = 14;
  return (
    <group position={[0, 0, z]}>
      {/* the wall the portal is cut into */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (V.hall.x / 2 + w / 4), V.hall.y / 2, 0]} material={M.charcoal}>
          <boxGeometry args={[V.hall.x - w / 2, V.hall.y, 1.2]} />
        </mesh>
      ))}
      <mesh position={[0, (V.hall.y + h) / 2, 0]} material={M.charcoal}>
        <boxGeometry args={[w, V.hall.y - h, 1.2]} />
      </mesh>
      {/* portal reveal — warm light spilling from the arena beyond */}
      {[-1, 1].map((side) => (
        <mesh key={`r${side}`} position={[side * (w / 2 + 0.06), h / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[h, 0.12]} />
          <meshBasicMaterial color="#5a4429" toneMapped />
        </mesh>
      ))}
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, 0.12]} />
        <meshBasicMaterial color="#5a4429" toneMapped />
      </mesh>
    </group>
  );
}

/* ── shared helper: a pavilion-sized floor plinth ──────── */

export function Plinth({
  position,
  size,
  height = 0.12,
  material = M.deck,
}: {
  position: [number, number, number];
  size: [number, number];
  height?: number;
  material?: THREE.Material;
}) {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} material={material} receiveShadow>
      <boxGeometry args={[size[0], height, size[1]]} />
    </mesh>
  );
}
