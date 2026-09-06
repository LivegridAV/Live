"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { signals, THEMES, useExperience } from "../store";

/**
 * The cosmos around the venue — a persistent, layered deep-space backdrop
 * for the whole journey.
 *
 * Depth comes from parallax: every layer trails the camera's z by a
 * different factor (foreground dust 0.8 → near stars 0.88 → deep shell
 * 0.96 → planet 0.99), so travel reads as motion through space. Stars are
 * a custom point shader with blackbody colour temperatures, a realistic
 * magnitude spread, scintillation and diffraction spikes on the bright
 * ones; half the deep shell is concentrated into a tilted Milky Way band
 * with dust sprites. A ringed gas giant and a sun (which drives the
 * planet's terminator and the satellite's glints) anchor the scene, and a
 * detailed satellite tumbles slowly overhead. Ship traffic lanes and the
 * satellite's path sit outside the |x| < 20, y < 14 corridor the rooms
 * occupy, so nothing ever flies through a scene.
 *
 * Everything ignores scene fog (the fog is the venue's haze; the sky
 * behind it stays crisp) and fades in with power-on.
 */

const tmpColor = new THREE.Color();
const tmpV1 = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpV3 = new THREE.Vector3();

/** Direction toward the sun (world space) — keep in sync with SUN_POS. */
const SUN_DIR = new THREE.Vector3(0.94, 0.32, 0.1).normalize();
/** Sun sprite position, camera-relative. */
const SUN_POS: [number, number, number] = [42, 46, -95];

/* Milky Way band basis: a tilted great circle through the star shell. */
const BAND_N = new THREE.Vector3(0.32, 0.86, 0.4).normalize();
const BAND_U = new THREE.Vector3()
  .crossVectors(BAND_N, new THREE.Vector3(0, 0, 1))
  .normalize();
const BAND_V = new THREE.Vector3().crossVectors(BAND_N, BAND_U).normalize();

/** 0 → 1 in the seconds after the venue powers on. */
function powerFade(t: number) {
  if (signals.poweredAt <= 0) return 0;
  return Math.min(1, Math.max(0, (t - signals.poweredAt - 0.6) / 2.5));
}

/** Approximate gaussian in [-1.5, 1.5]. */
function gauss() {
  return Math.random() + Math.random() + Math.random() - 1.5;
}

/* ── Procedural textures ───────────────────────────────────────────── */

function makeRadialTexture(size: number, stops: [number, string][]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function makeStreakTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 8;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,244,224,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 8);
  // vertical falloff so the streak has no hard edges
  const vg = ctx.createLinearGradient(0, 0, 0, 8);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(0.5, "rgba(0,0,0,1)");
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 256, 8);
  return new THREE.CanvasTexture(canvas);
}

/** Banded gas-giant surface in deep slate/teal tones. */
function makePlanetTexture() {
  const w = 512, h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const bands = ["#101f27", "#1a3a42", "#0d1d22", "#255258", "#1c3d47", "#12262c"];
  for (let y = 0; y < h; y++) {
    const n =
      Math.sin(y * 0.11) * 1.6 +
      Math.sin(y * 0.041 + 2.4) * 2.2 +
      Math.sin(y * 0.23 + 5.1) * 0.7;
    const idx = Math.abs(Math.round(y * 0.06 + n)) % bands.length;
    ctx.fillStyle = bands[idx];
    ctx.fillRect(0, y, w, 1);
    // horizontal turbulence streaks
    ctx.fillStyle = "rgba(120,180,180,0.05)";
    const sx = (Math.sin(y * 0.7) * 0.5 + 0.5) * w;
    ctx.fillRect(sx, y, 30 + Math.sin(y * 1.3) * 25, 1);
  }
  // storm ovals
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * w;
    const y = h * (0.2 + Math.random() * 0.6);
    const rx = 8 + Math.random() * 26;
    ctx.fillStyle = Math.random() > 0.5
      ? "rgba(150,210,205,0.10)"
      : "rgba(6,14,16,0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

/** Concentric translucent rings (planar map for RingGeometry). */
function makeRingTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  // geometry inner radius 34 / outer 46 → 94..128 px in texture space
  for (let r = 94; r < 128; r += 0.5) {
    const t = (r - 94) / 34;
    let a =
      0.1 +
      0.22 * Math.abs(Math.sin(t * 21)) * (1 - t * 0.4) +
      0.12 * Math.sin(t * 47 + 2);
    if (t > 0.55 && t < 0.64) a *= 0.12; // Cassini-like gap
    ctx.strokeStyle = `rgba(196,208,204,${Math.max(0, a)})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

/** Cratered rocky surface for the moons. */
function makeMoonTexture() {
  const w = 256, h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8e918f";
  ctx.fillRect(0, 0, w, h);
  // regolith mottling
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = Math.random() > 0.5
      ? `rgba(200,203,200,${0.04 + Math.random() * 0.08})`
      : `rgba(60,63,62,${0.04 + Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 1 + Math.random() * 3);
  }
  // dark maria patches
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = "rgba(70,74,73,0.35)";
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * w, Math.random() * h,
      12 + Math.random() * 26, 8 + Math.random() * 16,
      Math.random() * Math.PI, 0, Math.PI * 2,
    );
    ctx.fill();
  }
  // craters: dark floor + bright rim
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = 1.5 + Math.random() * 6;
    ctx.fillStyle = "rgba(52,56,55,0.55)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(215,218,215,0.4)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI * 0.9, Math.PI * 0.1);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

