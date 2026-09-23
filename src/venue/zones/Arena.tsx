"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HouseCeiling } from "./HouseCeiling";
import { Audience } from "./Audience";
import { ExpoAsset } from "../three/ExpoAsset";
import { M } from "../three/materials";
import { PillarScreen, Screen } from "../three/screens";
import { Haze, HangPoint, LineArray, MovingHead, SubStack, Truss } from "../three/rig";
import { LightPool } from "../three/environment";
import { ReflectionStreak } from "../three/Reflection";
import { journey, show } from "../systems/journey";
import { useVenue } from "../systems/store";
import { ZoneGroup } from "../three/ZoneGroup";

/**
 * The arena and the main stage.
 *
 * This is the climax, so it is built at climax scale — and, since the client
 * supplied a reference, built to a specific shape. Three things in that
 * reference decide everything else here, and none of them is a colour choice:
 *
 *  1. **The stage is an array, not a wall.** A dominant centre canvas, a pair
 *     of vertical light strips either side of it, portrait fillers, stacked
 *     landscape pairs further out, and canted clusters at the extremes turned
 *     back toward the audience. Sixty-odd metres of screen, wall to wall. One
 *     big rectangle — which is what this file used to be — cannot produce that
 *     composition however large you make it.
 *  2. **Every panel is outlined in light.** A lit reveal around each screen is
 *     what makes an array read as designed set architecture instead of a pile
 *     of rectangles. (It is a fixture, not a cabinet join; continuous surfaces
 *     in this venue still have no visible seams anywhere.)
 *  3. **The room is lit, warmly, from above.** The reference's whole upper
 *     half is a receding grid of warm ceiling fixtures, and that — not the
 *     screens — is what makes the venue read as premium rather than as a
 *     black void with something bright in it.
 *
 * One stage, two creative directions. Nothing structural changes when the
 * visitor switches mode — the same trusses, the same walls, the same movers —
 * only the content, the rim colour, and the way the lights behave. That is the
 * argument: the infrastructure is ours, the creative is yours.
 */

export const STAGE = {
  /** front edge of the deck */
  front: -332,
  back: -354,
  deckH: 1.6,
  /** the deck runs nearly the full width of the room */
  width: 80,
  /** the screen plane */
  wallZ: -353.4,
  /** every panel in the array stands off this line */
  baseY: 1.8,
  /** the dominant centre canvas */
  heroW: 26,
  heroH: 10.0,
  /**
   * Height of the stage roof grid.
   *
   * It used to be 25.5 m, under a thirty-four metre arena roof, and the
   * consequence was that the ceiling never entered the frame at all: from any
   * camera position on the floor the roof sat above the top of the picture, so
   * the upper half of every arena shot was pure black. The reference is a room
   * whose ceiling is part of the composition, which means the rig has to live
   * under a ceiling the camera can actually see.
   */
  roof: 15.4,
  /** the house ceiling the whole room is lit from */
  ceiling: 16.4,
};

const HERO_Y = STAGE.baseY + STAGE.heroH / 2;

/** 0 → 1 ramp over a progress window, read per frame. */
function ramp(a: number, b: number) {
  return () => Math.min(1, Math.max(0, (journey.progress - a) / (b - a)));
}

/* The finale, beat by beat. Each ramp is one cue, and they overlap the way a
   programmed sequence does rather than cutting between states.

   The whole sequence was pulled ~8 thousandths earlier so that the last beat
   has somewhere to live: the contact form gates in at 0.9905, and the
   invitation used to arrive at 0.987 and be covered by it about a frame
   later. A finale whose final card is never seen is not a finale. */
const showOut = ramp(0.944, 0.958); // the performance ends, the room settles
const brandUp = ramp(0.954, 0.968); // livegridAV takes every major surface
const lineUp = ramp(0.968, 0.979); // the strapline follows
const ctaUp = ramp(0.979, 0.9885); // and then the invitation
const showLive = () => 1 - showOut();

/* ── approach ──────────────────────────────────────────── */

