"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperience } from "../store";

/**
 * Stage haze: billboarded sprites with a procedural soft-radial texture,
 * drifting from the smoke machines at the stage edges. The haze is also
 * what sells the light beams, so it defaults on.
 */

function makeSmokeTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(180,205,200,0.55)");
  g.addColorStop(0.45, "rgba(150,175,170,0.22)");
  g.addColorStop(1, "rgba(120,140,138,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface Puff {
  seed: number;
  speed: number;
  drift: number;
  scale: number;
}

export default function Smoke({ count = 34 }: { count?: number }) {
  const group = useRef<THREE.Group>(null);
  const texture = useMemo(() => makeSmokeTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  const puffs = useMemo<Puff[]>(
    () =>
      Array.from({ length: count }, () => ({
        seed: Math.random() * 100,
        speed: 0.15 + Math.random() * 0.25,
        drift: (Math.random() - 0.5) * 0.6,
        scale: 3 + Math.random() * 4,
      })),
    [count],
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const s = useExperience.getState();
    const on = s.powered && s.smoke;

    group.current.children.forEach((sprite, i) => {
      const p = puffs[i];
      const life = ((t * p.speed + p.seed) % 1 + 1) % 1; // 0..1 loop
      const side = p.seed % 2 > 1 ? 1 : -1;
      const spr = sprite as THREE.Sprite;
      // rises from a smoke machine at the stage edge, drifts inwards
      spr.position.set(
        side * (12 - life * 9) + Math.sin(t * 0.3 + p.seed) * 1.5 + p.drift * life * 8,
        1.5 + life * 8,
        3 + Math.sin(p.seed * 7) * 4,
      );
      const grow = p.scale * (0.6 + life * 1.3);
      spr.scale.set(grow, grow, 1);
      const mat = spr.material as THREE.SpriteMaterial;
      // fade in fast, out slow; whole system fades with the toggle
      const alpha = Math.min(life * 4, 1 - life) * 0.5;
      mat.opacity += ((on ? alpha : 0) - mat.opacity) * 0.04;
      mat.rotation = p.seed + t * 0.05 * (p.drift > 0 ? 1 : -1);
    });
  });

  return (
    <group ref={group}>
      {puffs.map((_, i) => (
        <sprite key={i}>
          <spriteMaterial
            map={texture}
            transparent
            opacity={0}
            depthWrite={false}
            color="#9fb8b2"
          />
        </sprite>
      ))}
    </group>
  );
}
