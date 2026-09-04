"use client";
import { useMemo, useRef } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { audio } from "../audio";
import { chapterT, signals, THEMES, useExperience } from "../store";

/**
 * The mega LED wall. One shader does everything:
 *  - physical LED pixels (visible up close, blend at distance)
 *  - boot sequence: scanline power-on with glitches
 *  - 4 content programs (signal-grid logo · equalizer · waves · warp tunnel)
 *  - pointer ripples across the pixel grid
 *  - the central mechanical iris "vault" that opens to let the camera through
 */

const MAX_RIPPLES = 5;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uPower;      // 0 dark → 1 fully booted
  uniform float uContent;    // program index
  uniform float uIris;       // 0 closed → 1 open
  uniform vec3 uAccent;
  uniform vec3 uGlow;
  uniform vec3 uWarm;
  uniform vec4 uRipples[${MAX_RIPPLES}]; // xy=uv, z=start time, w=strength
  uniform vec2 uRes;         // led pixel resolution

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // brand 5x5 signal grid: column heights 2,4,3,5,4 (bottom-up)
  float logoCell(vec2 cell, float t) {
    if (cell.x < 0.0 || cell.x > 4.0 || cell.y < 0.0 || cell.y > 4.0) return 0.0;
    float h = 2.0;
    if (cell.x > 0.5) h = 4.0;
    if (cell.x > 1.5) h = 3.0;
    if (cell.x > 2.5) h = 5.0;
    if (cell.x > 3.5) h = 4.0;
    float lit = step(cell.y, h - 0.5); // y counted from bottom
    // diagonal pop sweep, looping — mirrors the brand lgPop keyframes
    float order = cell.x + cell.y;
    float phase = fract((t - order * 0.13) / 3.4);
    float pop = smoothstep(0.0, 0.14, phase) * (1.0 - smoothstep(0.78, 1.0, phase));
    return lit * (0.12 + 0.88 * pop);
  }

  vec3 program(vec2 id, vec2 res, float t) {
    vec2 uv = (id + 0.5) / res;          // 0..1 across the wall
    vec2 c = uv - 0.5;
    c.x *= res.x / res.y;
    float prog = uContent;
    vec3 col = vec3(0.0);

    if (prog < 0.5) {
      // ── program 0: a living FOREST inside the wall — the anamorphic hero
      // content the tiger emerges from (brief §7/§12/§13). Natural greens and
      // earth, atmospheric depth, and layered wind (near layers sway more).
      float y = uv.y;
      // atmospheric backdrop: cool canopy up top → warm ground haze below,
      // with a soft shaft of daylight filtering deep between the trees. These
      // are LED emission values, so they run bright — the wall is a light source.
      vec3 backTop = vec3(0.14, 0.22, 0.20);
      vec3 backLow = vec3(0.34, 0.30, 0.22);
      col = mix(backLow, backTop, smoothstep(0.05, 0.98, y));
      float shaft = exp(-pow((uv.x - 0.6) / 0.22, 2.0)) * smoothstep(0.02, 0.85, y);
      col += uWarm * shaft * 0.55;

      // four depth layers of foliage silhouettes; near = darker + more sway
      for (int L = 0; L < 4; L++) {
        float fl = float(L);
        float depth = fl / 3.0;
        float freq = mix(3.0, 11.0, depth);
        float wind = sin(t * (0.35 + depth * 0.8) + fl * 2.1);
        // undulating tree-line horizon for this layer
        float ridge = 0.30 + depth * 0.15
          + 0.06 * sin(uv.x * freq + fl * 3.0 + wind * (0.15 + depth * 0.5))
          + 0.03 * sin(uv.x * freq * 2.7 + fl);
        // sparse trunks poking below the ridge
        float trunkId = floor((uv.x + wind * (0.004 + depth * 0.02)) * freq * 1.6);
        float trunk = step(0.72, hash(vec2(trunkId, fl)))
                    * step(y, ridge) * step(ridge - 0.5, y);
        float canopy = smoothstep(ridge + 0.015, ridge - 0.015, y);
        float mask = max(canopy, trunk);
        // brighter greens far (catching light), deep shadow greens near
        vec3 leaf = mix(vec3(0.20, 0.42, 0.22), vec3(0.05, 0.12, 0.07), depth);
        col = mix(col, leaf, mask);
      }

      // low ground mist drifting sideways (very slow atmosphere)
      float mist = smoothstep(0.26, 0.0, y) * (0.4 + 0.28 * sin(uv.x * 5.0 - t * 0.4));
      col = mix(col, vec3(0.34, 0.36, 0.30), clamp(mist, 0.0, 0.55) * 0.6);
      col *= 1.15;
    } else if (prog < 1.5) {
      // ── program 1: live equalizer bars
      float bar = floor(uv.x * 24.0);
      float h = 0.25 + 0.55 * (0.5 + 0.5 * sin(t * 2.4 + bar * 1.7)
              + 0.3 * sin(t * 5.1 + bar * 0.9)) * 0.6;
      float on = step(uv.y, h);
      vec3 grad = mix(uAccent, uGlow, uv.y * 1.6);
      col = grad * on * (0.6 + 0.4 * hash(vec2(bar, floor(t * 8.0))));
      col += uWarm * step(abs(uv.y - h), 0.012) * 1.4; // peak caps
    } else if (prog < 2.5) {
      // ── program 2: radial energy waves
      float d = length(c);
      float w = sin(d * 26.0 - t * 3.2) * 0.5 + 0.5;
      w = pow(w, 3.0);
      col = mix(uAccent, uGlow, w) * (w * 0.9 + 0.08);
      col += uGlow * smoothstep(0.05, 0.0, abs(d - fract(t * 0.25) * 0.9)) * 0.8;
    } else {
      // ── program 3: naked-eye warp tunnel
      float ang = atan(c.y, c.x);
      float d = length(c) + 0.12;
      float star = hash(vec2(floor(ang * 24.0), floor(1.0 / d * 6.0 - t * 2.0)));
      star = step(0.86, star);
      col = mix(uAccent, vec3(1.0), 0.4) * star * (1.2 - d);
      col += uGlow * (0.10 / (d * 6.0));
    }
    return col;
  }

  void main() {
    vec2 res = uRes;
    vec2 id = floor(vUv * res);
    vec2 f = fract(vUv * res);

    // physical LED dot — round, with dark grout between pixels
    float dot_ = smoothstep(0.52, 0.30, length(f - 0.5));

    vec3 content = program(id, res, uTime);

    // ── boot: rows scan on from the bottom with flicker/glitch
    float rowOn = step(1.0 - vUv.y, uPower * 1.25);
    float flick = mix(1.0, 0.4 + 0.6 * hash(vec2(id.y, floor(uTime * 24.0))),
                      step(uPower, 0.995));
    content *= rowOn * flick;

    // ── pointer ripples: expanding rings in pixel space
    float ripple = 0.0;
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if (age < 0.0 || age > 1.6 || r.w <= 0.0) continue;
      vec2 d = (vUv - r.xy) * vec2(res.x / res.y, 1.0);
      float radius = age * 0.55;
      float ring = smoothstep(0.05, 0.0, abs(length(d) - radius));
      ripple += ring * (1.0 - age / 1.6) * r.w;
    }
    content += uGlow * ripple * 2.2;

    // ── mechanical iris vault at the center
    vec2 ic = vUv - 0.5;
    ic.x *= res.x / res.y;
    float idist = length(ic);
    float irisR = uIris * 0.42;
    // rim: glowing ring at the aperture edge
    float rim = smoothstep(0.035, 0.0, abs(idist - irisR)) * step(0.001, uIris);
    // rotating spokes engraved around the hub
    float ang = atan(ic.y, ic.x);
    float spokes = smoothstep(0.94, 1.0, sin(ang * 12.0 + uIris * 6.0) * 0.5 + 0.5)
                 * smoothstep(irisR + 0.16, irisR, idist) * step(0.001, uIris) * step(idist, irisR + 0.16);

    vec3 col = content * dot_;
    col += uGlow * rim * 3.0;
    col += uWarm * spokes * 0.8;

    // hole punched through — camera passes here
    float hole = smoothstep(irisR, irisR - 0.02, idist) * step(0.001, uIris);
    float alpha = 1.0 - hole;

    // unpowered wall still faintly catches ambient light
    col += vec3(0.012, 0.02, 0.018) * (1.0 - uPower) * dot_;

    gl_FragColor = vec4(col, alpha);
  }
