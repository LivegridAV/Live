"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { signals, THEMES, useExperience } from "../store";

/**
 * The light rig: mouse-tracking moving heads on the roof truss, two warm
 * follow spots on the towers, laser fans, and the audience wash.
 * Beams are open cones with an additive shader that fades along the throw
 * and at the edges — cheap volumetrics that read like haze-filled light.
 */

const beamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragment = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uIntensity;
  void main() {
    // vUv.y: 1 at the fixture, 0 at the throw end
    float len = pow(vUv.y, 1.6);
    // soft edges around the cone seam
    float edge = sin(vUv.x * 3.14159);
    float a = len * (0.25 + 0.75 * edge) * uIntensity;
    gl_FragColor = vec4(uColor, a * 0.35);
  }
`;

function useBeamMaterial(color: string) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: 1 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      } as THREE.ShaderMaterialParameters),
    [color],
  );
}

const DOWN = new THREE.Vector3(0, -1, 0);
const tmpDir = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpTarget = new THREE.Vector3();

/** Beams dim as the camera dives into the LED wall so pixels stay readable. */
function stageFade(): number {
  return 1 - THREE.MathUtils.clamp((signals.progress - 0.13) / 0.09, 0, 1);
}

/** One moving-head fixture: body + yoke + volumetric beam cone. */
function MovingHead({
  x,
  phase,
  material,
}: {
  x: number;
  phase: number;
  material: THREE.ShaderMaterial;
}) {
  const beam = useRef<THREE.Group>(null);
  const origin = useMemo(() => new THREE.Vector3(x, 12.1, 0), [x]);

  useFrame((state) => {
    if (!beam.current) return;
    const t = state.clock.elapsedTime;
    const s = useExperience.getState();

    // resting scan pattern — lazy figure-eights over the crowd
    const scanX = Math.sin(t * 0.45 + phase) * 14;
    const scanZ = 12 + Math.sin(t * 0.3 + phase * 2.1) * 8;

    // mouse target on the floor plane — beams chase the visitor's cursor
    const mx = signals.pointerSmooth.x * 16;
    const mz = 10 + signals.pointerSmooth.y * -8;
    const chase = 0.55; // blend: still feels alive, not glued to the cursor

    tmpTarget.set(
      scanX + (mx - scanX) * chase,
      0,
      scanZ + (mz - scanZ) * chase,
    );
    tmpDir.subVectors(tmpTarget, origin).normalize();
    tmpQuat.setFromUnitVectors(DOWN, tmpDir);
    beam.current.quaternion.slerp(tmpQuat, 0.08);

    const on = s.powered && s.stageLights ? stageFade() : 0;
    material.uniforms.uIntensity.value +=
      (on - material.uniforms.uIntensity.value) * 0.08;
  });

  return (
    <group position={[x, 12.1, 0]}>
      {/* yoke + body */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.3]} />
        <meshStandardMaterial color="#151d1b" roughness={0.6} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.14, 0.2, 0.5, 8]} />
        <meshStandardMaterial color="#0e1513" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* beam — cone apex at the fixture, widening over 24m */}
      <group ref={beam}>
        <mesh position={[0, -12, 0]} material={material}>
          <coneGeometry args={[2.2, 24, 24, 1, true]} />
        </mesh>
        {/* hot lens dot */}
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color="#c8fff8" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** Fan of laser lines from a tower, sweeping + reacting to the cursor. */
function LaserFan({ x }: { x: number }) {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  const COUNT = 9;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const s = useExperience.getState();
    const th = THEMES[s.theme];
    const on = s.powered && s.lasers;

    // fan opens/closes rhythmically; cursor x skews the whole fan
    const spread = 0.5 + 0.35 * Math.sin(t * 0.7 + x);
    const skew = signals.pointerSmooth.x * 0.5;
    group.current.children.forEach((child, i) => {
      const f = (i / (COUNT - 1) - 0.5) * 2;
      child.rotation.z = (Math.sign(x) * Math.PI) / 2.6 + f * spread + skew;
      child.rotation.x = Math.sin(t * 0.9 + i) * 0.12;
    });
    const fade = stageFade();
    mats.current.forEach((m, i) => {
      if (!m) return;
      const target = on ? (0.5 + 0.5 * Math.sin(t * 6 + i * 2)) * fade : 0;
      m.opacity += (target * 0.75 - m.opacity) * 0.15;
      m.color.set(th.glow);
    });
  });

  return (
    <group position={[x, 10.5, 0.5]} ref={group}>
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i}>
          <mesh position={[0, 30, 0]}>
            <boxGeometry args={[0.035, 60, 0.035]} />
            <meshBasicMaterial
              ref={(m) => {
                if (m) mats.current[i] = m;
              }}
              color="#3fd6c8"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Warm follow spot from a tower, wandering around center stage. */
function FollowSpot({ x }: { x: number }) {
  const beam = useRef<THREE.Group>(null);
  const material = useBeamMaterial("#ffd9a0");
  const origin = useMemo(() => new THREE.Vector3(x, 11, 1), [x]);

  useFrame((state) => {
    if (!beam.current) return;
    const t = state.clock.elapsedTime;
    const s = useExperience.getState();
    tmpTarget.set(Math.sin(t * 0.4 + x) * 4, 1.4, 2 + Math.cos(t * 0.33) * 1.5);
    tmpDir.subVectors(tmpTarget, origin).normalize();
    tmpQuat.setFromUnitVectors(DOWN, tmpDir);
    beam.current.quaternion.slerp(tmpQuat, 0.05);
    const on = s.powered && s.stageLights ? 0.7 * stageFade() : 0;
    material.uniforms.uIntensity.value +=
      (on - material.uniforms.uIntensity.value) * 0.06;
  });

  return (
    <group position={[x, 11, 1]}>
      <mesh rotation={[0, 0, Math.sign(x) * 0.4]}>
        <cylinderGeometry args={[0.12, 0.18, 0.8, 8]} />
        <meshStandardMaterial color="#131b19" roughness={0.5} metalness={0.5} />
      </mesh>
      <group ref={beam}>
        <mesh position={[0, -7, 0]} material={material}>
          <coneGeometry args={[1.1, 14, 20, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}

/** Wide, dim wash cones over the audience — the "audience lights" toggle. */
function AudienceWash() {
  const material = useBeamMaterial("#7fe8dd");
  useFrame(() => {
    const s = useExperience.getState();
    const on = s.powered && s.audienceLights ? 0.35 * stageFade() : 0;
    material.uniforms.uIntensity.value +=
      (on - material.uniforms.uIntensity.value) * 0.05;
    material.uniforms.uColor.value.set(THEMES[s.theme].glow);
  });
  return (
    <group>
      {[-8, -2.5, 2.5, 8].map((x) => (
        <group key={x} position={[x, 12.6, 0.4]} rotation={[0.5, 0, 0]}>
          <mesh position={[0, -9, 0]} material={material}>
            <coneGeometry args={[4.5, 18, 20, 1, true]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function Beams() {
  const theme = useExperience((s) => s.theme);
  const beamMat = useBeamMaterial(THEMES[theme].glow);
  const beamMatB = useBeamMaterial(THEMES[theme].accent);
  const quality = useExperience((s) => s.quality);
  const headCount = quality === "high" ? 8 : 5;

  useFrame(() => {
    const th = THEMES[useExperience.getState().theme];
    beamMat.uniforms.uColor.value.lerp(new THREE.Color(th.glow), 0.05);
    beamMatB.uniforms.uColor.value.lerp(new THREE.Color(th.accent), 0.05);
  });

  return (
    <group>
      {Array.from({ length: headCount }, (_, i) => {
        const x = -10.5 + (21 / (headCount - 1)) * i;
        return (
          <MovingHead
            key={i}
            x={x}
            phase={i * 1.7}
            material={i % 2 ? beamMat : beamMatB}
          />
        );
      })}
      <LaserFan x={-11} />
      <LaserFan x={11} />
      <FollowSpot x={-11} />
      <FollowSpot x={11} />
      <AudienceWash />
    </group>
  );
}
