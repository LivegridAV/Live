/**
 * Procedural LED content programs.
 *
 * Every screen in the venue plays *moving* media. Rather than ship a folder of
 * placeholder MP4s that would be slow to download and obviously temporary,
 * the content is generated on the GPU: each program below is a fragment shader
 * rendered into a small shared render target, which screens then sample.
 *
 * That buys three things the brief asks for — content that never freezes, a
 * cohesive visual family that looks authored rather than stock, and a media
 * layer that can be swapped for real video per screen (see `media.ts`) without
 * touching a single line of scene code.
 *
 * Art direction: natural colour grading, rich blacks, light that behaves like
 * light. Teal is an accent, never the subject.
 */

export const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** Shared helpers available to every program. */
const PRELUDE = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSeed;
  uniform float uMode;      // 0 = corporate, 1 = festival
  uniform float uVariant;   // per-screen offset so twin screens differ
  uniform vec3  uAccent;
  uniform vec2  uAspect;

  const float PI = 3.14159265359;
  const float TAU = 6.28318530718;

  float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  vec2 hash22(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), u.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
  }

  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++){
      v += a * noise(p);
      p = mat2(1.6, 1.2, -1.2, 1.6) * p;
      a *= 0.5;
    }
    return v;
  }

  mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  // Cheap, controllable cosine palette (Inigo Quilez). Tuned per program.
  vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){
    return a + b * cos(TAU * (c * t + d));
  }

  // Gentle highlight knee. Output stays HDR (values may exceed 1) — the render
  // targets are half-float and the main pass tone-maps once, so LED content
  // keeps real emissive headroom instead of being flattened twice.
  vec3 tone(vec3 x){
    x = max(vec3(0.0), x);
    return x / (1.0 + x * 0.22);
  }

  // Centred, aspect-corrected coordinates.
  vec2 centred(){ return (vUv - 0.5) * uAspect * 2.0; }
`;

const wrap = (body: string) => PRELUDE + body;

/** Retained stage finale and shared entrance / arena ribbon programs. */
const finaleBrand = wrap(/* glsl */ `
  /**
   * The closing image.
   *
   * It used to be a twenty-two column dot matrix, which on a forty-metre wall
   * resolved into half-metre ovals — a coarse pixel grid, which is the one
   * thing this venue must never show. What replaces it is light itself: a slow
   * convergence of fine filaments toward the centre, a bloom, and a horizon
   * line that settles as the room goes quiet. Nothing in it has a pixel size.
   */
  void main(){
    vec2 p = centred();
    float t = uTime;
    float r = length(p * vec2(0.62, 1.0));

    // Filaments drawn toward the centre, slowing as they arrive.
    float a = atan(p.y, p.x);
    float filaments = 0.0;
    for (int i = 0; i < 3; i++){
      float fi = float(i);
      float freq = 14.0 + fi * 9.0;
      float phase = t * (0.22 + fi * 0.09) + fi * 2.1;
      float band = pow(0.5 + 0.5 * sin(a * freq + phase), 22.0 + fi * 16.0);
      filaments += band * exp(-r * (0.9 + fi * 0.5)) * (1.0 - fi * 0.22);
    }

    // A calm breathing core, and the halo it throws.
    float pulse = 0.5 + 0.5 * sin(t * 0.42);
    float core = exp(-r * r * 3.2) * (0.72 + 0.28 * pulse);
    float halo = exp(-r * 1.15) * 0.34;

    // The horizon the room settles onto.
    float horizon = exp(-abs(p.y) * 26.0) * smoothstep(1.9, 0.2, abs(p.x)) * (0.35 + 0.3 * pulse);

    vec3 col = vec3(0.006, 0.013, 0.014);
    col += uAccent * (filaments * 0.55 + core * 1.5 + halo);
    col += vec3(0.96, 0.88, 0.74) * core * core * 0.9;
    col += uAccent * horizon * 0.9;
    col += vec3(0.9, 0.95, 0.96) * horizon * 0.35;

    gl_FragColor = vec4(tone(col * 1.15), 1.0);
  }
