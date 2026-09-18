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
