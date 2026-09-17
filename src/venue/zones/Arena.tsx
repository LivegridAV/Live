"use client";
import { useMemo, useRef } from "react";
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
 * This is the climax, so it is built at climax scale: a room forty-four metres
 * to each side wall and thirty-four to the roof steel, a forty-metre main wall
 * and a rig that takes four truss layers to hang. The camera arrives at the
 * far end and finishes four metres off the barrier, by which point the stage
 * fills the frame — a stage that stays small and distant is the single fastest
 * way to lose an arena sequence.
 *
 * One stage, two creative directions. Nothing structural changes when the
 * visitor switches mode — the same trusses, the same walls, the same movers —
 * only the content, the colour and the way the lights behave. That is the
 * argument: the infrastructure is ours, the creative is yours.
 */

export const STAGE = {
  /** front edge of the deck */
  front: -330,
  back: -350,
  deckH: 2.0,
  width: 44,
  /** main LED wall */
  wallW: 40,
  wallH: 17,
  wallZ: -350.4,
  wallY: 2.4,
  /** roof grid height */
  roof: 25.5,
};

/** 0 → 1 ramp over a progress window, read per frame. */
function ramp(a: number, b: number) {
  return () => Math.min(1, Math.max(0, (journey.progress - a) / (b - a)));
}

/* The finale, beat by beat. Each ramp is one cue, and they overlap the way a
   programmed sequence does rather than cutting between states. */
const showOut = ramp(0.952, 0.966); // the performance ends, the room settles
const brandUp = ramp(0.962, 0.976); // livegridAV takes every major surface
const lineUp = ramp(0.976, 0.987); // the strapline follows
const ctaUp = ramp(0.987, 0.996); // and then the invitation
const showLive = () => 1 - showOut();

/* ── approach ──────────────────────────────────────────── */

