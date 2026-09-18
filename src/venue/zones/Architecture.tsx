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

  const slots = useMemo(() => {
    const out: number[] = [];
    for (let z = from - 4; z > to; z -= 8) out.push(z);
    return out;
  }, [from, to]);

  /**
   * Warm downlights in the ceiling, on a tighter spacing than the truss bays.
   *
   * Everything lighting this hall was some shade of steel or teal, and a room
   * lit entirely in one cool hue reads as unlit however many emitters are in
   * it — there is nothing for the cool to be cool *against*. These are the
   * warm half of the scheme, and they are what the brief means by
   * architectural ambience.
   */
  const downs = useMemo(() => {
    const out: number[] = [];
    for (let z = from - 3.5; z > to; z -= 7) out.push(z);
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
      <mesh position={[0, V.hall.y, mid]} rotation={[Math.PI / 2, 0, 0]} material={M.ceiling}>
        <planeGeometry args={[V.hall.x * 2, len]} />
      </mesh>

      {/* Skirting, coves and wall slots.
          Point lights with physical falloff cannot light a hall this size —
          at twenty metres a 20 W fixture contributes almost nothing — so the
          architecture lights itself, the way a real exhibition hall does.
          These are emissive strips: free to draw, and they are what stops the
          room reading as a void. */}
      {[-1, 1].map((side) => (
        <group key={`lit${side}`}>
          {/* skirting line */}
          <mesh
            position={[side * (V.hall.x - 0.05), 0.07, mid]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[len, 0.06]} />
            <meshBasicMaterial color="#2c5c58" toneMapped />
          </mesh>
          {/* continuous cove where the wall meets the ceiling */}
          <mesh
            position={[side * (V.hall.x - 0.06), V.hall.y - 0.9, mid]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[len, 0.22]} />
            <meshBasicMaterial color="#8d9ea4" toneMapped />
          </mesh>
          {/* a graded wash down the wall beneath the cove */}
          <mesh
            position={[side * (V.hall.x - 0.08), V.hall.y * 0.62, mid]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[len, V.hall.y * 0.5]} />
            <meshBasicMaterial color="#1d282c" toneMapped transparent opacity={0.85} />
          </mesh>
        </group>
      ))}

      {/* vertical light slots at regular bays: the strongest single cue that a
          dark wall is a wall and not the absence of one */}
      {slots.map((z) =>
        [-1, 1].map((side) => (
          <mesh
            key={`sl${z}${side}`}
            position={[side * (V.hall.x - 0.07), V.hall.y * 0.45, z]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[0.1, V.hall.y * 0.72]} />
            <meshBasicMaterial color="#6f8b92" toneMapped />
          </mesh>
        )),
      )}
      {slots.map((z) =>
        [-1, 1].map((side) => (
          <LightPool
            key={`wp${z}${side}`}
            position={[side * (V.hall.x - 2.6), 0.05, z]}
            size={[7, 9]}
            color="#5f7c84"
            opacity={0.07}
          />
        )),
      )}

      {/* structural columns down each side, with a recessed light slot */}
      {columns.map((z) =>
        [-1, 1].map((side) => (
          <group key={`col${z}${side}`} position={[side * (V.hall.x - 0.6), 0, z]}>
            <mesh position={[0, V.hall.y / 2, 0]} material={M.charcoal}>
              <boxGeometry args={[1.2, V.hall.y, 1.2]} />
            </mesh>
            <mesh
              position={[side * -0.62, V.hall.y / 2, 0]}
              rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            >
              <planeGeometry args={[0.1, V.hall.y - 2.4]} />
              <meshBasicMaterial color="#4a7370" toneMapped />
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
        [-13, -4.5, 4.5, 13].map((x) => (
          <mesh key={`lb${z}${x}`} position={[x, V.hall.y - 1.45, z]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6.4, 0.2]} />
            <meshBasicMaterial color="#9fb2b8" toneMapped />
          </mesh>
        )),
      )}
      {trusses.map((z) => (
        <LightPool
          key={`lp${z}`}
          position={[0, 0.04, z]}
          size={[34, 24]}
          color="#8497a0"
          opacity={0.1}
        />
      ))}

      {/* ── warm architectural ambience ── */}
      {downs.map((z) =>
        [-15.5, -9, 9, 15.5].map((x) => (
          <group key={`dn${z}${x}`}>
            <mesh position={[x, V.hall.y - 0.55, z]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.5, 0.5]} />
              <meshBasicMaterial color="#e6c08a" toneMapped />
            </mesh>
            {/* the pool it lays on the floor, well out toward the walls where
                the hall was darkest */}
            <LightPool position={[x * 0.92, 0.045, z]} size={[9, 8]} color="#a8814d" opacity={0.085} />
          </group>
        )),
      )}

      {/* a warm cove opposite the cool one, low on the wall — this is the
          "low-level environment lighting that reveals the space" */}
      {[-1, 1].map((side) => (
        <group key={`warm${side}`}>
          <mesh
            position={[side * (V.hall.x - 0.07), 2.5, mid]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[len, 0.09]} />
            <meshBasicMaterial color="#9a7748" toneMapped />
          </mesh>
          <LightPool
            position={[side * (V.hall.x - 0.35), 1.5, mid]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            size={[len * 0.96, 5.2]}
            color="#8a6a42"
            opacity={0.1}
          />
        </group>
      ))}

      {/* rigging practicals: a warm point at each truss end, so the steel
          overhead glows rather than disappearing */}
      {quality !== "low" &&
        trusses.map((z) =>
          [-1, 1].map((side) => (
            <mesh key={`tg${z}${side}`} position={[side * (V.hall.x - 2.2), V.hall.y - 1.1, z]}>
              <sphereGeometry args={[0.09, 6, 5]} />
              <meshBasicMaterial color="#f0cf9c" toneMapped />
            </mesh>
          )),
        )}

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

      {/* tiered seating banks either side — scale cues, not detail */}
      {[-1, 1].map((side) =>
        Array.from({ length: 9 }, (_, i) => (
          <mesh
            key={`seat${side}${i}`}
            position={[side * (V.arena.x - 5 - i * 2.4), 1.0 + i * 1.2, -318]}
            material={M.charcoal}
          >
            <boxGeometry args={[2.4, 1.2, 66]} />
          </mesh>
        )),
      )}
      {/* a lit nosing on every tier: banked seating is invisible in the dark
          without one, and it is the cue that says "this room holds people" */}
      {[-1, 1].map((side) =>
        Array.from({ length: 9 }, (_, i) => (
          <mesh
            key={`nose${side}${i}`}
            position={[side * (V.arena.x - 6.2 - i * 2.4), 1.62 + i * 1.2, -318]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[66, 0.05]} />
            <meshBasicMaterial color="#3b5a5c" toneMapped />
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
