import * as THREE from "three";

const EMPTY_BACKDROP = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
EMPTY_BACKDROP.needsUpdate = true;

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
  uniform sampler2D uBackdrop;
  uniform float uBackdropMix;

  varying vec3 vWorld;
  varying vec3 vNrm;
  varying vec2 vUv;

  float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
  vec2 hash22(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }
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
  vec3 gradeA(float t){ return mix(vec3(0.06,0.11,0.19), vec3(0.58,0.76,0.98), t); }
  vec3 gradeB(float t){ return mix(vec3(0.19,0.12,0.07), vec3(0.96,0.68,0.37), t); }
  vec3 gradeC(float t){ return mix(vec3(0.05,0.13,0.15), vec3(0.72,0.98,0.95), t); }

  vec3 grade(float t, vec3 w){
    return gradeA(t) * w.x + gradeB(t) * w.y + gradeC(t) * w.z;
  }

  /* ── The world, in three bands ──────────────────────────
     Read from the reference the client supplied: an immersive tunnel does not
     treat its surfaces equally. Above you it goes quiet and nearly black, so
     the eye has somewhere to rest; at head height it is dense with structure;
     and the floor is the brightest, most detailed surface in the room. That
     ordering is what makes the space feel enormous, and it is worth more than
     any individual effect. The bands below are the venue's own world built on
     that principle — not a copy of the reference's artwork. */

  /* ── stars ──────────────────────────────────────────────
     One helper, used at several densities and cut-offs so the field has
     magnitude classes rather than one uniform sprinkle of identical dots.
     'cut' is the fraction of cells left empty; what survives is graded by how
     far past the cut it fell, which is what gives a few stars real presence. */
  float starLayer(vec2 q, float density, float cut, float seedOff){
    vec2 g = q * density;
    vec2 id = floor(g) + seedOff;
    vec2 f = fract(g) - 0.5;
    vec2 off = (hash22(id) - 0.5) * 0.74;
    float m = hash21(id + 11.0);
    float live = step(cut, m);
    float mag = (m - cut) / max(1e-4, 1.0 - cut);
    float tw = 0.62 + 0.38 * sin(uTime * 1.4 + m * 57.0);
    float r = length(f - off);
    return live * smoothstep(0.048 + mag * 0.055, 0.0, r) * (0.3 + 1.15 * mag) * tw;
  }

  /** The diffraction cross on the few brightest stars. */
  float starGlint(vec2 q, float density, float cut){
    vec2 g = q * density;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    vec2 off = (hash22(id + 5.0) - 0.5) * 0.7;
    float live = step(cut, hash21(id + 19.0));
    vec2 d = abs(f - off);
    float cross = max(
      smoothstep(0.26, 0.0, d.x) * smoothstep(0.010, 0.0, d.y),
      smoothstep(0.26, 0.0, d.y) * smoothstep(0.010, 0.0, d.x));
    return live * cross;
  }

  /** Above: open sky. Deep field, a wash of nebula, one arm crossing it. */
  vec3 skyBand(vec3 p, vec3 w){
    vec2 q = vec2(p.x, p.z) * 0.05;
    float s1 = starLayer(q, 11.0, 0.855, 0.0);
    float s2 = starLayer(q, 23.0, 0.900, 7.0);
    float s3 = starLayer(q, 41.0, 0.938, 19.0);

    float neb = fbm(q * 1.8 + vec2(uTime * 0.008, 0.0));
    // a galactic arm running across the vault, so the sky has a direction
    float arm = exp(-pow((q.y * 0.55 + fbm(q * 0.7) * 0.95 - 0.2) * 2.1, 2.0));

    vec3 col = vec3(0.003, 0.005, 0.010);
    col += grade(0.42, w) * pow(neb, 3.2) * 0.075;
    col += mix(grade(0.62, w), uAccent, 0.4) * arm * pow(neb, 2.2) * 0.075;
    col += vec3(0.88, 0.94, 1.0) * (s1 + s2 * 0.7 + s3 * 0.45) * 1.05;
    // a scattering of warm giants — the only warmth up here
    col += vec3(1.0, 0.70, 0.40) * s1 * step(0.965, hash21(floor(q * 11.0))) * 1.0;
    return col;
  }

  /**
   * A monumental massif, drawn as a silhouette against whatever is behind it.
   *
   * The reference tunnel is not an abstract field — it is *country*: cliffs
   * either side of the walkway with light falling down them, receding into a
   * portal. A silhouette plus a lit rim plus falling veins of light is all
   * that takes, and it is what gives the corridor a floor, a horizon and a
   * sense of enormous scale that stars alone never produce.
   */
  vec4 massif(vec2 q, float seedOff, float t){
    // the skyline
    float ridge =
        fbm(vec2(q.x * 0.35 + seedOff, seedOff)) * 1.5
      + fbm(vec2(q.x * 1.1 + seedOff * 3.0, 2.0)) * 0.55
      - 0.62;
    float body = smoothstep(0.03, -0.03, q.y - ridge);
    if (body < 0.001) return vec4(0.0);

    // the lit rim along the skyline
    float rim = smoothstep(0.18, 0.0, abs(q.y - ridge));

    /* Veins of light running down the face — the reference's waterfalls.
       They are a function of position *along* the cliff and not of height, so
       each one paints a vertical band; at the width and level this first ran
       at, a vein passing close to the camera filled a third of the frame with
       a pale column and read as a light fixture standing in the corridor
       rather than as water on a rock face. Narrow, dimmer, and fading out
       before it reaches the foot of the cliff. */
    float lane = hash21(vec2(floor(q.x * 5.5 + seedOff * 7.0), 0.0));
    float drop = ridge - q.y;
    float vein = smoothstep(0.035, 0.0, abs(fract(q.x * 5.5 + seedOff * 7.0) - 0.5))
      * step(0.68, lane)
      * smoothstep(0.02, 0.16, drop) * smoothstep(1.1, 0.35, drop)
      * (0.55 + 0.45 * sin(q.y * 9.0 + t * 2.2 + lane * 20.0));

    // strata across the face, so it is rock and not a cut-out
    float strata = 0.5 + 0.5 * sin(q.y * 9.0 + fbm(q * 1.6) * 5.0);

    vec3 col = vec3(0.014, 0.019, 0.030) * (0.5 + 0.9 * strata);
    col += mix(uAccent, vec3(1.0, 0.86, 0.62), 0.35) * rim * 1.6;
    col += mix(uAccent, vec3(0.80, 0.94, 1.0), 0.5) * vein * 0.65;
    return vec4(col, body);
  }

  /** Head height: the deep field, with nebula structure and dust. */
  vec3 wallBand(vec3 p, vec3 w, float fade){
    float zf = p.z - uTime * uFlow * 0.35;
    vec2 q = vec2(zf, p.y) * 0.075;

    float s1 = starLayer(q, 13.0, 0.840, 3.0);
    float s2 = starLayer(q, 27.0, 0.890, 17.0);
    float s3 = starLayer(q, 47.0, 0.930, 29.0);
    float glint = starGlint(q, 13.0, 0.976);

    // Two noise fields, one eroding the other. A single fbm reads as even fog;
    // subtracting a finer field from a coarser one is what gives a cloud
    // structure, an edge, and dark dust in front of it.
    float n1 = fbm(q * 1.6 + vec2(uTime * 0.010, 0.0));
    float n2 = fbm(q * 3.4 - vec2(uTime * 0.016, 0.0));
    float cloud = pow(max(0.0, n1 * 1.28 - n2 * 0.46), 2.0);
    float dust = smoothstep(0.62, 0.30, n2);

    // rare distant galaxies — small, elliptical, and unmistakably far away
    vec2 gg = q * 3.2;
    vec2 gf = fract(gg) - 0.5;
    float gal = step(0.972, hash21(floor(gg) + 41.0))
      * exp(-pow(length(gf * vec2(1.0, 2.7)) * 7.0, 2.0));

    vec3 col = vec3(0.002, 0.004, 0.008);
    // Restraint is the whole discipline here. Nebula is *faint* — it is the
    // thing you notice second, after the stars — and at the weight this ran
    // at, eleven composited depth planes of it turned the vault into grey
    // smoke with lights behind it.
    col += grade(0.45, w) * cloud * 0.15 * dust;
    col += mix(uAccent, grade(0.9, w), 0.45) * pow(cloud, 2.6) * 0.26 * dust;
    // warm emission where the cloud is densest, so the field is not all blue
    col += vec3(1.0, 0.55, 0.28) * pow(max(0.0, n2 - 0.60), 2.2) * 0.16;
    col += vec3(0.86, 0.92, 1.0) * (s1 + s2 * 0.72 + s3 * 0.5) * 1.15;
    col += vec3(0.80, 0.90, 1.0) * glint * 0.5;
    col += mix(grade(0.8, w), vec3(1.0, 0.86, 0.62), 0.4) * gal * 1.5;

    /* Country, in two ranges. Composed in the same (depth, height) space the
       field is, so it sits *in* the world rather than on top of it — and the
       far range is deliberately fainter and lower, which is the whole of
       aerial perspective. */
    vec2 mq = vec2(p.z * 0.010 - uTime * 0.012, (p.y - uCentreY) * 0.048);
    vec4 far = massif(mq + vec2(0.0, 0.34), 11.0, uTime);
    vec4 near = massif(mq * vec2(0.62, 0.74), 3.0, uTime);
    col = mix(col, far.rgb * 0.80, far.a * 0.95);
    col = mix(col, near.rgb * 1.15, near.a);

    return col * fade;
  }

  /**
   * The floor.
   *
   * This is a *wet* surface. Everything on it is a reflection of what is
   * overhead and ahead, stretched along the direction of travel — which is
   * what a polished floor does to a light source, and what makes the corridor
   * read as a real room rather than a lit ribbon you are walking on.
   *
   * It is composed in a **converging** coordinate rather than in world X,
   * and that is the whole trick. The visible floor is only six metres wide but
   * runs hundreds of metres away, so anything authored in world X has almost
   * no variation across the near floor and all of its detail bunched at the
   * horizon — a blurry sheet underfoot. Dividing X by the distance to the hit
   * turns every feature into a line that converges on the vanishing point,
   * which is both correct for a reflection and the single strongest depth cue
   * the corridor has.
   *
   * 'dist' is the distance to the hit, not a world coordinate. An earlier
   * version faded the destination's reflection in against a *drifting* depth
   * term, which after a few seconds of flow saturated permanently — the whole
   * floor went warm and stayed there, and with it the whole tunnel.
   */
  vec3 terrainBand(vec3 p, vec3 w, float fade, float dist){
    // converging: constant across the frame at any depth, one line per feature
    float conv = p.x / (0.9 + dist * 0.16);
    // and a slow travel along the corridor, so the reflections move with you
    float run = p.z * 0.045 + uTime * 0.14;

    // brightness concentrated on the centre line
    float band = exp(-pow(conv * 1.15, 2.0));

    /* Specular lanes. Sampled with a long thin footprint — sharp across the
       corridor, smeared away down it, which is what a reflection looks like. */
    float streak = 0.0;
    float spec = 0.0;
    for (int i = 0; i < 5; i++){
      float fi = float(i);
      float x0 = (hash11(fi * 3.7) - 0.5) * 1.9;
      float wob = sin(run * 0.6 + fi * 2.1) * 0.22 + sin(run * 0.23 - fi) * 0.12;
      float wdt = 0.035 + 0.05 * hash11(fi * 9.1);
      float dl = abs(conv - x0 - wob) / wdt;
      float line = smoothstep(1.0, 0.0, dl);
      // broken up along its length, so it is a reflection and not a stripe
      float breaks = 0.45 + 0.55 * fbm(vec2(fi * 7.0, run * 1.6));
      streak += line * breaks * (0.55 + 0.45 * hash11(fi * 5.3));
      spec += line * pow(max(0.0, 1.0 - min(1.0, dl * dl)), 10.0) * breaks;
    }

    float grain = fbm(vec2(conv * 3.2, run * 2.2));
    float s1 = starLayer(vec2(conv, run) * 0.9, 9.0, 0.880, 61.0);

    /* Reflections, not searchlights. The specular term first ran at a weight
       that turned five lanes into five hard beams converging on the exit — a
       striking image, and one that belongs to a laser rig rather than to a
       floor. A reflection is a low, broad, broken sheen; what sells it is that
       it *converges*, not that it is bright. It also fades out under the
       camera, because a reflection you are standing on is seen at an angle too
       steep to return anything. */
    float nearFade = smoothstep(2.0, 11.0, dist);

    vec3 col = vec3(0.003, 0.005, 0.009);
    col += grade(0.62, w) * band * grain * 0.12;
    col += mix(grade(0.92, w), uAccent, 0.30) * streak * nearFade * 0.15;
    col += mix(uAccent, vec3(1.0, 0.94, 0.84), 0.72) * spec * nearFade * 0.13;
    /* The destination's reflection, running back up the corridor toward the
       viewer. Keyed off (1 - fade), which is small near the camera and large
       at the horizon — an honest depth term that cannot drift. */
    col += vec3(1.0, 0.64, 0.34) * pow(band, 2.6) * (1.0 - fade) * 0.34;
    col += vec3(0.90, 0.95, 1.0) * s1 * (0.3 + band * 0.6) * 0.7;
    return col * fade * 0.9;
  }

  /* The destination.
     In the reference this is the only warm element in a cold world, it sits at
     eye height rather than centred, and it has a defined rim rather than being
     a soft glow. All three matter: it is what the whole corridor points at. */
  vec3 portal(vec3 p, vec3 w){
    vec2 q = vec2(p.x, (p.y - uCentreY) * 1.15);
    float r = length(q);

    float open = 2.1 + uPhase * 4.6;
    float core = exp(-pow(r / open, 2.4));
    // A bright rim right at the aperture edge, warm against everything else.
    float rim = exp(-pow((r - open) * 1.9, 2.0));
    float halo = exp(-r * 0.075);
    float rings = pow(0.5 + 0.5 * sin(r * 1.5 - uTime * 0.9), 16.0) * exp(-r * 0.1);

    vec3 warm = vec3(1.0, 0.52, 0.26);
    vec3 col = grade(1.0, w) * (core * 2.0 + rings * 0.6 + halo * 0.18);
    col += warm * rim * 2.2;
    col += warm * core * 0.55;
    col += uAccent * (core * 0.6 + rings * 0.45) * 0.65;
    // a second, tighter aperture inside the first: the reference's portal has
    // a defined mouth rather than a soft centre
    col += mix(warm, vec3(1.0), 0.55) * exp(-pow((r - open * 0.42) * 3.4, 2.0)) * 0.55;
    return col;
  }

  /* Free-standing structure between here and there. */
  vec4 layer(vec3 p, float idx, float dist, vec3 w){
    vec2 q = vec2(p.x, p.y - uCentreY);
    float r = length(q);
    float a = atan(q.y, q.x);

    // A - dust and debris drifting between here and the far field. This used
    //     to be slabs on a grid, which in a city read as cut architecture and
    //     in space reads as a building that wandered in.
    vec2 dg = q * 1.7 + idx * 4.0;
    vec2 did = floor(dg);
    vec2 df = fract(dg) - 0.5;
    vec2 doff = (hash22(did + 9.0) - 0.5) * 0.7;
    float occupied = step(0.86, hash21(did + idx * 13.7));
    float edge = smoothstep(0.085, 0.004, length(df - doff));
    // Keep the middle of the corridor clear so the portal is never blocked.
    float slabs = occupied * edge * smoothstep(2.4, 6.0, r);

    /* B - poured metal.
       Broad ribbons turning around the corridor's axis, shaded across their
       width so the highlight travels along them. The previous version was a
       raised sine, which gives an evenly bright stripe — pleasant, and not
       remotely metallic. The difference is entirely in the cross-section. */
    float arm = sin(a * 2.0 + r * 0.42 - uTime * 0.5 + idx * 2.3);
    float across = arm / 0.78;
    float ribbon = smoothstep(1.0, 0.0, abs(across));
    float rn = sqrt(max(0.0, 1.0 - min(1.0, across * across)));
    float rspec = ribbon * pow(rn, 18.0);
    ribbon *= smoothstep(1.6, 4.4, r) * smoothstep(14.0, 7.0, r);
    rspec *= smoothstep(1.6, 4.4, r) * smoothstep(14.0, 7.0, r);

    // C - energy: a fine field of motes plus an expanding shockwave ring.
    vec2 g = q * 0.85;
    float motes = pow(hash21(floor(g) + idx * 3.1), 34.0);
    motes *= smoothstep(0.42, 0.10, length(fract(g) - 0.5));
    float wave = pow(0.5 + 0.5 * sin(r * 0.9 - uTime * 2.1 + idx * 1.7), 30.0) * smoothstep(0.5, 3.0, r);

    float alpha = slabs * 0.22 * w.x + ribbon * 0.34 * w.y + (motes * 2.0 + wave * 0.4) * w.z;
    alpha *= smoothstep(0.0, 14.0, dist) * smoothstep(250.0, 90.0, dist);
    alpha = clamp(alpha, 0.0, 1.0);

    float lum = 0.45 + 0.4 * hash11(idx * 7.13);
    vec3 col = grade(lum, w) * (0.6 + 1.3 * w.z);
    col += mix(vec3(1.0, 0.86, 0.60), vec3(0.86, 0.94, 1.0), hash11(idx * 3.1))
         * ribbon * w.y * 0.5;
    col += vec3(1.0, 0.97, 0.92) * rspec * w.y * 3.4;   // the travelling highlight
    col += uAccent * (wave * w.z * 1.2 + edge * occupied * w.x * 0.45);
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

    // Atmospheric depth: the far end dissolves into the destination's colour,
    // which is what makes the distance readable at all.
    float fade = exp(-tBg * 0.0075);
    // Airlight: the far end of the world fills with the destination's colour.
    vec3 air = grade(1.0, w) * (1.0 - fade) * 0.11;

    vec3 bg;
    if (tZ <= tX && tZ <= tY) {
      bg = portal(pBg, w);
    } else if (tY < tX) {
      // The sky is the backdrop, so it takes no airlight — adding it there
      // would lift the one band whose darkness the composition depends on.
      bg = rd.y > 0.0 ? skyBand(pBg, w) : terrainBand(pBg, w, fade, tBg) + air;
    } else {
      bg = wallBand(pBg, w, fade) + air;
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

    /* A single panoramic plate sits behind the procedural depth. Sampling it
       from the world ray—not from any panel UV—is the important part: left,
       right, vault and floor remain windows onto one image, with no restart at
       a physical seam. The procedural planes stay in front, so the plate reads
       as a destination rather than wallpaper. */
    float panoU = atan(rd.x, -rd.z) / 6.28318530718 + 0.5;
    float panoV = asin(clamp(rd.y, -1.0, 1.0)) / 3.14159265359 + 0.5;
    vec3 plate = texture2D(uBackdrop, vec2(panoU, panoV)).rgb;
    plate *= 0.78 + 0.22 * fade;
    col = mix(col, plate + col * 0.28, uBackdropMix * 0.84);

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

    col = max(vec3(0.0), col) * 0.64;   // exposure: rich blacks, controlled glow
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
  /** optional panoramic plate, sampled from the same world ray on every face */
  backdrop?: THREE.Texture;
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
      uBackdrop: { value: o.backdrop ?? EMPTY_BACKDROP },
      uBackdropMix: { value: o.backdrop ? 1 : 0 },
    },
    side: o.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    toneMapped: true,
  });
}