function Approach() {
  const quality = useVenue((s) => s.quality);
  return (
    <group>
      {/* giant LED pillars flanking the run-in */}
      {[-1, 1].map((side) =>
        [0, 1, 2].map((i) => (
          <PillarScreen
            key={`${side}-${i}`}
            media="approach-pillar"
            width={1.15}
            depth={1.15}
            height={9.5 - i * 1.1}
            position={[side * (5.6 + i * 1.5), 0, -228 - i * 4.5]}
            pitch={2.6}
            brightness={1.0}
            range={70}
          />
        )),
      )}

      {/* large portrait displays, the kind that line a real concourse */}
      {[-1, 1].map((side) =>
        [0, 1].map((i) => (
          <Screen
            key={`p${side}${i}`}
            media="approach-portrait"
            width={1.9}
            height={4.6}
            position={[side * 12.5, 3.0, -230 - i * 7]}
            rotation={[0, side === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}
            pitch={1.9}
            range={60}
            frame={false}
          />
        )),
      )}

      <Truss length={22} size={0.44} position={[0, 12.2, -233]} braceEvery={0.9} />
      {quality !== "low" &&
        [-7, -2.4, 2.4, 7].map((x, i) => (
          <MovingHead key={x} position={[x, 11.7, -233]} seed={i * 2.1} reach={12} color="#e0b784" intensity={0.9} />
        ))}

      <LightPool position={[0, 0.04, -236]} size={[26, 30]} color="#c0925c" opacity={0.1} pulse={0.4} />
      <ReflectionStreak position={[0, 0.03, -224]} width={22} length={14} color="#4fb0a6" opacity={0.12} />
    </group>
  );
}

/* ── the stage ─────────────────────────────────────────── */

function StageStructure() {
  const deckZ = (STAGE.front + STAGE.back) / 2;
  const deckD = Math.abs(STAGE.back - STAGE.front);
  const towerX = STAGE.wallW / 2 + 2.6;

  return (
    <group>
      {/* deck, with a thrust running out into the room */}
      <mesh position={[0, STAGE.deckH / 2, deckZ]} material={M.deck} receiveShadow>
        <boxGeometry args={[STAGE.width, STAGE.deckH, deckD]} />
      </mesh>
      <mesh position={[0, STAGE.deckH / 2, STAGE.front + 3.2]} material={M.deck}>
        <boxGeometry args={[13, STAGE.deckH, 6.4]} />
      </mesh>
      {/* deck edge trim, all the way round the thrust */}
      <mesh position={[0, STAGE.deckH - 0.05, STAGE.front + 6.42]}>
        <planeGeometry args={[13, 0.09]} />
        <meshBasicMaterial color="#2f524e" toneMapped />
      </mesh>
      <mesh position={[0, STAGE.deckH - 0.05, STAGE.front + 0.02]}>
        <planeGeometry args={[STAGE.width, 0.09]} />
        <meshBasicMaterial color="#2f524e" toneMapped />
      </mesh>
      {/* stairs stage left */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-STAGE.width / 2 - 0.6, 0.2 + i * 0.34, STAGE.front + 2 + i * 0.42]} material={M.charcoal}>
          <boxGeometry args={[2.6, 0.34, 0.42]} />
        </mesh>
      ))}

      {/* upstage wall the LED is built against */}
      <mesh position={[0, 12, STAGE.back - 1.4]} material={M.charcoal}>
        <boxGeometry args={[66, 26, 1.4]} />
      </mesh>

      {/* ground-support towers: four corners, full height */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Truss length={STAGE.roof - 2} size={0.62} position={[side * towerX, (STAGE.roof - 2) / 2 + 1, STAGE.back + 1]} rotation={[0, 0, Math.PI / 2]} braceEvery={1.1} />
          <Truss length={STAGE.roof - 2} size={0.62} position={[side * towerX, (STAGE.roof - 2) / 2 + 1, STAGE.front + 1]} rotation={[0, 0, Math.PI / 2]} braceEvery={1.1} />
          <mesh position={[side * towerX, 0.4, STAGE.back + 1]} material={M.anodised}>
            <boxGeometry args={[1.6, 0.8, 1.6]} />
          </mesh>
          <mesh position={[side * towerX, 0.4, STAGE.front + 1]} material={M.anodised}>
            <boxGeometry args={[1.6, 0.8, 1.6]} />
          </mesh>
        </group>
      ))}

      {/* the roof grid: two headers, a downstage truss and four hanging bars */}
      <Truss length={towerX * 2} size={0.7} position={[0, STAGE.roof, STAGE.front + 1]} braceEvery={1.2} />
      <Truss length={towerX * 2} size={0.7} position={[0, STAGE.roof, STAGE.back + 1]} braceEvery={1.2} />
      <Truss length={towerX * 2} size={0.56} position={[0, STAGE.roof - 3.4, deckZ]} braceEvery={1.2} />
      {[-1, 1].map((side) => (
        <Truss
          key={`rl${side}`}
          length={Math.abs(STAGE.back - STAGE.front) + 2}
          size={0.62}
          position={[side * towerX, STAGE.roof, deckZ + 1]}
          rotation={[0, Math.PI / 2, 0]}
          braceEvery={1.4}
        />
      ))}
      {[-15, -5, 5, 15].map((x) => (
        <Truss key={x} length={20} size={0.44} position={[x, STAGE.roof - 6.2, deckZ]} rotation={[0, Math.PI / 2, 0]} braceEvery={1.3} />
      ))}
    </group>
  );
}

