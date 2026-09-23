"use client";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVenue } from "../systems/store";
import { show } from "../systems/journey";

/**
 * Production hardware: truss, movers, rigging, haze.
 *
 * These are the objects that make an event engineer believe the room. Truss is
 * built from real chords and braces rather than a textured box; movers have a
 * yoke that pans and a head that tilts, because that is what sells motion; the
 * haze is what turns a beam into a visible shaft of light.
 */

type Vec3 = [number, number, number];

/* ── truss ─────────────────────────────────────────────── */

const CHORD_R = 0.025;
const BRACE_R = 0.016;

/**
 * A length of box truss. One instanced cylinder draws every chord and brace,
 * so a whole arena roof grid costs a handful of draw calls.
 */
export function Truss({
  length,
  size = 0.3,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  braceEvery = 0.5,
  color = "#9aa0a3",
}: {
  length: number;
  size?: number;
  position?: Vec3;
  rotation?: Vec3;
  braceEvery?: number;
  color?: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const transforms = useMemo(() => {
    const out: { pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3 }[] = [];
    const h = size / 2;
    const corners: [number, number][] = [
      [-h, -h],
      [h, -h],
      [-h, h],
      [h, h],
    ];
    const up = new THREE.Vector3(0, 1, 0);

    // chords run the length of the truss (local X)
    for (const [y, z] of corners) {
      const q = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(1, 0, 0));
      out.push({
        pos: new THREE.Vector3(0, y, z),
        quat: q,
        scale: new THREE.Vector3(1, length, 1),
      });
    }

    // diagonal braces on all four faces, alternating direction
    const n = Math.max(1, Math.floor(length / braceEvery));
    const step = length / n;
    const faces: [[number, number], [number, number]][] = [
      [[-h, -h], [h, -h]],
      [[-h, h], [h, h]],
      [[-h, -h], [-h, h]],
      [[h, -h], [h, h]],
    ];
    for (let i = 0; i < n; i++) {
      const x0 = -length / 2 + i * step;
      const x1 = x0 + step;
      for (let fi = 0; fi < faces.length; fi++) {
        const [aP, bP] = faces[fi];
        const flip = (i + fi) % 2 === 0;
        const a = new THREE.Vector3(flip ? x0 : x1, aP[0], aP[1]);
        const b = new THREE.Vector3(flip ? x1 : x0, bP[0], bP[1]);
        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(b, a);
        const len = dir.length();
        dir.normalize();
        out.push({
          pos: mid,
          quat: new THREE.Quaternion().setFromUnitVectors(up, dir),
          scale: new THREE.Vector3(BRACE_R / CHORD_R, len, BRACE_R / CHORD_R),
        });
      }
      // vertical ladder rungs
      const xm = x0 + step / 2;
      for (const [aP, bP] of faces) {
        const a = new THREE.Vector3(xm, aP[0], aP[1]);
        const b = new THREE.Vector3(xm, bP[0], bP[1]);
        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(b, a);
        const len = dir.length();
        dir.normalize();
        out.push({
          pos: mid,
          quat: new THREE.Quaternion().setFromUnitVectors(up, dir),
          scale: new THREE.Vector3(BRACE_R / CHORD_R, len, BRACE_R / CHORD_R),
        });
      }
    }
    return out;
  }, [length, size, braceEvery]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    transforms.forEach((t, i) => {
      m.compose(t.pos, t.quat, t.scale);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [transforms]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, transforms.length]}
      position={position}
      rotation={rotation}
      castShadow={false}
      receiveShadow={false}
      frustumCulled
    >
      <cylinderGeometry args={[CHORD_R, CHORD_R, 1, 6]} />
      <meshStandardMaterial color={color} roughness={0.42} metalness={0.92} />
    </instancedMesh>
  );
}

/* ── moving head ───────────────────────────────────────── */

export interface MoverProps {
  position: Vec3;
  color?: string;
  /** fixture index — drives its position in the chase */
  seed?: number;
  /** beam length in metres */
  reach?: number;
  intensity?: number;
  /** hangs upside down from truss (true) or stands on the deck */
  hanging?: boolean;
  beamAngle?: number;
  /** multiplier on beam visibility, for fixtures that are meant to be seen */
  beamGain?: number;
}

