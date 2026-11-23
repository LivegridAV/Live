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
   * The closing image: a naked-eye 3D (anamorphic) stage background.
   *
   * Rendered once for the whole ~80 m array (each panel samples its own
   * slice), so the array reads as one window. Behind the window is a deep
   * dark vault; through it flows a liquid-chrome ribbon that swings toward
   * the audience and out past the frame plane. Above the invitation screen
   * floats the livegridAV signal grid as 25 glass blocks: the 18 lit cells
   * are aqua glass glowing from within, the 7 unlit cells are clear glass.
   * Every block reflects the studio and refracts the vault behind it, so the
   * logo sits in the space rather than on top of it.
   *
   * The illusion is built the way real anamorphic billboards are: a fixed
   * audience eye point, a box with visible depth, objects that cast shadows
   * into the box and break its front plane. Palette: chrome, champagne and
   * glass on rich black, with aqua only in the logo and a faint rim.
   */
  const float DEPTH = 5.5;          // how far the vault recedes behind the wall
  const float EYE = 3.2;            // audience eye distance in front of the wall
  const vec3 LOGO_C = vec3(0.0, 0.40, -0.35);   // just behind the wall, above the finale screens
  const float LOGO_S = 0.545;       // ~3 m overall
  const float PITCH = LOGO_S * 57.0 / 276.0;
  const float HALF = LOGO_S * 24.0 / 276.0;     // half of a 48/276 cell
  const float DEPTH_HALF = 0.045;
  const float ROUND = 0.012;

  float signalHeight(float c){
    if (c < 0.5) return 2.0;
    if (c < 1.5) return 4.0;
    if (c < 2.5) return 3.0;
    if (c < 3.5) return 5.0;
    return 4.0;
  }

  // The ribbon's centre line, as a function of x across the wall.
  vec2 ribbonPath(float x, float t){
    float y = 0.22 * sin(x * 0.55 + t * 0.35) - 0.12 + 0.08 * sin(x * 1.3 - t * 0.5);
    float z = -1.4 + 1.3 * sin(x * 0.42 - t * 0.28) + 0.25 * sin(x * 0.9 + t * 0.4);
    return vec2(y, z);
  }

  float ribbon(vec3 p, float t){
    vec2 c = ribbonPath(p.x, t);
    vec2 d = vec2(p.y - c.x, p.z - c.y);
    float a = p.x * 0.7 + t * 0.3;
    d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d;
    float r = 0.40 + 0.05 * sin(p.x * 2.1 + t * 0.9);
    return (length(d * vec2(1.0, 1.7)) - r) * 0.55;
  }

  // The logo's own frame: a slow turn so the glass shows its depth.
  vec3 logoLocal(vec3 p, float t){
    vec3 q = p - LOGO_C;
    float yaw = 0.38 * sin(t * 0.22);
    float tilt = 0.08 * sin(t * 0.17);
    q.xz = mat2(cos(yaw), sin(yaw), -sin(yaw), cos(yaw)) * q.xz;
    q.yz = mat2(cos(tilt), sin(tilt), -sin(tilt), cos(tilt)) * q.yz;
    return q;
  }

  vec2 logoCell(vec3 q){ return clamp(floor(q.xy / PITCH + 0.5), -2.0, 2.0); }

  float logo(vec3 p, float t){
    vec3 q = logoLocal(p, t);
    vec3 l = q - vec3(logoCell(q) * PITCH, 0.0);
    vec3 b = abs(l) - vec3(HALF - ROUND, HALF - ROUND, DEPTH_HALF - ROUND);
    return (length(max(b, 0.0)) + min(max(b.x, max(b.y, b.z)), 0.0) - ROUND) * 0.85;
  }

  vec3 ribbonNormal(vec3 p, float t){
    vec2 e = vec2(0.004, 0.0);
    return normalize(vec3(
      ribbon(p + e.xyy, t) - ribbon(p - e.xyy, t),
      ribbon(p + e.yxy, t) - ribbon(p - e.yxy, t),
      ribbon(p + e.yyx, t) - ribbon(p - e.yyx, t)));
  }

  vec3 logoNormal(vec3 p, float t){
    vec2 e = vec2(0.0015, 0.0);
    return normalize(vec3(
      logo(p + e.xyy, t) - logo(p - e.xyy, t),
      logo(p + e.yxy, t) - logo(p - e.yxy, t),
      logo(p + e.yyx, t) - logo(p - e.yyx, t)));
  }

  // A dark studio: two warm softbox strips, a cool top light, black elsewhere.
  vec3 studio(vec3 r){
    vec3 c = vec3(0.004, 0.005, 0.006);
    c += vec3(1.0, 0.84, 0.62) * smoothstep(0.86, 0.98, r.y) * 1.4;
    c += vec3(1.0, 0.86, 0.66) * exp(-pow((r.x - 0.62) * 9.0, 2.0)) * smoothstep(-0.2, 0.5, r.y) * 1.1;
    c += vec3(0.92, 0.88, 0.80) * exp(-pow((r.x + 0.70) * 11.0, 2.0)) * smoothstep(-0.4, 0.4, r.y) * 0.7;
    c += vec3(0.80, 0.86, 0.90) * smoothstep(-0.3, -0.9, r.y) * 0.08;
    return c;
  }

  // The vault's surfaces seen along a ray (an analytic box), with the
  // ribbon's shadow on the floor. Returns the colour; hb is the hit point.
  vec3 vault(vec3 o, vec3 rd, float A, float t, out vec3 hb){
    float tb = 1e3;
    vec3 nb = vec3(0.0, 0.0, 1.0);
    if (rd.x > 0.0) { float k = (A - o.x) / rd.x; if (k < tb) { tb = k; nb = vec3(-1, 0, 0); } }
    if (rd.x < 0.0) { float k = (-A - o.x) / rd.x; if (k < tb) { tb = k; nb = vec3(1, 0, 0); } }
    if (rd.y < 0.0) { float k = (-1.0 - o.y) / rd.y; if (k < tb) { tb = k; nb = vec3(0, 1, 0); } }
    if (rd.y > 0.0) { float k = (1.0 - o.y) / rd.y; if (k < tb) { tb = k; nb = vec3(0, -1, 0); } }
    if (rd.z < 0.0) { float k = (-DEPTH - o.z) / rd.z; if (k < tb) { tb = k; nb = vec3(0, 0, 1); } }
    hb = o + rd * tb;

    float depthFade = exp(hb.z * 0.32);
    vec3 col = vec3(0.016, 0.017, 0.019) * (0.6 + 0.4 * depthFade);
    // a warm glow on the back wall, so shapes read in silhouette
    if (nb.z > 0.5) col += vec3(0.30, 0.24, 0.17) * exp(-hb.y * hb.y * 2.5) * exp(-hb.x * hb.x * 0.04) * 0.22;
    // fine champagne seams that sell the depth
    vec2 g = nb.y != 0.0 ? hb.xz : nb.x != 0.0 ? hb.zy : hb.xy;
    vec2 cell = abs(fract(g * 0.9) - 0.5);
    float seam = smoothstep(0.012, 0.0, min(0.5 - cell.x, 0.5 - cell.y));
    col += vec3(0.62, 0.52, 0.38) * seam * 0.18 * depthFade;
    // the vault's mouth: a thin lit edge where its walls meet the wall plane
    col += vec3(0.85, 0.74, 0.56) * exp(hb.z * 9.0) * (nb.z == 0.0 ? 1.0 : 0.0) * 0.35;
    // warm light pooling on the floor, the ribbon's soft shadow on it
    if (nb.y > 0.5) {
      vec2 c = ribbonPath(hb.x, t);
      float shadow = 1.0 - 0.75 * exp(-pow((hb.z - c.y) * 1.6, 2.0));
      col += vec3(0.20, 0.16, 0.11) * exp(-pow(hb.z + 1.6, 2.0) * 0.35) * shadow * 0.6;
      col *= shadow;
    }
    // a faint aqua pool on the ceiling above the glowing logo
    if (nb.y < -0.5) col += uAccent * exp(-pow(hb.x * 2.2, 2.0) - pow((hb.z - LOGO_C.z) * 2.0, 2.0)) * 0.06;
    return col;
  }

  void main(){
    vec2 s = centred();               // x spans the wall (about +-7.3), y is -1..1
    float A = uAspect.x / uAspect.y;
    float t = uTime;

    // Ray from the audience eye through this point of the wall, into the vault.
    vec3 ro = vec3(0.0, -0.05, EYE);
    vec3 rd = normalize(vec3(s, 0.0) - ro);

    vec3 hb;
    vec3 col = vault(vec3(s, 0.0), rd, A, t, hb);
    float far = length(hb - ro);

    // March the ribbon and the glass logo together, starting at the eye so
    // both can come out of the wall.
    float d = 0.0, hit = -1.0, mat = 0.0, minL = 1e3;
    vec3 p = ro;
    for (int i = 0; i < 96; i++) {
      p = ro + rd * d;
      float hr = ribbon(p, t);
      float hl = logo(p, t);
      minL = min(minL, hl);
      float h = min(hr, hl);
      if (h < 0.0015) { hit = d; mat = hl < hr ? 1.0 : 0.0; break; }
      d += h;
      if (d > far) break;
    }

    float quiet = 1.0 - 0.35 * exp(-pow(s.x / 2.4, 4.0)) * exp(-s.y * s.y * 4.0);

    if (hit > 0.0 && mat < 0.5) {
      // liquid chrome
      vec3 n = ribbonNormal(p, t);
      vec3 r = reflect(rd, n);
      float fres = pow(1.0 - max(dot(-rd, n), 0.0), 4.0);
      vec3 chrome = mix(vec3(0.78, 0.76, 0.72), vec3(0.95, 0.80, 0.58), 0.35 + 0.25 * sin(p.x * 0.8 + t * 0.2));
      col = chrome * studio(r) * 1.7 + chrome * (0.07 + 0.08 * max(n.y, 0.0)) + uAccent * fres * 0.25;
      col *= quiet;
    } else if (hit > 0.0) {
      // glass signal grid
      vec3 n = logoNormal(p, t);
      vec3 q = logoLocal(p, t);
      vec2 idx = logoCell(q);
      vec2 l = abs(q.xy - idx * PITCH) / HALF;
      // bevelled edges catch the studio light, so even clear glass reads
      float edge = smoothstep(0.72, 0.98, max(l.x, l.y));
      float c = idx.x + 2.0, row = 2.0 - idx.y;          // row 0 at the top
      float lit = (5.0 - row) <= signalHeight(c) ? 1.0 : 0.0;
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
      vec3 refl = studio(reflect(rd, n));
      vec3 rr = refract(rd, n, 1.0 / 1.45);
      vec3 hb2;
      vec3 behind = vault(p + rr * 0.05, rr, A, t, hb2);
      float breathe = 0.85 + 0.15 * sin(t * 0.6 + c * 0.5 + row * 0.3);
      vec3 body = lit > 0.5
        ? behind * uAccent * 2.2 + uAccent * 0.55 * breathe            // aqua glass, glowing from within
        : behind * vec3(0.80, 0.86, 0.88) + vec3(0.05, 0.058, 0.062);  // clear, slightly smoky glass
      col = mix(body, refl * 1.6, fres);
      col += mix(vec3(0.62, 0.66, 0.66), vec3(0.75, 1.0, 0.96), lit) * edge * 0.45;
    } else {
      col *= quiet;
    }
    // the lit glass throws a soft aqua light into the space around it
    if (mat < 0.5) col += uAccent * exp(-minL * 34.0) * 0.22;

    gl_FragColor = vec4(tone(col * 1.05), 1.0);
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