function StageScreens() {
  return (
    <group>
      {/* main wall */}
      <Screen
        media="stage-main"
        width={STAGE.wallW}
        height={STAGE.wallH}
        position={[0, STAGE.wallY + STAGE.wallH / 2, STAGE.wallZ]}
        pitch={2.6}
        brightness={1.1}
        range={170}
        frame={false}
        /* dips rather than dying, so the finale crossfades over a live wall */
        power={() => 0.1 + 0.9 * showLive()}
      />
      {/* the finale takes the same wall, a hair in front of it, and crossfades */}
      <Screen
        media="finale"
        width={STAGE.wallW}
        height={STAGE.wallH}
        position={[0, STAGE.wallY + STAGE.wallH / 2, STAGE.wallZ + 0.1]}
        pitch={2.6}
        brightness={1.05}
        range={170}
        frame={false}
        power={brandUp}
      />

      {/* side portrait walls, angled in toward the audience */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Screen
            media="stage-side"
            width={7}
            height={14}
            position={[side * 24.4, 9.2, STAGE.back + 2.2]}
            rotation={[0, side === -1 ? 0.36 : -0.36, 0]}
            pitch={2.6}
            brightness={1.0}
            range={160}
            frame={false}
            power={() => 0.06 + 0.94 * showLive()}
          />
          {/* the same surfaces join the finale — "every major display
              synchronises" has to be literal or it is not a finale */}
          <Screen
            media="finale"
            width={7}
            height={14}
            position={[side * 24.4 + side * 0.04, 9.2, STAGE.back + 2.3]}
            rotation={[0, side === -1 ? 0.36 : -0.36, 0]}
            pitch={2.6}
            brightness={0.95}
            range={160}
            frame={false}
            power={brandUp}
          />
        </group>
      ))}

      {/* vertical blades above the wall — one image cut across all ten */}
      {Array.from({ length: 10 }, (_, i) => (
        <Screen
          key={`b${i}`}
          media="stage-blade"
          width={1.9}
          height={6.4}
          position={[(i - 4.5) * 4.0, STAGE.wallY + STAGE.wallH + 3.8, STAGE.back + 0.8]}
          pitch={2.6}
          brightness={1.0}
          range={170}
          frame={false}
          uv={[1 / 10, 1, i / 10, 0]}
          power={() => 0.04 + 0.96 * showLive()}
        />
      ))}

      {/* stage floor LED */}
      <Screen
        media="stage-floor"
        width={28}
        height={13}
        position={[0, STAGE.deckH + 0.03, (STAGE.front + STAGE.back) / 2 + 1.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        pitch={2.6}
        brightness={0.8}
        range={150}
        frame={false}
        power={() => 0.05 + 0.95 * showLive()}
      />

      {/* curved wing screens, down stage left and right */}
      {[-1, 1].map((side) => (
        <CurvedScreen
          key={`w${side}`}
          media="stage-wing"
          radius={5.6}
          arc={Math.PI * 0.55}
          height={8.4}
          position={[side * 33, 4.4, STAGE.front + 4]}
          rotation={[0, side === -1 ? -0.5 : 0.5, 0]}
          pitch={2.6}
          brightness={0.95}
          range={150}
        />
      ))}

      <ReflectionStreak
        position={[0, 0.04, STAGE.front - 16]}
        width={56}
        length={34}
        color="#6fa8b5"
        opacity={0.16}
      />
      <LightPool position={[0, 0.05, STAGE.front - 11]} size={[62, 36]} color="#5f93a8" opacity={0.11} pulse={0.35} />
    </group>
  );
}

