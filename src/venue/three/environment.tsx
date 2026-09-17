"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { journey, show } from "../systems/journey";
import { zoneAt } from "../data/zones";
import { PAVILIONS, PARTNER_BAY } from "../data/pavilions";

/**
 * Lighting and reflection environment.
 *
 * A dark venue lives or dies on how metal and glass respond, so the scene gets
 * a real (if small) environment map — generated procedurally, so nothing is
 * downloaded. Direct light is deliberately scarce: a handful of fixtures that
 * travel with the camera and are re-coloured per zone, rather than hundreds of
 * static lights the GPU would have to evaluate everywhere at once.
 */

/** A dark room: cool ceiling wash, warm horizon bounce, near-black floor. */
function buildEnvTexture() {
  const w = 256;
  const h = 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, "#1a2427"); // ceiling
  g.addColorStop(0.35, "#10181a");
  g.addColorStop(0.52, "#1b1d1c"); // horizon
  g.addColorStop(0.7, "#090c0d");
  g.addColorStop(1.0, "#050708"); // floor
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Warm architectural sources around the horizon, plus one cool key.
  const blobs: [number, number, number, string][] = [
    [0.18, 0.44, 42, "rgba(150,118,84,0.26)"],
    [0.52, 0.40, 54, "rgba(110,160,158,0.2)"],
    [0.82, 0.47, 36, "rgba(140,112,86,0.2)"],
    [0.35, 0.16, 70, "rgba(96,128,138,0.18)"],
  ];
  for (const [x, y, r, col] of blobs) {
    const rg = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r);
    rg.addColorStop(0, col);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function VenueEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const src = buildEnvTexture();
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const rt = pmrem.fromEquirectangular(src);
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.62;
    src.dispose();
    pmrem.dispose();
    return () => {
      scene.environment = null;
      rt.dispose();
    };
  }, [gl, scene]);

  return null;
}

/* ── the travelling light rig ──────────────────────────── */

interface ZoneLight {
  /** key light colour */
  key: string;
  /** fill colour */
  fill: string;
  keyI: number;
  fillI: number;
  /** ambient level */
  amb: number;
  fog: string;
  fogDensity: number;
}

const LOOKS: Record<string, ZoneLight> = {
  arrival: { key: "#c8b391", fill: "#5b7e8c", keyI: 24, fillI: 16, amb: 0.16, fog: "#0a1013", fogDensity: 0.0068 },
  tunnel: { key: "#7fd0c4", fill: "#3e6f78", keyI: 7, fillI: 5, amb: 0.08, fog: "#050b0c", fogDensity: 0.010 },
  hall: { key: "#b7c3c6", fill: "#44646b", keyI: 34, fillI: 20, amb: 0.2, fog: "#070c0e", fogDensity: 0.0068 },
  gallery: { key: "#c4b69b", fill: "#476a72", keyI: 30, fillI: 19, amb: 0.19, fog: "#070c0e", fogDensity: 0.0072 },
  boulevard: { key: "#b8c0c3", fill: "#4c6874", keyI: 28, fillI: 18, amb: 0.18, fog: "#060b0d", fogDensity: 0.0076 },
  approach: { key: "#e0b47e", fill: "#4a6a76", keyI: 32, fillI: 18, amb: 0.17, fog: "#060a0c", fogDensity: 0.0082 },
  arena: { key: "#b9c6cc", fill: "#3f5f6a", keyI: 28, fillI: 18, amb: 0.14, fog: "#04080a", fogDensity: 0.0068 },
  stage: { key: "#cbd6da", fill: "#44636e", keyI: 24, fillI: 16, amb: 0.12, fog: "#04080a", fogDensity: 0.0064 },
  finale: { key: "#9fb0b6", fill: "#2f4a53", keyI: 11, fillI: 8, amb: 0.06, fog: "#020607", fogDensity: 0.008 },
  contact: { key: "#8fa5ab", fill: "#2a444c", keyI: 10, fillI: 7, amb: 0.06, fog: "#020607", fogDensity: 0.008 },
};