`;

export default function LedWall({
  position = [0, 6, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  size = [19.2, 10.8] as [number, number],
  main = true, // main wall owns the vault iris + click-to-unlock
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
  main?: boolean;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const irisState = useRef({ value: 0, target: 0, clicked: false, hissed: false });
  const rippleIndex = useRef(0);
  const lastRipple = useRef(0);
  const theme = useExperience((s) => s.theme);
  const quality = useExperience((s) => s.quality);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPower: { value: 0 },
      uContent: { value: 0 },
      uIris: { value: 0 },
      uAccent: { value: new THREE.Color(THEMES.signal.accent) },
      uGlow: { value: new THREE.Color(THEMES.signal.glow) },
      uWarm: { value: new THREE.Color(THEMES.signal.warm) },
      uRipples: {
        value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -10, 0)),
      },
      uRes: { value: new THREE.Vector2(128, 72) },
    }),
    [],
  );

  useFrame((state) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    const t = state.clock.elapsedTime;
    const s = useExperience.getState();
    u.uTime.value = t;

    // boot ramp begins when the visitor powers the venue on
    if (s.powered && signals.poweredAt === 0) signals.poweredAt = t;
    const sinceBoot = signals.poweredAt > 0 ? t - signals.poweredAt : 0;
    u.uPower.value = THREE.MathUtils.clamp(sinceBoot / 3.2, 0, 1);

    u.uContent.value = s.ledContent;

    const th = THEMES[s.theme];
    (u.uAccent.value as THREE.Color).lerp(new THREE.Color(th.accent), 0.05);
    (u.uGlow.value as THREE.Color).lerp(new THREE.Color(th.glow), 0.05);
    (u.uWarm.value as THREE.Color).lerp(new THREE.Color(th.warm), 0.05);

    u.uRes.value.set(quality === "high" ? 128 : 72, quality === "high" ? 72 : 40);

    // iris: opens on click in the vault chapter, or automatically just
    // before the camera reaches the wall so nobody gets stuck
    if (main) {
      const vt = chapterT(signals.progress, "vault");
      const st = irisState.current;
      st.target = st.clicked || vt > 0.45 ? 1 : 0;
      const prev = st.value;
      st.value += (st.target - st.value) * 0.045; // heavy, hydraulic pace
      if (st.target === 1 && prev < 0.02 && !st.hissed) {
        st.hissed = true;
        audio.hydraulics();
      }
      u.uIris.value = st.value;
    }
  });

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!e.uv || !mat.current) return;
    const now = performance.now();
    if (now - lastRipple.current < 120) return; // throttle
    lastRipple.current = now;
    const arr = mat.current.uniforms.uRipples.value as THREE.Vector4[];
    const i = rippleIndex.current % MAX_RIPPLES;
    arr[i].set(e.uv.x, e.uv.y, mat.current.uniforms.uTime.value as number, 0.8);
    rippleIndex.current++;
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!main) return;
    // near the center in the vault chapter = the unlock control
    const vt = chapterT(signals.progress, "vault");
    if (vt > 0 && vt < 1 && e.uv) {
      const c = new THREE.Vector2(e.uv.x - 0.5, e.uv.y - 0.5);
      if (c.length() < 0.25 && !irisState.current.clicked) {
        irisState.current.clicked = true;
        audio.click(undefined, 0.8);
      }
    }
  };

  return (
    <mesh
      position={position}
      rotation={rotation}
      onPointerMove={main ? onPointerMove : undefined}
      onClick={onClick}
    >
      <planeGeometry args={size} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        toneMapped={false}
        key={theme /* re-render safety; uniforms lerp anyway */}
      />
    </mesh>
  );
}