/** Crinkled gold MLI foil for the satellite bus. */
function makeFoilTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#a8842f";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 520; i++) {
    ctx.fillStyle = Math.random() > 0.5
      ? `rgba(238,204,110,${0.1 + Math.random() * 0.22})`
      : `rgba(96,70,20,${0.1 + Math.random() * 0.22})`;
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.ellipse(
      x, y,
      1 + Math.random() * 7, 1 + Math.random() * 3,
      Math.random() * Math.PI, 0, Math.PI * 2,
    );
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

/** Photovoltaic cell grid for the solar arrays. */
function makePanelTexture() {
  const w = 256, h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#94a6b8";
  ctx.fillRect(0, 0, w, h);
  const cell = 16;
  for (let x = 1; x < w / cell; x++) {
    for (let y = 1; y < h / cell - 1; y++) {
      const v = 18 + Math.random() * 14;
      ctx.fillStyle = `rgb(${8 + v * 0.3},${14 + v * 0.8},${30 + v * 1.6})`;
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      // cell highlight
      ctx.fillStyle = "rgba(160,200,255,0.12)";
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, 2);
    }
  }
  return new THREE.CanvasTexture(canvas);
}

/* ── Star shader ───────────────────────────────────────────────────── */

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  varying vec3 vColor;
  varying float vBig;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // scintillation — each star twinkles at its own rate
    float tw = 0.78 + 0.22 * sin(uTime * (0.4 + fract(aSeed * 0.13) * 1.7) + aSeed);
    vBig = step(1.9, aSize);
    gl_PointSize = aSize * tw * (340.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAG = /* glsl */ `
  uniform float uFade;
  varying vec3 vColor;
  varying float vBig;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    float core = smoothstep(1.0, 0.0, d);
    core *= core;
    // diffraction spikes on the brightest stars only
    float spikes = (max(0.0, 1.0 - abs(uv.x) * 14.0) + max(0.0, 1.0 - abs(uv.y) * 14.0))
      * smoothstep(1.0, 0.2, d) * 0.35 * vBig;
    float a = (core + spikes) * uFade;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

/* Blackbody-ish palette, weighted toward the middle classes. */
const STAR_PALETTE: [string, number][] = [
  ["#9db4ff", 0.06], // O/B blue
  ["#c7d8ff", 0.16], // A blue-white
  ["#eef1ff", 0.26], // F white
  ["#fff6e8", 0.24], // G warm white
  ["#ffe9c4", 0.16], // K pale orange
  ["#ffd2a1", 0.08],
  ["#ffb56b", 0.04], // M orange-red
];

function pickStarColor() {
  let x = Math.random();
  for (const [hex, w] of STAR_PALETTE) {
    if (x < w) return hex;
    x -= w;
  }
  return "#fff6e8";
}

interface StarData {
  pos: Float32Array;
  col: Float32Array;
  size: Float32Array;
  seed: Float32Array;
}

function buildStars(
  count: number,
  rMin: number,
  rMax: number,
  bandFrac: number,
  sizeMin: number,
  sizeMax: number,
  brightFrac: number,
): StarData {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const inBand = i < count * bandFrac;
    if (inBand) {
      const th = Math.random() * Math.PI * 2;
      const r = rMin + Math.random() * (rMax - rMin);
      tmpV1
        .copy(BAND_U).multiplyScalar(Math.cos(th) * r)
        .addScaledVector(BAND_V, Math.sin(th) * r)
        .addScaledVector(BAND_N, gauss() * 9);
    } else {
      tmpV1
        .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .normalize()
        .multiplyScalar(rMin + Math.pow(Math.random(), 0.6) * (rMax - rMin));
    }
    pos.set([tmpV1.x, tmpV1.y, tmpV1.z], i * 3);

    // magnitude spread: many dim, few bright
    const m = Math.pow(Math.random(), 2.2);
    const bright = Math.random() < brightFrac;
    size[i] = bright
      ? sizeMax + Math.random() * sizeMax * 0.5
      : sizeMin + m * (sizeMax - sizeMin);

    tmpColor
      .set(pickStarColor())
      .multiplyScalar((inBand ? 0.4 : 0.5) + m * 0.55 + (bright ? 0.35 : 0));
    col.set([tmpColor.r, tmpColor.g, tmpColor.b], i * 3);
    seed[i] = Math.random() * 100;
  }
  return { pos, col, size, seed };
}

function StarLayer({
  count, rMin, rMax, bandFrac, follow, sizeMin, sizeMax, brightFrac, spin,
}: {
  count: number;
  rMin: number;
  rMax: number;
  bandFrac: number;
  follow: number;
  sizeMin: number;
  sizeMax: number;
  brightFrac: number;
  spin: number;
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const data = useMemo(
    () => buildStars(count, rMin, rMax, bandFrac, sizeMin, sizeMax, brightFrac),
    [count, rMin, rMax, bandFrac, sizeMin, sizeMax, brightFrac],
  );
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uFade: { value: 0 } }),
    [],
  );

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.position.set(
        camera.position.x,
        camera.position.y,
        camera.position.z * follow,
      );
      group.current.rotation.y = t * spin;
      group.current.rotation.z = t * spin * 0.4;
    }
    if (mat.current) {
      mat.current.uniforms.uTime.value = t;
      // the opening is an enclosed venue — keep the sky almost black, then let
      // the starfield swell as the camera dives toward/through the wall
      const enclose = THREE.MathUtils.clamp((signals.progress - 0.08) / 0.11, 0.0, 1);
      mat.current.uniforms.uFade.value = powerFade(t) * enclose;
    }
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[data.col, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[data.size, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[data.seed, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={mat}
          vertexShader={STAR_VERT}
          fragmentShader={STAR_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/* ── Milky Way dust + distant galaxies ─────────────────────────────── */

function MilkyDust({ quality }: { quality: "high" | "low" }) {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<(THREE.SpriteMaterial | null)[]>([]);
  const tex = useMemo(
    () => makeRadialTexture(128, [
      [0, "rgba(255,255,255,0.65)"],
      [0.45, "rgba(255,255,255,0.2)"],
      [1, "rgba(255,255,255,0)"],
    ]),
    [],
  );
  const sprites = useMemo(() => {
    const list: { pos: [number, number, number]; scale: [number, number]; opacity: number; tint: string }[] = [];
    const n = quality === "high" ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2 + 0.4;
      tmpV1
        .copy(BAND_U).multiplyScalar(Math.cos(th) * 102)
        .addScaledVector(BAND_V, Math.sin(th) * 102)
        .addScaledVector(BAND_N, gauss() * 5);
      list.push({
        pos: [tmpV1.x, tmpV1.y, tmpV1.z],
        scale: [42 + Math.random() * 34, 20 + Math.random() * 16],
        opacity: 0.011 + Math.random() * 0.012,
        tint: i % 3 === 0 ? "#9fb4ad" : "#8ba0a6",
      });
    }
    // a few distant galaxies off the band
    for (let i = 0; i < (quality === "high" ? 3 : 2); i++) {
      tmpV1
        .set(Math.random() - 0.5, Math.random() * 0.5 + 0.1, Math.random() - 0.5)
        .normalize()
        .multiplyScalar(108);
      list.push({
        pos: [tmpV1.x, tmpV1.y, tmpV1.z],
        scale: [8 + Math.random() * 5, 3 + Math.random() * 2],
        opacity: 0.07,
        tint: "#c3d2dc",
      });
    }
    return list;
  }, [quality]);

  useFrame(({ camera, clock }) => {
    if (group.current) {
      group.current.position.set(
        camera.position.x,
        camera.position.y,
        camera.position.z * 0.96,
      );
    }
    const fade = powerFade(clock.elapsedTime);
    mats.current.forEach((m, i) => {
      if (m) m.opacity = fade * sprites[i].opacity;
    });
  });

  return (
    <group ref={group}>
      {sprites.map((s, i) => (
        <sprite key={i} position={s.pos} scale={[s.scale[0], s.scale[1], 1]}>
          <spriteMaterial
            ref={(m) => { mats.current[i] = m; }}
            map={tex}
            color={s.tint}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
            rotation={Math.random() * Math.PI}
          />
        </sprite>
      ))}
    </group>
  );
}

/* ── Foreground dust motes (strong parallax) ───────────────────────── */

function DustMotes({ count }: { count: number }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const tex = useMemo(
    () => makeRadialTexture(64, [
      [0, "rgba(255,255,255,0.9)"],
      [1, "rgba(255,255,255,0)"],
    ]),
    [],
  );
  const pos = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      tmpV1
        .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .normalize()
        .multiplyScalar(30 + Math.random() * 25);
      arr.set([tmpV1.x, tmpV1.y, tmpV1.z], i * 3);
    }
    return arr;
  }, [count]);

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.position.set(
        camera.position.x,
        camera.position.y,
        camera.position.z * 0.8,
      );
      group.current.rotation.y = t * 0.006;
    }
    if (mat.current) mat.current.opacity = powerFade(t) * 0.018;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={mat}
          map={tex}
          color="#aebfba"
          size={2.2}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </points>
    </group>
  );
}

/* ── Nebulae (theme-tinted, the one brand moment in the sky) ───────── */

interface NebulaSpec {
  pos: [number, number, number];
  scale: number;
  tint: "accent" | "glow" | "warm";
  opacity: number;
  spin: number;
}

const NEBULAE: NebulaSpec[] = [
  { pos: [-70, 32, -60], scale: 95, tint: "glow", opacity: 0.038, spin: 0.01 },
  { pos: [66, 22, -92], scale: 110, tint: "accent", opacity: 0.032, spin: -0.008 },
  { pos: [4, 58, -40], scale: 80, tint: "glow", opacity: 0.026, spin: 0.006 },
  { pos: [-42, -28, -108], scale: 100, tint: "warm", opacity: 0.012, spin: -0.005 },
  { pos: [82, -12, 28], scale: 85, tint: "accent", opacity: 0.022, spin: 0.009 },
];

function Nebulae({ quality }: { quality: "high" | "low" }) {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<(THREE.SpriteMaterial | null)[]>([]);
  const list = quality === "high" ? NEBULAE : NEBULAE.slice(0, 3);
  const tex = useMemo(
    () => makeRadialTexture(256, [
      [0, "rgba(255,255,255,0.8)"],
      [0.4, "rgba(255,255,255,0.26)"],
      [1, "rgba(255,255,255,0)"],
    ]),
    [],
  );

  useFrame(({ camera, clock }, delta) => {
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.position.set(
        camera.position.x,
        camera.position.y,
        camera.position.z * 0.96,
      );
    }
    const fade = powerFade(t);
    const th = THEMES[useExperience.getState().theme];
    list.forEach((n, i) => {
      const m = mats.current[i];
      if (!m) return;
      m.rotation += n.spin * delta;
      m.color.lerp(tmpColor.set(th[n.tint]), 0.03);
      m.opacity = fade * n.opacity;
    });
  });

  return (
    <group ref={group}>
      {list.map((n, i) => (
        <sprite key={i} position={n.pos} scale={[n.scale, n.scale * 0.75, 1]}>
          <spriteMaterial
            ref={(m) => { mats.current[i] = m; }}
            map={tex}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </sprite>
      ))}
    </group>
  );
}

/* ── The sun ───────────────────────────────────────────────────────── */

function Sun() {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<(THREE.SpriteMaterial | null)[]>([]);
  const coreTex = useMemo(
    () => makeRadialTexture(128, [
      [0, "rgba(255,255,255,1)"],
      [0.2, "rgba(255,246,225,0.95)"],
      [0.5, "rgba(255,214,150,0.35)"],
      [1, "rgba(255,190,110,0)"],
    ]),
    [],
  );
  const haloTex = useMemo(
    () => makeRadialTexture(128, [
      [0, "rgba(255,226,180,0.5)"],
      [0.5, "rgba(255,200,130,0.14)"],
      [1, "rgba(255,190,110,0)"],
    ]),
    [],
  );
  const streakTex = useMemo(() => makeStreakTexture(), []);
  const opacities = useMemo(() => [1, 0.09, 0.06], []);

  useFrame(({ camera, clock }) => {
    if (group.current) group.current.position.copy(camera.position);
    const fade = powerFade(clock.elapsedTime);
    mats.current.forEach((m, i) => {
      if (m) m.opacity = fade * opacities[i];
    });
  });

  return (
    <group ref={group}>
      <sprite position={SUN_POS} scale={[7, 7, 1]}>
        <spriteMaterial
          ref={(m) => { mats.current[0] = m; }}
          map={coreTex}
          transparent opacity={0} depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} fog={false}
        />
      </sprite>
      <sprite position={SUN_POS} scale={[18, 18, 1]}>
        <spriteMaterial
          ref={(m) => { mats.current[1] = m; }}
          map={haloTex}
          transparent opacity={0} depthWrite={false}
          blending={THREE.AdditiveBlending} fog={false}
        />
      </sprite>
      {/* anamorphic flare streak */}
      <sprite position={SUN_POS} scale={[30, 1.6, 1]}>
        <spriteMaterial
          ref={(m) => { mats.current[2] = m; }}
          map={streakTex}
          transparent opacity={0} depthWrite={false}
          blending={THREE.AdditiveBlending} fog={false}
        />
      </sprite>
    </group>
  );
}

/* ── Ringed gas giant ──────────────────────────────────────────────── */

const PLANET_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const PLANET_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uLightDir;
  uniform vec3 uAtmo;
  uniform float uFade;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vWorld);
    float ndl = dot(n, uLightDir);
    float day = smoothstep(-0.12, 0.35, ndl);
    vec3 base = texture2D(uMap, vUv).rgb;
    vec3 col = base * (0.05 + 1.05 * day);
    // atmospheric limb scattering
    float fr = pow(1.0 - max(dot(n, v), 0.0), 2.6);
    col += uAtmo * fr * (0.18 + 0.82 * day);
    gl_FragColor = vec4(col * uFade, 1.0);
  }
`;

interface MoonSpec {
  radius: number;
  orbit: number; // orbital radius around the planet
  speed: number;
  phase: number;
  tilt: number; // orbital-plane tilt
}

const MOONS: MoonSpec[] = [
  { radius: 2.4, orbit: 30, speed: 0.045, phase: 0.8, tilt: 0.12 },
  { radius: 1.4, orbit: 40, speed: 0.028, phase: 3.6, tilt: -0.2 },
];

function Moon({ spec, map }: { spec: MoonSpec; map: THREE.Texture }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uLightDir: { value: SUN_DIR },
      uAtmo: { value: new THREE.Color("#3a4442") },
      uFade: { value: 0 },
    }),
    [map],
  );

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (mesh.current) {
      const a = t * spec.speed + spec.phase;
      mesh.current.position.set(
        Math.cos(a) * spec.orbit,
        Math.sin(a) * spec.orbit * spec.tilt,
        Math.sin(a) * spec.orbit * 0.85,
      );
      mesh.current.rotation.y += delta * 0.02;
    }
    if (mat.current) mat.current.uniforms.uFade.value = powerFade(t);
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[spec.radius, 24, 16]} />
      <shaderMaterial
        ref={mat}
        vertexShader={PLANET_VERT}
        fragmentShader={PLANET_FRAG}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function Planet() {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const haloMat = useRef<THREE.SpriteMaterial>(null);
  const map = useMemo(() => makePlanetTexture(), []);
  const moonTex = useMemo(() => makeMoonTexture(), []);
  const ringTex = useMemo(() => makeRingTexture(), []);
  const haloTex = useMemo(
    () => makeRadialTexture(128, [
      [0, "rgba(140,200,210,0.32)"],
      [0.55, "rgba(120,180,195,0.1)"],
      [1, "rgba(110,170,190,0)"],
    ]),
    [],
  );
  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uLightDir: { value: SUN_DIR },
      uAtmo: { value: new THREE.Color("#4d98a8") },
      uFade: { value: 0 },
    }),
    [map],
  );

  useFrame(({ camera, clock }, delta) => {
    const t = clock.elapsedTime;
    if (group.current) {
      group.current.position.set(
        camera.position.x,
        camera.position.y,
        camera.position.z * 0.99,
      );
    }
    if (mesh.current) mesh.current.rotation.y += delta * 0.008;
    const fade = powerFade(t);
    if (mat.current) mat.current.uniforms.uFade.value = fade;
    if (ringMat.current) ringMat.current.opacity = fade * 0.28;
    if (haloMat.current) haloMat.current.opacity = fade * 0.2;
  });

  return (
    <group ref={group}>
      <group position={[-70, 31, -100]}>
        {/* atmosphere halo behind the disc */}
        <sprite scale={[38, 38, 1]}>
          <spriteMaterial
            ref={haloMat}
            map={haloTex}
            transparent opacity={0} depthWrite={false}
            blending={THREE.AdditiveBlending} fog={false}
          />
        </sprite>
        <mesh ref={mesh} rotation={[0.12, 0, 0.18]}>
          <sphereGeometry args={[15.5, 48, 32]} />
          <shaderMaterial
            ref={mat}
            vertexShader={PLANET_VERT}
            fragmentShader={PLANET_FRAG}
            uniforms={uniforms}
          />
        </mesh>
        <mesh rotation={[1.12, 0, 0.35]} scale={0.6}>
          <ringGeometry args={[34, 46, 96]} />
          <meshBasicMaterial
            ref={ringMat}
            map={ringTex}
            color="#6b7a76"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            fog={false}
          />
        </mesh>
        {MOONS.map((m, i) => (
          <Moon key={i} spec={m} map={moonTex} />
        ))}
      </group>
    </group>
  );
}

