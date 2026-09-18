"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { M } from "../three/materials";
import { CurvedScreen, PillarScreen, Screen } from "../three/screens";
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
  width: 62,
  /** the screen plane */
  wallZ: -353.4,
  /** every panel in the array stands off this line */
  baseY: 1.8,
  /** the dominant centre canvas */
  heroW: 22,
  heroH: 10.6,
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
    <group>
      {/* Giant LED totems flanking the run-in. They start past the partner bay
          at -231: an earlier arrangement began at -228 and the first pair stood
          directly between the camera and the bay it was meant to be walking
          past. */}
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
  const deckZ = (STAGE.front + STAGE.back) / 2;
  const deckD = Math.abs(STAGE.back - STAGE.front);
  const towerX = STAGE.width / 2 + 2.2;

  return (
    <group>
      {/* A low, very wide deck. The reference's deck is barely higher than a
          kerb and runs the full width of the room; height is what makes a
          stage look like a platform, width is what makes it look like a set. */}
      <mesh position={[0, STAGE.deckH / 2, deckZ]} material={M.deck} receiveShadow>
        <boxGeometry args={[STAGE.width, STAGE.deckH, deckD]} />
      </mesh>
      {/* a lit line along the whole deck edge */}
      <mesh position={[0, STAGE.deckH - 0.06, STAGE.front + 0.02]}>
        <planeGeometry args={[STAGE.width, 0.08]} />
        <meshBasicMaterial color="#c08a4e" toneMapped />
      </mesh>
      <mesh position={[0, STAGE.deckH * 0.42, STAGE.front + 0.04]} material={M.charcoal}>
        <boxGeometry args={[STAGE.width, STAGE.deckH * 0.84, 0.1]} />
      </mesh>
      {/* a second lit line low on the fascia, and the wash the array throws
          down onto it — a black band the full width of the frame is the
          fastest way to kill a stage picture */}
      <mesh position={[0, 0.34, STAGE.front + 0.1]}>
        <planeGeometry args={[STAGE.width - 2, 0.04]} />
        <meshBasicMaterial color="#6d5029" toneMapped />
      </mesh>
      <LightPool
        position={[0, STAGE.deckH * 0.5, STAGE.front + 0.5]}
        rotation={[0, 0, 0]}
        size={[STAGE.width, 4.6]}
        color="#b58a55"
        opacity={0.16}
      />

      {/* Centre steps down into the room — the reference's one asymmetry in an
          otherwise symmetrical elevation, and the thing that connects stage to
          audience instead of walling them off. */}
      {Array.from({ length: 4 }, (_, i) => (
        <group key={i}>
          <mesh position={[0, STAGE.deckH - 0.2 - i * 0.4, STAGE.front + 0.5 + i * 0.92]} material={M.deck}>
            <boxGeometry args={[15 + i * 1.6, 0.4, 0.92]} />
          </mesh>
          <mesh position={[0, STAGE.deckH - 0.02 - i * 0.4, STAGE.front + 0.96 + i * 0.92]}>
            <planeGeometry args={[15 + i * 1.6, 0.04]} />
            <meshBasicMaterial color="#b3874f" toneMapped />
          </mesh>
        </group>
      ))}

      {/* upstage wall the array is built against */}
      <mesh position={[0, 9, STAGE.back - 1.4]} material={M.charcoal}>
        <boxGeometry args={[86, 20, 1.4]} />
      </mesh>

      {/* The black framing columns at the extreme edges of the elevation. In
          the reference these are what stop the set from bleeding into the room
          — the composition has a left and right border, and it needs one. */}
      {[-1, 1].map((side) => (
        <group key={`col${side}`}>
          <mesh position={[side * towerX, 7.6, STAGE.wallZ + 1.2]} material={M.charcoal}>
            <boxGeometry args={[1.5, 15.2, 2.2]} />
          </mesh>
          <mesh position={[side * (towerX - 0.78), 7.6, STAGE.wallZ + 1.2]}>
            <planeGeometry args={[0.05, 13.6]} />
            <meshBasicMaterial color="#8a6a44" toneMapped />
          </mesh>
        </group>
      ))}

      {/* ground-support towers behind the columns */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Truss
            length={STAGE.roof - 2}
            size={0.62}
            position={[side * (towerX + 1.8), (STAGE.roof - 2) / 2 + 1, STAGE.back + 1]}
            rotation={[0, 0, Math.PI / 2]}
            braceEvery={1.1}
          />
          <Truss
            length={STAGE.roof - 2}
            size={0.62}
            position={[side * (towerX + 1.8), (STAGE.roof - 2) / 2 + 1, STAGE.front + 1]}
            rotation={[0, 0, Math.PI / 2]}
            braceEvery={1.1}
          />
          <mesh position={[side * (towerX + 1.8), 0.4, STAGE.back + 1]} material={M.anodised}>
            <boxGeometry args={[1.6, 0.8, 1.6]} />
          </mesh>
          <mesh position={[side * (towerX + 1.8), 0.4, STAGE.front + 1]} material={M.anodised}>
            <boxGeometry args={[1.6, 0.8, 1.6]} />
          </mesh>
        </group>
      ))}

      {/* The roof grid. The front truss sits just above the array and carries
          the fixtures that rake down across it — in the reference that single
          line of warm beams is doing more for the picture than any screen. */}
      <Truss length={towerX * 2 + 4} size={0.7} position={[0, 14.3, STAGE.wallZ + 4.2]} braceEvery={1.2} />
      <Truss length={towerX * 2 + 4} size={0.7} position={[0, STAGE.roof, STAGE.front + 1]} braceEvery={1.2} />
      <Truss length={towerX * 2 + 4} size={0.7} position={[0, STAGE.roof, STAGE.back + 1]} braceEvery={1.2} />
      <Truss length={towerX * 2 + 4} size={0.56} position={[0, STAGE.roof - 1.6, deckZ]} braceEvery={1.2} />
      {[-1, 1].map((side) => (
        <Truss
          key={`rl${side}`}
          length={deckD + 2}
          size={0.62}
          position={[side * towerX, STAGE.roof, deckZ + 1]}
          rotation={[0, Math.PI / 2, 0]}
          braceEvery={1.4}
        />
      ))}
      {[-22, -8, 8, 22].map((x) => (
        <Truss key={x} length={22} size={0.44} position={[x, STAGE.roof - 1.0, deckZ]} rotation={[0, Math.PI / 2, 0]} braceEvery={1.3} />
      ))}

      {/* A catenary of small warm practicals strung across the front truss.
          It is the one soft, hand-hung element in an otherwise engineered
          elevation, and the reference leans on it heavily. */}
      {Array.from({ length: 34 }, (_, i) => {
        const f = i / 33;
        const x = (f - 0.5) * (towerX * 2 - 4);
        const sag = Math.sin(f * Math.PI) * 1.5;
        return (
          <mesh key={`fest${i}`} position={[x, 13.9 - sag, STAGE.wallZ + 5.4]}>
            <sphereGeometry args={[0.075, 6, 5]} />
            <meshBasicMaterial color="#f0c184" toneMapped />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── the screen array ──────────────────────────────────── */

/**
 * The array, described once and mirrored. Positive X is built and the mirror
 * is generated, which is what guarantees the elevation is actually symmetrical
 * rather than approximately so — a stage set that is nearly symmetrical looks
 * like a mistake from the centre aisle.
 */
function StageScreens({ rim }: { rim: THREE.Material }) {
  const Z = STAGE.wallZ;

  return (
    <group>
      {/* ── centre: the dominant canvas ── */}
      <Panel
        media="stage-main"
        width={STAGE.heroW}
        height={STAGE.heroH}
        position={[0, HERO_Y, Z]}
        rim={rim}
        brightness={1.12}
        reveal={0.14}
        /* dips rather than dying, so the finale crossfades over a live wall */
        power={() => 0.1 + 0.9 * showLive()}
      />
      {/* The finale takes the same canvas, a hair in front of it — and
          deliberately brings no chrome of its own: it is the same physical
          panel showing different content, not a second panel. */}
      <Panel
        media="finale"
        width={STAGE.heroW}
        height={STAGE.heroH}
        position={[0, HERO_Y, Z + 0.06]}
        rim={rim}
        brightness={1.06}
        chrome={false}
        power={brandUp}
      />

      {[-1, 1].map((side) => (
        <group key={side}>
          {/* ── the vertical light strips either side of centre ──
              Thin, full height, carrying a slice of their own programme. They
              are the hinge of the composition: they separate the hero canvas
              from everything outboard of it and give the elevation a rhythm. */}
          <Panel
            media="stage-strip"
            width={0.5}
            height={STAGE.heroH}
            position={[side * 12.5, HERO_Y, Z]}
            rim={rim}
            pitch={1.9}
            brightness={1.15}
            reveal={0.08}
            uv={[1, 1, 0, 0]}
            power={() => 0.06 + 0.94 * showLive()}
          />
          {/* the strips join the finale too — "every major display
              synchronises" has to be literal or it is not a finale */}
          <Panel
            media="finale"
            width={0.5}
            height={STAGE.heroH}
            position={[side * 12.5, HERO_Y, Z + 0.06]}
            rim={rim}
            pitch={1.9}
            brightness={1.1}
            chrome={false}
            uv={[0.12, 1, 0.44, 0]}
            power={brandUp}
          />

          {/* ── portrait fillers ── */}
          {[
            { x: 14.3, y: 4.9, w: 1.7, h: 6.2, u: 0 },
            { x: 16.4, y: 5.7, w: 1.7, h: 7.8, u: 0.5 },
          ].map((p, i) => (
            <Panel
              key={`pt${i}`}
              media="stage-portrait"
              width={p.w}
              height={p.h}
              position={[side * p.x, p.y, Z]}
              rim={rim}
              pitch={1.9}
              brightness={1.02}
              reveal={0.08}
              uv={[0.5, 1, p.u, 0]}
              power={() => 0.06 + 0.94 * showLive()}
            />
          ))}

          {/* ── the stacked landscape pair ──
              Two wide panels one above the other carrying the upper and lower
              halves of a single render, so the pair reads as one tall image
              interrupted by a band of light rather than as two screens. */}
          {[
            { y: 10.3, v: 0.5 },
            { y: 5.3, v: 0 },
          ].map((p, i) => (
            <Panel
              key={`st${i}`}
              media="stage-side"
              width={12}
              height={4.6}
              position={[side * 23.4, p.y, Z]}
              rim={rim}
              brightness={1.04}
              uv={[1, 0.5, 0, p.v]}
              power={() => 0.06 + 0.94 * showLive()}
            />
          ))}
          {/* the finale reaches these too — "every major display
              synchronises" has to be literal or it is not a finale */}
          {[
            { y: 10.3, v: 0.5 },
            { y: 5.3, v: 0 },
          ].map((p, i) => (
            <Panel
              key={`sf${i}`}
              media="finale"
              width={12}
              height={4.6}
              position={[side * 23.4, p.y, Z + 0.06]}
              rim={rim}
              brightness={0.98}
              chrome={false}
              uv={[1, 0.5, 0, p.v]}
              power={brandUp}
            />
          ))}

          {/* ── the canted outer cluster ──
              Turned back toward the audience so the people at the ends of the
              front rows are looking at a screen face rather than at its edge.
              This is the detail that makes a wide set read as audience-facing
              instead of merely long. */}
          <group position={[side * 31.4, 0, Z + 2.6]} rotation={[0, -side * 0.34, 0]}>
            {[
              { y: 10.0, v: 0.5 },
              { y: 5.2, v: 0 },
            ].map((p, i) => (
              <Panel
                key={`oc${i}`}
                media="stage-outer"
                width={8.6}
                height={4.4}
                position={[0, p.y, 0]}
                rim={rim}
                brightness={1.0}
                uv={[1, 0.5, 0, p.v]}
                power={() => 0.06 + 0.94 * showLive()}
              />
            ))}
            <Panel
              media="stage-portrait"
              width={1.6}
              height={5.4}
              position={[-5.9, 5.0, 0]}
              rim={rim}
              pitch={1.9}
              brightness={1.0}
              reveal={0.08}
              uv={[0.5, 1, 0.5, 0]}
              power={() => 0.06 + 0.94 * showLive()}
            />
            {[
              { y: 10.0, v: 0.5 },
              { y: 5.2, v: 0 },
            ].map((p, i) => (
              <Panel
                key={`of${i}`}
                media="finale"
                width={8.6}
                height={4.4}
                position={[0, p.y, 0.06]}
                rim={rim}
                brightness={0.96}
                chrome={false}
                uv={[1, 0.5, 0, p.v]}
                power={brandUp}
              />
            ))}
          </group>
        </group>
      ))}

      {/* stage floor LED, washing up under the array */}
      <Screen
        media="stage-floor"
        width={34}
        height={12}
        position={[0, STAGE.deckH + 0.03, (STAGE.front + STAGE.back) / 2 + 2.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        pitch={2.6}
        brightness={0.72}
        range={170}
        frame={false}
        flat
        power={() => 0.05 + 0.95 * showLive()}
      />

      {/* curved wing screens, downstage left and right */}
      {[-1, 1].map((side) => (
        <CurvedScreen
          key={`w${side}`}
          media="stage-wing"
          radius={5.0}
          arc={Math.PI * 0.5}
          height={7.2}
          position={[side * 39, 3.8, STAGE.front + 6]}
          rotation={[0, side === -1 ? -0.62 : 0.62, 0]}
          pitch={2.6}
          brightness={0.92}
          range={160}
        />
      ))}

      <ReflectionStreak position={[0, 0.04, STAGE.front - 18]} width={70} length={40} color="#c08a4e" opacity={0.15} />
      <LightPool position={[0, 0.05, STAGE.front - 12]} size={[76, 42]} color="#b5854f" opacity={0.12} pulse={0.3} />
    </group>
  );
}

/** Mode-reactive lighting: the movers are the loudest part of the switch. */
function StageLighting() {
  const quality = useVenue((s) => s.quality);
  const deckZ = (STAGE.front + STAGE.back) / 2;
  const rake = useMemo(() => Array.from({ length: 19 }, (_, i) => (i - 9) * 3.5), []);
  const back = useMemo(() => Array.from({ length: 13 }, (_, i) => (i - 6) * 4.6), []);

  return (
    <group>
      {/* The rake across the front truss. Nineteen fixtures, evenly spaced,
          throwing down across the array — the reference's signature, and the
          reason its stage reads as lit rather than merely bright. */}
      {rake.map((x, i) => (
        <MovingHead
          key={`r${x}`}
          position={[x, 13.9, STAGE.wallZ + 4.2]}
          seed={i * 1.7}
          reach={17}
          beamAngle={0.05}
          color="#f0c489"
          intensity={1.2}
          beamGain={2.3}
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
function CeilingGrid() {
  const quality = useVenue((s) => s.quality);
  const rows = useMemo(() => {
    const out: number[] = [];
    for (let z = -288; z > -356; z -= 4.6) out.push(z);
    return out;
  }, []);
  const cols = useMemo(() => [-35, -28, -21, -14, -7, 0, 7, 14, 21, 28, 35], []);
  const step = quality === "low" ? 2 : 1;
  const Y = STAGE.ceiling;

  return (
    <group>
      {rows
        .filter((_, i) => i % step === 0)
        .map((z) =>
          cols.map((x) => (
            <group key={`cf${z}${x}`}>
              <mesh position={[x, Y - 0.24, z]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[3.2, 0.42]} />
                <meshBasicMaterial color="#f4d09a" toneMapped />
              </mesh>
              {/* the housing, so each fixture has a body above it */}
              <mesh position={[x, Y - 0.08, z]} material={M.charcoal}>
                <boxGeometry args={[3.5, 0.32, 0.7]} />
              </mesh>
            </group>
          )),
        )}
      {/* the bars they are hung from */}
      {rows
        .filter((_, i) => i % (step * 2) === 0)
        .map((z) => (
          <mesh key={`cb${z}`} position={[0, Y + 0.14, z]} material={M.steel}>
            <boxGeometry args={[76, 0.16, 0.16]} />
          </mesh>
        ))}
      {/* The slatted soffit the fixtures are set into. Without it they float in
          a void and the room has no lid; with it, the top of every arena shot
          is a lit ceiling receding toward the stage — which is the single
          largest thing the reference does that this venue was not doing. */}
      <mesh position={[0, Y + 0.55, -322]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[90, 104]} />
        {/* a dark *warm* soffit, not black. A ceiling full of tungsten
            fixtures is never neutral, and the difference between #000 and
            this is most of what stops the upper frame reading as a hole. */}
        <meshBasicMaterial color="#161009" toneMapped />
      </mesh>
      {quality !== "low" &&
        Array.from({ length: 34 }, (_, i) => (
          <mesh key={`sl${i}`} position={[0, Y + 0.44, -274 - i * 2.9]} material={M.void}>
            <boxGeometry args={[90, 0.2, 0.55]} />
          </mesh>
        ))}
      {/* a warm cove where the ceiling meets each side wall */}
      {[-1, 1].map((side) => (
        <mesh
          key={`cc${side}`}
          position={[side * 41, Y - 0.6, -320]}
          rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
        >
          <planeGeometry args={[100, 0.34]} />
          <meshBasicMaterial color="#8a6f4c" toneMapped />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Audience seating.
 *
 * Empty seating in warm light is the most efficient scale cue a venue has: it
 * says how many people this room holds, which is the question a client is
 * actually asking. Rows are single boxes — at any distance the camera ever
 * reaches, individual chairs are below a pixel.
 */
function Seating() {
  const rows = useMemo(() => {
    const out: number[] = [];
    for (let z = -302; z > -329; z -= 1.0) out.push(z);
    return out;
  }, []);

  return (
    <group>
      {[-1, 1].map((side) =>
        rows.map((z, i) => (
          <group key={`sr${side}${z}`}>
            <mesh position={[side * 15.5, 0.52, z]} material={M.charcoal}>
              <boxGeometry args={[23, 0.56, 0.5]} />
            </mesh>
            {/* The top edge of every seat back, catching the ceiling. This is
                the whole reason the seating is visible at all: unlit charcoal
                boxes on a dark floor are invisible, and an arena with no
                legible audience has no scale. */}
            <mesh position={[side * 15.5, 0.8, z + 0.03]} rotation={[-Math.PI / 2.3, 0, 0]}>
              <planeGeometry args={[23, 0.05]} />
              <meshBasicMaterial color={i % 4 === 0 ? "#7a6144" : "#584736"} toneMapped />
            </mesh>
          </group>
        )),
      )}
      {/* The centre aisle, lit. The reference runs a pale carpeted runway from
          the steps straight down the room, and it is what gives the shot its
          one-point perspective. */}
      <mesh position={[0, 0.02, -315]} rotation={[-Math.PI / 2, 0, 0]} material={M.deck}>
        <planeGeometry args={[7, 34]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`al${side}`} position={[side * 3.5, 0.03, -315]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.09, 34]} />
          <meshBasicMaterial color="#c08a4e" toneMapped />
        </mesh>
      ))}
      <ReflectionStreak position={[0, 0.035, -315]} width={6.4} length={32} color="#d3a366" opacity={0.2} />
      {/* cross aisles either side of the seating blocks */}
      {[-1, 1].map((side) => (
        <mesh key={`cx${side}`} position={[side * 28.5, 0.02, -315]} rotation={[-Math.PI / 2, 0, 0]} material={M.deck}>
          <planeGeometry args={[4, 34]} />
        </mesh>
      ))}
    </group>
  );
}

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
      <group position={[0, 0, STAGE.front + 50]}>
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
      {Array.from({ length: 23 }, (_, i) => (
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
