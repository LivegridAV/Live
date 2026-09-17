"use client";
import { useMemo } from "react";
import { M } from "../three/materials";
import { ImmersiveVolume, type Surface } from "../three/ImmersiveVolume";
import { Haze } from "../three/rig";
import { LightPool } from "../three/environment";
import { useVenue } from "../systems/store";

/**
 * The four-sided immersive LED tunnel — the venue's first signature moment.
 *
 * Left wall, right wall, ceiling and floor are continuous LED, and between
 * them they are the tunnel: the structure is a slim reveal at each end and
 * nothing else. There is deliberately no frame around any panel, no cabinet
 * line, and no gap where two surfaces meet, because the whole effect depends
 * on the visitor being unable to find the edges.
 *
 * What they are showing is not four videos. It is one virtual canyon that
 * exists in the venue's own coordinates, far wider and far deeper than the
 * room — its floor below the real floor, its ceiling above the real ceiling,
 * and a portal in the distance ahead. Each surface is a window onto it from
 * the visitor's exact eye position (see `three/immersive.ts`), so structures
 * cross from floor to wall to ceiling without a break, and walking forward
 * moves you through the world rather than past a picture of one.
 */

export const TUNNEL = {
  width: 5.4,
  height: 4.2,
  /** entry and exit Z */
  from: -3.4,
  to: -28.4,
};

const DEPTH = Math.abs(TUNNEL.to - TUNNEL.from);
const MID_Z = (TUNNEL.from + TUNNEL.to) / 2;

/**
 * How far through the tunnel the camera is: 0 at the mouth, 1 at the exit.
 * Taken from the camera's own Z rather than from scroll progress, so the world
 * stays locked to the walk however the path timing is later re-cut.
 */
function tunnelPhase(camZ: number) {
  return Math.min(1, Math.max(0, (TUNNEL.from - camZ) / DEPTH));
}

/**
 * The wall the tunnel mouth is cut into. Without it the visitor can see over
 * the top of the tunnel into a 15 m hall from outside the building, which
 * gives the reveal away and makes the architecture read as scenery.
 */
function Bulkhead({ z, width = 52, height = 15 }: { z: number; width?: number; height?: number }) {
  const w = TUNNEL.width + 0.5;
  const h = TUNNEL.height + 0.5;
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (w / 2 + (width / 2 - w / 2) / 2), height / 2, 0]} material={M.charcoal}>
          <boxGeometry args={[width / 2 - w / 2, height, 0.5]} />
        </mesh>
      ))}
      <mesh position={[0, (height + h) / 2, 0]} material={M.charcoal}>
        <boxGeometry args={[w, height - h, 0.5]} />
      </mesh>
    </group>
  );
}

/** A slim machined reveal at the mouth. The only structure the visitor sees. */
function Threshold({ z }: { z: number }) {
  const w = TUNNEL.width;
  const h = TUNNEL.height;
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (w / 2 + 0.09), h / 2, 0]} material={M.aluminium}>
          <boxGeometry args={[0.18, h + 0.36, 0.34]} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.09, 0]} material={M.aluminium}>
        <boxGeometry args={[w + 0.36, 0.18, 0.34]} />
      </mesh>
    </group>
  );
}

/**
 * The far end of the tunnel, seen from inside it, is a hole cut in the content
 * — and a hole is the one thing the composition cannot afford, because it sits
 * exactly where the eye is being sent. So the exit is lit: a cove around the
 * aperture, a wash on the floor beyond it, and a fixture throwing light back
 * up the tunnel. The visitor walks toward light rather than toward a gap.
 */