const FESTIVAL_OVERRIDE: Partial<ZoneLight> = {
  key: "#b678e0",
  fill: "#d4643f",
  keyI: 26,
  fillI: 20,
  amb: 0.07,
  fog: "#0a0410",
  fogDensity: 0.0105,
};

/**
 * Stalls need their own light, but nine point lights would be evaluated by
 * every shader in the venue. One fixture that moves to whichever pavilion the
 * visitor is closest to costs the same as one light and reads as nine.
 */
const STALLS = [...PAVILIONS, PARTNER_BAY].map((p) => ({
  p: p.p,
  x: p.side * 12.5,
  z: p.z,
  color: new THREE.Color(p.accent),
}));

const _blend: ZoneLight = { ...LOOKS.arena };
function blendLook(base: ZoneLight, over: Partial<ZoneLight>, f: number): ZoneLight {
  _blend.key = f > 0.5 ? (over.key ?? base.key) : base.key;
  _blend.fill = f > 0.5 ? (over.fill ?? base.fill) : base.fill;
  _blend.keyI = base.keyI + ((over.keyI ?? base.keyI) - base.keyI) * f;
  _blend.fillI = base.fillI + ((over.fillI ?? base.fillI) - base.fillI) * f;
  _blend.amb = base.amb + ((over.amb ?? base.amb) - base.amb) * f;
  _blend.fog = f > 0.5 ? (over.fog ?? base.fog) : base.fog;
  _blend.fogDensity = base.fogDensity + ((over.fogDensity ?? base.fogDensity) - base.fogDensity) * f;
  return _blend;
}

