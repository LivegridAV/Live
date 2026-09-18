"use client";
import { useMemo } from "react";
import { M } from "../three/materials";
import { Screen } from "../three/screens";
import { Truss, HangPoint } from "../three/rig";
import { LightPool } from "../three/environment";
import { ReflectionStreak } from "../three/Reflection";
import { useVenue } from "../systems/store";

/**
 * Exhibition architecture.
 *
 * The creative LED gallery used to be a collection of beautiful objects in an
 * unlit warehouse, which is a specific and avoidable failure: with nothing
 * around them, expensive installations read as renders floating in a void.
 *
 * What a real technology exhibition has, and what this file adds, is the
 * building between the exhibits — a vestibule that receives you from the
 * tunnel, a floor that changes material where each stand begins, low dividers
 * that give every installation a footprint, lit coves overhead, and signage
 * gantries spanning the aisle. None of it competes with the screens. All of it
 * gives them somewhere to be.
 */

/* ── the vestibule: where the tunnel delivers you ──────── */

/**
 * Seen from inside the tunnel, the exit aperture is a hole cut in the content,
 * sitting exactly where the composition is sending the eye. The fix is not to
 * hide it but to put a lit room behind it, so the visitor is walking toward
 * somewhere rather than toward a gap.
 */
export function Vestibule({ from = -29, to = -44 }: { from?: number; to?: number }) {
  const len = Math.abs(to - from);
  const mid = (from + to) / 2;
  const halfW = 7.6;
  const h = 7.2;

  const slots = useMemo(() => {
    const out: number[] = [];
    for (let z = from - 1.6; z > to; z -= 2.6) out.push(z);
    return out;
  }, [from, to]);

  return (
    <group>
      {/* splayed side walls, narrowing the hall down to the tunnel mouth */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * halfW, h / 2, mid]} rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} material={M.graphite}>
            <planeGeometry args={[len, h]} />
          </mesh>
          {/* vertical light slots cut into them — the cue that reads as depth */}
          {slots.map((z) => (
            <mesh
              key={z}
              position={[side * (halfW - 0.04), h / 2 - 0.4, z]}
              rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            >
              <planeGeometry args={[0.07, h - 1.6]} />
              <meshBasicMaterial color="#7d99a0" toneMapped />
            </mesh>
          ))}
        </group>
      ))}

      {/* soffit over the vestibule, with a continuous cove down each edge */}
      <mesh position={[0, h, mid]} rotation={[Math.PI / 2, 0, 0]} material={M.charcoal}>
        <planeGeometry args={[halfW * 2, len]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`c${side}`} position={[side * (halfW - 0.7), h - 0.06, mid]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.24, len - 0.6]} />
          <meshBasicMaterial color="#c3a678" toneMapped />
        </mesh>
      ))}

      {/* a lit threshold band on the floor: you have arrived somewhere */}
      <mesh position={[0, 0.02, from - 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfW * 1.9, 0.12]} />
        <meshBasicMaterial color="#b89161" toneMapped />
      </mesh>
      <LightPool position={[0, 0.04, mid]} size={[halfW * 2.2, len]} color="#b0915f" opacity={0.17} />
      <ReflectionStreak position={[0, 0.03, mid]} width={halfW * 1.7} length={len * 0.8} color="#c0a071" opacity={0.1} />

      {/* Portal fins either side of the aisle. They sit wide enough to frame
          the opening rather than block it — an earlier version put them on the
          centre line carrying half a wordmark each, which read as two pale
          slabs parked in the doorway. */}
      {[-1, 1].map((side) => (
        <Screen
          key={`b${side}`}
          media="vestibule-blade"
          width={0.95}
          height={5.8}
          position={[side * 5.55, 3.1, to + 1.2]}
          rotation={[0, side === -1 ? 0.26 : -0.26, 0]}
          pitch={1.5}
          brightness={1.0}
          range={70}
          frame={false}
        />
      ))}
      <pointLight position={[0, 3.4, to + 2]} intensity={18} distance={20} decay={2} color="#cdb489" />
    </group>
  );
}

