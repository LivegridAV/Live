"use client";
import { useMemo } from "react";
import { M } from "../three/materials";
import {
  BarScreen,
  CornerScreen,
  CurvedScreen,
  CylinderScreen,
  PillarScreen,
  RingScreen,
  Screen,
} from "../three/screens";
import { Haze, HangPoint, Truss } from "../three/rig";
import { LightPool } from "../three/environment";
import { ReflectionStreak } from "../three/Reflection";
import { useVenue } from "../systems/store";
import { ZoneGroup } from "../three/ZoneGroup";
import { Aisle, Gantry, NameBoard, Stand, Vestibule } from "./Exhibition";

/**
 * The creative LED gallery.
 *
 * This is the argument the whole venue exists to make: LED is not a rectangle
 * behind a stage. Pillars, blades, a cylinder, a suspended ring, a bar fascia,
 * a curved wall, a mosaic of modules cut into a shape, and a 90° corner running
 * a perspective-correct illusion — every geometry a client might ask for,
 * standing in a room at real scale.
 *
 * Each of them now stands on an exhibition stand rather than on bare floor:
 * a footprint, a lit edge, a low backdrop, an overhead truss and a header. The
 * installations did not change. What changed is that the hall around them
 * finally reads as a designed exhibition instead of a dark warehouse.
 */

/* ── A · LED pillars ───────────────────────────────────── */

const PILLARS: { x: number; z: number; h: number; media: string }[] = [
  { x: -10.6, z: -42.5, h: 5.2, media: "pillar-flow" },
  { x: -7.2, z: -46.5, h: 7.4, media: "pillar-metal" },
  { x: -11.4, z: -50.5, h: 6.2, media: "pillar-metal" },
  { x: -5.4, z: -54.0, h: 8.6, media: "pillar-flow" },
  { x: -9.8, z: -57.5, h: 5.8, media: "pillar-flow" },
  { x: -13.2, z: -53.0, h: 7.0, media: "pillar-metal" },
];

function Pillars() {
  return (
    <group>
      <Stand
        position={[-9.6, 0, -50]}
        size={[14, 20]}
        accent="#4f9b93"
        backdrop={false}
        overhead={false}
        label="stand-pillars"
        labelAt={[6.4, 6.6, 3.2]}
        labelFace={1.15}
        labelWidth={5.0}
      />
      {/* the pillars are tall, so their overhead rig spans the whole cluster */}
      <Truss length={14} size={0.32} position={[-9.6, 10.2, -46]} braceEvery={0.9} />
      <Truss length={14} size={0.32} position={[-9.6, 10.2, -55]} braceEvery={0.9} />
      {PILLARS.map((p, i) => (
        <group key={i}>
          <PillarScreen
            media={p.media}
            width={0.72}
            depth={0.72}
            height={p.h}
            position={[p.x, 0, p.z]}
            pitch={1.5}
            brightness={1.0}
            range={60}
          />
          <ReflectionStreak
            position={[p.x, 0.04, p.z + 2.6]}
            width={1.5}
            length={5.2}
            color={p.media === "pillar-metal" ? "#8d7b6b" : "#4f9b93"}
            opacity={0.11}
          />
        </group>
      ))}
      <LightPool position={[-9.2, 0.05, -50]} size={[18, 22]} color="#4f9b93" opacity={0.08} pulse={0.5} />
    </group>
  );
}

/* ── B · vertical LED blades ───────────────────────────── */

const BLADES: { x: number; z: number; y: number; h: number; rot: number }[] = [
  { x: 4.6, z: -56.0, y: 1.1, h: 4.4, rot: 0.22 },
  { x: 6.8, z: -58.6, y: 1.6, h: 5.2, rot: -0.14 },
  { x: 9.4, z: -56.8, y: 0.9, h: 4.0, rot: 0.38 },
  { x: 5.6, z: -62.0, y: 1.9, h: 5.6, rot: -0.3 },
  { x: 8.4, z: -63.4, y: 1.2, h: 4.6, rot: 0.1 },
  { x: 11.0, z: -60.4, y: 1.5, h: 5.0, rot: -0.44 },
];

