"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { M } from "../three/materials";
import { ImmersiveVolume, type Surface } from "../three/ImmersiveVolume";
import { Haze } from "../three/rig";
import { LightPool } from "../three/environment";
import { useVenue } from "../systems/store";

/**
 * The four-sided immersive LED tunnel — the venue's first signature moment.
 *
 * It is a vaulted tunnel, not a box: a flat LED floor with a continuous LED
 * arch springing from both edges of it. The reference the client supplied is
 * built the same way, and the reason is not decorative — an arch gives the eye
 * no corner to find, so the room stops having a shape and the content becomes
 * the only thing there is. There is deliberately no frame around any panel, no
 * cabinet line, and no gap where the floor meets the arch.
 *
 * What the surfaces show is not a video. It is one virtual world that exists
 * in the venue's own coordinates, far wider and far deeper than the room, and
 * each surface is a window onto it from the visitor's exact eye position (see
 * `three/immersive.ts`). So structures cross from floor to arch without a
 * break, and walking forward moves you through the world rather than past a
 * picture of one.
 */

export const TUNNEL = {
  /** the vault springs from ±RADIUS, so the tunnel is twice this wide */
  radius: 3.0,
  /** crown height as a multiple of the radius */
  rise: 1.55,
  /** entry and exit Z */
  from: -3.4,
  to: -28.4,
};

const WIDTH = TUNNEL.radius * 2;
const CROWN = TUNNEL.radius * TUNNEL.rise;
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

/** The arched profile of the aperture, as a 2D path. */
function archPath(radius: number, rise: number) {
  const path = new THREE.Path();
  path.moveTo(-radius, 0);
  path.absellipse(0, 0, radius, radius * rise, Math.PI, 0, true, 0);
  path.lineTo(-radius, 0);
  return path;
}

/**
 * The wall the tunnel mouth is cut into. Without it the visitor can see over
 * the top of the tunnel into a fifteen-metre hall from outside the building,
 * which gives the reveal away and makes the architecture read as scenery.
 *
 * The opening is a real arch cut out of the wall rather than a rectangle with
 * an arch inside it — a rectangular opening would leave two triangles of the
 * hall showing in the corners.
 */
function Bulkhead({ z, width = 52, height = 15 }: { z: number; width?: number; height?: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(width / 2, height);
    shape.lineTo(-width / 2, height);
    shape.closePath();
    shape.holes.push(archPath(TUNNEL.radius + 0.22, TUNNEL.rise));
    return new THREE.ShapeGeometry(shape);
  }, [width, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} position={[0, 0, z]} material={M.charcoal} />;
}

/** A slim machined reveal around the mouth. The only structure the visitor sees. */
function Threshold({ z }: { z: number }) {
  const geometry = useMemo(() => {
    const outer = new THREE.Shape();
    const o = archPath(TUNNEL.radius + 0.22, TUNNEL.rise);
    outer.curves = o.curves;
    outer.autoClose = true;
    outer.holes.push(archPath(TUNNEL.radius + 0.04, TUNNEL.rise));
    return new THREE.ExtrudeGeometry(outer, { depth: 0.3, bevelEnabled: false, curveSegments: 40 });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} position={[0, 0, z]} material={M.aluminium} />;
}

/**
 * The far end of the tunnel, seen from inside it, is a hole cut in the content
 * — and a hole is the one thing the composition cannot afford, because it sits
 * exactly where the eye is being sent. So the exit is lit: a wash on the floor
 * beyond it and a fixture throwing light back up the tunnel, with the vestibule
 * in `zones/Exhibition` providing the room behind it.
 */
function ExitReveal() {
  return (
    <group>
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

  /**
   * Two surfaces, meeting exactly where the vault springs from the floor.
   * Everything else the visitor sees in here is content.
   */
  const surfaces = useMemo<Surface[]>(
    () => [
      { kind: "vault", size: [TUNNEL.radius, DEPTH], position: [0, 0, MID_Z], rise: TUNNEL.rise },
      { size: [WIDTH, DEPTH], position: [0, 0.012, MID_Z], rotation: [-Math.PI / 2, 0, 0] },
    ],
    [],
  );

  return (
    <group>
      <Bulkhead z={TUNNEL.from} />
      <Bulkhead z={TUNNEL.to} />

      {/* The structural shell the vault is built into, entirely outside the
          aperture — from inside the tunnel none of it is visible. */}
      <mesh position={[0, 0, MID_Z]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, TUNNEL.rise]}>
        <cylinderGeometry
          args={[TUNNEL.radius + 0.4, TUNNEL.radius + 0.4, DEPTH + 0.3, 40, 1, true, Math.PI / 2, Math.PI]}
        />
        <meshStandardMaterial color="#0b0f10" roughness={0.8} metalness={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* ── the environment ── */}
      <ImmersiveVolume
        surfaces={surfaces}
        pitch={1.2}
        brightness={1.06}
        accent="#63d9cc"
        flow={6.5}
        doubleSided
        /* The virtual world: three times the width of the room it is shown in,
           with a sky thirty metres up so the arch opens onto something rather
           than closing over. */
        boxMin={[-9.5, -0.5, -400]}
        boxMax={[9.5, 34, 40]}
        centreY={1.9}
        phase={tunnelPhase}
        /* The destination advances with the visitor and then settles, so the
           portal grows as the exit approaches instead of staying a backdrop. */
        portalZ={(p) => TUNNEL.to - 210 + p * 120}
      />

      {/* Protective glass deck over the floor LED — the floor is walked on.
          `envMapIntensity` is not a detail here. At roughness 0.05 this pane is
          effectively a mirror, and a mirror lying flat under the camera returns
          the environment at grazing incidence across the entire lower half of
          the frame. With a room environment bound for the metalwork, that put a
          flat sheet of warm studio light over the one surface in the venue
          whose whole job is to disappear — the tunnel floor stopped being a
          window onto the world and became a lit tabletop. The deck is glass
          over a light source: it should carry a whisper of reflection and
          nothing else. */}
      <mesh position={[0, 0.05, MID_Z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[WIDTH, DEPTH]} />
        <meshPhysicalMaterial
          color="#0a1012"
          roughness={0.05}
          metalness={0}
          transparent
          opacity={0.08}
          envMapIntensity={0.06}
          depthWrite={false}
        />
      </mesh>

      <Threshold z={TUNNEL.from + 0.02} />
      <Threshold z={TUNNEL.to - 0.32} />
      <ExitReveal />

      {/* the tunnel's own atmosphere — light leaving the surfaces needs
          something to land on, and it is what stops the air reading as vacuum */}
      {quality !== "low" && (
        /* Eight billboards nearly four metres across, inside a six-metre
           tunnel, put the camera *inside* two or three of them at all times —
           so instead of air you saw a pair of soft pale cones filling the
           frame. Air in a tunnel this tight has to be small and numerous. */
        <Haze
          count={16}
          area={[5.0, 3.4, DEPTH * 0.9]}
          position={[0, CROWN * 0.5, MID_Z]}
          color="#9fc8c4"
          opacity={0.009}
          scale={1.5}
          seed={3}
        />
      )}
    </group>
  );
}