function Approach() {
  const quality = useVenue((s) => s.quality);
  return (
    <group position={[0,0,-8]}>
      {/* Keep the complete run-in beyond the partner stand's footprint. The
          eight-metre group offset clears its hero camera sightline. */}
      {[-1, 1].map((side) =>
        [0, 1, 2].map((i) => (
          <PillarScreen
            key={`${side}-${i}`}
            media="approach-pillar"
            width={1.15}
            depth={1.15}
            height={9.5 - i * 1.1}
            position={[side * (5.4 + i * 0.8), 0, -234 - i * 2.6]}
            pitch={2.6}
            brightness={1.0}
            range={70}
          />
        )),
      )}

      {/* large portrait displays, against the hall walls the way a real
          concourse lines them */}
      {[-1, 1].map((side) =>
        [0, 1].map((i) => (
          <Screen
            key={`p${side}${i}`}
            media="approach-portrait"
            width={1.9}
            height={4.6}
            position={[side * 18.1, 3.0, -228 - i * 8]}
            rotation={[0, side === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}
            pitch={1.9}
            range={60}
            frame={false}
          />
        )),
      )}

      <Truss length={22} size={0.44} position={[0, 12.2, -236]} braceEvery={0.9} />
      {quality !== "low" &&
        [-7, -2.4, 2.4, 7].map((x, i) => (
          <MovingHead key={x} position={[x, 11.7, -236]} seed={i * 2.1} reach={12} color="#e0b784" intensity={0.9} />
        ))}

      <LightPool position={[0, 0.04, -236]} size={[26, 30]} color="#c0925c" opacity={0.1} pulse={0.4} />
      <ReflectionStreak position={[0, 0.03, -224]} width={22} length={14} color="#4fb0a6" opacity={0.12} />
    </group>
  );
}

/* ── the lit reveal around every panel ─────────────────── */

/**
 * The rims all share one material, so the whole array changes colour on a cue
 * with a single assignment per frame rather than twenty-six. That is also why
 * the switch reads as a programmed show: every outline in the room turns
 * together, on the same frame, the way a lighting desk would do it.
 */
function useRimMaterial() {
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#c8823c"), toneMapped: true }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const corporate = useMemo(() => new THREE.Color("#c8823c"), []);
  const festival = useMemo(() => new THREE.Color("#b04ad6"), []);

  useFrame(({ clock }) => {
    const f = show.mode;
    material.color.copy(corporate).lerp(festival, f);
    // a slow breath in corporate, a live pulse in festival
    const t = clock.elapsedTime;
    const lift = (1 - f) * (0.92 + 0.08 * Math.sin(t * 0.6)) + f * (0.78 + 0.22 * Math.sin(t * 3.1));
    material.color.multiplyScalar(lift * (1 - show.cue * 0.75));
  });

  return material;
}

/**
 * One screen of the stage array: a lit reveal, then the panel on top of it.
 * The reveal is a plane a few centimetres larger than the emitter surface, so
 * what shows is a clean border of light and nothing else.
 */
function Panel({
  media,
  width,
  height,
  position,
  rotation,
  rim,
  uv,
  pitch = 2.6,
  brightness = 1.0,
  power,
  reveal = 0.11,
  chrome = true,
}: {
  media: string;
  width: number;
  height: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  rim: THREE.Material;
  uv?: [number, number, number, number];
  pitch?: number;
  brightness?: number;
  power?: number | (() => number);
  reveal?: number;
  /**
   * Whether this panel brings its own lit reveal and carcass.
   *
   * A crossfade overlay must NOT: it shares a physical panel with the surface
   * underneath it and only contributes light. Giving every overlay its own
   * chrome put an opaque rim and a carcass box a hand's width in front of the
   * live array, so for the whole show the hero canvas and both stacked pairs
   * were covered by the switched-off finale sitting on top of them.
   */
  chrome?: boolean;
}) {
  return (
    <group position={position} rotation={rotation}>
      {chrome && (
        <>
          <mesh position={[0, 0, -0.03]} material={rim}>
            <planeGeometry args={[width + reveal * 2, height + reveal * 2]} />
          </mesh>
          {/* the panel's own carcass, so the reveal has something to sit on */}
          <mesh position={[0, 0, -0.19]} material={M.charcoal}>
            <boxGeometry args={[width + reveal * 2 + 0.12, height + reveal * 2 + 0.12, 0.3]} />
          </mesh>
        </>
      )}
      <Screen
        media={media}
        width={width}
        height={height}
        pitch={pitch}
        brightness={brightness}
        range={190}
        frame={false}
        flat
        uv={uv}
        power={power}
      />
    </group>
  );
}

/* ── the stage ─────────────────────────────────────────── */

function StageStructure() {
  return <group position={[0, 0, -354]}><ExpoAsset name="flagship-stage" /></group>;
}

/* ── the screen array ──────────────────────────────────── */

/**
 * The array, described once and mirrored. Positive X is built and the mirror
 * is generated, which is what guarantees the elevation is actually symmetrical
 * rather than approximately so — a stage set that is nearly symmetrical looks
 * like a mistake from the centre aisle.
 */
function StageBrand() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 1536; canvas.height = 288;
    const ctx = canvas.getContext("2d")!;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "600 166px Arial"; ctx.fillStyle = "#ffffff";
    ctx.fillText("LivegridAV", 768, 118);
    ctx.font = "400 24px Arial"; ctx.fillStyle = "#e3c49d";
    ctx.fillText("P E O P L E   /   P L A T F O R M S   /   P O S S I B I L I T I E S", 768, 230);
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(() => { if (material.current) material.current.opacity = showLive() * (1 - show.cue); });
  return <mesh position={[0, 9.55, STAGE.wallZ + .04]}>
    <planeGeometry args={[20, 3.75]} />
    <meshBasicMaterial ref={material} map={texture} transparent depthWrite={false} toneMapped={false} />
  </mesh>;
}