/* ── Traffic lanes (ships + satellite share the wrap logic) ────────── */

interface Lane {
  x: number; // lane offset — outside the |x| < 20 room corridor (or high above it)
  y: number;
  dir: 1 | -1; // travel direction along z
  speed: number;
  scale: number;
  drift: number; // sideways sway amplitude
  phase: number; // 0..1 stagger along the lane
}

const LANES: Lane[] = [
  { x: -44, y: 18, dir: 1, speed: 9, scale: 2.6, drift: 7, phase: 0 },
  { x: 48, y: 12, dir: 1, speed: 6.5, scale: 2, drift: 5, phase: 0.35 },
  { x: -36, y: 30, dir: -1, speed: 12, scale: 1.6, drift: 4, phase: 0.6 },
  { x: 38, y: 26, dir: -1, speed: 7.5, scale: 2.2, drift: 6, phase: 0.15 },
  { x: 0, y: 42, dir: 1, speed: 10, scale: 3.2, drift: 12, phase: 0.8 },
];

// vehicles live in a z-window around the camera: 45 behind the lens to 125 ahead
const LANE_SPAN = 170;

function lanePos(lane: Lane, t: number, camZ: number, out: THREE.Vector3) {
  const raw = lane.phase * LANE_SPAN + t * lane.speed * lane.dir;
  const rel = ((raw % LANE_SPAN) + LANE_SPAN) % LANE_SPAN;
  out.set(
    lane.x + Math.sin(t * 0.16 + lane.phase * 9) * lane.drift,
    lane.y + Math.sin(t * 0.23 + lane.phase * 5) * 2.5,
    camZ + 45 - rel,
  );
}

