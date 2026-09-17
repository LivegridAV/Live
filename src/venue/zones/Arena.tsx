"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { M } from "../three/materials";
import { CurvedScreen, PillarScreen, Screen } from "../three/screens";
import { Haze, HangPoint, LineArray, MovingHead, SubStack, Truss } from "../three/rig";
import { LightPool } from "../three/environment";
import { ReflectionStreak } from "../three/Reflection";
import { journey } from "../systems/journey";
import { useVenue } from "../systems/store";
import { ZoneGroup } from "../three/ZoneGroup";

/**
 * The arena and the main stage.
 *
 * One stage, two creative directions. Nothing structural changes when the
 * visitor switches mode — the same trusses, the same walls, the same movers —
 * only the content, the colour and the way the lights behave. That is the
 * argument: the infrastructure is ours, the creative is yours.
 */

export const STAGE = {
  /** front edge of the deck */
  front: -318,
  back: -333,
  deckH: 1.8,
  width: 30,
  /** main LED wall */
  wallW: 28,
  wallH: 12,
  wallZ: -333.4,
  wallY: 2.6,
};

/** 0 → 1 ramp over a progress window, read per frame. */
function ramp(a: number, b: number) {
  return () => Math.min(1, Math.max(0, (journey.progress - a) / (b - a)));
}
const finaleUp = ramp(0.958, 0.975);
const finaleDown = () => 1 - finaleUp();

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
            pitch={6.9}
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
            pitch={3.9}
            range={60}
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

  return (
    <group>
      {/* deck */}
      <mesh position={[0, STAGE.deckH / 2, deckZ]} material={M.deck} receiveShadow>
        <boxGeometry args={[STAGE.width, STAGE.deckH, deckD]} />
      </mesh>
      {/* deck edge trim */}
      <mesh position={[0, STAGE.deckH - 0.04, STAGE.front + 0.02]}>
        <planeGeometry args={[STAGE.width, 0.07]} />
        <meshBasicMaterial color="#2b4a47" toneMapped />
      </mesh>
      {/* stairs stage left */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[-STAGE.width / 2 - 0.5, 0.18 + i * 0.36, STAGE.front + 2 + i * 0.4]} material={M.charcoal}>
          <boxGeometry args={[2.4, 0.36, 0.4]} />
        </mesh>
      ))}

      {/* upstage wall the LED is built against */}
      <mesh position={[0, 9, STAGE.back - 1.2]} material={M.charcoal}>
        <boxGeometry args={[46, 18, 1.2]} />
      </mesh>

      {/* ground-support towers either side */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Truss length={17} size={0.52} position={[side * 17.5, 8.5, STAGE.back + 1]} rotation={[0, 0, Math.PI / 2]} braceEvery={1} />
          <Truss length={17} size={0.52} position={[side * 17.5, 8.5, STAGE.front + 1]} rotation={[0, 0, Math.PI / 2]} braceEvery={1} />
        </group>
      ))}
      {/* the roof grid over the stage */}
      <Truss length={36} size={0.6} position={[0, 17.2, STAGE.front + 1]} braceEvery={1.1} />
      <Truss length={36} size={0.6} position={[0, 17.2, STAGE.back + 1]} braceEvery={1.1} />
      <Truss length={14} size={0.6} position={[0, 17.2, deckZ]} rotation={[0, Math.PI / 2, 0]} braceEvery={1.1} />
      {[-12, 0, 12].map((x) => (
        <Truss key={x} length={14} size={0.44} position={[x, 14.6, deckZ]} rotation={[0, Math.PI / 2, 0]} braceEvery={1.2} />
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
        pitch={6.9}
        cabinet={0.5}
        brightness={1.1}
        range={130}
        /* dips rather than dying, so the finale crossfades over a live wall */
        power={() => 0.12 + 0.88 * finaleDown()}
      />
      {/* the finale takes the same wall, a hair in front of it, and crossfades */}
      <Screen
        media="finale"
        width={STAGE.wallW}
        height={STAGE.wallH}
        position={[0, STAGE.wallY + STAGE.wallH / 2, STAGE.wallZ + 0.08]}
        pitch={6.9}
        brightness={1.05}
        range={130}
        frame={false}
        power={finaleUp}
      />

      {/* side portrait walls, angled in toward the audience */}
      {[-1, 1].map((side) => (
        <Screen
          key={side}
          media="stage-side"
          width={5.4}
          height={10}
          position={[side * 17.8, 6.6, STAGE.back + 1.4]}
          rotation={[0, side === -1 ? 0.34 : -0.34, 0]}
          pitch={6.9}
          brightness={1.0}
          range={120}
        />
      ))}

      {/* vertical blades above the wall — one image cut across all eight */}
      {Array.from({ length: 8 }, (_, i) => (
        <Screen
          key={`b${i}`}
          media="stage-blade"
          width={1.5}
          height={5.2}
          position={[(i - 3.5) * 3.4, 17.6, STAGE.back + 0.6]}
          pitch={10}
          brightness={1.0}
          range={130}
          uv={[1 / 8, 1, i / 8, 0]}
        />
      ))}

      {/* stage floor LED */}
      <Screen
        media="stage-floor"
        width={20}
        height={9}
        position={[0, STAGE.deckH + 0.02, (STAGE.front + STAGE.back) / 2 + 1.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        pitch={10}
        brightness={0.78}
        range={110}
        frame={false}
      />

      {/* curved wing screens, down stage left and right */}
      {[-1, 1].map((side) => (
        <CurvedScreen
          key={`w${side}`}
          media="stage-wing"
          radius={4.4}
          arc={Math.PI * 0.55}
          height={6.4}
          position={[side * 24.5, 3.4, STAGE.front + 3]}
          rotation={[0, side === -1 ? -0.5 : 0.5, 0]}
          pitch={8}
          brightness={0.95}
          range={110}
        />
      ))}

      <ReflectionStreak
        position={[0, 0.04, STAGE.front - 12]}
        width={40}
        length={26}
        color="#6fa8b5"
        opacity={0.16}
      />
      <LightPool position={[0, 0.05, STAGE.front - 8]} size={[46, 28]} color="#5f93a8" opacity={0.1} pulse={0.35} />
    </group>
  );
}

/** Mode-reactive lighting: the movers are the loudest part of the switch. */
function StageLighting() {
  const quality = useVenue((s) => s.quality);
  const deckZ = (STAGE.front + STAGE.back) / 2;
  const front = useMemo(() => Array.from({ length: 10 }, (_, i) => (i - 4.5) * 3.4), []);
  const back = useMemo(() => Array.from({ length: 7 }, (_, i) => (i - 3) * 4.2), []);

  return (
    <group>
      {front.map((x, i) => (
        <MovingHead key={`f${x}`} position={[x, 16.9, STAGE.front + 1]} seed={i} reach={14} color="#d7e6f2" />
      ))}
      {quality !== "low" &&
        back.map((x, i) => (
          <MovingHead key={`b${x}`} position={[x, 16.9, STAGE.back + 1]} seed={i + 11} reach={16} color="#e8cfa6" />
        ))}
      {quality === "high" &&
        [-1, 1].map((side) =>
          [0, 1, 2].map((i) => (
            <MovingHead
              key={`s${side}${i}`}
              position={[side * 17.5, 4 + i * 4.4, deckZ]}
              seed={side * 3 + i * 2.3}
              reach={13}
              color="#cfe0ea"
              hanging={false}
            />
          )),
        )}
      {/* deck-level movers, uplighting the wall */}
      {quality !== "low" &&
        [-10, -3.4, 3.4, 10].map((x, i) => (
          <MovingHead
            key={`d${x}`}
            position={[x, STAGE.deckH + 0.25, STAGE.back - 0.6]}
            seed={i * 3.1 + 7}
            reach={11}
            color="#e0d0b4"
            hanging={false}
            beamAngle={0.075}
          />
        ))}
    </group>
  );
}

/** PA and audience — scale cues that make the room feel occupied. */
function ArenaDressing() {
  const quality = useVenue((s) => s.quality);
  return (
    <group>
      {/* flown PA either side of the stage */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <LineArray position={[side * 21, 14.5, STAGE.front + 2]} boxes={10} />
          <SubStack position={[side * 19 - (side === -1 ? 1.2 : 0), 0, STAGE.front - 1]} count={3} />
          <HangPoint position={[side * 21, 17.2, STAGE.front + 2]} drop={2.5} />
        </group>
      ))}

      {/* front-of-house control position, out in the room */}
      <group position={[0, 0, -282]}>
        <mesh position={[0, 0.9, 0]} material={M.deck}>
          <boxGeometry args={[7, 1.8, 4]} />
        </mesh>
        <mesh position={[0, 1.88, 0.6]} rotation={[-0.22, 0, 0]} material={M.anodised}>
          <boxGeometry args={[2.6, 0.06, 1.1]} />
        </mesh>
        <mesh position={[-2.1, 1.88, 0.4]} rotation={[-0.22, 0, 0]} material={M.anodised}>
          <boxGeometry args={[1.4, 0.06, 0.9]} />
        </mesh>
        {/* barrier around it */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 3.7, 1.35, 0]} material={M.steel}>
            <boxGeometry args={[0.06, 0.9, 4]} />
          </mesh>
        ))}
      </group>

      {/* audience barrier at the stage front */}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[(i - 6) * 2.4, 0.6, STAGE.front - 3.2]} material={M.steel}>
          <boxGeometry args={[2.3, 1.2, 0.12]} />
        </mesh>
      ))}

      {quality !== "low" && (
        <Haze
          count={11}
          area={[64, 16, 56]}
          position={[0, 8, -302]}
          color="#8fa8b4"
          opacity={0.009}
          scale={22}
          seed={4}
        />
      )}
    </group>
  );
}

