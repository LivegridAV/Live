"use client";
import { useMemo, useRef } from "react";
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
        {/* lintel above the portal */}
        <mesh position={[0, (FACADE_H + PORTAL_H) / 2, -0.5]} material={M.graphite}>
          <boxGeometry args={[PORTAL_W, FACADE_H - PORTAL_H, 1]} />
        </mesh>

        {/* portal reveal — brushed metal jamb catching light from inside */}
        {[-1, 1].map((side) => (
          <mesh key={`j${side}`} position={[side * (PORTAL_W / 2 + 0.12), PORTAL_H / 2, -0.5]} material={M.aluminium}>
            <boxGeometry args={[0.24, PORTAL_H, 1.1]} />
          </mesh>
        ))}
        <mesh position={[0, PORTAL_H + 0.12, -0.5]} material={M.aluminium}>
          <boxGeometry args={[PORTAL_W + 0.48, 0.24, 1.1]} />
        </mesh>

        {/* canopy */}
        <mesh position={[0, FACADE_H * 0.62, 3.2]} material={M.charcoal}>
          <boxGeometry args={[FACADE_W * 0.62, 0.55, 7.4]} />
        </mesh>
        {/* canopy underside light line */}
        <mesh position={[0, FACADE_H * 0.62 - 0.29, 3.2]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[FACADE_W * 0.5, 0.16]} />
          <meshBasicMaterial color="#6e5a3a" toneMapped />
        </mesh>

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
                <planeGeometry args={[0.07, FACADE_H - 3.2]} />
                <meshBasicMaterial color="#5c7f84" toneMapped />
              </mesh>
              {/* an uplight at the base, grazing the wall */}
              <mesh position={[x, 0.08, 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.5, 0.18]} />
                <meshBasicMaterial color="#b89a66" toneMapped />
              </mesh>
              <LightPool
                position={[x, FACADE_H * 0.42, 0.78]}
                rotation={[0, 0, 0]}
                size={[3.4, FACADE_H * 0.9]}
                color="#8f9e8a"
                opacity={0.09}
              />
            </group>
          );
        })}

        {/* a continuous cove along the top of the elevation */}
        <mesh position={[0, FACADE_H - 0.5, 0.55]}>
          <planeGeometry args={[FACADE_W - 1.2, 0.12]} />
          <meshBasicMaterial color="#7c8f94" toneMapped />
        </mesh>
      </group>

      {/* ── brand band above the doors ── */}
      <Screen
        media="entry-brand"
        width={12.6}
        height={2.1}
        position={[0, PORTAL_H + 2.6, 0.1]}
        pitch={1.9}
        brightness={1.05}
        range={70}
        frame={false}
      />
      <LightPool position={[0, 0.03, 4]} size={[16, 12]} color="#5fb8ad" opacity={0.1} pulse={0.4} />

      {/* wayfinding sign beside the entrance */}
      <Screen
        media="entry-sign"
        width={4.2}
        height={1.05}
        position={[-9.2, 2.6, 0.3]}
        pitch={1.5}
        brightness={0.9}
        range={45}
      />

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
          <meshBasicMaterial color="#20403e" toneMapped />
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