`);

const pillarWrap = wrap(/* glsl */ `
  void main(){
    float th = vUv.x * TAU;           // once around the column
    float v  = vUv.y;                 // base to head
    float t  = uTime * 0.16 + uVariant * 7.0;

    /* ── the field the metal travels through ──
       Never flat black. A totem whose dark areas are pure black reads as a
       cut-out; a deep graded field reads as a lit object standing in a room,
       which is the whole difference between the two. */
    vec3 col = mix(vec3(0.009, 0.013, 0.026), vec3(0.003, 0.004, 0.010), v);
    col += mix(uAccent, vec3(0.45, 0.58, 1.0), 0.55)
         * pow(max(0.0, 1.0 - abs(v * 2.0 - 1.0)), 3.0) * 0.05;

    /* ── sparkle ──
       Cells are indexed by (angle, height) with an INTEGER number of cells per
       revolution, so the field wraps for the same reason the ribbons do. */
    for (int i = 0; i < 3; i++){
      float fi = float(i);
      float cols = 26.0 + fi * 20.0;
      vec2 g = vec2(vUv.x * cols, (v - t * (0.05 + fi * 0.03)) * cols * 2.4);
      vec2 id = floor(g);
      float live = step(0.978 - fi * 0.006, hash21(id + fi * 7.0));
      float sp = live * smoothstep(0.11, 0.0,
        length(fract(g) - 0.5 - (hash22(id + fi * 31.0) - 0.5) * 0.7));
      col += mix(vec3(1.0, 0.93, 0.76), uAccent, 0.35) * sp
           * (0.30 + 0.70 * sin(t * 2.6 + hash21(id) * TAU)) * 0.55;
    }

    /* ── three ribbons of polished metal ──
       Each is shaded as a real cylindrical section: a normal is built across
       the ribbon's width, a light is moved around it, and the highlight falls
       out of the geometry. That is what separates metal from a coloured
       stripe — the highlight races while the body turns slowly, which is what
       a polished surface actually does and what a gradient can never fake.

       They are composited front to back, so ribbons genuinely pass over one
       another instead of adding into white. */
    for (int i = 0; i < 3; i++){
      float fi = float(i);
      // 1, 1, 2 turns per revolution. Integer, therefore seamless at u = 0/1.
      float turns = fi < 1.5 ? 1.0 : 2.0;
      float ph = th * turns + t * (0.50 + fi * 0.15) + fi * 2.4;

      float centre = 0.5
        + (0.25 - fi * 0.045) * sin(ph)
        + 0.065 * sin(ph * 2.0 + fi * 1.4)
        + (fi - 1.0) * 0.135;
      float w = 0.145 + 0.055 * sin(ph * 0.5 + fi * 2.0);

      float d = (v - centre) / max(w, 1e-4);
      if (abs(d) > 1.0) continue;

      float n = sqrt(max(0.0, 1.0 - d * d));
      vec2 N = normalize(vec2(d, n + 0.001));
      vec2 L = normalize(vec2(cos(ph * 0.45 + t * 0.9) * 0.9, 0.75));
      vec2 H = normalize(L + vec2(0.0, 1.0));

      float diff = max(dot(N, L), 0.0);
      float spec = pow(max(dot(N, H), 0.0), 64.0);
      float fres = pow(1.0 - n, 3.0);
      // a brushed grain along the length of the ribbon
      float brush = 0.86 + 0.28 * noise(vec2(ph * 8.0, d * 2.6));

      /* The palette shift is a *seasoning*. At an even mix the cosine palette
         won and every column came out the same iridescent pastel, which is
         both off-brand and the reason two totems specified as gold and silver
         looked identical. At 0.28 the accent leads and the shift gives it
         life. */
      vec3 tint = mix(uAccent,
        pal(fi * 0.22 + ph * 0.028 + t * 0.02,
            vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.25, 0.55)), 0.28);

      /* A real metal is never black where it faces away from the light — it
         is showing you the room instead. Without that ambient term the
         ribbons read as a thin bright line on an unlit column, which is the
         opposite of the heavy, luminous installations in the reference. */
      vec3 metal = vec3(0.010, 0.013, 0.021);
      metal += tint * 0.22;                                  // the room, in the metal
      metal += tint * pow(diff, 1.5) * brush * 1.35;
      metal += vec3(1.0, 0.97, 0.92) * spec * brush * 2.6;
      metal += mix(tint, vec3(1.0), 0.45) * fres * 0.34;

      col = mix(col, metal, smoothstep(1.0, 0.82, abs(d)));
    }

    /* ── the installation is a finite object ── */
    float foot = smoothstep(0.0, 0.030, v);
    float head = smoothstep(1.0, 0.970, v);
    col *= foot * head * 0.94 + 0.06;
    col += mix(uAccent, vec3(1.0, 0.94, 0.82), 0.5)
         * ((1.0 - foot) + (1.0 - head)) * 0.22;

    gl_FragColor = vec4(tone(col * 1.55), 1.0);
  }
`);

export const SHADER_PROGRAMS = { finaleBrand, pillarWrap } as const;

export type ShaderProgramId = keyof typeof SHADER_PROGRAMS;