function Ship({ lane }: { lane: Lane }) {
  const group = useRef<THREE.Group>(null);

  const hullMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: "#17211f",
      metalness: 0.65,
      roughness: 0.45,
      emissive: "#0c1412",
      fog: false,
    }),
    [],
  );
  const engineMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: "#3fd6c8",
      toneMapped: false,
      transparent: true,
      opacity: 0,
      fog: false,
    }),
    [],
  );
  const trailMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: "#3fd6c8",
      toneMapped: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    }),
    [],
  );

  useFrame(({ camera, clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const fade = powerFade(t);
    g.visible = fade > 0.01;
    if (!g.visible) return;

    lanePos(lane, t, camera.position.z, tmpV1);
    g.position.copy(tmpV1);

    // face along the analytic velocity, then bank into the sway
    tmpV2.set(
      Math.cos(t * 0.16 + lane.phase * 9) * lane.drift * 0.16,
      Math.cos(t * 0.23 + lane.phase * 5) * 2.5 * 0.23,
      -lane.speed * lane.dir,
    );
    g.lookAt(tmpV3.copy(g.position).add(tmpV2));
    g.rotateZ(Math.sin(t * 0.16 + lane.phase * 9) * -0.35 * lane.dir);
    g.scale.setScalar(lane.scale);

    const th = THEMES[useExperience.getState().theme];
    engineMaterial.color.lerp(tmpColor.set(th.glow), 0.06);
    engineMaterial.opacity = fade;
    trailMaterial.color.lerp(tmpColor.set(th.glow), 0.06);
    trailMaterial.opacity = fade * (0.3 + 0.12 * Math.sin(t * 7 + lane.phase * 20));
  });

  return (
    <group ref={group} visible={false}>
      {/* hull */}
      <mesh material={hullMaterial}>
        <boxGeometry args={[0.52, 0.26, 2.1]} />
      </mesh>
      {/* nose */}
      <mesh material={hullMaterial} position={[0, 0, 1.45]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.24, 0.8, 12]} />
      </mesh>
      {/* wings */}
      <mesh material={hullMaterial} position={[0, -0.02, -0.35]}>
        <boxGeometry args={[2.3, 0.05, 0.75]} />
      </mesh>
      {/* tail fin */}
      <mesh material={hullMaterial} position={[0, 0.3, -0.7]}>
        <boxGeometry args={[0.05, 0.55, 0.6]} />
      </mesh>
      {/* cockpit canopy */}
      <mesh material={engineMaterial} position={[0, 0.16, 0.75]}>
        <sphereGeometry args={[0.15, 12, 8]} />
      </mesh>
      {/* wingtip running lights */}
      <mesh material={engineMaterial} position={[-1.12, -0.02, -0.35]}>
        <sphereGeometry args={[0.07, 8, 6]} />
      </mesh>
      <mesh material={engineMaterial} position={[1.12, -0.02, -0.35]}>
        <sphereGeometry args={[0.07, 8, 6]} />
      </mesh>
      {/* engine */}
      <mesh material={engineMaterial} position={[0, 0, -1.1]}>
        <sphereGeometry args={[0.17, 12, 8]} />
      </mesh>
      {/* exhaust trail — apex trailing behind the ship */}
      <mesh material={trailMaterial} position={[0, 0, -3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.28, 4.2, 10, 1, true]} />
      </mesh>
    </group>
  );
}