/* ── contact zone signage ──────────────────────────────── */

function ContactSignage() {
  const contactUp = useMemo(() => ramp(0.984, 0.995), []);
  return (
    <Screen
      media="finale-word"
      width={18}
      height={5}
      position={[0, 11.4, STAGE.wallZ + 0.16]}
      pitch={6.9}
      brightness={1.0}
      range={130}
      frame={false}
      power={contactUp}
    />
  );
}

/* ── mode-reactive room tint ───────────────────────────── */

/**
 * A wash across the arena that follows the stage mode. Corporate keeps the
 * room neutral and architectural; festival floods it.
 */
function ModeWash() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const stageMode = useVenue((s) => s.stageMode);
  const target = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }, dt) => {
    if (!mat.current) return;
    const festival = stageMode === "festival";
    target.set(festival ? "#7b3fd0" : "#5b7f93");
    mat.current.color.lerp(target, Math.min(1, dt * 2));
    const pulse = festival ? 0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.4) : 0.6 + 0.2 * Math.sin(clock.elapsedTime * 0.5);
    mat.current.opacity = (festival ? 0.1 : 0.05) * pulse;
  });

  return (
    <mesh ref={mesh} position={[0, 0.06, -300]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
      <planeGeometry args={[100, 70]} />
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
      <ZoneGroup from={-244} to={-356} ahead={54} behind={40}>
        <StageStructure />
        <StageScreens />
        <StageLighting />
        <ArenaDressing />
        <ContactSignage />
        <ModeWash />
      </ZoneGroup>
    </group>
  );
}
