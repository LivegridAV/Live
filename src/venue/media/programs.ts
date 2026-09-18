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

/* ══════════════════════════════════════════════════════════
   Brand
   ══════════════════════════════════════════════════════════ */

/** The 5×5 signal grid, grown into a wall-sized LED matrix. */
const signalGrid = wrap(/* glsl */ `
  void main(){
    vec2 uv = vUv;
    // Derive the matrix from the surface aspect: a 6:1 brand band and a 1:1
    // tile both get square cells, instead of stretched lozenges.
    // Density matters: a sparse matrix on an eighteen-metre band reads as
    // half-metre diodes, which is the opposite of the fine-pitch product this
    // venue is selling. Keep the cells small enough to read as a display.
    float rows = max(8.0, floor(16.0 * sqrt(uAspect.y / uAspect.x) + 5.0));
    float cols = max(10.0, floor(rows * uAspect.x / uAspect.y));
    vec2 g = vec2(uv.x * cols, uv.y * rows);
    vec2 cell = floor(g);
    vec2 f = fract(g);

    // Column "signal bars" rise and fall like a level meter.
    float t = uTime * 0.55 + uVariant * 3.1;
    float h = 0.5 + 0.5 * sin(t + cell.x * 0.62 + sin(cell.x * 1.7) * 1.3);
    h = pow(h, 0.7) * rows;
    float lit = step(cell.y + 0.5, h);

    // Diagonal sweep of light across the matrix.
    float sweep = fract((cell.x / max(cols, 1.0) + (rows - cell.y) / max(rows, 1.0)) * 0.5 - uTime * 0.16);
    float pulse = smoothstep(0.0, 0.12, sweep) * smoothstep(0.30, 0.10, sweep);

    float d = length(f - 0.5);
    float dot_ = smoothstep(0.40, 0.18, d);

    vec3 base = vec3(0.012, 0.028, 0.026);
    vec3 dim  = vec3(0.05, 0.10, 0.096);
    vec3 on   = uAccent;

    vec3 col = base;
    col = mix(col, dim, dot_ * 0.9);
    col = mix(col, on * 1.25, dot_ * lit * (0.55 + 0.45 * pulse));
    col += on * dot_ * pulse * 0.5;

    // Soft bloom bed so the matrix reads as emission, not flat colour.
    col += on * lit * 0.05 * smoothstep(1.0, 0.0, d);
    gl_FragColor = vec4(tone(col * 1.15), 1.0);
  }
`);

/** Dimensional wordmark sweep — big type moving through light. */
const brandType = wrap(/* glsl */ `
  // Blocky glyph field standing in for extruded type: bars of varying width
  // sweeping through a raking light. Reads as monumental typography in motion.
  void main(){
    vec2 p = centred();
    float t = uTime * 0.22 + uVariant;

    float acc = 0.0;
    for (int i = 0; i < 7; i++){
      float fi = float(i);
      float depth = 1.0 + fi * 0.42;
      vec2 q = p * depth;
      q.x += t * (1.6 + fi * 0.25) - fi * 2.1;
      float bar = abs(fract(q.x * 0.28) - 0.5);
      float wide = 0.14 + 0.1 * hash11(floor(q.x * 0.28) + fi * 13.0);
      float m = smoothstep(wide, wide - 0.04, bar);
      m *= smoothstep(1.3, 0.55, abs(q.y));
      acc += m / depth * 0.9;
    }

    float rake = smoothstep(1.4, -0.4, p.x + sin(uTime * 0.3) * 1.2);
    vec3 metal = mix(vec3(0.05, 0.055, 0.062), vec3(0.34, 0.355, 0.375), rake);
    vec3 col = metal * acc * 0.8;
    col += uAccent * acc * rake * 0.4;
    col += vec3(0.006, 0.012, 0.012);
    gl_FragColor = vec4(tone(col), 1.0);
  }
`);

/* ══════════════════════════════════════════════════════════
   Tunnel — four faces, one environment
   ══════════════════════════════════════════════════════════ */

/**
 * The four tunnel surfaces share this program. The pattern is driven mainly by
 * `v` (depth along the tunnel) and only lightly by `u` (across the surface),
 * so the visuals line up perfectly at every seam and the visitor reads one
 * continuous environment rather than four screens.
 */