/** Mode-reactive lighting: the movers are the loudest part of the switch. */
function StageLighting() {
  const quality = useVenue((s) => s.quality);
  const deckZ = (STAGE.front + STAGE.back) / 2;
  const front = useMemo(() => Array.from({ length: 12 }, (_, i) => (i - 5.5) * 4.0), []);
  const back = useMemo(() => Array.from({ length: 9 }, (_, i) => (i - 4) * 4.6), []);

  return (
    <group>
      {front.map((x, i) => (
        <MovingHead key={`f${x}`} position={[x, STAGE.roof - 0.4, STAGE.front + 1]} seed={i} reach={20} color="#d7e6f2" />
      ))}
      {quality !== "low" &&
        back.map((x, i) => (
          <MovingHead key={`b${x}`} position={[x, STAGE.roof - 0.4, STAGE.back + 1]} seed={i + 11} reach={22} color="#e8cfa6" />
        ))}
      {quality !== "low" &&
        [-15, -5, 5, 15].map((x, i) => (
          <MovingHead key={`m${x}`} position={[x, STAGE.roof - 6.6, deckZ]} seed={i * 1.9 + 21} reach={18} color="#cfe0ea" />
        ))}
      {quality === "high" &&
        [-1, 1].map((side) =>
          [0, 1, 2, 3].map((i) => (
            <MovingHead
              key={`s${side}${i}`}
              position={[side * (STAGE.wallW / 2 + 2.6), 4 + i * 5.2, deckZ]}
              seed={side * 3 + i * 2.3}
              reach={17}
              color="#cfe0ea"
              hanging={false}
            />
          )),
        )}
      {/* deck-level movers, uplighting the wall */}
      {quality !== "low" &&
        [-14, -5, 5, 14].map((x, i) => (
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

/** PA, delay towers and audience — the scale cues that make a room a venue. */
function ArenaDressing() {
  const quality = useVenue((s) => s.quality);
  return (
    <group>
      {/* flown PA either side of the stage */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <LineArray position={[side * 27.5, 20, STAGE.front + 2]} boxes={14} />
          <SubStack position={[side * 25 - (side === -1 ? 1.2 : 0), 0, STAGE.front - 1]} count={4} />
          <HangPoint position={[side * 27.5, 24.5, STAGE.front + 2]} drop={4} />
          {/* delay position out in the room, which is what makes the depth of
              an arena legible rather than merely large */}
          <group key={`delay${side}`}>
            <LineArray position={[side * 20, 16, STAGE.front + 46]} boxes={8} />
            <mesh position={[side * 20, 8.5, STAGE.front + 46]} material={M.steel}>
              <boxGeometry args={[0.36, 17, 0.36]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* front-of-house control position, out in the room */}
      <group position={[0, 0, STAGE.front + 48]}>
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

      {/* audience barrier at the stage front — the camera finishes right on it,
          so it doubles as the foreground the hero shot needs */}
      {Array.from({ length: 19 }, (_, i) => (
        <mesh key={i} position={[(i - 9) * 2.4, 0.6, STAGE.front + 8.4]} material={M.steel}>
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
            position={[side * 14, 22, STAGE.front + 20 + i * 16]}
            rotation={[0, Math.PI / 2, 0]}
            braceEvery={1.6}
          />
        )),
      )}

      {quality !== "low" && (
        <Haze
          count={13}
          area={[76, 22, 78]}
          position={[0, 10, STAGE.front + 16]}
          color="#8fa8b4"
          opacity={0.009}
          scale={26}
          seed={4}
        />
      )}
    </group>
  );
}

/* ── the finale sequence ───────────────────────────────── */

/**
 * After the brand takes the room, the strapline and then the invitation
 * arrive on the wall in front of it. They are separate surfaces rather than
 * one changing texture so each can be timed independently — which is what
 * lets the sequence breathe instead of cross-dissolving through itself.
 */
function FinaleSequence() {
  return (
    <group>
      <Screen
        media="finale-word"
        width={26}
        height={6.4}
        position={[0, STAGE.wallY + STAGE.wallH * 0.52, STAGE.wallZ + 0.22]}
        pitch={2.6}
        brightness={1.05}
        range={170}
        frame={false}
        power={() => lineUp() * (1 - ctaUp() * 0.9)}
      />
      <Screen
        media="finale-cta"
        width={24}
        height={5.6}
        position={[0, STAGE.wallY + STAGE.wallH * 0.44, STAGE.wallZ + 0.34]}
        pitch={2.6}
        brightness={1.08}
        range={170}
        frame={false}
        power={ctaUp}
      />
    </group>
  );
}

/* ── mode-reactive room tint ───────────────────────────── */

/**
 * A wash across the arena that follows the stage mode. Corporate keeps the
 * room neutral and architectural; festival floods it.
 */
function ModeWash() {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const corporate = useMemo(() => new THREE.Color("#5b7f93"), []);
  const festival = useMemo(() => new THREE.Color("#7b3fd0"), []);

  useFrame(({ clock }) => {
    if (!mat.current) return;
    const f = show.mode;
    mat.current.color.copy(corporate).lerp(festival, f);
    const t = clock.elapsedTime;
    const pulse = (0.6 + 0.2 * Math.sin(t * 0.5)) * (1 - f) + (0.5 + 0.5 * Math.sin(t * 2.4)) * f;
    mat.current.opacity = (0.05 + 0.05 * f) * pulse * (1 - show.cue * 0.8);
  });

  return (
    <mesh position={[0, 0.06, STAGE.front + 24]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[150, 110]} />
      <meshBasicMaterial
        ref={mat}
        color="#5b7f93"
        transparent
        opacity={0.06}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export function Arena() {
  return (
    <group>
      <ZoneGroup from={-214} to={-250} ahead={46} behind={30}>
        <Approach />
      </ZoneGroup>
      <ZoneGroup from={-244} to={-380} ahead={64} behind={44}>
        <StageStructure />
        <StageScreens />
        <StageLighting />
        <ArenaDressing />
        <FinaleSequence />
        <ModeWash />
      </ZoneGroup>
    </group>
  );
}