/* ── stand architecture ────────────────────────────────── */

export interface StandProps {
  /** centre of the stand footprint */
  position: [number, number, number];
  /** footprint size along X and Z */
  size: [number, number];
  rotation?: number;
  accent?: string;
  /** a back wall gives the installation something to be seen against */
  backdrop?: boolean;
  /** overhead lighting truss and cove */
  overhead?: boolean;
  label?: string;
  /**
   * Where the name board hangs, relative to the stand centre and in **world**
   * axes — it is deliberately outside the stand's own rotation.
   *
   * The default used to be the back edge of the footprint, facing the way the
   * stand faces, which put the name behind the very installation it was
   * naming: from the aisle you saw a screen with its label hidden somewhere
   * behind it. A real exhibition hangs the fascia at the aisle edge, above
   * head height, turned to face the walkway, and that is what every call site
   * now specifies.
   */
  labelAt?: [number, number, number];
  /** Y rotation of the name board, in world axes. 0 faces +Z (back up the aisle). */
  labelFace?: number;
  /** name board width — wide stands carry a wider fascia */
  labelWidth?: number;
}

/**
 * The floor, edge, backdrop and overhead rig that turns an object standing in
 * a hall into an exhibition stand. Every creative installation in the gallery
 * sits on one of these.
 */
export function Stand({
  position,
  size,
  rotation = 0,
  accent = "#8fa3b8",
  backdrop = true,
  overhead = true,
  label,
  labelAt,
  labelFace = 0,
  labelWidth,
}: StandProps) {
  const quality = useVenue((s) => s.quality);
  const [w, d] = size;

  return (
    <group position={position}>
      {label && (
        <NameBoard
          position={labelAt ?? [0, 4.6, d / 2 - 0.4]}
          face={labelFace}
          media={label}
          width={labelWidth ?? Math.min(w * 0.5, 4.6)}
          accent={accent}
        />
      )}
      <group rotation={[0, rotation, 0]}>
      {/* the footprint: a different, matte floor material with a lit edge */}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.deck} receiveShadow>
        <planeGeometry args={[w, d]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`ex${side}`} position={[side * (w / 2), 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, d]} />
          <meshBasicMaterial color={accent} toneMapped />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`ez${side}`} position={[0, 0.03, side * (d / 2)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, 0.06]} />
          <meshBasicMaterial color={accent} toneMapped />
        </mesh>
      ))}

      {/* low dividers at the back corners: enough to read as a stand, low
          enough to keep the hall open */}
      {backdrop && (
        <>
          <mesh position={[0, 1.5, -d / 2 + 0.15]} material={M.graphite}>
            <boxGeometry args={[w * 0.92, 3.0, 0.25]} />
          </mesh>
          <mesh position={[0, 2.96, -d / 2 + 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w * 0.8, 0.09]} />
            <meshBasicMaterial color={accent} toneMapped />
          </mesh>
          <LightPool
            position={[0, 1.5, -d / 2 + 0.32]}
            rotation={[0, 0, 0]}
            size={[w * 1.05, 3.4]}
            color={accent}
            opacity={0.12}
          />
        </>
      )}

      {/* overhead: a short truss run and a cove, so the stand has a ceiling */}
      {overhead && quality !== "low" && (
        <>
          <Truss length={Math.min(w, 11)} size={0.28} position={[0, 6.4, 0]} braceEvery={0.8} />
          <HangPoint position={[-Math.min(w, 11) / 2 + 0.4, 9.2, 0]} drop={2.6} />
          <HangPoint position={[Math.min(w, 11) / 2 - 0.4, 9.2, 0]} drop={2.6} />
          <mesh position={[0, 6.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[Math.min(w, 11) * 0.8, 0.12]} />
            <meshBasicMaterial color="#96a9ae" toneMapped />
          </mesh>
        </>
      )}
      </group>
    </group>
  );
}