/* ── The satellite ─────────────────────────────────────────────────── */

const SAT_LANE: Lane = {
  x: 14, y: 33, dir: 1, speed: 2.4, scale: 2.4, drift: 2, phase: 0.45,
};

function Satellite() {
  const group = useRef<THREE.Group>(null);
  const beaconMat = useRef<THREE.MeshBasicMaterial>(null);

  const foilTex = useMemo(() => makeFoilTexture(), []);
  const panelTex = useMemo(() => makePanelTexture(), []);
  const foilMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      map: foilTex,
      bumpMap: foilTex,
      bumpScale: 0.03,
      metalness: 0.85,
      roughness: 0.42,
      fog: false,
    }),
    [foilTex],
  );
  const panelMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      map: panelTex,
      metalness: 0.7,
      roughness: 0.28,
      fog: false,
    }),
    [panelTex],
  );
  const whiteMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: "#dbe2e0", metalness: 0.15, roughness: 0.6, fog: false,
    }),
    [],
  );
  const strutMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: "#7f8a8c", metalness: 0.85, roughness: 0.35, fog: false,
    }),
    [],
  );
  const nozzleMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: "#33393c", metalness: 0.9, roughness: 0.3, fog: false,
    }),
    [],
  );

  useFrame(({ camera, clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const fade = powerFade(t);
    g.visible = fade > 0.01;
    if (!g.visible) return;

    lanePos(SAT_LANE, t, camera.position.z, tmpV1);
    g.position.copy(tmpV1);
    // stately multi-axis tumble
    g.rotation.set(t * 0.045, t * 0.06, Math.sin(t * 0.05) * 0.35);
    g.scale.setScalar(SAT_LANE.scale);

    // beacon strobe — short red flash every ~2.4 s
    if (beaconMat.current) {
      const flash = Math.pow(Math.max(0, Math.sin(t * 2.6 + 1)), 24);
      beaconMat.current.opacity = fade * flash;
    }
  });

  return (
    <group ref={group} visible={false}>
      {/* gold MLI bus */}
      <mesh material={foilMat}>
        <boxGeometry args={[1.1, 1.3, 1.1]} />
      </mesh>
      {/* white radiator face */}
      <mesh material={whiteMat} position={[0, 0, 0.57]}>
        <boxGeometry args={[0.9, 1.1, 0.05]} />
      </mesh>
      {/* solar array yokes */}
      <mesh material={strutMat} position={[-0.95, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
      </mesh>
      <mesh material={strutMat} position={[0.95, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
      </mesh>
      {/* solar arrays */}
      <mesh material={panelMat} position={[-2.75, 0, 0]}>
        <boxGeometry args={[2.9, 0.05, 1.25]} />
      </mesh>
      <mesh material={panelMat} position={[2.75, 0, 0]}>
        <boxGeometry args={[2.9, 0.05, 1.25]} />
      </mesh>
      {/* dish antenna, aimed off-axis */}
      <group position={[0, 0.92, 0.2]} rotation={[-0.55, 0.2, 0]}>
        <mesh material={whiteMat} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.55, 0.22, 24, 1, true]} />
        </mesh>
        <mesh material={strutMat} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.42, 6]} />
        </mesh>
        <mesh material={strutMat} position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.045, 8, 6]} />
        </mesh>
      </group>
      {/* comms whip antennas */}
      <mesh material={strutMat} position={[0.35, -0.85, 0.3]} rotation={[0.3, 0, 0.2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.9, 4]} />
      </mesh>
      <mesh material={strutMat} position={[-0.3, -0.9, -0.2]} rotation={[-0.2, 0, -0.3]}>
        <cylinderGeometry args={[0.012, 0.012, 1.1, 4]} />
      </mesh>
      {/* thruster nozzle */}
      <mesh material={nozzleMat} position={[0, -0.78, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.17, 0.3, 16, 1, true]} />
      </mesh>
      {/* strobing beacon */}
      <mesh position={[0.6, 0.72, 0.55]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshBasicMaterial
          ref={beaconMat}
          color="#ff5546"
          toneMapped={false}
          transparent
          opacity={0}
          fog={false}
        />
      </mesh>
      {/* private sun — tight falloff so it glints the foil and panels
          without reaching the rooms ~20 units below */}
      <pointLight
        position={[2.4, 1.6, 0.6]}
        intensity={60}
        distance={18}
        decay={2}
        color="#fff1dd"
      />
    </group>
  );
}