export function LightRig() {
  const scene = useThree((s) => s.scene);
  const stallRef = useRef<THREE.PointLight>(null);
  const keyRef = useRef<THREE.PointLight>(null);
  const fillRef = useRef<THREE.PointLight>(null);
  const rimRef = useRef<THREE.PointLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  const cur = useRef({
    key: new THREE.Color(LOOKS.arrival.key),
    fill: new THREE.Color(LOOKS.arrival.fill),
    keyI: LOOKS.arrival.keyI,
    fillI: LOOKS.arrival.fillI,
    amb: LOOKS.arrival.amb,
    fog: new THREE.Color(LOOKS.arrival.fog),
    fogDensity: LOOKS.arrival.fogDensity,
  });
  const targetKey = useMemo(() => new THREE.Color(), []);
  const targetFill = useMemo(() => new THREE.Color(), []);
  const targetFog = useMemo(() => new THREE.Color(), []);

  const fog = useMemo(() => new THREE.FogExp2(LOOKS.arrival.fog, LOOKS.arrival.fogDensity), []);
  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  useFrame(({ camera, clock }, dt) => {
    const d = Math.min(0.1, dt);
    const zone = zoneAt(journey.progress);
    const base = LOOKS[zone.id] ?? LOOKS.hall;
    // Blended, not switched: the room arrives at the festival look across the
    // cue, in step with the screens and the fixtures.
    const inRoom = zone.id === "stage" || zone.id === "arena" || zone.id === "finale";
    const f = inRoom ? show.mode : 0;
    const look = f > 0.001 ? blendLook(base, FESTIVAL_OVERRIDE, f) : base;

    // Finale dims the house — a real venue getting ready for the last cue.
    const finaleFade = zone.id === "finale" || zone.id === "contact" ? 1 : 0;

    targetKey.set(look.key);
    targetFill.set(look.fill);
    targetFog.set(look.fog);
    const k = Math.min(1, d * 1.6);
    cur.current.key.lerp(targetKey, k);
    cur.current.fill.lerp(targetFill, k);
    cur.current.fog.lerp(targetFog, k);
    // The house dips during a cue as well — the screens are not doing it alone.
    const dip = 1 - show.cue * 0.6;
    cur.current.keyI += (look.keyI * (1 - finaleFade * 0.55) * dip - cur.current.keyI) * k;
    cur.current.fillI += (look.fillI * (1 - finaleFade * 0.6) * dip - cur.current.fillI) * k;
    cur.current.amb += (look.amb - cur.current.amb) * k;
    cur.current.fogDensity += (look.fogDensity - cur.current.fogDensity) * k;

    fog.color.copy(cur.current.fog);
    fog.density = cur.current.fogDensity;

    const t = clock.elapsedTime;
    // Lights ride with the camera so the whole 375 m venue is lit by four
    // fixtures. A slow wander keeps the room from ever looking static.
    if (keyRef.current) {
      keyRef.current.color.copy(cur.current.key);
      keyRef.current.intensity = cur.current.keyI * (0.9 + 0.1 * Math.sin(t * 0.5));
      keyRef.current.position.set(
        camera.position.x + Math.sin(t * 0.18) * 3.5,
        camera.position.y + 4.4,
        camera.position.z - 7 + Math.sin(t * 0.13) * 1.6,
      );
    }
    if (fillRef.current) {
      fillRef.current.color.copy(cur.current.fill);
      fillRef.current.intensity = cur.current.fillI;
      fillRef.current.position.set(
        camera.position.x - Math.sin(t * 0.15) * 5,
        camera.position.y + 1.6,
        camera.position.z - 2.2,
      );
    }
    if (rimRef.current) {
      rimRef.current.color.copy(cur.current.key);
      rimRef.current.intensity = cur.current.keyI * 0.35;
      rimRef.current.position.set(camera.position.x, camera.position.y + 2.4, camera.position.z + 6);
    }
    // Feature light: snap to the nearest stall, fade with distance.
    if (stallRef.current) {
      let best = STALLS[0];
      let bestD = Infinity;
      for (const st of STALLS) {
        const d = Math.abs(journey.progress - st.p);
        if (d < bestD) {
          bestD = d;
          best = st;
        }
      }
      const near = Math.max(0, 1 - bestD / 0.03);
      stallRef.current.position.set(best.x, 4.2, best.z);
      stallRef.current.color.copy(best.color);
      stallRef.current.intensity = near * 78 * (0.9 + 0.1 * Math.sin(t * 0.8));
      stallRef.current.visible = near > 0.01;
    }

    if (ambRef.current) ambRef.current.intensity = cur.current.amb;
    if (hemiRef.current) {
      hemiRef.current.intensity = cur.current.amb * 2.1;
      hemiRef.current.color.copy(cur.current.fill);
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.14} color="#93a8ac" />
      <hemisphereLight ref={hemiRef} args={["#5b7d86", "#0c1113", 0.25]} />
      <pointLight ref={keyRef} distance={58} decay={2} intensity={26} />
      <pointLight ref={fillRef} distance={44} decay={2} intensity={14} />
      <pointLight ref={rimRef} distance={34} decay={2} intensity={8} />
      <pointLight ref={stallRef} distance={34} decay={2} intensity={0} visible={false} />
    </>
  );
}

/* ── light pools ───────────────────────────────────────── */

let poolTex: THREE.Texture | null = null;
export function getPoolTexture() {
  if (poolTex) return poolTex;
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.35, "rgba(255,255,255,0.28)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  poolTex = new THREE.CanvasTexture(c);
  poolTex.colorSpace = THREE.SRGBColorSpace;
  return poolTex;
}

/**
 * The pool of light a screen throws onto the floor. An additive decal costs
 * nothing, where a real light would cost every shader in the scene — and at
 * these angles it is indistinguishable.
 */
export function LightPool({
  position,
  rotation = [-Math.PI / 2, 0, 0],
  size = 6,
  color = "#7fd3c6",
  opacity = 0.16,
  pulse = 0,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: number | [number, number];
  color?: string;
  opacity?: number;
  pulse?: number;
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => getPoolTexture(), []);
  const [w, h] = Array.isArray(size) ? size : [size, size];

  useFrame(({ clock }) => {
    if (!mat.current || pulse === 0) return;
    mat.current.opacity = opacity * (1 - pulse + pulse * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 0.9)));
  });

  return (
    <mesh position={position} rotation={rotation} renderOrder={2}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        ref={mat}
        map={tex}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