function StageScreens({ rim }: { rim: THREE.Material }) {
  const panels = [
    { x: 0, y: HERO_Y, w: 26, h: 10, media: "stage-main" },
    ...[-1, 1].flatMap(side => [
      { x: side * 14.1, y: 7.3, w: .42, h: 11, media: "stage-strip" },
      { x: side * 15.05, y: 7.3, w: .42, h: 11, media: "stage-strip" },
      { x: side * 17.05, y: 6.7, w: 2.5, h: 9.8, media: "stage-portrait" },
      { x: side * 24.8, y: 9.8, w: 12.1, h: 4.15, media: "stage-side" },
      { x: side * 24.8, y: 5.05, w: 12.1, h: 4.15, media: "stage-side" },
      { x: side * 35.85, y: 9.8, w: 8.8, h: 4.15, media: "stage-outer" },
      { x: side * 35.85, y: 5.05, w: 8.8, h: 4.15, media: "stage-outer" },
    ]),
  ];
  return <group>
    {panels.map((p, i) => <group key={i}>
      <Panel media={p.media} width={p.w} height={p.h} position={[p.x,p.y,STAGE.wallZ]}
        rim={rim} brightness={1} reveal={.045} power={() => .08 + .92 * showLive()} />
      <Panel media="finale" width={p.w} height={p.h} position={[p.x,p.y,STAGE.wallZ+.07]}
        rim={rim} chrome={false} power={brandUp} />
    </group>)}
    <StageBrand />
    <Screen media="stage-floor" width={26} height={14}
      position={[0,STAGE.deckH+.025,STAGE.wallZ+9]} rotation={[-Math.PI/2,0,0]}
      frame={false} flat brightness={.45} range={150} power={() => showLive() * (.15 + show.mode * .55)} />
  </group>;
}

