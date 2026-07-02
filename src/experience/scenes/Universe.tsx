"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { audio } from "../audio";
import { signals, THEMES, useExperience } from "../store";

/**
 * Scene 3 — the impossible world inside the LED wall.
 * One instanced particle field (thousands of glowing cubes) morphs between
 * formations: the LiveGridAV signal-grid logo by default, and short
 * "naked-eye 3D" demonstrations when a glass cube is clicked. The particles
 * also flee from the cursor, so the logo feels alive under the mouse.
 */

const CENTER = new THREE.Vector3(0, 4.5, -40);
const HEIGHTS = [2, 4, 3, 5, 4];
const tmpObj = new THREE.Object3D();
const tmpV = new THREE.Vector3();

export const DEMOS = [
  { id: 0, name: "Signal Logo", desc: "The grid, alive" },
  { id: 1, name: "Ocean Wave", desc: "Naked-eye water illusion" },
  { id: 2, name: "Energy Vortex", desc: "Portal animation" },
  { id: 3, name: "Product Reveal", desc: "Object leaving the screen" },
  { id: 4, name: "Hyper Cube", desc: "Floating cube illusion" },
] as const;

/** Build particle target positions for every formation up-front. */
function buildFormations(count: number) {
  const formations: Float32Array[] = [];

  // 0 — the 5×5 signal-grid logo, each lit cell a small cluster
  {
    const lit: [number, number][] = [];
    for (let col = 0; col < 5; col++)
      for (let row = 0; row < 5; row++)
        if (5 - row <= HEIGHTS[col]) lit.push([col, row]);
    const arr = new Float32Array(count * 3);
    const cellSize = 1.5;
    for (let i = 0; i < count; i++) {
      const [col, row] = lit[i % lit.length];
      arr[i * 3] = (col - 2) * cellSize + (Math.random() - 0.5) * 1.1;
      arr[i * 3 + 1] = (2 - row) * cellSize + (Math.random() - 0.5) * 1.1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 1.1;
    }
    formations.push(arr);
  }

  // 1 — ocean: wide plane (waves are added per-frame)
  {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = -2 + (Math.random() - 0.5) * 0.4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    formations.push(arr);
  }

  // 2 — vortex: spiral ring
  {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 14;
      const r = 2 + (i / count) * 3.5;
      arr[i * 3] = Math.cos(t) * r;
      arr[i * 3 + 1] = (i / count - 0.5) * 7;
      arr[i * 3 + 2] = Math.sin(t) * r;
    }
    formations.push(arr);
  }

  // 3 — product reveal: torus knot bursting forward
  {
    const arr = new Float32Array(count * 3);
    const p = 2, q = 3;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const r = 2.4 + Math.cos(q * t) * 0.9;
      arr[i * 3] = r * Math.cos(p * t) + (Math.random() - 0.5) * 0.3;
      arr[i * 3 + 1] = r * Math.sin(p * t) + (Math.random() - 0.5) * 0.3;
      arr[i * 3 + 2] = Math.sin(q * t) * 1.6 + 2.5; // pushed toward the viewer
    }
    formations.push(arr);
  }

  // 4 — hyper cube: particles on the edges of a large cube
  {
    const arr = new Float32Array(count * 3);
    const S = 3.2;
    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 12);
      const t = Math.random() * 2 - 1;
      const a = edge % 4 < 2 ? -1 : 1;
      const b = edge % 2 === 0 ? -1 : 1;
      const axis = Math.floor(edge / 4); // 0:x 1:y 2:z runs
      const p = [t, a, b];
      const x = p[(3 - axis) % 3], y = p[(4 - axis) % 3], z = p[(5 - axis) % 3];
      arr[i * 3] = x * S;
      arr[i * 3 + 1] = y * S;
      arr[i * 3 + 2] = z * S;
    }
    formations.push(arr);
  }

  return formations;
}

function ParticleField({ count }: { count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const formations = useMemo(() => buildFormations(count), [count]);
  const positions = useMemo(() => {
    // start scattered in a big shell so the logo assembles on entry
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(
        Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5,
      ).normalize().multiplyScalar(14 + Math.random() * 10);
      arr.set([v.x, v.y, v.z], i * 3);
    }
    return arr;
  }, [count]);
  const seeds = useMemo(
    () => Float32Array.from({ length: count }, () => Math.random() * 100),
    [count],
  );

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    const s = useExperience.getState();
    const demo = s.activeDemo ?? 0;
    const target = formations[demo];
    const k = Math.min(1, delta * 2.2); // convergence speed

    // cursor in scene-local space (approx): use pointer NDC mapped to room
    const cx = signals.pointerSmooth.x * 8;
    const cy = 0 + signals.pointerSmooth.y * 5;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      let tx = target[ix], ty = target[ix + 1], tz = target[ix + 2];

      // per-formation life
      if (demo === 1) {
        ty += Math.sin(tx * 0.7 + t * 2.1) * 0.9 + Math.sin(tz * 0.9 + t * 1.4) * 0.6;
      } else if (demo === 2) {
        const ang = t * 0.8;
        const x0 = tx, z0 = tz;
        tx = x0 * Math.cos(ang) - z0 * Math.sin(ang);
        tz = x0 * Math.sin(ang) + z0 * Math.cos(ang);
      } else if (demo === 4) {
        const sc = 1 + Math.sin(t * 1.2) * 0.18;
        tx *= sc; ty *= sc; tz *= sc;
      } else if (demo === 0) {
        // idle logo breathing + slight z shimmer
        tz += Math.sin(t * 1.5 + seeds[i]) * 0.25;
      }

      // gentle wander so nothing is ever frozen
      tx += Math.sin(t * 0.6 + seeds[i]) * 0.08;
      ty += Math.cos(t * 0.5 + seeds[i] * 1.3) * 0.08;

      let px = positions[ix] + (tx - positions[ix]) * k;
      let py = positions[ix + 1] + (ty - positions[ix + 1]) * k;
      const pz = positions[ix + 2] + (tz - positions[ix + 2]) * k;

      // particles avoid the cursor (logo formation only — demos stay solid)
      if (demo === 0) {
        const dx = px - cx, dy = py - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < 4) {
          const f = (2 - Math.sqrt(d2)) * 0.6;
          const inv = 1 / Math.max(0.2, Math.sqrt(d2));
          px += dx * inv * f;
          py += dy * inv * f;
        }
      }

      positions[ix] = px; positions[ix + 1] = py; positions[ix + 2] = pz;
      tmpObj.position.set(px, py, pz);
      const sc = 0.07 + 0.05 * Math.abs(Math.sin(seeds[i] + t));
      tmpObj.scale.setScalar(sc);
      tmpObj.rotation.set(seeds[i], seeds[i] * 2 + t * 0.4, 0);
      tmpObj.updateMatrix();
      mesh.current.setMatrixAt(i, tmpObj.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;

    const th = THEMES[s.theme];
    (mesh.current.material as THREE.MeshBasicMaterial).color.lerp(
      new THREE.Color(th.glow), 0.05,
    );
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} position={CENTER}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#3fd6c8" toneMapped={false} transparent opacity={0.9} />
    </instancedMesh>
  );
}

