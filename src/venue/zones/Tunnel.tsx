"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { M } from "../three/materials";
import { ImmersiveVolume, type Surface } from "../three/ImmersiveVolume";
import { LightPool } from "../three/environment";
import { useVenue } from "../systems/store";

/** Four-sided LED room: walls, ceiling and floor share the same world-space
 * shader and master clock. The rectangular architecture follows the reference. */

export const TUNNEL = {
  /** Half-width of the rectangular room. */
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

/** The rectangular profile of the aperture, as a 2D path. */
function archPath(radius: number, rise: number) {
  const path = new THREE.Path();
  path.moveTo(-radius, 0);
  path.lineTo(-radius, radius * rise);
  path.lineTo(radius, radius * rise);
  path.lineTo(radius, 0);
  path.lineTo(-radius, 0);
  return path;
}

/**
 * The wall the tunnel mouth is cut into. Without it the visitor can see over
 * the top of the tunnel into a fifteen-metre hall from outside the building,
 * which gives the reveal away and makes the architecture read as scenery.
 *
 * The opening matches the four planar LED faces, with a narrow protective rim.
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
  const mobile = useVenue(s => s.isMobile);
  const brand = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1536; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "500 150px Arial"; ctx.fillStyle = "#f5f1e8";
    ctx.fillText("LivegridAV", 768, 205);
    ctx.font = "400 30px Arial";
    ctx.fillText("I M M E R S I V E   W O R L D S", 768, 348);
    ctx.fillText("R E A L   I M P A C T", 768, 413);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  useEffect(() => () => brand.dispose(), [brand]);

  /**
   * Four surfaces, meeting exactly at the rectangular room's corners.
   * Everything else the visitor sees in here is content.
   */
  const surfaces = useMemo<Surface[]>(
    () => [
      { size: [DEPTH, CROWN], position: [-TUNNEL.radius, CROWN / 2, MID_Z], rotation: [0, Math.PI / 2, 0] },
      { size: [DEPTH, CROWN], position: [TUNNEL.radius, CROWN / 2, MID_Z], rotation: [0, -Math.PI / 2, 0] },
      { size: [WIDTH, DEPTH], position: [0, CROWN, MID_Z], rotation: [Math.PI / 2, 0, 0] },
      { size: [WIDTH, DEPTH], position: [0, 0.012, MID_Z], rotation: [-Math.PI / 2, 0, 0] },
      { size: [WIDTH, CROWN], position: [0, CROWN / 2, TUNNEL.to + .02], reveal: true },
    ],
    [],
  );

  return (
    <group>
      <Bulkhead z={TUNNEL.from} />
      <Bulkhead z={TUNNEL.to} />

      {/* The architecture is outside the LED faces, never in the content. */}
      {[-1, 1].map(side => <mesh key={side} position={[side * (TUNNEL.radius + .13), CROWN / 2, MID_Z]} material={M.charcoal}>
        <boxGeometry args={[.25, CROWN + .3, DEPTH]} />
      </mesh>)}
      <mesh position={[0, CROWN + .13, MID_Z]} material={M.charcoal}><boxGeometry args={[WIDTH + .5, .25, DEPTH]} /></mesh>

      {/* ── the environment ── */}
      <ImmersiveVolume
        surfaces={surfaces}
        cinematic
        backdrop={mobile ? "/media/final/cinematic-world-mobile.webp" : "/media/final/cinematic-world.png"}
        pitch={1.2}
        brightness={0.92}
        accent="#ccad81"
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

      <mesh position={[-TUNNEL.radius + .014, 2.65, MID_Z - 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[4.3, 1.44]} />
        <meshBasicMaterial map={brand} transparent depthWrite={false} toneMapped={false} />
      </mesh>

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

      {/* Atmosphere is contained in the shared world shader. No translucent
          billboard layer sits between the viewer and the fine-pitch artwork. */}
    </group>
  );
}
