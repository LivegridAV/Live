"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { M } from "../three/materials";
import { Screen } from "../three/screens";
import { Haze } from "../three/rig";
import { LightPool } from "../three/environment";
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

/** The warm glow leaking out of the doors — the reason to walk in. */
function PortalGlow() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.5 + 0.16 * Math.sin(clock.elapsedTime * 0.55);
  });
  return (
    <mesh ref={ref} position={[0, PORTAL_H / 2, -1.2]} renderOrder={2}>
      <planeGeometry args={[PORTAL_W, PORTAL_H]} />
      <meshBasicMaterial
        color="#7c6a45"
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
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

        {/* vertical façade fins — architecture, not decoration */}
        {Array.from({ length: 10 }, (_, i) => {
          const x = (i - 4.5) * 3.9;
          if (Math.abs(x) < PORTAL_W / 2 + 1.6) return null;
          return (
            <mesh key={`fin${i}`} position={[x, FACADE_H / 2, 0.35]} material={M.charcoal}>
              <boxGeometry args={[0.35, FACADE_H - 0.6, 0.7]} />
            </mesh>
          );
        })}
      </group>

      {/* ── brand band above the doors ── */}
      <Screen
        media="entry-brand"
        width={12.6}
        height={2.1}
        position={[0, PORTAL_H + 2.6, 0.1]}
        pitch={5.2}
        brightness={1.15}
        range={70}
      />
      <LightPool position={[0, 0.03, 4]} size={[16, 12]} color="#5fb8ad" opacity={0.1} pulse={0.4} />

      {/* wayfinding sign beside the entrance */}
      <Screen
        media="entry-sign"
        width={4.2}
        height={1.05}
        position={[-9.2, 2.6, 0.3]}
        pitch={3.9}
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
            pitch={3.9}
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

      <PortalGlow />

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