const tunnelFlow = wrap(/* glsl */ `
  void main(){
    float v = vUv.y;              // 0 at entry, 1 at the exit
    float u = vUv.x;
    float t = uTime;

    // ── particles travelling toward the exit ──
    float streams = 0.0;
    float warmStreams = 0.0;
    for (int i = 0; i < 6; i++){
      float fi = float(i);
      float lanes = 3.0 + fi * 1.5;
      float laneId = floor(u * lanes + fi * 0.37);
      float lane = fract(u * lanes + fi * 0.37);
      float speed = 0.22 + hash11(laneId + fi * 9.1) * 0.42;
      float ph = fract(v - t * speed + hash11(laneId * 2.3 + fi));
      float head = smoothstep(0.0, 0.006, ph) * smoothstep(0.16, 0.01, ph);
      float across = smoothstep(0.5, 0.06, abs(lane - 0.5));
      float w = hash11(laneId * 3.1 + fi * 5.0);
      streams += head * across * (0.45 + 0.55 * w);
      if (w > 0.72) warmStreams += head * across;
    }
    streams *= 0.5;
    warmStreams *= 0.5;

    // ── structural bands pulling toward the vanishing point ──
    float bands = sin(v * 34.0 - t * 3.0 + sin(v * 3.0 + t * 0.4) * 1.2);
    bands = pow(smoothstep(0.72, 1.0, bands), 1.6);
    bands *= smoothstep(0.0, 0.3, v) * smoothstep(1.0, 0.85, v);

    // ── slow drifting volume so no surface is ever empty ──
    float haze = fbm(vec2(u * 2.0, v * 6.0 - t * 0.3));
    haze = pow(haze, 3.0);

    // A single travelling sweep down the whole tunnel, every few seconds.
    float sweep = fract(t * 0.085);
    float pulse = smoothstep(0.0, 0.05, v - sweep + 0.05) * smoothstep(0.16, 0.02, v - sweep + 0.05);

    // ── grade ──
    // Graphite and silver carry the image; amber is the light at the end of
    // the tunnel; teal is a rim accent only. A corridor washed entirely in
    // cyan is exactly the AI-template look the brief rules out.
    vec3 base   = vec3(0.008, 0.013, 0.015);
    vec3 silver = vec3(0.62, 0.68, 0.72);
    vec3 warm   = vec3(1.0, 0.62, 0.28);
    vec3 accent = uAccent;

    vec3 col = base;
    col += vec3(0.06, 0.085, 0.09) * haze * 0.9;
    col += silver * bands * 0.34;
    col += accent * bands * 0.1;
    col += silver * streams * 0.62;
    col += warm * warmStreams * 0.6;
    col += accent * streams * 0.22;
    col += mix(silver, accent, 0.45) * pulse * 0.55;

    // The exit glow, and a soft falloff into the entry so the tunnel has depth.
    col += warm * 0.30 * pow(smoothstep(0.66, 1.0, v), 2.2);
    col *= mix(0.55, 1.0, smoothstep(0.0, 0.22, v));

    gl_FragColor = vec4(tone(col * 1.15), 1.0);
  }
`);

/* ══════════════════════════════════════════════════════════
   Abstract content families
   ══════════════════════════════════════════════════════════ */

/** Flowing metallic forms — brushed, anisotropic, expensive-looking. */
const liquidMetal = wrap(/* glsl */ `
  void main(){
    vec2 p = centred();
    float t = uTime * 0.13 + uVariant * 2.0;

    // Long horizontal flow lines, warped just enough to feel liquid. fbm on
    // its own reads as marble; it is the directional grain that makes metal.
    vec2 q = vec2(p.x * 0.55, p.y * 1.7);
    float warp = fbm(q * 0.9 + vec2(t, -t * 0.4));
    q.y += (warp - 0.5) * 0.42;
    q.x += fbm(q * 0.5 - vec2(t * 0.6, 0.0)) * 0.5;

    // Stacked ribbons of varying width sliding past each other.
    float grain = sin(q.y * 6.5 + q.x * 2.4 + sin(q.x * 0.7 + t) * 1.6 + warp * 2.2);
    float ribbon = smoothstep(-0.2, 0.9, grain);
    float edge = pow(1.0 - abs(grain), 8.0);

    // Slope of the ribbon field → a believable anisotropic highlight.
    float e = 0.02;
    float g2 = sin((q.y + e) * 6.5 + q.x * 2.4 + sin(q.x * 0.7 + t) * 1.6 + warp * 2.2);
    float slope = (g2 - grain) / e;
    float spec = pow(clamp(1.0 - abs(slope) * 0.08, 0.0, 1.0), 24.0);

    // A raking key travelling across the surface.
    float rake = smoothstep(1.8, -0.6, p.x - sin(t * 1.4) * 1.6);

    vec3 dark  = vec3(0.020, 0.023, 0.026);
    vec3 steel = vec3(0.46, 0.49, 0.53);
    vec3 hot   = vec3(1.0, 0.88, 0.70);

    vec3 col = mix(dark, steel, ribbon * (0.35 + 0.65 * rake));
    col += hot * spec * (0.35 + 0.65 * rake) * 1.4;
    col += mix(uAccent, hot, 0.35) * edge * 0.55;
    col += uAccent * ribbon * 0.06;
    gl_FragColor = vec4(tone(col * 1.1), 1.0);
  }
`);

