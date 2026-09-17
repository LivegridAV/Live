import * as THREE from "three";

/**
 * The LED surface material.
 *
 * Content textures carry the *picture*; this material makes it read as a real
 * LED product — discrete emitters on black glass, visible module seams, the
 * off-axis brightness falloff every physical panel has, and a dot structure
 * that dissolves as the wall recedes (so a 3.9 mm wall doesn't turn into moiré
 * at fifty metres). Getting this right is what separates "video on a plane"
 * from "screen in a room".
 */

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vViewDir;
  varying vec3 vNormalV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2  uPitch;    // emitters across / down
  uniform vec2  uModule;   // cabinet count across / down
  uniform vec2  uRepeat;
  uniform vec2  uOffset;
  uniform float uSwap;     // 1 = sample the content with u/v exchanged
  uniform vec2  uFlip;     // 1 = mirror that axis
  uniform vec3  uTint;
  uniform float uBright;
  uniform float uOn;       // 0 = dark panel, 1 = full output
  uniform float uDot;      // 0 = no visible pixel structure, 1 = full

  varying vec2 vUv;
  varying vec3 vViewDir;
  varying vec3 vNormalV;

  void main() {
    // Content UVs are independent of the physical panel UVs: a tunnel wall is
    // built long-side-along-Z but its content has to run *down* the tunnel.
    vec2 src = mix(vUv, vUv.yx, uSwap);
    src = mix(src, 1.0 - src, uFlip);
    vec2 uv = src * uRepeat + uOffset;
    vec3 content = texture2D(uMap, uv).rgb;

    // Emitter grid. fwidth tells us how many LED cells fall inside one screen
    // pixel — once that passes ~1 the structure is dissolved away instead of
    // aliasing into moiré.
    vec2 g = vUv * uPitch;
    vec2 f = fract(g) - 0.5;
    float d = length(f);
    float px = max(fwidth(g.x), fwidth(g.y));
    float structure = (1.0 - smoothstep(0.30, 0.80, px)) * uDot;
    float emitter = mix(1.0, smoothstep(0.54, 0.26, d), structure * 0.85);

    // Cabinet seams — a hairline of unlit frame between modules.
    vec2 m = fract(vUv * uModule);
    float seamD = min(min(m.x, 1.0 - m.x), min(m.y, 1.0 - m.y));
    float seam = mix(1.0, smoothstep(0.0, 0.010, seamD), structure * 0.6);

    // Real panels lose output off-axis; this also stops grazing surfaces from
    // blowing out the frame.
    float axis = clamp(dot(normalize(vNormalV), normalize(vViewDir)), 0.0, 1.0);
    float offAxis = mix(0.42, 1.0, pow(axis, 0.6));

    vec3 col = content * uTint * uBright * emitter * seam * offAxis * uOn;

    // Black glass between the emitters still catches a little room light.
    col += vec3(0.004, 0.0075, 0.008) * (1.0 - emitter) * (0.25 + 0.75 * uOn);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface LEDOptions {
  /** physical size in metres, used to derive a believable emitter count */
  width: number;
  height: number;
  /** pixel pitch in millimetres (2.6 fine · 3.9 indoor · 6.9 stage · 10 outdoor) */
  pitch?: number;
  /** cabinet size in metres — drives the seam grid */
  cabinet?: number;
  brightness?: number;
  tint?: string;
  repeat?: [number, number];
  offset?: [number, number];
  /** sample the content with u/v exchanged (long surfaces, tunnels) */
  swap?: boolean;
  /** mirror the content on [u, v] */
  flip?: [boolean, boolean];
  /** 0 disables the emitter/seam structure (use for projection surfaces) */
  dot?: number;
  /** curved and ring products are seen from both sides */
  doubleSided?: boolean;
}

/** Emitter counts are capped: beyond this the structure is invisible anyway. */
const MAX_EMITTERS = 420;

export function createLEDMaterial(texture: THREE.Texture, o: LEDOptions) {
  const pitch = o.pitch ?? 3.9;
  const cabinet = o.cabinet ?? 0.5;
  const across = Math.min(MAX_EMITTERS, Math.max(8, Math.round((o.width * 1000) / pitch)));
  const down = Math.min(MAX_EMITTERS, Math.max(8, Math.round((o.height * 1000) / pitch)));

  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uMap: { value: texture },
      uPitch: { value: new THREE.Vector2(across, down) },
      uModule: {
        value: new THREE.Vector2(
          Math.max(1, Math.round(o.width / cabinet)),
          Math.max(1, Math.round(o.height / cabinet)),
        ),
      },
      uRepeat: { value: new THREE.Vector2(...(o.repeat ?? [1, 1])) },
      uOffset: { value: new THREE.Vector2(...(o.offset ?? [0, 0])) },
      uSwap: { value: o.swap ? 1 : 0 },
      uFlip: { value: new THREE.Vector2(o.flip?.[0] ? 1 : 0, o.flip?.[1] ? 1 : 0) },
      uTint: { value: new THREE.Color(o.tint ?? "#ffffff").convertSRGBToLinear() },
      uBright: { value: o.brightness ?? 1 },
      uOn: { value: 1 },
      uDot: { value: o.dot ?? 1 },
    },
    side: o.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    toneMapped: true,
  });
}

/* ── Non-LED surfaces ──────────────────────────────────── */

/**
 * Projection surfaces have no emitters — they're light thrown onto a material,
 * so the content picks up the surface tint and loses contrast in the blacks.
 */
export function createProjectionMaterial(texture: THREE.Texture, brightness = 0.85) {
  const m = createLEDMaterial(texture, { width: 1, height: 1, dot: 0, brightness });
  m.uniforms.uTint.value.set(0.92, 0.9, 0.86);
  return m;
}
