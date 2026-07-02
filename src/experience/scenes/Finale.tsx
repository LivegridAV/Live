"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audio } from "../audio";
import { chapterT, signals, THEMES, useExperience } from "../store";
import Stage from "./Stage";
import LedWall from "./LedWall";

/**
 * Scene 8 — the finale venue. A second stage, fully lit, where the
 * signal-grid logo rises from the deck while fireworks and confetti
 * celebrate overhead. Double-clicking anywhere launches more bursts.
 */

const CENTER_Z = -250;
const HEIGHTS = [2, 4, 3, 5, 4];
const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

/** The brand mark, built from physical glowing cells, rising from the stage. */
function RisingLogo() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cells = useMemo(() => {
    const out: { col: number; row: number; order: number }[] = [];
    for (let col = 0; col < 5; col++)
      for (let row = 0; row < 5; row++)
        if (5 - row <= HEIGHTS[col]) out.push({ col, row, order: col + (4 - row) });
    return out;
  }, []);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    const ft = chapterT(signals.progress, "finale");
    const th = THEMES[useExperience.getState().theme];
    const cell = 1.1;

    cells.forEach((c, i) => {
      // staggered diagonal rise — the brand's lgPop, in physical space
      const rise = Math.min(1, Math.max(0, ft * 4 - c.order * 0.25));
      const eased = 1 - Math.pow(1 - rise, 3);
      const targetY = 2.2 + (2 - c.row) * cell + 3;
      tmpObj.position.set(
        (c.col - 2) * cell,
        1.2 + (targetY - 1.2) * eased + Math.sin(t * 1.2 + c.order) * 0.06 * eased,
        CENTER_Z + 2,
      );
      const s = 0.45 * (0.2 + 0.8 * eased);
      tmpObj.scale.setScalar(Math.max(0.001, s));
      tmpObj.rotation.set(0, (1 - eased) * Math.PI, 0);
      tmpObj.updateMatrix();
      mesh.current!.setMatrixAt(i, tmpObj.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    (mesh.current.material as THREE.MeshBasicMaterial).color.lerp(
      tmpColor.set(th.glow), 0.06,
    );
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, cells.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#3fd6c8" toneMapped={false} />
    </instancedMesh>
  );
}

/** GPU-light fireworks: pooled bursts of instanced sparks. */
const BURSTS = 6;
const SPARKS = 90;

function Fireworks() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const bursts = useRef(
    Array.from({ length: BURSTS }, () => ({
      born: -100,
      origin: new THREE.Vector3(),
      color: new THREE.Color(),
      dirs: Array.from({ length: SPARKS }, () =>
        new THREE.Vector3(
          Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5,
        ).normalize().multiplyScalar(2 + Math.random() * 4),
      ),
    })),
  );
  const nextBurst = useRef(0);
  const lastAuto = useRef(0);
  const lastCounter = useRef(0);

  const launch = (time: number) => {
    const b = bursts.current[nextBurst.current % BURSTS];
    nextBurst.current++;
    b.born = time;
    b.origin.set(
      (Math.random() - 0.5) * 20,
      8 + Math.random() * 5,
      CENTER_Z + (Math.random() - 0.5) * 10,
    );
    const palette = ["#3fd6c8", "#e8b84a", "#e84ad4", "#7fb8ff", "#ff7a6a"];
    b.color.set(palette[Math.floor(Math.random() * palette.length)]);
    audio.firework();
  };

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    const s = useExperience.getState();
    const ft = chapterT(signals.progress, "finale");

    // auto-launch while the finale is on screen
    if (ft > 0.15 && ft < 1 && t - lastAuto.current > 1.6) {
      lastAuto.current = t;
      launch(t);
    }
    // manual launches (double-click easter egg, HUD button)
    if (s.fireworksBurst !== lastCounter.current) {
      lastCounter.current = s.fireworksBurst;
      launch(t);
    }

    let i = 0;
    for (const b of bursts.current) {
      const age = t - b.born;
      const alive = age >= 0 && age < 2.2;
      for (let k = 0; k < SPARKS; k++) {
        if (alive) {
          const d = b.dirs[k];
          tmpObj.position.set(
            b.origin.x + d.x * age * 2.2,
            b.origin.y + d.y * age * 2.2 - age * age * 1.6, // gravity
            b.origin.z + d.z * age * 2.2,
          );
          tmpObj.scale.setScalar(0.08 * (1 - age / 2.2));
        } else {
          tmpObj.scale.setScalar(0.0001);
          tmpObj.position.set(0, -50, CENTER_Z);
        }
        tmpObj.rotation.set(0, 0, 0);
        tmpObj.updateMatrix();
        mesh.current.setMatrixAt(i, tmpObj.matrix);
        mesh.current.setColorAt(i, alive ? b.color : tmpColor.set(0));
        i++;
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, BURSTS * SPARKS]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** Slow-falling confetti over the finale crowd area. */
function Confetti({ count = 260 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 30,
        z: CENTER_Z + (Math.random() - 0.5) * 20 + 6,
        speed: 0.35 + Math.random() * 0.5,
        phase: Math.random() * 100,
        hue: Math.random(),
      })),
    [count],
  );

  useEffect(() => {
    if (!mesh.current) return;
    const palette = ["#3fd6c8", "#e8b84a", "#e84ad4", "#f4f6f5", "#1fa093"];
    seeds.forEach((s, i) =>
      mesh.current!.setColorAt(i, tmpColor.set(palette[Math.floor(s.hue * palette.length)])),
    );
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [seeds]);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    const ft = chapterT(signals.progress, "finale");
    seeds.forEach((s, i) => {
      const y = 14 - ((t * s.speed + s.phase) % 14);
      tmpObj.position.set(
        s.x + Math.sin(t * 1.1 + s.phase) * 1.2,
        y,
        s.z,
      );
      tmpObj.rotation.set(t * 2 + s.phase, t * 1.4, s.phase);
      tmpObj.scale.setScalar(ft > 0.1 ? 1 : 0.0001);
      tmpObj.updateMatrix();
      mesh.current!.setMatrixAt(i, tmpObj.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <planeGeometry args={[0.09, 0.14]} />
      <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

export default function Finale() {
  return (
    <group>
      {/* the venue again — this time it's all celebration */}
      <group position={[0, 0, CENTER_Z]}>
        <Stage variant="finale" />
      </group>
      <LedWall position={[0, 6, CENTER_Z]} size={[19.2, 10.8]} main={false} />
      <RisingLogo />
      <Fireworks />
      <Confetti />
      <pointLight position={[0, 8, CENTER_Z + 12]} intensity={30} color="#3fd6c8" distance={40} />
    </group>
  );
}