/** Volumetric particle drift with depth falloff. */
const volumetric = wrap(/* glsl */ `
  void main(){
    vec2 p = centred();
    float t = uTime * 0.1 + uVariant * 4.0;
    vec3 col = vec3(0.008, 0.016, 0.019);

    // Four well-separated depth planes. A dense field of tiny points reads as
    // sensor noise; a few large, soft, parallaxing motes read as volume.
    for (int L = 0; L < 4; L++){
      float fl = float(L);
      float depth = 0.5 + fl * 0.55;
      vec2 q = p / depth;
      q += vec2(t * (0.16 + fl * 0.1), -t * (0.3 + fl * 0.12));
      q *= rot(fl * 0.5);

      vec2 g = q * (1.9 + fl * 1.1);
      vec2 id = floor(g);
      vec2 f = fract(g) - 0.5;
      vec2 off = (hash22(id + fl * 31.0) - 0.5) * 0.55;
      float d = length(f - off);

      float size = (0.16 + 0.16 * hash21(id + fl * 7.0)) / (1.0 + fl * 0.25);
      float core = smoothstep(size, size * 0.15, d);
      float halo = smoothstep(size * 5.0, 0.0, d);
      float breathe = 0.5 + 0.5 * sin(t * 1.4 + hash21(id) * TAU);

      vec3 tint = mix(uAccent, vec3(0.98, 0.80, 0.55), hash21(id + 3.7) * 0.7);
      float near = 1.0 / (depth * 1.6);
      col += tint * core * breathe * near * 0.85;
      col += tint * halo * near * 0.1;
    }

    // A slow drifting volume behind them so the blacks are never empty.
    float vol = fbm(p * 0.9 + vec2(t * 0.4, -t * 0.25));
    col += mix(uAccent, vec3(0.5, 0.62, 0.7), 0.5) * pow(vol, 2.5) * 0.28;
    gl_FragColor = vec4(tone(col * 1.15), 1.0);
  }
`);

/** Interference wave field — spatial, calm, architectural. */
const spatialWaves = wrap(/* glsl */ `
  void main(){
    vec2 p = centred();
    float t = uTime * 0.36 + uVariant * 5.0;

    float acc = 0.0;
    for (int i = 0; i < 6; i++){
      float fi = float(i);
      vec2 src = vec2(cos(fi * 2.1 + t * 0.21), sin(fi * 1.7 + t * 0.26)) * (1.0 + fi * 0.2);
      float d = length(p - src);
      acc += sin(d * (6.0 + fi * 1.4) - t * (1.5 + fi * 0.22)) / (1.0 + d * 0.8);
    }
    acc /= 3.2;

    // Contour lines across the interference field. The field on its own was a
    // set of soft blobs — pleasant at thumbnail size, mush on a six-metre
    // cylinder. The contours are what give it structure to resolve.
    float contour = pow(0.5 + 0.5 * sin(acc * 26.0 - t * 2.0), 26.0);

    // Sharp crests read at distance; a soft field does not.
    float crest = pow(max(acc, 0.0), 3.0);
    float trough = pow(max(-acc, 0.0), 3.2);
    float ridge = smoothstep(0.1, 0.8, abs(acc));

    vec3 deep  = vec3(0.012, 0.028, 0.034);
    vec3 body  = mix(vec3(0.09, 0.22, 0.26), uAccent * 0.75, 0.55);
    vec3 warm  = vec3(1.0, 0.72, 0.4);

    vec3 col = mix(deep, body, ridge);
    col += uAccent * crest * 2.1;
    col += vec3(0.95, 0.99, 1.0) * pow(crest, 3.0) * 1.1;
    col += warm * trough * 0.75;
    col += mix(vec3(0.85, 0.94, 0.96), uAccent, 0.4) * contour * 0.9;
    gl_FragColor = vec4(tone(col * 1.2), 1.0);
  }
`);

/** Impossible architecture — raymarched repeating structure with real depth. */
const architecture = wrap(/* glsl */ `
  float box(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }

  float map(vec3 p, out float id){
    vec3 q = p;
    q.z += uTime * 1.6;
    vec3 c = vec3(3.2, 3.2, 4.4);
    vec3 cell = floor((q + 0.5 * c) / c);
    q = mod(q + 0.5 * c, c) - 0.5 * c;
    float r = hash21(cell.xy + cell.z * 7.3);
    id = r;
    vec3 size = vec3(0.35 + r * 0.7, 0.9 + r * 1.1, 0.35 + r * 0.5);
    float d = box(q, size);
    float frame = box(q, size * vec3(1.35, 0.06, 1.35));
    return min(d, frame);
  }

  void main(){
    vec2 p = centred();
    vec3 ro = vec3(sin(uTime * 0.13) * 0.9, cos(uTime * 0.1) * 0.5, 0.0);
    vec3 rd = normalize(vec3(p, 1.7));
    rd.xy *= rot(sin(uTime * 0.07) * 0.14);

    float t = 0.0, id = 0.0, hitId = 0.0;
    float glow = 0.0;
    bool hit = false;
    for (int i = 0; i < 46; i++){
      vec3 pos = ro + rd * t;
      float d = map(pos, id);
      glow += 0.012 / (0.6 + d * d * 9.0);
      if (d < 0.004){ hit = true; hitId = id; break; }
      t += d * 0.85;
      if (t > 26.0) break;
    }

    vec3 col = vec3(0.01, 0.018, 0.022);
    if (hit){
      vec3 pos = ro + rd * t;
      float e = 0.004; float dummy;
      vec3 n = normalize(vec3(
        map(pos + vec3(e,0,0), dummy) - map(pos - vec3(e,0,0), dummy),
        map(pos + vec3(0,e,0), dummy) - map(pos - vec3(0,e,0), dummy),
        map(pos + vec3(0,0,e), dummy) - map(pos - vec3(0,0,e), dummy)));
      vec3 l = normalize(vec3(0.4, 0.75, -0.5));
      float diff = max(dot(n, l), 0.0);
      float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
      vec3 mat = mix(vec3(0.035, 0.038, 0.042), vec3(0.15, 0.14, 0.135), hitId);
      col = mat * (0.1 + diff * 0.62);
      col += uAccent * fres * 0.75;
      col += vec3(0.95, 0.62, 0.3) * pow(diff, 22.0) * 0.8;
      col *= exp(-t * 0.075);
    }
    col += uAccent * glow * 0.42;
    col += vec3(0.9, 0.58, 0.3) * glow * 0.3;
    gl_FragColor = vec4(tone(col * 1.25), 1.0);
  }
`);