/**
 * A stand's name board.
 *
 * Signage in a hall is a built object, not a floating rectangle: a fascia
 * panel on a header beam, hung off two droppers, with a lit reveal under it.
 * Building it that way is also what keeps it legible — it sits at a height
 * nothing else on the stand occupies, so it can never end up behind an
 * exhibit.
 */
export function NameBoard({
  position,
  face = 0,
  media,
  width = 4.2,
  accent = "#8fa3b8",
}: {
  position: [number, number, number];
  face?: number;
  media: string;
  width?: number;
  accent?: string;
}) {
  const h = 0.86;
  return (
    <group position={position} rotation={[0, face, 0]}>
      {/* header beam the fascia is built onto */}
      <mesh position={[0, h / 2 + 0.24, -0.16]} material={M.charcoal}>
        <boxGeometry args={[width + 0.7, h + 0.48, 0.26]} />
      </mesh>
      {/* droppers */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 + 0.28), h + 1.5, -0.16]} material={M.steel}>
          <cylinderGeometry args={[0.028, 0.028, 2.4, 6]} />
        </mesh>
      ))}
      <Screen
        media={media}
        width={width}
        height={h}
        position={[0, h / 2 + 0.24, 0]}
        pitch={1.5}
        brightness={1.12}
        range={78}
        frame={false}
      />
      {/* The glass the sign lives behind. Real venue signage is nearly always
          behind a laminate, and the give-away is not the pane itself but the
          two things it does: a faint specular sheet across the face, and a
          bright line where the glass edge catches light. */}
      <mesh position={[0, h / 2 + 0.24, 0.035]}>
        <planeGeometry args={[width + 0.34, h + 0.34]} />
        <meshPhysicalMaterial
          color="#cfe6e2"
          transparent
          opacity={0.07}
          roughness={0.08}
          metalness={0}
          envMapIntensity={0.45}
          clearcoat={1}
          clearcoatRoughness={0.05}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, h + 0.42, 0.04]}>
        <planeGeometry args={[width + 0.34, 0.025]} />
        <meshBasicMaterial color="#b8ded8" toneMapped />
      </mesh>
      <mesh position={[0, -0.09, 0.04]}>
        <planeGeometry args={[width + 0.34, 0.02]} />
        <meshBasicMaterial color="#7fa8a4" toneMapped />
      </mesh>
      {/* lit reveal under the board — signage reads at distance because it is
          lit, not because it is large */}
      <mesh position={[0, -0.06, 0.02]}>
        <planeGeometry args={[width + 0.5, 0.05]} />
        <meshBasicMaterial color={accent} toneMapped />
      </mesh>
      <LightPool position={[0, h / 2 + 0.24, 0.2]} rotation={[0, 0, 0]} size={[width * 1.5, 3.2]} color={accent} opacity={0.1} />
    </group>
  );
}

/* ── exhibition furnishing ─────────────────────────────── */

/**
 * The things between the exhibits.
 *
 * An installation hall is not a gallery of objects on plinths — it is a place
 * people are meant to stand in, sit down in, and be served coffee in, and the
 * reference photographs make that obvious: in every one of them the LED is
 * surrounded by seating, counters, planting and glass. Adding them is not
 * decoration. It is the difference between "here are some screens" and "here
 * is an event", and it is also what finally gives the venue human scale — a
 * six-metre column only reads as six metres when there is a one-metre bench
 * in front of it.
 *
 * Everything here is pale enough to catch the LED spill, which is the other
 * half of the job: a screen that lights nothing looks like a picture of a
 * screen.
 */

