"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { M } from "../three/materials";
import { Screen } from "../three/screens";
import { Haze } from "../three/rig";
import { LightPool, getPoolTexture } from "../three/environment";
import { ReflectionStreak } from "../three/Reflection";
import { useVenue } from "../systems/store";

/**
 * Arrival — outside a premium event entrance, at night.
 *
 * No navigation-heavy hero. The first thing the visitor sees is a building,
 * a brand band, and light coming from somewhere deeper inside it. Everything
 * here is arranged to pull the eye through the portal: the ground strips
 * converge on it, the canopy frames it, and the only warm light in the scene
 * is leaking out of it.
 */

const PORTAL_W = 10.8;
const PORTAL_H = 6.4;
const FACADE_W = 46;
const FACADE_H = 15;

/**
 * The entrance arch.
 *
 * Springing radius and rise are deliberately a little smaller than the hole
 * cut in the facade, so the arch face covers the rectangular opening corners
 * and what the visitor sees is an arch, not an arch sitting inside a box.
 */
const ARCH = { radius: 5.0, rise: 1.2, faceZ: 0.55, depth: 0.62 };
const ARCH_CROWN = ARCH.radius * ARCH.rise;

/** Night sky — a single graded dome, so the plaza has somewhere to be. */
function SkyDome() {
  const geo = useMemo(() => new THREE.SphereGeometry(220, 24, 16), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vPos;
          void main(){
            float h = normalize(vPos).y * 0.5 + 0.5;
            vec3 low  = vec3(0.020, 0.030, 0.034);
            vec3 mid  = vec3(0.030, 0.043, 0.050);
            vec3 high = vec3(0.008, 0.013, 0.020);
            vec3 c = mix(low, mid, smoothstep(0.38, 0.52, h));
            c = mix(c, high, smoothstep(0.52, 1.0, h));
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );
  return <mesh geometry={geo} material={mat} renderOrder={-1} frustumCulled={false} />;
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
 * The entrance arch.
 *
 * The first structure on the site, so it carries the whole promise: this is a
 * flagship event entrance, not a door in a wall. What it was — a rectangular
 * hole with a metal surround and an abstract band floating above it — read as
 * temporary, and a temporary-looking entrance undermines every premium claim
 * made after it.
 *
 * Three things make it read as event-grade, in this order: the opening is an
 * *arch*, so the elevation has a gesture in it; the arch has real depth, a
 * machined reveal you pass through rather than a line you cross; and the
 * fascia over it says the name, lit, on its own illuminated band.
 */
function EntranceArch() {
  const face = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 19;
    const h = 12.6;
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(w / 2, h);
    shape.lineTo(-w / 2, h);
    shape.closePath();
    shape.holes.push(archPath(ARCH.radius, ARCH.rise));
    return new THREE.ShapeGeometry(shape);
  }, []);

  const reveal = useMemo(() => {
    const outer = new THREE.Shape();
    const o = archPath(ARCH.radius + 0.34, ARCH.rise);
    outer.curves = o.curves;
    outer.autoClose = true;
    outer.holes.push(archPath(ARCH.radius, ARCH.rise));
    return new THREE.ExtrudeGeometry(outer, {
      depth: ARCH.depth,
      bevelEnabled: false,
      curveSegments: 48,
    });
  }, []);

  const cove = useMemo(() => {
    const outer = new THREE.Shape();
    const o = archPath(ARCH.radius + 0.1, ARCH.rise);
    outer.curves = o.curves;
    outer.autoClose = true;
    outer.holes.push(archPath(ARCH.radius + 0.02, ARCH.rise));
    return new THREE.ShapeGeometry(outer, 48);
  }, []);

  useEffect(
    () => () => {
      face.dispose();
      reveal.dispose();
      cove.dispose();
    },
    [face, reveal, cove],
  );

  return (
    <group>
      {/* the arch face, standing proud of the facade */}
      <mesh geometry={face} position={[0, 0, ARCH.faceZ]} material={M.graphite} />
      {/* and its returns back to the wall, so it reads as a solid mass */}
      {[-1, 1].map((side) => (
        <mesh key={`rt${side}`} position={[side * 9.5, 6.3, ARCH.faceZ / 2]} material={M.charcoal}>
          <boxGeometry args={[0.35, 12.6, ARCH.faceZ + 0.5]} />
        </mesh>
      ))}

      {/* machined reveal through the thickness of the arch */}
      <mesh geometry={reveal} position={[0, 0, ARCH.faceZ - ARCH.depth]} material={M.aluminium} />
      {/* a warm cove hidden in the reveal, washing the soffit of the arch */}
      <mesh geometry={cove} position={[0, 0, ARCH.faceZ - 0.02]}>
        <meshBasicMaterial color="#e2bb85" toneMapped side={THREE.DoubleSide} />
      </mesh>

      {/* Fascia. Set on its own lit band above the crown, on a header that
          projects from the arch face — signage that is part of the building
          rather than stuck to it. */}
      <mesh position={[0, ARCH_CROWN + 1.55, ARCH.faceZ + 0.28]} material={M.charcoal}>
        <boxGeometry args={[12.6, 2.6, 0.62]} />
      </mesh>
      <Screen
        media="entry-brand"
        width={11.2}
        height={1.85}
        position={[0, ARCH_CROWN + 1.55, ARCH.faceZ + 0.6]}
        pitch={1.5}
        brightness={1.12}
        range={80}
        frame={false}
        edge="#2c6f68"
        edgeWidth={0.06}
      />
      {/* a projecting lintel over the fascia, catching a warm line underneath */}
      <mesh position={[0, ARCH_CROWN + 3.05, ARCH.faceZ + 0.5]} material={M.charcoal}>
        <boxGeometry args={[14.4, 0.42, 1.2]} />
      </mesh>
      <mesh position={[0, ARCH_CROWN + 2.83, ARCH.faceZ + 0.72]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13.4, 0.1]} />
        <meshBasicMaterial color="#c9a373" toneMapped />
      </mesh>

      {/* Vertical light lines down the shoulders of the arch, so it reads as a
          mass with a top and two legs rather than as a cut-out. */}
      {[-1, 1].map((side) => (
        <group key={`sh${side}`}>
          <mesh position={[side * 7.4, 5.4, ARCH.faceZ + 0.04]}>
            <planeGeometry args={[0.1, 9.2]} />
            <meshBasicMaterial color="#5f8a86" toneMapped />
          </mesh>
          {/* uplight grazing the arch leg from the plaza floor */}
          <mesh position={[side * 6.1, 0.06, ARCH.faceZ + 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.7, 0.24]} />
            <meshBasicMaterial color="#d8b177" toneMapped />
          </mesh>
          <LightPool
            position={[side * 6.6, 4.6, ARCH.faceZ + 0.3]}
            rotation={[0, 0, 0]}
            size={[4.2, 11]}
            color="#a68a5e"
            opacity={0.13}
          />
        </group>
      ))}

      {/* Banding on the arch face. A nineteen-metre unbroken slab of dark
          material reads as a hole in the night however well the sign on it is
          lit; shallow reveals give the mass a scale and something for the
          uplighting to catch.

          They run in two pieces, one either side of the opening, and stop
          clear of it. Drawn full width they crossed the aperture instead —
          two bars straight through the archway and a third through the sign,
          with the plinth laying a fourth across the threshold like something
          you would trip over. A reveal is cut into a face; it cannot run
          through the hole in the middle of one. */}
      {[2.2, 4.6].map((y) =>
        [-1, 1].map((side) => (
          <group key={`band${y}${side}`} position={[side * 7.5, y, 0]}>
            <mesh position={[0, 0, ARCH.faceZ + 0.06]} material={M.charcoal}>
              <boxGeometry args={[4.0, 0.22, 0.14]} />
            </mesh>
            <mesh position={[0, -0.13, ARCH.faceZ + 0.14]}>
              <planeGeometry args={[3.85, 0.035]} />
              <meshBasicMaterial color="#4e6a6c" toneMapped />
            </mesh>
          </group>
        )),
      )}

      {/* the lit plinth, in the same two pieces, so the mass sits on the
          ground rather than floating out of it */}
      {[-1, 1].map((side) => (
        <group key={`plinth${side}`} position={[side * 7.5, 0, 0]}>
          <mesh position={[0, 0.16, ARCH.faceZ + 0.12]} material={M.anodised}>
            <boxGeometry args={[4.0, 0.32, 0.3]} />
          </mesh>
          <mesh position={[0, 0.35, ARCH.faceZ + 0.2]}>
            <planeGeometry args={[3.85, 0.05]} />
            <meshBasicMaterial color="#c2975d" toneMapped />
          </mesh>
        </group>
      ))}

      {/* the graze up the face from the plaza, and the light the arch throws
          onto the apron in front of it */}
      <LightPool
        position={[0, 4.4, ARCH.faceZ + 0.18]}
        rotation={[0, 0, 0]}
        size={[20, 11]}
        color="#7f6d4e"
        opacity={0.1}
      />
      <LightPool position={[0, 0.035, 3.4]} size={[19, 13]} color="#c79a62" opacity={0.17} pulse={0.25} />
      <pointLight position={[0, 4.2, 1.6]} intensity={28} distance={20} decay={2} color="#d9b681" />
    </group>
  );
}

