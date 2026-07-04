"use client";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { audio } from "../audio";
import { chapterT, signals, THEMES, useChapterActive, useExperience } from "../store";
import { STATS } from "@/content/site";

/**
 * Scene 5 — company achievements as holographic glass pillars.
 * Pillars rise as the chapter begins; hovering one expands it and
 * runs its counter + story. Stats are shared with the classic site
 * via src/content/site.ts.
 */

const CENTER_Z = -120;

function useCounter(target: number, active: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1400);
      setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);
  return n;
}

function Pillar({ stat, x, index }: { stat: (typeof STATS)[number]; x: number; index: number }) {
  const group = useRef<THREE.Group>(null);
  const glass = useRef<THREE.MeshPhysicalMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [inChapter, setInChapter] = useState(false);
  const count = useCounter(stat.value, inChapter);
  const th = THEMES[useExperience((s) => s.theme)];
  const labelOn = useChapterActive(0.52, 0.7);

  useFrame((state) => {
    if (!group.current) return;
    const t = chapterT(signals.progress, "stats");
    const rise = Math.min(1, Math.max(0, t * 3 - index * 0.4));
    const eased = 1 - Math.pow(1 - rise, 3);
    group.current.scale.y = Math.max(0.001, eased);
    group.current.position.y = 3.2 * eased * 0.5;
    const now = t > 0.15 && t < 1;
    if (now !== inChapter) setInChapter(now);
    if (glass.current) {
      glass.current.emissiveIntensity +=
        ((hovered ? 0.65 : 0.18) - glass.current.emissiveIntensity) * 0.1;
      glass.current.emissive.set(th.glow);
    }
    // hovered pillar leans slightly toward the visitor
    group.current.rotation.y +=
      ((hovered ? 0.12 : 0) + Math.sin(state.clock.elapsedTime * 0.4 + index) * 0.02 -
        group.current.rotation.y) * 0.08;
  });

  return (
    <group position={[x, 0, CENTER_Z]}>
      <group ref={group}>
        <mesh
          position={[0, 1.6, 0]}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); audio.blip(1); }}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[2.4, 6.4, 1.2]} />
          <meshPhysicalMaterial
            ref={glass}
            color="#9fd4cc"
            transparent
            opacity={0.18}
            roughness={0.15}
            metalness={0}
            emissive="#3fd6c8"
            emissiveIntensity={0.18}
          />
        </mesh>
        {/* base plinth */}
        <mesh position={[0, -1.5, 0]}>
          <boxGeometry args={[2.8, 0.35, 1.6]} />
          <meshStandardMaterial color="#182220" metalness={0.7} roughness={0.35} />
        </mesh>
        {labelOn && (
          <group position={[0, 2.2, 0.7]} scale={0.5}>
            <Html center transform style={{ pointerEvents: "none" }}>
              <div className={`lg-pillar ${hovered ? "is-open" : ""}`}>
                <div className="lg-pillar-value">
                  {count}
                  <span>{stat.suffix}</span>
                </div>
                <div className="lg-pillar-label">{stat.label}</div>
                <div className="lg-pillar-story">{stat.story}</div>
              </div>
            </Html>
          </group>
        )}
      </group>
    </group>
  );
}

export default function Pillars() {
  return (
    <group>
      {STATS.map((s, i) => (
        <Pillar key={s.label} stat={s} x={(i - 1.5) * 4.6} index={i} />
      ))}
      {/* holographic floor grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, CENTER_Z]}>
        <planeGeometry args={[40, 24, 20, 12]} />
        <meshBasicMaterial color="#1fa093" wireframe transparent opacity={0.14} toneMapped={false} />
      </mesh>
    </group>
  );
}