/**
 * A moving head with a real yoke. The beam is a cone with an additive falloff
 * — cheap, and with haze in the room it reads exactly like a hard-edge fixture
 * cutting through the air.
 */
export function MovingHead({
  position,
  color = "#cfe3ff",
  seed = 0,
  reach = 14,
  intensity = 1,
  hanging = true,
  beamAngle = 0.055,
  beamGain = 1,
}: MoverProps) {
  const yoke = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const quality = useVenue((s) => s.quality);

  const beamGeo = useMemo(() => {
    const r = Math.tan(beamAngle) * reach;
    const g = new THREE.ConeGeometry(r, reach, 18, 1, true);
    g.translate(0, -reach / 2, 0);
    return g;
  }, [reach, beamAngle]);
  useEffect(() => () => beamGeo.dispose(), [beamGeo]);

  const col = useMemo(() => new THREE.Color(color), [color]);
  const festivalCol = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // `show.mode` is the animated blend the cue drives, not the raw switch —
    // so the rig travels to its new position over the cue rather than snapping.
    const f = show.mode;
    const sp = 0.4 + f * 1.15;
    const spread = 0.34 + f * 0.66;
    // During the cue the fixtures move faster and further: a rig repositioning
    // between looks is the most visible part of a real mode change.
    const move = 1 + show.cue * 1.4;

    if (yoke.current) {
      yoke.current.rotation.y = Math.sin(t * sp * 0.6 * move + seed * 1.7) * spread * 1.6;
    }
    if (head.current) {
      head.current.rotation.x =
        (hanging ? 0 : Math.PI) + Math.sin(t * sp * 0.44 * move + seed * 2.3) * spread * 0.5;
    }
    if (beamMat.current) {
      // Festival strobes and chases; corporate breathes.
      const chase = Math.pow(0.5 + 0.5 * Math.sin(t * 5.2 + seed * 1.1), 1.6);
      const breathe = (0.55 + 0.25 * Math.sin(t * 0.7 + seed)) * 0.6;
      const on = breathe + (chase - breathe) * f;
      // `beamGain` is for fixtures meant to be *seen* as beams rather than
      // merely to light something. The fan of warm beams raking across the
      // stage array is a large part of the reference picture, and at the
      // default weight it was invisible from the hero position.
      beamMat.current.opacity =
        Math.min(0.16, on * 0.065 * intensity * beamGain) * (1 - show.cue * 0.75);

      if (f > 0.02) {
        festivalCol.set(seed % 3 < 1 ? "#f4a148" : "#6682d5");
        beamMat.current.color.copy(col).lerp(festivalCol, f);
      } else {
        beamMat.current.color.copy(col);
      }
    }
  });

  return (
    <group position={position} rotation={hanging ? [0, 0, 0] : [Math.PI, 0, 0]}>
      {/* base / clamp */}
      <mesh>
        <boxGeometry args={[0.26, 0.1, 0.26]} />
        <meshStandardMaterial color="#0e1112" roughness={0.5} metalness={0.8} />
      </mesh>
      <group ref={yoke} position={[0, -0.1, 0]}>
        {/* yoke arms */}
        <mesh position={[-0.14, -0.16, 0]}>
          <boxGeometry args={[0.05, 0.34, 0.12]} />
          <meshStandardMaterial color="#121617" roughness={0.45} metalness={0.85} />
        </mesh>
        <mesh position={[0.14, -0.16, 0]}>
          <boxGeometry args={[0.05, 0.34, 0.12]} />
          <meshStandardMaterial color="#121617" roughness={0.45} metalness={0.85} />
        </mesh>
        <group ref={head} position={[0, -0.28, 0]}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.12, 0.3, 12]} />
            <meshStandardMaterial color="#0d1011" roughness={0.4} metalness={0.9} />
          </mesh>
          {/* lens */}
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.095, 0.095, 0.02, 12]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          {(quality !== "low" || beamGain > 1.3) && (
            <mesh geometry={beamGeo} position={[0, -0.17, 0]} renderOrder={4}>
              <meshBasicMaterial
                ref={beamMat}
                color={color}
                transparent
                opacity={0.05}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

/* ── atmosphere ────────────────────────────────────────── */

const hazeTexture = (() => {
  let cached: THREE.Texture | null = null;
  return () => {
    if (cached) return cached;
    const size = 128;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(0.45, "rgba(255,255,255,0.14)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    cached = new THREE.CanvasTexture(c);
    cached.colorSpace = THREE.SRGBColorSpace;
    return cached;
  };
})();

/**
 * Drifting haze. Large soft billboards that keep moving whether or not the
 * visitor scrolls — the room is never allowed to look frozen.
 */
export function Haze({
  count = 14,
  area = [30, 8, 40] as Vec3,
  position = [0, 4, 0] as Vec3,
  color = "#9fb6bd",
  opacity = 0.05,
  scale = 14,
  seed = 1,
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const quality = useVenue((s) => s.quality);
  const n = quality === "low" ? Math.ceil(count * 0.4) : quality === "medium" ? Math.ceil(count * 0.7) : count;
  const tex = useMemo(() => hazeTexture(), []);
  const [aw, ah, ad] = area;

  // Deterministic placement rather than Math.random: the haze then looks the
  // same on every render, which matters for re-mounts and for comparing
  // screenshots between builds.
  const seeds = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const r = (k: number) => {
          const v = Math.sin((i + 1) * 12.9898 + k * 78.233 + seed * 3.77) * 43758.5453;
          return v - Math.floor(v);
        };
        return {
          x: (r(1) - 0.5) * aw,
          y: (r(2) - 0.5) * ah,
          z: (r(3) - 0.5) * ad,
          s: scale * (0.6 + r(4) * 0.9),
          ph: r(5) * Math.PI * 2,
          sp: 0.05 + r(6) * 0.1,
          i,
        };
      }),
    [n, aw, ah, ad, scale, seed],
  );

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, camera }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    q.copy(camera.quaternion); // billboard
    seeds.forEach((s, i) => {
      v.set(
        s.x + Math.sin(t * s.sp + s.ph) * 2.4,
        s.y + Math.sin(t * s.sp * 0.7 + s.ph * 1.7) * 0.7,
        s.z + Math.cos(t * s.sp * 0.6 + s.ph) * 2.0,
      );
      const pulse = 0.85 + 0.15 * Math.sin(t * 0.3 + s.ph);
      sc.setScalar(s.s * pulse);
      m.compose(v, q, sc);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, n]}
      position={position}
      frustumCulled={false}
      renderOrder={3}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={tex}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/* ── rigging hardware ──────────────────────────────────── */

export function HangPoint({ position, drop = 3 }: { position: Vec3; drop?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, -drop / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, drop, 5]} />
        <meshStandardMaterial color="#1a1e20" roughness={0.4} metalness={0.95} />
      </mesh>
      <mesh position={[0, -drop - 0.06, 0]}>
        <boxGeometry args={[0.1, 0.12, 0.1]} />
        <meshStandardMaterial color="#0f1314" roughness={0.5} metalness={0.85} />
      </mesh>
    </group>
  );
}

/** Line-array hang for the partner bay — recognisable silhouette, no branding. */
export function LineArray({ position, boxes = 8 }: { position: Vec3; boxes?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: boxes }, (_, i) => {
        const y = -i * 0.38;
        const splay = i * 0.045;
        return (
          <mesh key={i} position={[0, y, i * 0.05]} rotation={[splay, 0, 0]}>
            <boxGeometry args={[1.1, 0.34, 0.62]} />
            <meshStandardMaterial color="#0c0f10" roughness={0.72} metalness={0.25} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.0, 0.16, 0.5]} />
        <meshStandardMaterial color="#14181a" roughness={0.45} metalness={0.8} />
      </mesh>
    </group>
  );
}

export function SubStack({ position, count = 3 }: { position: Vec3; count?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[i * 1.15, 0.45, 0]}>
          <boxGeometry args={[1.1, 0.9, 1.05]} />
          <meshStandardMaterial color="#0a0d0e" roughness={0.75} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