/**
 * The entrance hall behind the doors.
 *
 * A flat additive plane across the opening was standing in for "light from
 * inside", and from the plaza it read as exactly what it was: a brown
 * rectangle. What the opening needs is a room — a short lit lobby between the
 * façade and the tunnel mouth, so the visitor is looking into somewhere.
 */
function EntranceHall() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.2 + 0.05 * Math.sin(clock.elapsedTime * 0.55);
  });

  const from = -1.0;
  const to = -3.6;
  const mid = (from + to) / 2;
  const halfW = PORTAL_W / 2;

  return (
    <group>
      {/* lobby walls, splayed in toward the tunnel mouth */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * halfW, PORTAL_H / 2, mid]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            material={M.graphite}
          >
            <planeGeometry args={[Math.abs(to - from), PORTAL_H]} />
          </mesh>
          <mesh
            position={[side * (halfW - 0.04), PORTAL_H / 2, mid]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[Math.abs(to - from) - 0.5, 0.1]} />
            <meshBasicMaterial color="#c2a068" toneMapped />
          </mesh>
        </group>
      ))}
      {/* soffit and its cove */}
      <mesh position={[0, PORTAL_H, mid]} rotation={[Math.PI / 2, 0, 0]} material={M.charcoal}>
        <planeGeometry args={[PORTAL_W, Math.abs(to - from)]} />
      </mesh>
      <mesh position={[0, PORTAL_H - 0.05, mid]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PORTAL_W - 1.4, 0.16]} />
        <meshBasicMaterial color="#d3b27a" toneMapped />
      </mesh>
      {/* the lobby floor reads warm against the cool plaza outside */}
      <mesh position={[0, 0.01, mid]} rotation={[-Math.PI / 2, 0, 0]} material={M.deck}>
        <planeGeometry args={[PORTAL_W, Math.abs(to - from)]} />
      </mesh>
      <pointLight position={[0, PORTAL_H * 0.7, mid]} intensity={22} distance={16} decay={2} color="#d7b47e" />

      {/* a soft bloom in the opening — now a glow rather than a panel */}
      <mesh ref={ref} position={[0, PORTAL_H / 2, -0.9]} renderOrder={2}>
        <planeGeometry args={[PORTAL_W * 1.25, PORTAL_H * 1.3]} />
        <meshBasicMaterial
          map={getPoolTexture()}
          color="#9b8354"
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function Arrival() {
  const quality = useVenue((s) => s.quality);

  // Ground light strips converging on the portal.
  const strips = useMemo(() => Array.from({ length: 9 }, (_, i) => 4 + i * 4.2), []);

  return (
    <group>
      <SkyDome />

      {/* ── façade ── */}
      <group position={[0, 0, 0]}>
        {/* solid wall either side of the portal */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * (PORTAL_W / 2 + (FACADE_W / 2 - PORTAL_W / 2) / 2), FACADE_H / 2, -0.5]}
            material={M.graphite}
          >
            <boxGeometry args={[FACADE_W / 2 - PORTAL_W / 2, FACADE_H, 1]} />
          </mesh>
        ))}
        {/* The wall the opening is cut into. The arch face standing in front
            of it is what the visitor actually reads. */}
        <mesh position={[0, (FACADE_H + PORTAL_H) / 2, -0.5]} material={M.graphite}>
          <boxGeometry args={[PORTAL_W, FACADE_H - PORTAL_H, 1]} />
        </mesh>

        {/* canopy */}
        <mesh position={[0, FACADE_H * 0.62, 3.2]} material={M.charcoal}>
          <boxGeometry args={[FACADE_W * 0.62, 0.55, 7.4]} />
        </mesh>
        {/* canopy underside light line */}
        <mesh position={[0, FACADE_H * 0.62 - 0.29, 3.2]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[FACADE_W * 0.56, 0.24]} />
          <meshBasicMaterial color="#c0a06a" toneMapped />
        </mesh>
        {/* what the canopy throws down onto the forecourt */}
        <LightPool position={[0, 0.03, 3.2]} size={[FACADE_W * 0.6, 12]} color="#96784c" opacity={0.13} />

        {/* Vertical façade fins, each with a light line washing the wall
            behind it. A building at night is legible because of how it is lit,
            not because of its geometry — unlit, this whole elevation was a
            black rectangle with a door in it. */}
        {Array.from({ length: 10 }, (_, i) => {
          const x = (i - 4.5) * 3.9;
          if (Math.abs(x) < PORTAL_W / 2 + 1.6) return null;
          return (
            <group key={`fin${i}`}>
              <mesh position={[x, FACADE_H / 2, 0.35]} material={M.charcoal}>
                <boxGeometry args={[0.35, FACADE_H - 0.6, 0.7]} />
              </mesh>
              <mesh position={[x, FACADE_H / 2 - 0.6, 0.72]}>
                <planeGeometry args={[0.1, FACADE_H - 3.2]} />
                <meshBasicMaterial color="#8fbdc0" toneMapped />
              </mesh>
              {/* an uplight at the base, grazing the wall */}
              <mesh position={[x, 0.08, 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.8, 0.26]} />
                <meshBasicMaterial color="#e0bd85" toneMapped />
              </mesh>
              {/* The graze itself. A camera-ridden point light is twenty-four
                  metres from this elevation with a decay of two, which is to
                  say it contributes nothing — a forty-six metre facade has to
                  light itself or it is a black rectangle with a sign on it. */}
              <LightPool
                position={[x, FACADE_H * 0.4, 0.8]}
                rotation={[0, 0, 0]}
                size={[4.2, FACADE_H * 1.05]}
                color="#9a8a68"
                opacity={0.19}
              />
              <LightPool position={[x, 0.04, 2.4]} size={[5, 6]} color="#a8834f" opacity={0.12} />
            </group>
          );
        })}

        {/* a continuous cove along the top of the elevation */}
        <mesh position={[0, FACADE_H - 0.5, 0.55]}>
          <planeGeometry args={[FACADE_W - 1.2, 0.18]} />
          <meshBasicMaterial color="#b6ccd0" toneMapped />
        </mesh>
        {/* the wash falling from that cove down the top of the elevation */}
        <LightPool
          position={[0, FACADE_H - 3.4, 0.6]}
          rotation={[0, 0, 0]}
          size={[FACADE_W - 2, 7]}
          color="#6f8288"
          opacity={0.13}
        />
        {/* and a low band along the foot of the whole elevation, so the
            building meets the ground somewhere the eye can find */}
        <mesh position={[0, 0.5, 0.58]}>
          <planeGeometry args={[FACADE_W - 1.2, 0.07]} />
          <meshBasicMaterial color="#5f7d74" toneMapped />
        </mesh>
      </group>

      <EntranceArch />
      <LightPool position={[0, 0.03, 6]} size={[20, 16]} color="#4f9a92" opacity={0.12} pulse={0.4} />
      {/* approach lighting out across the plaza — without it the visitor
          starts the walkthrough standing in an unlit car park */}
      {[10, 18, 27].map((z, i) => (
        <LightPool
          key={`ap${z}`}
          position={[0, 0.025, z]}
          size={[26 + i * 6, 12]}
          color="#7d6a4a"
          opacity={0.1 - i * 0.02}
        />
      ))}

      {/* ── the welcome ──
          This used to be a 4.2 m plate flat against the facade at x = -9.2:
          nine metres off the centre line, edge-on to the approach, twenty-four
          metres away and behind the arch light. It was present and it was
          invisible, which is the worst of both.

          A welcome is a moment, so it is now a restrained glass sign in the
          near foreground: immediately legible, but small enough that the
          architecture remains the first impression. */}
      <group position={[-4.0, 0, 10.2]} rotation={[0, 0.32, 0]}>
        {/* base and stem */}
        <mesh position={[0, 0.09, 0]} material={M.anodised}>
          <boxGeometry args={[1.55, 0.14, 0.62]} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <planeGeometry args={[1.38, 0.03]} />
          <meshBasicMaterial color="#c2975d" toneMapped />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.82, 1.15, 0]} material={M.aluminium}>
            <boxGeometry args={[0.07, 2.05, 0.18]} />
          </mesh>
        ))}
        {/* transparent body with a compact illuminated message suspended in it */}
        <mesh position={[0, 1.48, -0.06]}>
          <boxGeometry args={[1.74, 0.92, 0.11]} />
          <meshPhysicalMaterial
            color="#b9d6d1"
            transparent
            opacity={0.16}
            roughness={0.18}
            metalness={0.05}
            clearcoat={1}
            clearcoatRoughness={0.08}
            depthWrite={false}
          />
        </mesh>
        <Screen
          media="entry-sign"
          width={1.46}
          height={0.63}
          position={[0, 1.48, 0.035]}
          pitch={1.2}
          brightness={1.18}
          range={70}
          frame={false}
          edge="#2f7a72"
          edgeWidth={0.05}
        />
        {/* and the same face on the reverse, for the walk back out */}
        <Screen
          media="entry-sign"
          width={1.46}
          height={0.63}
          position={[0, 1.48, -0.13]}
          rotation={[0, Math.PI, 0]}
          pitch={1.2}
          brightness={0.9}
          range={70}
          frame={false}
        />
        {/* the glass over it, and the light it stands in */}
        <mesh position={[0, 1.48, 0.075]}>
          <planeGeometry args={[1.76, 0.94]} />
          <meshPhysicalMaterial
            color="#cfe6e2"
            transparent
            opacity={0.07}
            roughness={0.08}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.05}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 1.96, 0.08]}>
          <planeGeometry args={[1.76, 0.02]} />
          <meshBasicMaterial color="#b8ded8" toneMapped />
        </mesh>
        <LightPool position={[0, 0.03, 0.6]} size={[6, 5]} color="#5fb0a6" opacity={0.22} pulse={0.3} />
        <pointLight position={[0, 1.5, 0.9]} intensity={7} distance={7} decay={2} color="#7fd0c4" />
      </group>

      {/* flanking LED blades */}
      {[-1, 1].map((side) => (
        <group key={`blade${side}`} position={[side * 8.2, 0, 2.4]}>
          <mesh position={[0, 0.12, 0]} material={M.anodised}>
            <boxGeometry args={[1.1, 0.24, 0.6]} />
          </mesh>
          <Screen
            media="entry-blade"
            width={1.15}
            height={6.4}
            position={[0, 3.5, 0.12]}
            pitch={1.5}
            brightness={1.0}
            range={50}
          />
          <ReflectionStreak
            position={[side * 0, 0.02, 2.6]}
            width={1.6}
            length={5}
            color="#4fbfb2"
            opacity={0.18}
          />
        </group>
      ))}

      <EntranceHall />

      {/* ── plaza ── */}
      {strips.map((z, i) => (
        <mesh key={`st${i}`} position={[0, 0.015, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[PORTAL_W + 3.4 + i * 0.9, 0.09]} />
          {/* warmer and brighter toward the arch: the strips are the only
              thing leading the eye across a very dark plaza */}
          <meshBasicMaterial color={i < 4 ? "#3d5c4f" : "#2a4a46"} toneMapped />
        </mesh>
      ))}

      {/* bollards guiding the approach */}
      {Array.from({ length: 12 }, (_, i) => {
        const z = 5 + Math.floor(i / 2) * 5.5;
        const side = i % 2 === 0 ? -1 : 1;
        return (
          <group key={`bo${i}`} position={[side * (PORTAL_W / 2 + 2.6 + Math.floor(i / 2) * 0.55), 0, z]}>
            <mesh position={[0, 0.45, 0]} material={M.anodised}>
              <cylinderGeometry args={[0.055, 0.07, 0.9, 8]} />
            </mesh>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.058, 0.058, 0.03, 8]} />
              <meshBasicMaterial color="#8a7340" toneMapped />
            </mesh>
          </group>
        );
      })}

      {/* the roof of the building, seen from outside */}
      <mesh position={[0, FACADE_H + 0.3, -9]} material={M.charcoal}>
        <boxGeometry args={[FACADE_W + 8, 0.6, 20]} />
      </mesh>

      {quality !== "low" && (
        <Haze
          count={7}
          area={[34, 5, 26]}
          position={[0, 3.4, 14]}
          color="#6f8894"
          opacity={0.014}
          scale={13}
          seed={5}
        />
      )}
    </group>
  );
}