function Blades() {
  return (
    <group>
      <Stand
        position={[7.8, 0, -59.6]}
        size={[12, 13]}
        accent="#4fc4b6"
        label="stand-blades"
        labelAt={[-5.4, 5.9, 3.6]}
        labelFace={-1.15}
        labelWidth={4.4}
      />
      {/* the truss the blades hang from */}
      <Truss length={12} size={0.3} position={[7.8, 7.2, -59.6]} rotation={[0, 0.18, 0]} braceEvery={0.7} />
      {BLADES.map((b, i) => (
        <group key={i}>
          <HangPoint position={[b.x, 7.0, b.z]} drop={7.0 - (b.y + b.h)} />
          <Screen
            media="blade-rain"
            width={0.62}
            height={b.h}
            position={[b.x, b.y + b.h / 2, b.z]}
            rotation={[0, b.rot, 0]}
            pitch={1.5}
            brightness={1.05}
            /* each blade shows its own vertical slice, so the content reads as
               one image cut across all six panels */
            uv={[1 / BLADES.length, 1, i / BLADES.length, 0]}
            range={55}
            frame={false}
          />
          <ReflectionStreak
            position={[b.x, 0.04, b.z + 2.2]}
            width={1.1}
            length={4.4}
            color="#4fc4b6"
            opacity={0.17}
          />
        </group>
      ))}
    </group>
  );
}

/* ── C · cylindrical LED ───────────────────────────────── */

function Cylinder() {
  return (
    <group>
      <Stand
        position={[8.6, 0, -70]}
        size={[11, 11]}
        accent="#c08a4e"
        label="stand-cylinder"
        labelAt={[-4.9, 5.4, 3.6]}
        labelFace={-1.15}
        labelWidth={4.2}
      />
      <group position={[8.6, 0, -70]}>
        <mesh position={[0, 0.1, 0]} material={M.anodised}>
          <cylinderGeometry args={[2.5, 2.7, 0.14, 40]} />
        </mesh>
        <CylinderScreen
          media="cylinder-ribbon"
          radius={2.2}
          height={4.6}
          position={[0, 2.6, 0]}
          pitch={1.9}
          brightness={1.0}
          range={60}
        />
        <HangPoint position={[0, 7.4, 0]} drop={2.4} />
        <LightPool position={[0, 0.06, 0]} size={12} color="#c08a4e" opacity={0.16} pulse={0.35} />
      </group>
    </group>
  );
}

/* ── D · suspended ring ────────────────────────────────── */

function Ring() {
  return (
    <group position={[-3.2, 0, -78]}>
      <RingScreen
        media="ring-waves"
        radius={5.4}
        height={1.5}
        position={[0, 6.4, 0]}
        pitch={1.9}
        brightness={1.6}
        range={80}
      />
      {/* a second, smaller ring inside it — the composition needs a counterpoint */}
      <RingScreen
        media="ring-waves"
        radius={3.0}
        height={0.9}
        position={[0, 7.9, 0]}
        pitch={1.9}
        brightness={1.35}
        inward
        range={80}
      />
      {/* a floor medallion directly beneath, so the ring has a footprint the
          camera can walk through rather than merely under */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.3, 5.5, 64]} />
        <meshBasicMaterial color="#2f7a72" toneMapped />
      </mesh>
      <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.deck}>
        <circleGeometry args={[5.4, 48]} />
      </mesh>
      <LightPool position={[0, 0.05, 0]} size={20} color="#4fa79c" opacity={0.13} pulse={0.45} />
      {/* The ring is flown over the walkway rather than standing on a stand,
          so its name board hangs clear to one side — directly under it is
          where the camera goes. */}
      <NameBoard position={[-5.6, 4.4, 0.6]} face={1.0} media="stand-ring" width={4.2} accent="#4fa79c" />
    </group>
  );
}

/* ── E · LED bar counter ───────────────────────────────── */

function Bar() {
  return (
    <group>
      <Stand
        position={[-9.8, 0, -84]}
        size={[13, 10]}
        rotation={Math.PI / 2.3}
        accent="#4fc4b6"
        label="stand-bar"
        labelAt={[-0.8, 4.6, -2.4]}
        labelFace={0.9}
        labelWidth={4.4}
      />
      <group position={[-9.8, 0, -84]} rotation={[0, Math.PI / 2.3, 0]}>
        <BarScreen media="bar-brand" width={7.6} height={1.08} depth={0.72} pitch={1.2} brightness={0.72} spill={0} />
        {/* back bar + bottle shelf, lit by the fascia */}
        <mesh position={[0, 1.4, -1.9]} material={M.composite}>
          <boxGeometry args={[7.2, 2.8, 0.35]} />
        </mesh>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} position={[-3.2 + i * 0.49, 1.55 + (i % 2) * 0.55, -1.66]} material={M.smokedGlass}>
            <cylinderGeometry args={[0.055, 0.055, 0.3, 7]} />
          </mesh>
        ))}
        {/* a lit shelf line behind the bottles: the back bar has to glow or the
            whole counter reads as furniture rather than as hospitality */}
        <mesh position={[0, 1.36, -1.7]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7.0, 0.06]} />
          <meshBasicMaterial color="#b9895a" toneMapped />
        </mesh>
        <mesh position={[0, 2.46, -1.7]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7.0, 0.06]} />
          <meshBasicMaterial color="#b9895a" toneMapped />
        </mesh>
        {/* stools */}
        {Array.from({ length: 5 }, (_, i) => (
          <group key={`s${i}`} position={[-2.9 + i * 1.45, 0, 1.25]}>
            <mesh position={[0, 0.36, 0]} material={M.anodised}>
              <cylinderGeometry args={[0.04, 0.05, 0.72, 8]} />
            </mesh>
            <mesh position={[0, 0.74, 0]} material={M.graphite}>
              <cylinderGeometry args={[0.19, 0.19, 0.06, 14]} />
            </mesh>
          </group>
        ))}
        <ReflectionStreak position={[0, 0.04, 2.4]} width={8} length={4.6} color="#57cbbd" opacity={0.22} />
        <LightPool position={[0, 0.05, 1.6]} size={[12, 8]} color="#4fc4b6" opacity={0.14} />
      </group>
    </group>
  );
}