/** Immersive nature abstraction — real natural colour, no neon. */
const naturalFlow = wrap(/* glsl */ `
  void main(){
    vec2 p = centred() * 0.85;
    float t = uTime * 0.09 + uVariant * 3.0;

    vec2 q = p;
    q += vec2(fbm(q * 1.1 + t), fbm(q * 1.1 + 4.0 - t)) * 1.2;
    float f = fbm(q * 1.6 + vec2(0.0, t * 0.6));
    float g = fbm(q * 3.2 - vec2(t * 0.4, 0.0));

    // Forest-canopy / low-sun grade: deep greens, moss, amber light shafts.
    vec3 shadow = vec3(0.016, 0.034, 0.026);
    vec3 moss   = vec3(0.10, 0.20, 0.12);
    vec3 leaf   = vec3(0.26, 0.34, 0.16);
    vec3 sun    = vec3(0.98, 0.72, 0.36);

    vec3 col = mix(shadow, moss, smoothstep(0.32, 0.6, f));
    col = mix(col, leaf, smoothstep(0.54, 0.8, f));

    // Hard-edged light shafts through the canopy give the surface structure;
    // without them the whole panel reads as one flat green wash.
    float shaft = pow(max(0.0, sin(p.x * 2.1 + p.y * 2.9 + t * 0.7)), 14.0);
    shaft *= smoothstep(0.25, 0.85, g);
    col += sun * shaft * 1.5;
    col += sun * pow(max(0.0, f - 0.68), 1.6) * 2.2;
    // deepen the shadows so the highlights have somewhere to read against
    col *= 0.55 + 0.75 * smoothstep(0.15, 0.7, f);
    col += uAccent * 0.04 * g;

    gl_FragColor = vec4(tone(col * 1.15), 1.0);
  }
`);

/** Flowing ribbons — designed for curved and cylindrical surfaces. */
const plasmaRibbon = wrap(/* glsl */ `
  void main(){
    vec2 p = centred();
    float t = uTime * 0.35 + uVariant * 6.0;
    vec3 col = vec3(0.012, 0.022, 0.026);

    for (int i = 0; i < 6; i++){
      float fi = float(i);
      float off = fi * 0.9;
      float y = sin(p.x * (1.1 + fi * 0.28) + t * (0.6 + fi * 0.13) + off) * (0.35 + fi * 0.08);
      y += sin(p.x * 2.7 - t * 0.9 + off) * 0.14;
      float d = abs(p.y - y);
      float w = 0.035 + 0.03 * sin(t + fi);
      float line = smoothstep(w, 0.0, d);
      float halo = smoothstep(w * 9.0, 0.0, d);
      vec3 tint = pal(fi * 0.14 + t * 0.03,
        vec3(0.35, 0.3, 0.28), vec3(0.32, 0.26, 0.2),
        vec3(1.0, 0.9, 0.85), vec3(0.0, 0.18, 0.42));
      tint = mix(tint, uAccent, 0.35);
      col += tint * (line * 1.2 + halo * 0.12);
    }
    gl_FragColor = vec4(tone(col * 1.2), 1.0);
  }
`);

/** Vertical pixel rain — built for tall, narrow blades. */
const pixelRain = wrap(/* glsl */ `
  void main(){
    vec2 uv = vUv;
    // One comet per blade: the column count follows the source aspect, so a
    // wide texture sliced across eight blades still gives each one its own.
    float cols = max(3.0, floor(4.5 * uAspect.x / uAspect.y));
    float x = floor(uv.x * cols);
    float fx = fract(uv.x * cols);
    float t = uTime * 0.5 + uVariant * 11.0;

    // Each column runs one clean, long comet rather than a field of noise —
    // a blade reads as designed content at a glance, static reads as a fault.
    float speed = 0.30 + hash11(x * 1.7 + 3.0) * 0.28;
    float len   = 0.42 + hash11(x * 5.3) * 0.34;
    float ph    = fract(uv.y + t * speed + hash11(x * 7.7));

    float trail = pow(smoothstep(len, 0.0, ph), 1.8);
    float head  = smoothstep(0.045, 0.0, ph);

    // Soft column shoulders keep the emitters from looking like a bar chart.
    float across = smoothstep(0.0, 0.16, fx) * smoothstep(1.0, 0.84, fx);

    // A slow swell travelling up the blade, shared by every column.
    float swell = 0.55 + 0.45 * sin(uv.y * 3.0 - uTime * 0.6 + uVariant * 4.0);

    vec3 base = vec3(0.010, 0.020, 0.022);
    vec3 tint = mix(uAccent, vec3(0.94, 0.76, 0.46), hash11(x * 2.2) * 0.45);

    vec3 col = base;
    col += tint * trail * across * swell * 0.95;
    col += mix(tint, vec3(1.0), 0.6) * head * across * 1.1;
    col += tint * 0.05 * across;
    gl_FragColor = vec4(tone(col * 1.2), 1.0);
  }
`);