/** A floating glass cube that triggers a 10s naked-eye 3D demo. */
function DemoCube({
  demo, position,
}: {
  demo: (typeof DEMOS)[number];
  position: [number, number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const active = useExperience((s) => s.activeDemo) === demo.id;
  const setActiveDemo = useExperience((s) => s.setActiveDemo);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y =
      position[1] + Math.sin(t * 0.8 + position[0] * 2) * 0.35;
    group.current.rotation.y = t * 0.3 + position[0];
    group.current.rotation.x = Math.sin(t * 0.4 + position[2]) * 0.2;
    const target = hovered || active ? 1.35 : 1;
    group.current.scale.lerp(tmpV.setScalar(target), 0.1);
  });

  const th = THEMES[useExperience((s) => s.theme)];

  return (
    <group ref={group} position={position}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          audio.blip(1.1);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          audio.click(undefined, 1.2);
          setActiveDemo(demo.id);
          if (timer.current) clearTimeout(timer.current);
          // demos run 10 seconds, then the logo reassembles
          if (demo.id !== 0) {
            timer.current = setTimeout(
              () => useExperience.getState().setActiveDemo(0),
              10000,
            );
          }
        }}
      >
        <boxGeometry args={[0.9, 0.9, 0.9]} />
        <meshPhysicalMaterial
          color={hovered || active ? th.glow : "#8ab5ae"}
          metalness={0.1}
          roughness={0.05}
          transparent
          opacity={0.32}
          emissive={hovered || active ? th.glow : "#000000"}
          emissiveIntensity={hovered || active ? 0.7 : 0}
        />
      </mesh>
      {/* wireframe edge glow */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.9, 0.9, 0.9)]} />
        <lineBasicMaterial color={hovered || active ? th.glow : th.accent} toneMapped={false} />
      </lineSegments>
      {hovered && (
        <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
          <div className="lg-label">
            <span className="lg-label-name">{demo.name}</span>
            <span className="lg-label-role">{demo.desc}</span>
            {demo.id !== 0 && <span className="lg-label-hint">click to run · 10 s</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

/** Big drifting LED panels that frame the impossible room. */
function FloatingPanels() {
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);
  const panels = useMemo(
    () => [
      { pos: [-10, 6, -48], rot: [0, 0.7, 0.08], size: [7, 4] },
      { pos: [11, 3, -50], rot: [0, -0.6, -0.06], size: [6, 3.5] },
      { pos: [-7, 10, -55], rot: [0.2, 0.4, 0], size: [5, 3] },
      { pos: [8, 9, -46], rot: [-0.1, -0.4, 0.1], size: [4, 2.5] },
    ],
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const th = THEMES[useExperience.getState().theme];
    mats.current.forEach((m, i) => {
      if (!m) return;
      const pulse = 0.25 + 0.2 * Math.sin(t * 0.8 + i * 2);
      m.color.set(i % 2 ? th.accent : th.glow).multiplyScalar(pulse);
    });
  });

  return (
    <group>
      {panels.map((p, i) => (
        <mesh
          key={i}
          position={p.pos as [number, number, number]}
          rotation={p.rot as [number, number, number]}
        >
          <planeGeometry args={p.size as [number, number]} />
          <meshBasicMaterial
            ref={(m) => { if (m) mats.current[i] = m; }}
            toneMapped={false}
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Universe() {
  const quality = useExperience((s) => s.quality);
  return (
    <group>
      <ParticleField count={quality === "high" ? 5200 : 2200} />
      <FloatingPanels />
      {/* demo trigger cubes orbiting the logo */}
      <DemoCube demo={DEMOS[1]} position={[-7, 2.5, -33]} />
      <DemoCube demo={DEMOS[2]} position={[-3.5, 7.5, -34]} />
      <DemoCube demo={DEMOS[3]} position={[3.5, 1.8, -33.5]} />
      <DemoCube demo={DEMOS[4]} position={[7, 6.5, -34.5]} />
      <pointLight position={[0, 6, -34]} intensity={30} color="#3fd6c8" distance={30} />
    </group>
  );
}
