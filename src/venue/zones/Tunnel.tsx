"use client";
import { M } from "../three/materials";
import { Screen } from "../three/screens";
import { Haze } from "../three/rig";
import { useVenue } from "../systems/store";

/**
 * The four-sided immersive LED tunnel — the venue's first signature moment.
 *
 * Left wall, right wall, ceiling and floor are all LED, all playing the *same*
 * texture. Because the content is authored along its V axis and every surface
 * maps V to the tunnel's depth, the image is continuous across all four seams:
 * a particle leaving the left wall arrives on the ceiling in the right place.
 * That single decision is what makes the tunnel read as one environment rather
 * than four screens pointed at each other.
 */

export const TUNNEL = {
  width: 4.6,
  height: 3.8,
  /** entry and exit Z */
  from: -3.4,
  to: -24.4,
};

const DEPTH = Math.abs(TUNNEL.to - TUNNEL.from);
const MID_Z = (TUNNEL.from + TUNNEL.to) / 2;

/**
 * The wall the tunnel mouth is cut into. Without it the visitor can see over
 * the top of a 3.8 m tunnel into a 15 m hall from outside the building, which
 * gives the whole reveal away and makes the architecture read as scenery.
 */
function Bulkhead({ z, width = 52, height = 15 }: { z: number; width?: number; height?: number }) {
  const w = TUNNEL.width + 0.64;
  const h = TUNNEL.height + 0.64;
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

export function Tunnel() {
  const quality = useVenue((s) => s.quality);
  const w = TUNNEL.width;
  const h = TUNNEL.height;

  return (
    <group>
      <Bulkhead z={TUNNEL.from} />
      <Bulkhead z={TUNNEL.to} />
      {/* ── structural shell the panels are built into ── */}
      {[-1, 1].map((side) => (
        <mesh key={`sh${side}`} position={[side * (w / 2 + 0.32), h / 2, MID_Z]} material={M.charcoal}>
          <boxGeometry args={[0.6, h + 1.2, DEPTH + 0.6]} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.32, MID_Z]} material={M.charcoal}>
        <boxGeometry args={[w + 1.2, 0.6, DEPTH + 0.6]} />
      </mesh>

      {/* ── LEFT WALL ── */}
      <Screen
        media="tunnel"
        width={DEPTH}
        height={h}
        position={[-w / 2, h / 2, MID_Z]}
        rotation={[0, Math.PI / 2, 0]}
        pitch={2.9}
        brightness={1.0}
        swap
        flip={[false, false]}
        range={40}
        frame={false}
      />

      {/* ── RIGHT WALL ── */}
      <Screen
        media="tunnel"
        width={DEPTH}
        height={h}
        position={[w / 2, h / 2, MID_Z]}
        rotation={[0, -Math.PI / 2, 0]}
        pitch={2.9}
        brightness={1.0}
        swap
        flip={[false, true]}
        range={40}
        frame={false}
      />

      {/* ── CEILING ── */}
      <Screen
        media="tunnel"
        width={w}
        height={DEPTH}
        position={[0, h, MID_Z]}
        rotation={[Math.PI / 2, 0, 0]}
        pitch={3.9}
        brightness={0.92}
        flip={[false, true]}
        range={40}
        frame={false}
      />

      {/* ── FLOOR ── walked on, so it gets a protective glass deck ── */}
      <Screen
        media="tunnel"
        width={w}
        height={DEPTH}
        position={[0, 0.02, MID_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        pitch={5.2}
        brightness={0.8}
        flip={[false, false]}
        range={40}
        frame={false}
      />
      <mesh position={[0, 0.055, MID_Z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[w, DEPTH]} />
        <meshPhysicalMaterial
          color="#0a1012"
          roughness={0.06}
          metalness={0}
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </mesh>

      {/* ── entry threshold: brushed portal frame ── */}
      <group position={[0, 0, TUNNEL.from + 0.1]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (w / 2 + 0.18), h / 2, 0]} material={M.aluminium}>
            <boxGeometry args={[0.3, h + 0.6, 0.5]} />
          </mesh>
        ))}
        <mesh position={[0, h + 0.2, 0]} material={M.aluminium}>
          <boxGeometry args={[w + 0.96, 0.4, 0.5]} />
        </mesh>
      </group>

      {/* ── exit threshold, opening into the hall ── */}
      <group position={[0, 0, TUNNEL.to - 0.1]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (w / 2 + 0.18), h / 2, 0]} material={M.aluminium}>
            <boxGeometry args={[0.3, h + 0.6, 0.5]} />
          </mesh>
        ))}
        <mesh position={[0, h + 0.2, 0]} material={M.aluminium}>
          <boxGeometry args={[w + 0.96, 0.4, 0.5]} />
        </mesh>
      </group>

      {/* the tunnel's own atmosphere — the beams need something to land on */}
      {quality !== "low" && (
        <Haze
          count={7}
          area={[3.4, 2.6, DEPTH * 0.85]}
          position={[0, h * 0.55, MID_Z]}
          color="#8fc0bd"
          opacity={0.012}
          scale={3.4}
          seed={3}
        />
      )}
    </group>
  );
}