/** LED format study — the "what LED can be" showcase content. */
const ledFormats = wrap(/* glsl */ `
  void main(){
    vec2 uv = vUv;
    float t = uTime * 0.3 + uVariant;
    // A wall assembling itself from panels, over and over.
    float cols = 8.0, rows = 5.0;
    vec2 g = vec2(uv.x * cols, uv.y * rows);
    vec2 id = floor(g); vec2 f = fract(g);
    float order = id.x + (rows - id.y) * 1.7;
    float ph = fract(t * 0.16 - order * 0.035);
    float on = smoothstep(0.0, 0.06, ph) * smoothstep(0.96, 0.62, ph);

    float border = smoothstep(0.02, 0.05, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
    float inner = fbm(vec2(id.x * 0.6, id.y * 0.7) + t * 0.35);

    vec3 col = vec3(0.012, 0.022, 0.024);
    vec3 face = mix(vec3(0.05, 0.09, 0.1), uAccent * 0.9, inner);
    col = mix(col, face, on * border);
    col += uAccent * (1.0 - border) * on * 0.35;      // panel seams glow
    col += vec3(0.9, 0.66, 0.38) * pow(on, 6.0) * 0.4; // warm snap as it lands
    gl_FragColor = vec4(tone(col * 1.2), 1.0);
  }
`);

/* ══════════════════════════════════════════════════════════
   Anamorphic / naked-eye 3D
   ══════════════════════════════════════════════════════════ */

/**
 * A void cut into the wall. Raymarched from a fixed virtual viewpoint so that,
 * seen from the intended corner position, the box reads as real depth behind
 * the LED rather than a picture on it.
 */
const anamorphicVoid = wrap(/* glsl */ `
  float box(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }

  /** The suspended sculpture inside the void — this is all the marcher does. */
  float sculpt(vec3 p){
    vec3 q = p - vec3(0.0, sin(uTime * 0.35) * 0.10, 2.30);
    q.xz *= rot(uTime * 0.30);
    q.yz *= rot(sin(uTime * 0.21) * 0.45);
    float shell = box(q, vec3(0.40)) - 0.055;
    shell = max(shell, -(box(q, vec3(0.30)) - 0.055));      // hollow it out
    float ring = length(vec2(length(q.xz) - 0.74, q.y)) - 0.042;
    vec3 r = q; r.yz *= rot(1.5707963);
    float ring2 = length(vec2(length(r.xz) - 0.74, r.y)) - 0.042;
    return min(shell, min(ring, ring2));
  }

  void main(){
    // The illusion is rendered from where the visitor actually stands: 2.6 m
    // back, on the bisector of the fold. The venue puts the camera path there.
    vec2 p = centred();
    vec3 ro = vec3(0.0, 0.0, -2.6);
    vec3 rd = normalize(vec3(p * 1.25, 2.6));

    // ── the room behind the wall ──
    // Solved analytically rather than marched: a signed box is negative at the
    // ray origin, so a marcher started outside it registers an instant hit and
    // the whole void renders as flat shading.
    vec3 bmin = vec3(-1.35, -1.05, 0.0);
    vec3 bmax = vec3( 1.35,  1.05, 5.6);
    vec3 inv = 1.0 / rd;
    vec3 t1 = (bmin - ro) * inv;
    vec3 t2 = (bmax - ro) * inv;
    vec3 tmaxv = max(t1, t2);
    float tWall = min(min(tmaxv.x, tmaxv.y), tmaxv.z);

    vec3 wp = ro + rd * tWall;
    // which wall did we land on?
    vec3 dmin = abs(wp - bmin);
    vec3 dmax = abs(wp - bmax);
    bool isBack = dmax.z < 0.01;
    // A perspective grid on every surface: the thing that actually sells depth.
    vec2 gv = isBack ? wp.xy : (abs(wp.x) > 1.3 ? wp.zy : wp.xz);
    vec2 gf = abs(fract(gv * 2.2) - 0.5);
    float grid = smoothstep(0.46, 0.5, max(gf.x, gf.y));
    float depthFade = exp(-wp.z * 0.34);

    vec3 col = vec3(0.004, 0.007, 0.009);
    col += mix(vec3(0.05, 0.055, 0.06), uAccent * 0.5, 0.35) * grid * depthFade * 1.6;
    col += vec3(0.02, 0.03, 0.034) * depthFade;
    // a light source deep in the void
    col += vec3(1.0, 0.72, 0.4) * pow(max(0.0, 1.0 - length(wp.xy) * 0.8), 6.0) * 0.6;

    // ── the sculpture ──
    float t = 0.0;
    bool hit = false;
    for (int i = 0; i < 56; i++){
      vec3 pos = ro + rd * t;
      float d = sculpt(pos);
      if (d < 0.0025){ hit = true; break; }
      t += d * 0.92;
      if (t > tWall) break;
    }

    if (hit){
      vec3 pos = ro + rd * t;
      float e = 0.0025;
      vec3 n = normalize(vec3(
        sculpt(pos + vec3(e,0,0)) - sculpt(pos - vec3(e,0,0)),
        sculpt(pos + vec3(0,e,0)) - sculpt(pos - vec3(0,e,0)),
        sculpt(pos + vec3(0,0,e)) - sculpt(pos - vec3(0,0,e))));
      vec3 key = normalize(vec3(0.55, 0.75, -0.35));
      float diff = max(dot(n, key), 0.0);
      float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.5);
      vec3 mat = vec3(0.10, 0.105, 0.115);
      col = mat * (0.1 + diff * 0.9);
      col += vec3(1.0, 0.9, 0.74) * pow(diff, 28.0) * 1.5;
      col += uAccent * fres * 1.0;
    }

    // The frame of the opening: a hard edge is what makes it a hole, not a poster.
    float vig = smoothstep(1.45, 0.7, length(p));
    col *= 0.2 + 0.8 * vig;
    gl_FragColor = vec4(tone(col * 1.35), 1.0);
  }
`);