/* ── Shooting star ─────────────────────────────────────────────────── */

function ShootingStar() {
  const sprite = useRef<THREE.Sprite>(null);
  const mat = useRef<THREE.SpriteMaterial>(null);
  const st = useRef({
    active: false,
    next: 8,
    start: 0,
    origin: new THREE.Vector3(),
    dir: new THREE.Vector3(),
  });
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 16;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.75, "rgba(220,255,250,0.7)");
    g.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 16);
    const vg = ctx.createLinearGradient(0, 0, 0, 16);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.5, "rgba(0,0,0,1)");
    vg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 128, 16);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    const s = st.current;
    if (!sprite.current || !mat.current) return;

    if (!s.active) {
      sprite.current.visible = false;
      if (t > s.next && powerFade(t) >= 1) {
        s.active = true;
        s.start = t;
        s.origin.set(
          camera.position.x + (Math.random() - 0.5) * 110,
          camera.position.y + 26 + Math.random() * 28,
          camera.position.z - 45 - Math.random() * 45,
        );
        s.dir.set(
          (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.4),
          -(0.3 + Math.random() * 0.3),
          0,
        ).normalize();
        mat.current.rotation = Math.atan2(s.dir.y, s.dir.x);
      }
      return;
    }

    const life = (t - s.start) / 1.1;
    if (life >= 1) {
      s.active = false;
      s.next = t + 6 + Math.random() * 10;
      sprite.current.visible = false;
      return;
    }
    sprite.current.visible = true;
    sprite.current.position
      .copy(s.origin)
      .addScaledVector(s.dir, life * 55);
    mat.current.opacity = Math.sin(life * Math.PI) * 0.8;
  });

  return (
    <sprite ref={sprite} visible={false} scale={[8, 0.16, 1]}>
      <spriteMaterial
        ref={mat}
        map={tex}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </sprite>
  );
}