/* ── F · curved architectural LED ──────────────────────── */

function Curved() {
  return (
    <group>
      <Stand
        position={[8.4, 0, -90.5]}
        size={[13, 12]}
        accent="#7ea36a"
        label="stand-curved"
        labelAt={[-5.4, 4.9, 3.2]}
        labelFace={-1.0}
        labelWidth={4.4}
      />
      <group position={[8.4, 0, -90.5]} rotation={[0, -Math.PI / 2.6, 0]}>
        <CurvedScreen
          media="curve-natural"
          radius={5.2}
          arc={Math.PI * 0.62}
          height={4.2}
          position={[0, 2.4, 0]}
          pitch={1.9}
          brightness={1.0}
          range={60}
        />
        {/* the curved sub-frame it is built on */}
        <mesh position={[0, 0.12, 0]} material={M.anodised}>
          <cylinderGeometry args={[5.4, 5.5, 0.16, 48, 1, true, -Math.PI * 0.31, Math.PI * 0.62]} />
        </mesh>
        <LightPool position={[0, 0.06, 0]} size={16} color="#7ea36a" opacity={0.1} pulse={0.4} />
      </group>
    </group>
  );
}

/* ── G · creative-shaped LED mosaic ────────────────────── */

/**
 * Twelve rectangular modules assembled into a deliberately non-standard shape.
 * Each carries its own slice of one image, so a single composition runs across
 * a silhouette no off-the-shelf wall could make — which is exactly the pitch.
 */
const MOSAIC: { x: number; y: number; w: number; h: number }[] = [
  { x: -3.0, y: 4.4, w: 1.6, h: 1.0 },
  { x: -1.2, y: 4.9, w: 2.0, h: 1.4 },
  { x: 1.0, y: 4.4, w: 1.4, h: 1.0 },
  { x: -3.6, y: 3.0, w: 1.0, h: 1.6 },
  { x: -2.0, y: 3.1, w: 2.2, h: 1.8 },
  { x: 0.5, y: 3.3, w: 2.6, h: 2.0 },
  { x: 2.8, y: 3.6, w: 1.2, h: 1.4 },
  { x: -2.8, y: 1.5, w: 1.6, h: 1.2 },
  { x: -0.8, y: 1.3, w: 2.0, h: 1.8 },
  { x: 1.6, y: 1.6, w: 1.6, h: 1.2 },
  { x: 3.2, y: 2.0, w: 0.9, h: 0.9 },
  { x: 0.2, y: -0.2, w: 1.4, h: 0.9 },
];

function Mosaic() {
  const bounds = useMemo(() => {
    const xs = MOSAIC.flatMap((m) => [m.x - m.w / 2, m.x + m.w / 2]);
    const ys = MOSAIC.flatMap((m) => [m.y - m.h / 2, m.y + m.h / 2]);
    return {
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      y0: Math.min(...ys),
      y1: Math.max(...ys),
    };
  }, []);
  const W = bounds.x1 - bounds.x0;
  const H = bounds.y1 - bounds.y0;

  return (
    <group position={[-9.6, 1.6, -93]} rotation={[0, Math.PI / 3.4, 0]}>
      {/* support frame behind the composition */}
      <mesh position={[0, 2.2, -0.3]} material={M.charcoal}>
        <boxGeometry args={[W + 0.8, H + 0.8, 0.25]} />
      </mesh>
      {MOSAIC.map((m, i) => (
        <Screen
          key={i}
          media="mosaic-arch"
          width={m.w}
          height={m.h}
          position={[m.x, m.y, 0]}
          pitch={1.5}
          brightness={1.0}
          frame={false}
          range={55}
          uv={[
            m.w / W,
            m.h / H,
            (m.x - m.w / 2 - bounds.x0) / W,
            (m.y - m.h / 2 - bounds.y0) / H,
          ]}
        />
      ))}
      <LightPool position={[0, -1.55, 1.4]} size={[12, 7]} color="#7f97ab" opacity={0.12} />
    </group>
  );
}