/* ══════════════════════════════════════════════════════════
   Stage modes
   ══════════════════════════════════════════════════════════ */

/** Corporate: restrained, architectural, premium. Never PowerPoint blue. */
const corporatePremium = wrap(/* glsl */ `
  float rule(float x, float period, float sharp){
    float f = abs(fract(x / period) * 2.0 - 1.0);
    return pow(f, sharp);
  }

  /**
   * Corporate: the wall as a window, not a picture.
   *
   * An earlier version was a field of sliding panels under a raking key, and
   * on a forty-metre canvas seen from twenty metres it resolved into a beige
   * wash — the exact "low-quality gradient screen" failure. This builds an
   * architectural volume instead: a corridor of illuminated fins receding to a
   * lit aperture, with suspended slabs catching the light on the way in. It
   * has real depth, it holds up at scale, and it stays graphite.
   *
   * Exposure is set high on purpose. A show wall is the brightest object in
   * its room — that is the entire point of the product — and at the levels
   * this ran at before, a 22 m canvas read as mid-grey line-work from the
   * hero position and the arena looked unlit. Content carries the room.
   */
  void main(){
    vec2 p = centred();
    float t = uTime * 0.55 + uVariant * 9.0;

    vec3 ro = vec3(0.0);
    vec3 rd = normalize(vec3(p.x, p.y, 1.7));

    const float HX = 1.45;
    const float HY = 0.92;
    const float ZF = 26.0;

    float tX = 1e9, tY = 1e9;
    if (abs(rd.x) > 1e-4) tX = (rd.x > 0.0 ? HX : -HX) / rd.x;
    if (abs(rd.y) > 1e-4) tY = (rd.y > 0.0 ? HY : -HY) / rd.y;
    float tZ = ZF / max(rd.z, 1e-4);
    float tb = min(min(tX, tY), tZ);
    vec3 hit = ro + rd * tb;

    vec3 col = vec3(0.010, 0.013, 0.016);

    if (tZ <= tX && tZ <= tY) {
      // The aperture at the far end: the brightest thing in the composition,
      // and the reason the eye goes to the centre of the wall.
      float r = length(vec2(hit.x, hit.y * 1.25));
      col += vec3(0.62, 0.70, 0.82) * exp(-r * r * 0.42) * 2.9;
      col += uAccent * exp(-r * r * 1.1) * 1.15;
      // a warm bloom bed around the aperture, so the brightest thing in the
      // room is not a cold hole
      col += vec3(0.42, 0.31, 0.19) * exp(-r * r * 0.14) * 0.55;
    } else {
      float axis = (tY < tX) ? 1.0 : 0.0;
      float zf = hit.z + t;
      float tr = mix(hit.y, hit.x, axis);
      float ribs = rule(zf, 1.35, 70.0);
      float fine = rule(zf, 0.3375, 150.0) * 0.28;
      float cross = rule(tr, 0.42, 170.0) * 0.35;
      float body = fbm(vec2(zf * 0.35, tr * 1.4));
      float fade = exp(-hit.z * 0.065);
      col += vec3(0.19, 0.23, 0.29) * (0.16 + body * 0.52) * fade;
      col += vec3(0.82, 0.88, 0.98) * (ribs + fine + cross) * 1.62 * fade;
      col += uAccent * ribs * 0.85 * fade;
      // a warm graze along the floor and ceiling of the volume
      col += vec3(0.60, 0.44, 0.26) * pow(clamp(abs(tr) / 1.2, 0.0, 1.0), 3.0) * fade * 0.5;
      col += vec3(0.44, 0.50, 0.60) * (1.0 - fade) * 0.3;
    }

    // Suspended slabs between here and the aperture.
    float trans = 1.0;
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 7; i++){
      float fi = float(i);
      float zl = 1.6 + fi * 3.0 - mod(t, 3.0);
      if (zl <= 0.25) continue;
      float tl = zl / max(rd.z, 1e-4);
      if (tl >= tb) continue;
      vec3 pl = ro + rd * tl;
      vec2 cell = floor(pl.xy / 0.5);
      float occupied = step(0.58, hash21(cell + fi * 11.0));
      vec2 f = abs(fract(pl.xy / 0.5) - 0.5);
      float m = max(f.x, f.y);
      float edge = clamp(smoothstep(0.5, 0.44, m) - smoothstep(0.42, 0.34, m), 0.0, 1.0);
      float a = occupied * edge * smoothstep(0.35, 0.8, length(pl.xy)) * 0.55;
      a *= smoothstep(0.0, 1.5, zl) * smoothstep(26.0, 11.0, zl);
      vec3 slab = mix(vec3(0.92, 1.00, 1.12), uAccent, 0.26) * (0.6 + 0.6 * hash11(fi));
      acc += trans * slab * a;
      trans *= 1.0 - a;
    }
    col = acc + trans * col;

    // One slow raking sweep. Restrained on purpose: corporate does not mean
    // boring, but it does mean controlled.
    float rake = exp(-pow((p.x - sin(uTime * 0.16) * 1.6) * 0.85, 2.0));
    col *= 0.9 + 0.45 * rake;

    gl_FragColor = vec4(tone(col * 1.95), 1.0);
  }
`);

