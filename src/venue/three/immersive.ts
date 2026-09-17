import * as THREE from "three";

/**
 * The immersive-environment surface.
 *
 * Every other screen in the venue plays a picture: a texture, authored in its
 * own 2D space, mapped onto a panel. That is the right model for a wall behind
 * a stage. It is the wrong model for a room you stand inside, because four
 * pictures pointed at each other will always read as four pictures.
 *
 * So these surfaces do not play a picture at all. They are windows. Each
 * fragment casts a ray from the eye, through its own position in the venue,
 * into a virtual world that exists in the same world-space coordinates as the
 * building. Left wall, right wall, ceiling and floor all sample that single
 * world, so a structure crossing from the floor onto a wall lines up exactly —
 * not approximately, and not by careful UV authoring, but because it is one
 * object seen through two adjacent windows.
 *
 * The consequences are the ones the brief asks for. The physical tunnel stops
 * being four screens and becomes an aperture onto a canyon far larger than the
 * room containing it: the virtual floor lies below the real floor, the virtual
 * ceiling above the real one, and a portal hangs in the distance ahead pulling
 * the eye forward. There is no texture, so there is no resolution to run out
 * of, no seam to align, no loop to restart and nothing to decode.
 */

const vertex = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNrm;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vNrm = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const fragment = /* glsl */ `
  precision highp float;

  uniform vec3  uEye;        // the real camera, in world space
  uniform float uTime;
  uniform float uPhase;      // 0 to 1 along the installation: drives the morph
  uniform float uPortalZ;    // world Z of the destination
  uniform vec3  uAccent;
  uniform float uBright;
  uniform float uOn;
  uniform float uLayers;     // depth planes, by quality tier
  uniform float uFlow;       // metres per second the world travels toward you
  uniform vec3  uBoxMin;     // the virtual volume, in world space
  uniform vec3  uBoxMax;
  uniform float uCentreY;    // the axis the virtual world is composed around
  uniform vec3  uCentre;     // where the installation stands, in world space
  uniform float uYaw;        // and which way it faces
  uniform float uCell;       // metres per emitter, for the fine-pitch treatment
  uniform float uDot;

  varying vec3 vWorld;
  varying vec3 vNrm;
  varying vec2 vUv;

  float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), u.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 1.93; a *= 0.5; }
    return v;
  }

  /**
   * World space into the installation's own space.
   *
   * The tunnel runs along -Z, so for it this is the identity. A smaller
   * enveloping room elsewhere in the venue — the immersive cube in the Spatial
   * pavilion — is rotated to face the aisle, and without this its virtual
   * corridor would run off sideways through the building. Everything below is
   * written in the installation's space, which is also the space its surfaces
   * are authored in.
   */
  vec3 toLocal(vec3 p){
    vec3 q = p - uCentre;
    float c = cos(uYaw), s = sin(uYaw);
    return vec3(q.x * c - q.z * s, q.y, q.x * s + q.z * c);
  }
  vec3 dirToLocal(vec3 d){
    float c = cos(uYaw), s = sin(uYaw);
    return vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
  }

  /** A thin bright line at every multiple of period, measured in world metres. */
  float rule(float x, float period, float sharp){
    float f = abs(fract(x / period) * 2.0 - 1.0);
    return pow(f, sharp);
  }

  /* The three content families. Rather than crossfading three separate worlds
     (three times the cost, and it would read as a dissolve) one world morphs:
     its structures go from cut architecture, through poured metal, to light. */
  vec3 gradeA(float t){ return mix(vec3(0.10,0.14,0.18), vec3(0.66,0.78,0.92), t); }
  vec3 gradeB(float t){ return mix(vec3(0.19,0.12,0.07), vec3(0.96,0.68,0.37), t); }
  vec3 gradeC(float t){ return mix(vec3(0.05,0.13,0.15), vec3(0.72,0.98,0.95), t); }

  vec3 grade(float t, vec3 w){
    return gradeA(t) * w.x + gradeB(t) * w.y + gradeC(t) * w.z;
  }

  /* The virtual corridor's own surfaces.
     The material is dark and the structure is light. That ordering matters:
     lighting the material instead would give a white box, which is the single
     fastest way to make expensive LED look cheap. */
  vec3 shell(vec3 p, vec3 rd, float axisKind, vec3 w, float fade){
    // zf runs with the world, so structures travel toward the viewer.
    float zf = p.z - uTime * uFlow;

    // Transverse coordinate: height on the side walls, lateral position on the
    // floor and ceiling. One expression, so the treatment is identical on all
    // of them and nothing changes character at a corner.
    float tr = mix(p.y - uCentreY, p.x, axisKind);

    // Architectural ribs receding down the corridor: the strongest perspective
    // cue there is. Deliberately thin — a rib a hand's width across in world
    // space, not a glowing slab.
    float ribPeriod = mix(7.0, 11.0, w.y);
    float ribs = rule(zf, ribPeriod, 90.0);
    float fine = rule(zf, ribPeriod * 0.25, 190.0) * 0.45;

    // Transverse structure: cut joints in A, flowing bands in B, filaments in C.
    float bandsA = rule(tr, 2.6, 300.0);
    // The zf coupling here used to be strong enough to sweep diagonals across
    // every surface, which read as lens flare rather than as architecture.
    float bandsB = pow(0.5 + 0.5 * sin(tr * 1.0 + zf * 0.04 + uTime * 0.45), 18.0);
    float bandsC = pow(0.5 + 0.5 * sin(tr * 0.6 - zf * 0.08), 22.0);
    float bands = bandsA * w.x + bandsB * w.y + bandsC * w.z;

    // A large-scale flow gives the material its body; without it the corridor
    // is flat colour and reads as a wireframe.
    float body = fbm(vec2(zf * 0.06 + tr * 0.02, tr * 0.10) + w.y * 3.0);

    vec3 base = grade(0.06 + body * 0.30, w) * 0.16;
    // Longitudinal ribs carry the perspective; the transverse rules are a
    // quieter counterpoint. Weighting them equally turns the vanishing point
    // into a starburst, which reads as a lens artefact rather than a room.
    float emitL = ribs + fine + bands * 0.16;
    vec3 emit = grade(0.95, w) * emitL * 0.8 + uAccent * (ribs * 0.75 + bands * 0.3) * 0.7;

    vec3 col = base + emit;

    // A real floor reads brighter because you are close to it and it catches
    // everything; a ceiling falls away.
    float above = step(0.0, p.y - (uEye.y - uCentre.y));
    col *= mix(1.0, mix(1.12, 0.80, above), axisKind);

    return col * fade;
  }

  /* The destination. */
  vec3 portal(vec3 p, vec3 w){
    float r = length(vec2(p.x, (p.y - uCentreY) * 1.22));
    float open = 2.0 + uPhase * 5.2;
    float core = exp(-r * r / (open * open));
    float rings = pow(0.5 + 0.5 * sin(r * 1.7 - uTime * 1.1), 14.0) * exp(-r * 0.09);
    float halo = exp(-r * 0.055);

    vec3 col = grade(1.0, w) * (core * 1.9 + rings * 0.55 + halo * 0.16);
    col += uAccent * (core * 0.7 + rings * 0.4) * 0.6;
    return col;
  }

  /* Free-standing structure between here and there. */
  vec4 layer(vec3 p, float idx, float dist, vec3 w){
    vec2 q = vec2(p.x, p.y - uCentreY);
    float r = length(q);
    float a = atan(q.y, q.x);

    // A - cut architecture: slabs on a coarse grid, only some cells occupied.
    vec2 cell = floor(q / 2.6);
    float occupied = step(0.52, hash21(cell + idx * 13.7));
    vec2 f = abs(fract(q / 2.6) - 0.5);
    float m = max(f.x, f.y);
    float edge = clamp(smoothstep(0.50, 0.42, m) - smoothstep(0.40, 0.31, m), 0.0, 1.0);
    // Keep the middle of the corridor clear so the portal is never blocked.
    float slabs = occupied * edge * smoothstep(3.2, 6.0, r);

    // B - poured metal: broad ribbons turning slowly around the axis.
    float ribbon = pow(0.5 + 0.5 * sin(a * 3.0 + r * 0.8 - uTime * 0.7 + idx), 9.0);
    ribbon *= smoothstep(1.6, 4.2, r) * smoothstep(13.0, 7.0, r);

    // C - energy: a fine field of motes plus an expanding shockwave ring.
    vec2 g = q * 0.85;
    float motes = pow(hash21(floor(g) + idx * 3.1), 34.0);
    motes *= smoothstep(0.42, 0.10, length(fract(g) - 0.5));
    float wave = pow(0.5 + 0.5 * sin(r * 0.9 - uTime * 2.1 + idx * 1.7), 30.0) * smoothstep(0.5, 3.0, r);

    float alpha = slabs * 0.34 * w.x + ribbon * 0.26 * w.y + (motes * 2.0 + wave * 0.4) * w.z;
    alpha *= smoothstep(0.0, 14.0, dist) * smoothstep(250.0, 90.0, dist);
    alpha = clamp(alpha, 0.0, 1.0);

    float lum = 0.45 + 0.4 * hash11(idx * 7.13);
    vec3 col = grade(lum, w) * (0.6 + 1.3 * w.z);
    col += uAccent * (wave * w.z * 1.2 + edge * occupied * w.x * 0.3);
    return vec4(col, alpha);
  }

  void main() {
    vec3 ro = toLocal(uEye);
    vec3 rd = normalize(dirToLocal(vWorld - uEye));

    // Morph weights, overlapping so the world is always changing and never
    // switches. By the exit it has become light.
    float ph = clamp(uPhase, 0.0, 1.0);
    vec3 w = vec3(
      smoothstep(0.52, 0.10, ph),
      smoothstep(0.08, 0.40, ph) * smoothstep(0.92, 0.58, ph),
      smoothstep(0.55, 0.96, ph)
    );
    w /= max(0.0001, w.x + w.y + w.z);

    /* Where does this ray leave the virtual volume? Analytic slabs, so the
       cost is a handful of divisions no matter how deep the world appears. */
    float tX = 1e9, tY = 1e9, tZ = 1e9;
    if (abs(rd.x) > 1e-5) {
      float t = ((rd.x > 0.0 ? uBoxMax.x : uBoxMin.x) - ro.x) / rd.x;
      if (t > 0.0) tX = t;
    }
    if (abs(rd.y) > 1e-5) {
      float t = ((rd.y > 0.0 ? uBoxMax.y : uBoxMin.y) - ro.y) / rd.y;
      if (t > 0.0) tY = t;
    }
    if (rd.z < -1e-5) {
      float t = (uPortalZ - ro.z) / rd.z;
      if (t > 0.0) tZ = t;
    }

    float tBg = min(min(tX, tY), min(tZ, 900.0));
    vec3 pBg = ro + rd * tBg;

    vec3 bg;
    if (tZ <= tX && tZ <= tY) {
      bg = portal(pBg, w);
    } else {
      float axisKind = (tY < tX) ? 1.0 : 0.0;
      // Atmospheric depth: the far end dissolves into the portal's colour,
      // which is what makes the distance readable at all.
      float fade = exp(-tBg * 0.0075);
      bg = shell(pBg, rd, axisKind, w, fade);
      // Airlight: distance is readable because the far end of the corridor
      // fills with the destination's own colour.
      bg += grade(1.0, w) * (1.0 - fade) * 0.10;
    }

    /* Depth planes, composited front to back. Each is one ray-plane
       intersection; together they give the volume its interior. */
    vec3 acc = vec3(0.0);
    float trans = 1.0;
    if (rd.z < -1e-5) {
      float spacing = 11.0;
      float scroll = mod(uTime * uFlow, spacing);
      for (int i = 0; i < 14; i++) {
        if (float(i) >= uLayers) break;
        if (trans < 0.02) break;
        float zl = ro.z - (float(i) + 1.0) * spacing + scroll;
        float tl = (zl - ro.z) / rd.z;
        if (tl <= 0.0 || tl >= tBg) continue;
        vec4 L = layer(ro + rd * tl, float(i), tl, w);
        L.rgb *= exp(-tl * 0.006);
        acc += trans * L.rgb * L.a;
        trans *= 1.0 - L.a;
      }
    }
    vec3 col = acc + trans * bg;

    /* The physical panel the world is being shown on. Emitters are measured
       in world metres rather than UVs, so every surface of an installation
       shares one pitch however its geometry happens to be built — and one
       material can drive all four sides of a room. */
    vec3 an = abs(normalize(vNrm));
    vec2 g;
    if (an.x > an.y && an.x > an.z) g = vWorld.zy;
    else if (an.y > an.z)           g = vWorld.xz;
    else                            g = vWorld.xy;
    g /= uCell;
    float px = max(fwidth(g.x), fwidth(g.y));
    float structure = (1.0 - smoothstep(0.10, 0.34, px)) * uDot;
    float emitter = 1.0;
    if (structure > 0.001) {
      vec2 fv = fract(g) - 0.5;
      emitter = mix(1.0, smoothstep(0.62, 0.24, length(fv)), structure * 0.5);
    }

    col = max(vec3(0.0), col) * 0.72;   // exposure: rich blacks, controlled glow
    col = col / (1.0 + col * 0.26);
    col *= uBright * uOn * emitter;
    col += vec3(0.004, 0.0075, 0.008) * (1.0 - emitter) * (0.25 + 0.75 * uOn);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export interface ImmersiveOptions {
  /** pixel pitch in millimetres */
  pitch?: number;
  brightness?: number;
  accent?: string;
  /** the virtual volume, in world space — far larger than the room */
  boxMin: [number, number, number];
  boxMax: [number, number, number];
  /** world Z of the destination the corridor recedes toward */
  portalZ: number;
  /** the height the virtual world is composed around */
  centreY?: number;
  /** where the installation stands in the venue, and which way it faces */
  centre?: [number, number, number];
  yaw?: number;
  /** metres per second the world travels toward the viewer */
  flow?: number;
  layers?: number;
  dot?: number;
  doubleSided?: boolean;
}

export function createImmersiveMaterial(o: ImmersiveOptions) {
  const pitch = o.pitch ?? 1.5;

  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uEye: { value: new THREE.Vector3(0, 1.8, 0) },
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uPortalZ: { value: o.portalZ },
      uAccent: { value: new THREE.Color(o.accent ?? "#5fd9cc").convertSRGBToLinear() },
      uBright: { value: o.brightness ?? 1 },
      uOn: { value: 1 },
      uLayers: { value: o.layers ?? 10 },
      uFlow: { value: o.flow ?? 5.5 },
      uBoxMin: { value: new THREE.Vector3(...o.boxMin) },
      uBoxMax: { value: new THREE.Vector3(...o.boxMax) },
      uCentreY: { value: o.centreY ?? 2.4 },
      uCentre: { value: new THREE.Vector3(...(o.centre ?? [0, 0, 0])) },
      uYaw: { value: o.yaw ?? 0 },
      uCell: { value: pitch / 1000 },
      uDot: { value: o.dot ?? 1 },
    },
    side: o.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    toneMapped: true,
  });
}