function ExitReveal() {
  const w = TUNNEL.width;
  const h = TUNNEL.height;
  const z = TUNNEL.to - 0.36;
  return (
    <group>
      <group position={[0, 0, z]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (w / 2 + 0.16), h / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <planeGeometry args={[h + 0.3, 0.14]} />
            <meshBasicMaterial color="#c9b18a" toneMapped />
          </mesh>
        ))}
        <mesh position={[0, h + 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w + 0.3, 0.14]} />
          <meshBasicMaterial color="#c9b18a" toneMapped />
        </mesh>
      </group>
      {/* the vestibule beyond: warm floor wash and a soffit line, so the
          aperture opens onto a lit room rather than onto the dark */}
      <LightPool position={[0, 0.05, TUNNEL.to - 6]} size={[16, 14]} color="#b89468" opacity={0.2} pulse={0.25} />
      <mesh position={[0, 5.6, TUNNEL.to - 4.2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13, 0.18]} />
        <meshBasicMaterial color="#9fb0b4" toneMapped />
      </mesh>
      <pointLight position={[0, 2.6, TUNNEL.to - 3.4]} intensity={26} distance={22} decay={2} color="#d9b681" />
    </group>
  );
}

export function Tunnel() {
  const quality = useVenue((s) => s.quality);
  const w = TUNNEL.width;
  const h = TUNNEL.height;

  /**
   * Four surfaces, meeting exactly at the corners. They are placed on the
   * boundary planes of the aperture rather than inset, so no surface can ever
   * show its own edge against the next one.
   */
  const surfaces = useMemo<Surface[]>(
    () => [
      // left wall, facing +X
      { size: [DEPTH, h], position: [-w / 2, h / 2, MID_Z], rotation: [0, Math.PI / 2, 0] },
      // right wall, facing -X
      { size: [DEPTH, h], position: [w / 2, h / 2, MID_Z], rotation: [0, -Math.PI / 2, 0] },
      // ceiling, facing down
      { size: [w, DEPTH], position: [0, h, MID_Z], rotation: [Math.PI / 2, 0, 0] },
      // floor, facing up
      { size: [w, DEPTH], position: [0, 0.015, MID_Z], rotation: [-Math.PI / 2, 0, 0] },
    ],
    [w, h],
  );

  return (
    <group>
      <Bulkhead z={TUNNEL.from} />
      <Bulkhead z={TUNNEL.to} />

      {/* the structural shell the panels are built into, entirely outside the
          aperture — from inside the tunnel none of it is visible */}
      {[-1, 1].map((side) => (
        <mesh key={`sh${side}`} position={[side * (w / 2 + 0.3), h / 2, MID_Z]} material={M.charcoal}>
          <boxGeometry args={[0.56, h + 1.1, DEPTH + 0.4]} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.3, MID_Z]} material={M.charcoal}>
        <boxGeometry args={[w + 1.1, 0.56, DEPTH + 0.4]} />
      </mesh>

      {/* ── the environment ── */}
      <ImmersiveVolume
        surfaces={surfaces}
        pitch={1.2}
        brightness={1.06}
        accent="#63d9cc"
        flow={6.5}
        /* The virtual canyon: three times the width of the room it is shown in,
           its floor two and a half metres below the one being walked on. */
        boxMin={[-8.6, -2.6, -400]}
        boxMax={[8.6, 11.5, 40]}
        centreY={2.1}
        phase={tunnelPhase}
        /* The destination advances with the visitor and then settles, so the
           portal grows as the exit approaches instead of staying a backdrop. */
        portalZ={(p) => TUNNEL.to - 210 + p * 120}
      />

      {/* protective glass deck over the floor LED — the floor is walked on */}
      <mesh position={[0, 0.05, MID_Z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[w, DEPTH]} />
        <meshPhysicalMaterial
          color="#0a1012"
          roughness={0.05}
          metalness={0}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>

      <Threshold z={TUNNEL.from + 0.06} />
      <Threshold z={TUNNEL.to - 0.06} />
      <ExitReveal />

      {/* the tunnel's own atmosphere — light leaving the walls needs something
          to land on, and it is what stops the air reading as vacuum */}
      {quality !== "low" && (
        <Haze
          count={8}
          area={[3.6, 2.8, DEPTH * 0.85]}
          position={[0, h * 0.55, MID_Z]}
          color="#9fc8c4"
          opacity={0.014}
          scale={3.6}
          seed={3}
        />
      )}
    </group>
  );
}