/** Mode-reactive lighting: the movers are the loudest part of the switch. */
function StageLighting() {
  const quality = useVenue((s) => s.quality);
  const deckZ = (STAGE.front + STAGE.back) / 2;
  const rake = useMemo(() => Array.from({ length: 25 }, (_, i) => (i - 12) * 2.72), []);
  const back = useMemo(() => Array.from({ length: 13 }, (_, i) => (i - 6) * 4.6), []);

  return (
    <group>
      {/* The rake across the front truss. Nineteen fixtures, evenly spaced,
          throwing down across the array — the reference's signature, and the
          reason its stage reads as lit rather than merely bright. */}
      {rake.filter((_, i) => quality === "high" || i % 2 === 0).map((x, i) => (
        <MovingHead
          key={`r${x}`}
          position={[x, 13.9, STAGE.wallZ + 4.2]}
          seed={i * 1.7}
          reach={17}
          beamAngle={0.05}
          color="#f6ce97"
          intensity={1.35}
          beamGain={2.9}
        />
      ))}
      {rake
        .filter((_, i) => i % 2 === 0)
        .map((x, i) => (
          <MovingHead
            key={`f${x}`}
            position={[x, STAGE.roof - 0.4, STAGE.front + 1]}
            seed={i + 40}
            reach={16}
            color="#d7e6f2"
            beamGain={1.7}
          />
        ))}
      {quality !== "low" &&
        back.map((x, i) => (
          <MovingHead
            key={`b${x}`}
            position={[x, STAGE.roof - 0.4, STAGE.back + 1]}
            seed={i + 11}
            reach={15}
            color="#e8cfa6"
            beamGain={1.7}
          />
        ))}
      {quality !== "low" &&
        [-22, -8, 8, 22].map((x, i) => (
          <MovingHead
            key={`m${x}`}
            position={[x, STAGE.roof - 2.2, deckZ]}
            seed={i * 1.9 + 21}
            reach={13}
            color="#cfe0ea"
            beamGain={1.5}
          />
        ))}
      {quality === "high" &&
        [-1, 1].map((side) =>
          [0, 1, 2, 3].map((i) => (
            <MovingHead
              key={`s${side}${i}`}
              position={[side * (STAGE.width / 2 + 2.2), 3.5 + i * 3.4, deckZ]}
              seed={side * 3 + i * 2.3}
              reach={17}
              color="#cfe0ea"
              hanging={false}
            />
          )),
        )}
      {/* deck-level movers, uplighting the array */}
      {quality !== "low" &&
        [-26, -18, -9, 9, 18, 26].map((x, i) => (
          <MovingHead
            key={`d${x}`}
            position={[x, STAGE.deckH + 0.25, STAGE.back - 0.8]}
            seed={i * 3.1 + 7}
            reach={15}
            color="#e0d0b4"
            hanging={false}
            beamAngle={0.075}
          />
        ))}
    </group>
  );
}

/* ── the room around the stage ─────────────────────────── */

/**
 * The ceiling.
 *
 * A grid of warm fixtures flown over the audience, receding toward the stage.
 * This is the single largest change the reference asked for: in it, the top
 * third of the frame is a lit ceiling, and that is what separates "a premium
 * venue" from "a dark room with a screen in it". Fixtures are plain emissive
 * plates — at this distance a real light would cost every shader in the scene
 * and look identical.
 */
function CeilingGrid() { return <HouseCeiling />; }

/**
 * Audience seating.
 *
 * Empty seating in warm light is the most efficient scale cue a venue has: it
 * says how many people this room holds, which is the question a client is
 * actually asking. Rows are single boxes — at any distance the camera ever
 * reaches, individual chairs are below a pixel.
 */
function Seating() { return <Audience />; }

