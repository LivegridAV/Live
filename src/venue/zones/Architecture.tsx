"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { M } from "../three/materials";
import { Truss } from "../three/rig";
import { ZoneGroup } from "../three/ZoneGroup";
import { LightPool } from "../three/environment";
import { useVenue } from "../systems/store";

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
  hall: { x: 26, y: 15, from: -26, to: -238 },
  arena: { x: 58, y: 32, from: -244, to: -356 },
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
  const hallSegs = useMemo(() => segments(V.hall.from + 6, V.hall.to, 36), []);
  const arenaSegs = useMemo(() => segments(V.arena.from + 6, V.arena.to, 40), []);

  return (
    <group>
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
const HALL_CHUNK = 53;

function HallChunk({ from, to }: { from: number; to: number }) {
  const quality = useVenue((s) => s.quality);
  const len = Math.abs(to - from);
  const mid = (from + to) / 2;

  const columns = useMemo(() => {
    const out: number[] = [];
    for (let z = Math.ceil(from / 24) * 24; z > to; z -= 24) if (z <= from) out.push(z);
    return out;
  }, [from, to]);

  const trusses = useMemo(() => {
    const out: number[] = [];
    for (let z = from - 7; z > to; z -= 14) out.push(z);
    return out;
  }, [from, to]);

  return (
    <group>
      {/* side walls */}
      {[-1, 1].map((side) => (
        <mesh
          key={`w${side}`}
          position={[side * V.hall.x, V.hall.y / 2, mid]}
          rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          material={M.graphite}
        >
          <planeGeometry args={[len, V.hall.y]} />
        </mesh>
      ))}

      {/* ceiling */}
      <mesh position={[0, V.hall.y, mid]} rotation={[Math.PI / 2, 0, 0]} material={M.void}>
        <planeGeometry args={[V.hall.x * 2, len]} />
      </mesh>

      {/* skirting light line */}
      {[-1, 1].map((side) => (
        <mesh
          key={`sk${side}`}
          position={[side * (V.hall.x - 0.05), 0.06, mid]}
          rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
        >
          <planeGeometry args={[len, 0.05]} />
          <meshBasicMaterial color="#1d3a39" toneMapped />
        </mesh>
      ))}

      {/* structural columns with recessed light slots */}
      {columns.map((z) =>
        [-1, 1].map((side) => (
          <group key={`col${z}${side}`} position={[side * (V.hall.x - 0.6), 0, z]}>
            <mesh position={[0, V.hall.y / 2, 0]} material={M.charcoal}>
              <boxGeometry args={[1.2, V.hall.y, 1.2]} />
            </mesh>
            <mesh position={[side * -0.62, V.hall.y / 2, 0]} rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
              <planeGeometry args={[0.1, V.hall.y - 2.4]} />
              <meshBasicMaterial color="#2c4a4a" toneMapped />
            </mesh>
          </group>
        )),
      )}

      {/* roof grid — real truss, spanning the hall */}
      {quality !== "low" &&
        trusses.map((z) => (
          <Truss key={`t${z}`} length={V.hall.x * 2 - 1} size={0.4} position={[0, V.hall.y - 1.1, z]} braceEvery={0.9} />
        ))}

      {/* Architectural light bars rigged to the grid. Without them the hall has
          no ceiling to read against and the room loses its height. */}
      {trusses.map((z) =>
        [-15, -5, 5, 15].map((x) => (
          <mesh key={`lb${z}${x}`} position={[x, V.hall.y - 1.45, z]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.4, 0.16]} />
            <meshBasicMaterial color="#6d8288" toneMapped />
          </mesh>
        )),
      )}
      {trusses.map((z) => (
        <LightPool
          key={`lp${z}`}
          position={[0, 0.04, z]}
          size={[40, 26]}
          color="#7d919a"
          opacity={0.05}
        />
      ))}

      {/* longitudinal runs, so the roof reads as a grid and not a ladder */}
      {quality === "high" &&
        [-14, 0, 14].map((x) => (
          <Truss
            key={`tl${x}`}
            length={len}
            size={0.4}
            position={[x, V.hall.y - 1.55, mid]}
            rotation={[0, Math.PI / 2, 0]}
            braceEvery={1.6}
          />
        ))}
    </group>
  );
}

export function HallShell() {
  const chunks = useMemo(() => {
    const out: { from: number; to: number }[] = [];
    for (let z = V.hall.from; z > V.hall.to; z -= HALL_CHUNK) {
      out.push({ from: z, to: Math.max(V.hall.to, z - HALL_CHUNK) });
    }
    return out;
  }, []);

  return (
    <group>
      {chunks.map((c) => (
        <ZoneGroup key={c.from} from={c.from} to={c.to} ahead={120} behind={55}>
          <HallChunk from={c.from} to={c.to} />
        </ZoneGroup>
      ))}
    </group>
  );
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
          <Truss key={`at${z}`} length={70} size={0.52} position={[0, V.arena.y - 2.4, z]} braceEvery={1.3} />
        ))}

      {/* tiered seating banks either side — scale cues, not detail */}
      {[-1, 1].map((side) =>
        Array.from({ length: 7 }, (_, i) => (
          <mesh
            key={`seat${side}${i}`}
            position={[side * (V.arena.x - 6 - i * 2.2), 0.9 + i * 1.05, -296]}
            material={M.charcoal}
          >
            <boxGeometry args={[2.2, 1.05, 54]} />
          </mesh>
        )),
      )}
    </ZoneGroup>
  );
}

/* ── the joint between hall and arena ──────────────────── */

export function ArenaPortal({ z = -241 }: { z?: number }) {
  const h = 11;
  const w = 13;
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