/**
 * Festival: a monumental original sculpture — a dimensional mask emerging from
 * a portal, with particles and deep spatial architecture. Original geometry;
 * no reference to any existing festival's artwork or identity.
 */
const festivalMonument = wrap(/* glsl */ `
  /**
   * A monumental faceted sculpture turning inside a receding portal.
   *
   * Deliberately architectural rather than figurative: a face or a creature
   * built from blended primitives reads as a cartoon at a glance, which is the
   * one thing a festival wall must never do. Three interlocking blades around
   * a crystalline core, with shards in orbit — original geometry, with no
   * reference to any existing festival's artwork or identity.
   */
  float shard(vec3 p, vec3 s){
    vec3 q = p / s;
    // octahedron: hard facets and a sharp silhouette, scaled back to a
    // conservative distance so the march stays stable under the anisotropy
    return (abs(q.x) + abs(q.y) + abs(q.z) - 1.0) * 0.5774 * min(s.x, min(s.y, s.z));
  }

  float monolith(vec3 p){
    p.xz *= rot(uTime * 0.16);
    float d = shard(p, vec3(0.52, 0.9, 0.52));

    for (int i = 0; i < 3; i++){
      vec3 q = p;
      q.xz *= rot(float(i) * 2.0944);
      q.x -= 0.4;
      q.xy *= rot(0.2);
      d = min(d, shard(q, vec3(0.44, 1.62, 0.21)));
    }

    // a slot cut through the core, so light passes through the form
    vec3 c = p; c.xz *= rot(0.7854);
    d = max(d, -max(abs(c.x) - 0.1, abs(c.z) - 1.4));

    for (int i = 0; i < 4; i++){
      float fi = float(i);
      float a = fi * 1.5708 + uTime * 0.32;
      vec3 r = p - vec3(cos(a) * 1.62, sin(uTime * 0.4 + fi * 1.7) * 0.62, sin(a) * 1.62);
      r.xy *= rot(uTime * 0.6 + fi);
      d = min(d, shard(r, vec3(0.2, 0.36, 0.2)));
    }
    return d;
  }

  float portal(vec3 p){
    float d = 1e9;
    for (int i = 0; i < 5; i++){
      float fi = float(i);
      float z = 1.1 + fi * 1.45 + mod(uTime * 0.55, 1.45);
      float rad = 1.9 + fi * 0.55;
      d = min(d, length(vec2(length(p.xy) - rad, p.z - z)) - 0.035);
    }
    return d;
  }

  float map(vec3 p, out float m){
    float a = monolith(p - vec3(0.0, 0.0, 0.35));
    float b = portal(p);
    m = b < a ? 1.0 : 0.0;
    return min(a, b);
  }

  void main(){
    vec2 p = centred();
    vec3 ro = vec3(0.0, 0.0, -4.0);
    vec3 rd = normalize(vec3(p, 2.5));

    float t = 0.0; bool hit = false; float m = 0.0, hm = 0.0; float glow = 0.0;
    for (int i = 0; i < 52; i++){
      vec3 pos = ro + rd * t;
      float d = map(pos, m);
      glow += 0.012 / (0.45 + d * d * 14.0);
      // Cone tracing: the hit threshold widens with distance, which keeps the
      // silhouette from shimmering when the render is stretched across forty
      // metres of wall.
      if (d < 0.0016 + t * 0.0013){ hit = true; hm = m; break; }
      t += d * 0.85;
      if (t > 20.0) break;
    }

    vec3 col = vec3(0.020, 0.008, 0.028);

    if (hit){
      vec3 pos = ro + rd * t;
      float e = 0.003; float dm;
      vec3 n = normalize(vec3(
        map(pos + vec3(e,0,0), dm) - map(pos - vec3(e,0,0), dm),
        map(pos + vec3(0,e,0), dm) - map(pos - vec3(0,e,0), dm),
        map(pos + vec3(0,0,e), dm) - map(pos - vec3(0,0,e), dm)));
      vec3 key = normalize(vec3(0.45, 0.8, -0.55));
      vec3 rim = normalize(vec3(-0.85, 0.15, -0.35));
      vec3 back = normalize(vec3(0.1, -0.5, 0.85));
      float diff = max(dot(n, key), 0.0);
      float rimL = pow(max(dot(n, rim), 0.0), 2.0);
      float backL = pow(max(dot(n, back), 0.0), 3.0);
      float fres = pow(1.0 - max(dot(n, -rd), 0.0), 2.6);
      vec3 h = normalize(key - rd);
      float spec = pow(max(dot(n, h), 0.0), 90.0);

      if (hm > 0.5){
        // the portal rings are pure light
        col = uAccent * 2.4 + vec3(1.0, 0.42, 0.26) * 0.7;
      } else {
        // A cool stone that warms where it faces the key, so the facets read
        // as material rather than as flat shading.
        vec3 stone = mix(vec3(0.035, 0.032, 0.048), vec3(0.30, 0.26, 0.31), diff);
        stone = mix(stone, stone * vec3(1.25, 1.02, 0.86), pow(diff, 1.6) * 0.7);
        col = stone;
        col += vec3(1.0, 0.45, 0.2) * rimL * 1.2;
        col += uAccent * fres * 1.45;
        col += uAccent * backL * 0.5;
        col += vec3(1.0, 0.95, 0.88) * spec * 1.6;
        // a faint internal glow through the cut slot
        col += uAccent * pow(max(0.0, 1.0 - abs(pos.x) * 2.4), 6.0) * 0.5;
      }
      col *= exp(-max(0.0, t - 3.2) * 0.1);
    }

    // embers rising through the frame
    for (int i = 0; i < 3; i++){
      float fi = float(i);
      vec2 g = p * (2.6 + fi * 2.2);
      g.y += uTime * (0.22 + fi * 0.17);
      vec2 id = floor(g); vec2 f = fract(g) - 0.5;
      vec2 off = (hash22(id + fi * 17.0) - 0.5) * 0.7;
      float d = length(f - off);
      float flick = 0.55 + 0.45 * sin(uTime * 3.0 + hash21(id) * TAU);
      col += vec3(1.0, 0.48, 0.18) * smoothstep(0.055, 0.0, d) * flick * 0.75;
    }

    col += (uAccent * 0.6 + vec3(0.85, 0.25, 0.4) * 0.4) * glow * 0.8;
    gl_FragColor = vec4(tone(col * 2.28), 1.0);
  }
`);