/** A low upholstered bench, the exhibition's basic unit of human scale. */
export function Bench({
  position,
  rotation = 0,
  length = 2.0,
}: {
  position: [number, number, number];
  rotation?: number;
  length?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.20, 0]} material={M.upholstery} castShadow receiveShadow>
        <boxGeometry args={[length, 0.34, 0.72]} />
      </mesh>
      {/* the shadow gap under it — furniture that meets the floor flush reads
          as a box painted on it */}
      <mesh position={[0, 0.025, 0]} material={M.anodised}>
        <boxGeometry args={[length - 0.24, 0.05, 0.56]} />
      </mesh>
      <mesh position={[0, 0.375, 0]} material={M.pale}>
        <boxGeometry args={[length + 0.04, 0.02, 0.76]} />
      </mesh>
    </group>
  );
}

/** A planter. The one soft, living thing in a hall made of metal and glass. */
export function Planter({
  position,
  scale = 1,
  seed = 0,
}: {
  position: [number, number, number];
  scale?: number;
  seed?: number;
}) {
  const blades = useMemo(() => {
    const out: { a: number; r: number; h: number; tilt: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const n = Math.sin((i + seed) * 12.9898) * 43758.5453;
      const f = n - Math.floor(n);
      out.push({
        a: (i / 9) * Math.PI * 2 + f * 0.7,
        r: 0.1 + f * 0.22,
        h: 0.85 + f * 0.75,
        tilt: 0.12 + f * 0.3,
      });
    }
    return out;
  }, [seed]);

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} material={M.planter} castShadow>
        <cylinderGeometry args={[0.46, 0.38, 0.6, 16]} />
      </mesh>
      <mesh position={[0, 0.605, 0]} material={M.foliage}>
        <cylinderGeometry args={[0.43, 0.43, 0.05, 16]} />
      </mesh>
      {blades.map((b, i) => (
        <mesh
          key={i}
          position={[Math.cos(b.a) * b.r, 0.6 + b.h / 2, Math.sin(b.a) * b.r]}
          rotation={[Math.cos(b.a) * b.tilt, b.a, Math.sin(b.a) * b.tilt]}
          material={M.foliage}
        >
          <boxGeometry args={[0.07, b.h, 0.014]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A glass-fronted counter with a lit toe kick.
 *
 * Reception desks, info points, coffee — the piece of furniture that says a
 * stand is staffed. The lit reveal along the base is doing the same job the
 * reveals do everywhere else in this venue: it turns a box into a designed
 * object, and it gives the polished floor something to reflect.
 */
export function Counter({
  position,
  rotation = 0,
  width = 3.2,
  accent = "#8fa3b8",
}: {
  position: [number, number, number];
  rotation?: number;
  width?: number;
  accent?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.54, 0]} material={M.charcoal} castShadow receiveShadow>
        <boxGeometry args={[width, 1.0, 0.72]} />
      </mesh>
      {/* worktop, overhanging so it casts a line down the front */}
      <mesh position={[0, 1.06, 0.02]} material={M.pale}>
        <boxGeometry args={[width + 0.14, 0.05, 0.84]} />
      </mesh>
      {/* the glass front */}
      <mesh position={[0, 0.58, 0.37]} material={M.smokedGlass}>
        <planeGeometry args={[width - 0.18, 0.82]} />
      </mesh>
      {/* lit toe kick */}
      <mesh position={[0, 0.06, 0.365]}>
        <planeGeometry args={[width - 0.1, 0.09]} />
        <meshBasicMaterial color={accent} toneMapped />
      </mesh>
      <mesh position={[0, 1.035, 0.44]}>
        <planeGeometry args={[width + 0.14, 0.02]} />
        <meshBasicMaterial color={accent} toneMapped />
      </mesh>
      <ReflectionStreak position={[0, 0.03, 1.0]} width={width} length={2.2} color={accent} opacity={0.12} />
    </group>
  );
}

/** A poseur table — the standing-height counterpart to the bench. */
export function Poseur({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} material={M.anodised}>
        <cylinderGeometry args={[0.32, 0.36, 0.04, 16]} />
      </mesh>
      <mesh position={[0, 0.53, 0]} material={M.steel}>
        <cylinderGeometry args={[0.045, 0.045, 1.02, 10]} />
      </mesh>
      <mesh position={[0, 1.06, 0]} material={M.pale} castShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.05, 20]} />
      </mesh>
    </group>
  );
}

