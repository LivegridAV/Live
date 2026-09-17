import * as THREE from "three";

/**
 * The LED surface material.
 *
 * Content textures carry the *picture*; this material makes it read as a real
 * LED product. The product we are simulating is premium ultra-fine-pitch — the
 * class of panel where, at any normal viewing distance, you see an image and
 * not a grid of diodes. So the rules here are deliberately strict:
 *
 *  - There are NO cabinet seams. A fine-pitch wall is commissioned until the
 *    joins cannot be found; drawing them would be drawing a fault. The seam
 *    term exists only for the one technical exhibit that demonstrates module
 *    construction, and is off everywhere else.
 *  - The emitter structure dissolves early and softly. `fwidth` tells us how
 *    many LED cells fall inside a screen pixel; past a few tenths of a cell the
 *    structure is gone, long before it could alias into moiré or shimmer.
 *  - Off-axis falloff is gentle. Real panels lose output at grazing angles, but
 *    a strong falloff would make two surfaces meeting at a corner differ in
 *    brightness — which is exactly the discontinuity we are trying to avoid.
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
  precision highp float;

  uniform sampler2D uMap;
  uniform vec2  uPitch;    // emitters across / down
  uniform vec2  uModule;   // cabinet count across / down (technical exhibit only)
  uniform vec2  uRepeat;
  uniform vec2  uOffset;
  uniform float uSwap;     // 1 = sample the content with u/v exchanged
  uniform vec2  uFlip;     // 1 = mirror that axis
  uniform vec3  uTint;
  uniform float uBright;
  uniform float uOn;       // 0 = dark panel, 1 = full output
  uniform float uDot;      // emitter structure, only ever visible very close
  uniform float uSeam;     // 0 everywhere except the module-construction exhibit

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

    // How much of one LED cell lands inside one screen pixel. Below ~0.1 we
    // are close enough to resolve individual emitters; by ~0.34 the structure
    // is fully dissolved. On a 1.2 mm wall that threshold is reached with your
    // face almost against the panel, which is the intent.
    vec2 g = vUv * uPitch;
    float px = max(fwidth(g.x), fwidth(g.y));
    float structure = (1.0 - smoothstep(0.10, 0.34, px)) * uDot;

    float emitter = 1.0;
    if (structure > 0.001) {
      vec2 f = fract(g) - 0.5;
      float d = length(f);
      // A soft, shallow well rather than a hard dot: even at maximum visibility
      // this reads as fine texture on a bright surface, never as pixelation.
      emitter = mix(1.0, smoothstep(0.62, 0.24, d), structure * 0.5);
    }

    // Module construction. Off by default — see the note at the top.
    float seam = 1.0;
    if (uSeam > 0.001) {
      vec2 m = fract(vUv * uModule);
      float seamD = min(min(m.x, 1.0 - m.x), min(m.y, 1.0 - m.y));
      seam = mix(1.0, smoothstep(0.0, 0.006, seamD), uSeam * structure);
    }

    // Gentle off-axis falloff. Deliberately shallow so adjacent surfaces of an
    // enveloping installation keep the same apparent brightness.
    float axis = clamp(dot(normalize(vNormalV), normalize(vViewDir)), 0.0, 1.0);
    float offAxis = mix(0.74, 1.0, pow(axis, 0.45));

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
  /**
   * pixel pitch in millimetres. The venue is specified as premium fine pitch
   * throughout: 1.2–1.9 mm for anything the visitor gets close to, 2.6–3.9 mm
   * for large-format surfaces seen from across a room.
   */
  pitch?: number;
  /** cabinet size in metres — only used when `seam` is non-zero */
  cabinet?: number;
  brightness?: number;
  tint?: string;
  repeat?: [number, number];
  offset?: [number, number];
  /** sample the content with u/v exchanged (long surfaces, tunnels) */
  swap?: boolean;
  /** mirror the content on [u, v] */
  flip?: [boolean, boolean];
  /** 0 disables the emitter structure (use for projection surfaces) */
  dot?: number;
  /** module joins — reserved for the LED-construction exhibit, 0 everywhere else */
  seam?: number;
  /** curved and ring products are seen from both sides */
  doubleSided?: boolean;
}

/**
 * Emitter counts are capped well above anything that can be resolved on screen;
 * the cap exists to keep `fract()` precise, not to limit the apparent pitch.
 */
const MAX_EMITTERS = 900;

export function createLEDMaterial(texture: THREE.Texture, o: LEDOptions) {
  const pitch = o.pitch ?? 1.9;
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
      uSeam: { value: o.seam ?? 0 },
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