/** PA, delay towers and control — the scale cues that make a room a venue. */
function ArenaDressing() {
  const quality = useVenue((s) => s.quality);
  return (
    <group>
      {/* flown PA either side of the stage */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <LineArray position={[side * 36, 11.6, STAGE.front + 3]} boxes={14} />
          <SubStack position={[side * 33.5, 0, STAGE.front - 1]} count={4} />
          <HangPoint position={[side * 36, 15.4, STAGE.front + 3]} drop={2.2} />
          {/* delay position out in the room, which is what makes the depth of
              an arena legible rather than merely large */}
          <group key={`delay${side}`}>
            <LineArray position={[side * 24, 10.4, STAGE.front + 44]} boxes={8} />
            <mesh position={[side * 24, 5.2, STAGE.front + 44]} material={M.steel}>
              <boxGeometry args={[0.36, 10.4, 0.36]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* front-of-house control position, out in the room */}
      <group position={[20, 0, STAGE.front + 50]}>
        <mesh position={[0, 0.9, 0]} material={M.deck}>
          <boxGeometry args={[9, 1.8, 5]} />
        </mesh>
        <mesh position={[0, 1.88, 0.6]} rotation={[-0.22, 0, 0]} material={M.anodised}>
          <boxGeometry args={[2.6, 0.06, 1.1]} />
        </mesh>
        <mesh position={[-2.6, 1.88, 0.4]} rotation={[-0.22, 0, 0]} material={M.anodised}>
          <boxGeometry args={[1.4, 0.06, 0.9]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 4.7, 1.35, 0]} material={M.steel}>
            <boxGeometry args={[0.06, 0.9, 5]} />
          </mesh>
        ))}
      </group>

      {/* audience barrier at the stage front */}
      {Array.from({ length: 23 }, (_, i) => i).filter(i => Math.abs(i - 11) > 2).map((i) => (
        <mesh key={i} position={[(i - 11) * 2.4, 0.6, STAGE.front + 7.4]} material={M.steel}>
          <boxGeometry args={[2.3, 1.2, 0.12]} />
        </mesh>
      ))}

      {/* spot bars flown out over the floor: the room needs rigging above the
          audience, not only above the stage */}
      {[-1, 1].map((side) =>
        [0, 1].map((i) => (
          <Truss
            key={`fl${side}${i}`}
            length={26}
            size={0.4}
            position={[side * 18, 14.6, STAGE.front + 22 + i * 16]}
            rotation={[0, Math.PI / 2, 0]}
            braceEvery={1.6}
          />
        )),
      )}

      {quality !== "low" && (
        <Haze
          count={15}
          area={[86, 15, 82]}
          position={[0, 7.5, STAGE.front + 16]}
          color="#b09274"
          opacity={0.011}
          scale={28}
          seed={4}
        />
      )}
    </group>
  );
}

/* ── the finale sequence ───────────────────────────────── */

/**
 * After the brand takes the room, the strapline and then the invitation
 * arrive on the canvas in front of it. They are separate surfaces rather than
 * one changing texture so each can be timed independently — which is what
 * lets the sequence breathe instead of cross-dissolving through itself.
 */
function FinaleSequence({ rim }: { rim: THREE.Material }) {
  return (
    <group>
      <Panel
        media="finale-word"
        width={19}
        height={4.6}
        position={[0, HERO_Y + 0.4, STAGE.wallZ + 0.12]}
        rim={rim}
        brightness={1.05}
        chrome={false}
        power={() => lineUp() * (1 - ctaUp() * 0.9)}
      />
      <Panel
        media="finale-cta"
        width={18}
        height={4.2}
        position={[0, HERO_Y, STAGE.wallZ + 0.18]}
        rim={rim}
        brightness={1.08}
        chrome={false}
        power={ctaUp}
      />
    </group>
  );
}

/* ── mode-reactive room tint ───────────────────────────── */

/**
 * A wash across the arena that follows the stage mode. Corporate keeps the
 * room warm and architectural; festival floods it.
 */
function ModeWash() {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const corporate = useMemo(() => new THREE.Color("#a5793f"), []);
  const festival = useMemo(() => new THREE.Color("#7b3fd0"), []);

  useFrame(({ clock }) => {
    if (!mat.current) return;
    const f = show.mode;
    mat.current.color.copy(corporate).lerp(festival, f);
    const t = clock.elapsedTime;
    const pulse = (0.6 + 0.2 * Math.sin(t * 0.5)) * (1 - f) + (0.5 + 0.5 * Math.sin(t * 2.4)) * f;
    mat.current.opacity = (0.055 + 0.05 * f) * pulse * (1 - show.cue * 0.8);
  });

  return (
    <mesh position={[0, 0.06, STAGE.front + 24]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[150, 110]} />
      <meshBasicMaterial
        ref={mat}
        color="#a5793f"
        transparent
        opacity={0.06}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function Stage() {
  const rim = useRimMaterial();
  return (
    <>
      <StageStructure />
      <StageScreens rim={rim} />
      <StageLighting />
      <CeilingGrid />
      <Seating />
      <ArenaDressing />
      <FinaleSequence rim={rim} />
      <ModeWash />
    </>
  );
}

export function Arena() {
  return (
    <group>
      <ZoneGroup from={-214} to={-250} ahead={46} behind={30}>
        <Approach />
      </ZoneGroup>
      <ZoneGroup from={-244} to={-380} ahead={74} behind={52}>
        <Stage />
      </ZoneGroup>
    </group>
  );
}