/**
 * A furnished pocket beside a stand: two benches at right angles, a planter
 * and a poseur table, with a pool of light over them.
 *
 * Grouped rather than scattered, because that is how furniture is actually
 * laid out in a hall — you place a *place to stop*, not a distribution of
 * chairs.
 */
export function Lounge({
  position,
  rotation = 0,
  accent = "#8fa3b8",
  seed = 0,
}: {
  position: [number, number, number];
  rotation?: number;
  accent?: string;
  seed?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Bench position={[0, 0, 0]} length={2.2} />
      <Bench position={[1.55, 0, -1.55]} rotation={Math.PI / 2} length={2.2} />
      <Planter position={[-1.5, 0, -0.9]} seed={seed} />
      <Planter position={[-1.05, 0, -1.9]} scale={0.8} seed={seed + 3} />
      <Poseur position={[2.3, 0, 1.0]} />
      {/* a soft overhead pool, so the pocket reads as lit rather than as lost */}
      <LightPool position={[0.4, 0.05, -0.6]} size={[7.2, 6.4]} color={accent} opacity={0.11} />
      <pointLight position={[0.4, 3.2, -0.6]} intensity={9} distance={9} decay={2} color="#d7c2a0" />
    </group>
  );
}

/* ── signage gantry spanning the aisle ─────────────────── */

export function Gantry({
  z,
  media,
  width = 22,
  height = 6.6,
}: {
  z: number;
  media: string;
  width?: number;
  height?: number;
}) {
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2), height / 2, 0]} material={M.steel}>
          <boxGeometry args={[0.28, height, 0.28]} />
        </mesh>
      ))}
      <Truss length={width} size={0.34} position={[0, height + 0.2, 0]} braceEvery={0.9} />
      <Screen
        media={media}
        width={5.6}
        height={1.05}
        position={[0, height - 0.5, 0.2]}
        pitch={1.5}
        brightness={1.08}
        range={70}
        frame={false}
      />
      <mesh position={[0, height - 0.5, 0.24]}>
        <planeGeometry args={[5.94, 1.39]} />
        <meshPhysicalMaterial
          color="#cfe6e2"
          transparent
          opacity={0.07}
          roughness={0.08}
          metalness={0}
          envMapIntensity={0.45}
          clearcoat={1}
          clearcoatRoughness={0.05}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, height + 0.2, 0.25]}>
        <planeGeometry args={[5.94, 0.025]} />
        <meshBasicMaterial color="#b8ded8" toneMapped />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`f${side}`} position={[side * (width / 2 - 0.3), 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial color="#2f6f6a" toneMapped />
        </mesh>
      ))}
    </group>
  );
}

/* ── aisle treatment ───────────────────────────────────── */

/**
 * The walkway itself. A hall with one uniform polished floor from end to end
 * has no scale; inlaid bands crossing it every few metres give the eye
 * something to measure the distance against.
 */
export function Aisle({ from, to, width = 7.2 }: { from: number; to: number; width?: number }) {
  const bands = useMemo(() => {
    const out: number[] = [];
    for (let z = from; z > to; z -= 9) out.push(z);
    return out;
  }, [from, to]);
  const len = Math.abs(to - from);
  const mid = (from + to) / 2;

  return (
    <group>
      <mesh position={[0, 0.012, mid]} rotation={[-Math.PI / 2, 0, 0]} material={M.concrete}>
        <planeGeometry args={[width, len]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2), 0.016, mid]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.05, len]} />
          <meshBasicMaterial color="#2a5f5b" toneMapped />
        </mesh>
      ))}
      {bands.map((z) => (
        <mesh key={z} position={[0, 0.016, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, 0.09]} />
          <meshBasicMaterial color="#33474b" toneMapped />
        </mesh>
      ))}
    </group>
  );
}