/* ── Assembly ──────────────────────────────────────────────────────── */

/**
 * Cosmic bodies (gas giant, sun, satellite, traffic) belong to the "universe
 * inside the wall" — NOT floating over the physical opening venue (brief §4).
 * This gate keeps them hidden through the enclosed stage chapter and fades
 * them in only as the camera dives toward/through the LED wall (progress ≳0.2).
 */
function GatedCosmos({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const on = signals.progress > 0.19;
    g.current.visible = on;
  });
  return <group ref={g}>{children}</group>;
}

export default function Space() {
  const quality = useExperience((s) => s.quality);
  const high = quality === "high";
  const lanes = high ? LANES : LANES.slice(0, 3);
  return (
    <group>
      {/* deep shell — includes the Milky Way band */}
      <StarLayer
        count={high ? 2600 : 1200}
        rMin={70} rMax={115}
        bandFrac={0.55}
        follow={0.96}
        sizeMin={0.5} sizeMax={1.7}
        brightFrac={0.02}
        spin={0.003}
      />
      {/* near, brighter stars — stronger parallax */}
      <StarLayer
        count={high ? 360 : 140}
        rMin={45} rMax={75}
        bandFrac={0}
        follow={0.88}
        sizeMin={1.2} sizeMax={2.4}
        brightFrac={0.12}
        spin={0.005}
      />
      <GatedCosmos>
        <DustMotes count={high ? 70 : 30} />
        <MilkyDust quality={quality} />
        <Nebulae quality={quality} />
        <Sun />
        <Planet />
        <Satellite />
        {lanes.map((lane, i) => (
          <Ship key={i} lane={lane} />
        ))}
        {high && <ShootingStar />}
      </GatedCosmos>
    </group>
  );
}