/* ── H · anamorphic corner ─────────────────────────────── */

function AnamorphicCorner() {
  return (
    // Standing on the fold's bisector is the whole trick: the corner is placed
    // so the camera path passes exactly through the point the content is
    // rendered for.
    <group position={[-6.6, 0, -99]} rotation={[0, 0, 0]}>
      {/* The two building faces the LED is wrapped onto. Both are pulled clear
          of the fold: at 0.35 m their front corners met exactly where the two
          leaves meet, and the resulting sliver of structure read as a black
          seam straight down the middle of the illusion. */}
      <mesh position={[-3.45, 3.2, -0.5]} material={M.graphite}>
        <boxGeometry args={[6.4, 6.4, 0.6]} />
      </mesh>
      <mesh position={[-0.5, 3.2, -3.45]} rotation={[0, Math.PI / 2, 0]} material={M.graphite}>
        <boxGeometry args={[6.4, 6.4, 0.6]} />
      </mesh>
      <CornerScreen media="anamorphic" width={6.2} height={4.4} position={[0, 0.7, 0]} pitch={1.2} />
      {/* viewing mark on the floor — the point the illusion is built for */}
      <mesh position={[4.9, 0.04, 4.9]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <ringGeometry args={[0.45, 0.52, 28]} />
        <meshBasicMaterial color="#8c9a86" toneMapped />
      </mesh>
      {/* Hung above the left leaf on a real header, turned a little toward the
          viewing mark. It used to be a bare panel floating at the top of the
          building face, which read as a UI element stuck to the scene. */}
      <NameBoard position={[-3.4, 5.95, 0.25]} face={0.35} media="stand-anamorphic" width={4.2} accent="#b9ab93" />
      <LightPool position={[2.6, 0.05, 2.6]} size={16} color="#b9ab93" opacity={0.14} />
    </group>
  );
}

/* ── the hall reveal ───────────────────────────────────── */

function HallReveal() {
  return (
    <group>
      {/* suspended wordmark banner — the first thing seen as the hall opens up */}
      <Screen
        media="hall-wordmark"
        width={17}
        height={4.6}
        position={[0, 10.4, -54]}
        pitch={2.6}
        brightness={1.0}
        range={120}
        frame={false}
      />
      {[-7.4, 7.4].map((x) => (
        <HangPoint key={x} position={[x, 14.2, -54]} drop={1.5} />
      ))}

      {/* wayfinding gantries spanning the aisle, so the route is legible from
          a distance the way it is in a real exhibition hall */}
      <Gantry z={-47} media="sign-gallery" />
      <Gantry z={-74} media="sign-services" />
      <Gantry z={-101} media="sign-arena" />
    </group>
  );
}

/* ── zone root ─────────────────────────────────────────── */

export function Gallery() {
  const quality = useVenue((s) => s.quality);
  return (
    <group>
      <ZoneGroup from={-27} to={-45} ahead={70} behind={26}>
        <Vestibule from={-29} to={-40} />
      </ZoneGroup>
      <Aisle from={-40} to={-106} />
      <HallReveal />
      <ZoneGroup from={-40} to={-60} ahead={50} behind={26}>
        <Pillars />
      </ZoneGroup>
      <ZoneGroup from={-54} to={-66} ahead={46} behind={24}>
        <Blades />
      </ZoneGroup>
      <ZoneGroup from={-64} to={-74} ahead={44} behind={24}>
        <Cylinder />
      </ZoneGroup>
      <ZoneGroup from={-72} to={-84} ahead={46} behind={26}>
        <Ring />
      </ZoneGroup>
      <ZoneGroup from={-80} to={-90} ahead={40} behind={22}>
        <Bar />
      </ZoneGroup>
      <ZoneGroup from={-86} to={-95} ahead={40} behind={22}>
        <Curved />
        <Stand
          position={[-9.6, 0, -93]}
          size={[11, 9]}
          rotation={Math.PI / 3.4}
          accent="#7f97ab"
          backdrop={false}
          label="stand-mosaic"
          labelAt={[3.2, 4.7, 2.2]}
          labelFace={1.15}
          labelWidth={4.4}
        />
        <Mosaic />
      </ZoneGroup>
      <ZoneGroup from={-92} to={-108} ahead={42} behind={28}>
        <AnamorphicCorner />
      </ZoneGroup>
      {quality !== "low" && (
        <Haze count={9} area={[40, 8, 54]} position={[0, 5.5, -68]} color="#7f9aa4" opacity={0.009} scale={15} seed={2} />
      )}
    </group>
  );
}