/** Projection-mapped façade content. */
const mappingFacade = wrap(/* glsl */ `
  void main(){
    vec2 uv = vUv;
    float t = uTime * 0.3;
    // Architectural elements lighting up in sequence, like a mapped building.
    float cols = 6.0, rows = 4.0;
    vec2 g = vec2(uv.x * cols, uv.y * rows);
    vec2 id = floor(g); vec2 f = fract(g);
    float seed = hash21(id);
    float ph = fract(t * 0.18 + seed);
    float on = smoothstep(0.0, 0.05, ph) * smoothstep(0.55, 0.2, ph);

    float frame = 1.0 - smoothstep(0.04, 0.07, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
    float fill = smoothstep(0.0, 0.5, f.y) * (0.4 + 0.6 * sin(t * 2.0 + seed * TAU) * 0.5 + 0.3);

    // A light sweep travelling across the façade.
    float sweep = smoothstep(0.08, 0.0, abs(fract(t * 0.12) * 1.4 - 0.2 - uv.x));

    vec3 col = vec3(0.01, 0.014, 0.018);
    col += vec3(0.95, 0.72, 0.42) * frame * on * 1.1;
    col += uAccent * fill * on * 0.35;
    col += vec3(1.0, 0.95, 0.9) * sweep * 0.5;
    gl_FragColor = vec4(tone(col * 1.2), 1.0);
  }
`);

/** Immersive-room content — full surround environment. */
const immersiveRoom = wrap(/* glsl */ `
  void main(){
    vec2 p = centred();
    float t = uTime * 0.2;
    // Concentric spatial corridor, as if the room opens into a deeper space.
    float r = length(p) + 0.001;
    float a = atan(p.y, p.x);
    float depth = 1.0 / r;
    float z = depth * 0.7 + t;
    float rings = smoothstep(0.6, 1.0, sin(z * 5.0));
    float spokes = smoothstep(0.75, 1.0, sin(a * 10.0 + sin(z) * 2.0));
    float f = fbm(vec2(a * 2.0, z * 1.4));

    vec3 deep = vec3(0.01, 0.024, 0.03);
    vec3 col = deep;
    col += mix(uAccent, vec3(0.9, 0.7, 0.45), f) * rings * spokes * 0.85 * smoothstep(1.6, 0.15, r);
    col += uAccent * 0.35 * smoothstep(0.55, 0.0, r);
    col += vec3(0.95, 0.75, 0.5) * pow(smoothstep(0.3, 0.0, r), 2.0) * 0.5;
    gl_FragColor = vec4(tone(col * 1.2), 1.0);
  }
`);

/** Finale — every surface resolving into one synchronized brand moment. */
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

/* ══════════════════════════════════════════════════════════
   Registry
   ══════════════════════════════════════════════════════════ */

export const SHADER_PROGRAMS = {
  signalGrid,
  brandType,
  tunnelFlow,
  liquidMetal,
  volumetric,
  spatialWaves,
  architecture,
  naturalFlow,
  plasmaRibbon,
  pixelRain,
  ledFormats,
  anamorphicVoid,
  corporatePremium,
  festivalMonument,
  mappingFacade,
  immersiveRoom,
  finaleBrand,
} as const;

export type ShaderProgramId = keyof typeof SHADER_PROGRAMS;

/** Programs that raymarch — expensive, so they get smaller targets and lower fps. */
export const HEAVY_PROGRAMS: ShaderProgramId[] = [
  "architecture",
  "anamorphicVoid",
  "festivalMonument",
];
