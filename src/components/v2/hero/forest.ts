/**
 * Forest LED content — the natural environment shown on the hero's L-corner
 * LED walls (brief §7/§29). Layered aerial perspective, rounded organic
 * crowns, a warm sun break with god-rays, drifting ground mist and multi-speed
 * wind. Emissive (the wall is a light source). `uEdge` fades toward the corner
 * seam so the two walls read as one continuous scene.
 */
export const forestVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const forestFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFlip;   // 1 or -1: mirror content for the opposite wall
  uniform float uAmp;    // overall brightness

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

  void main() {
    vec2 uv = vec2(mix(vUv.x, 1.0 - vUv.x, step(0.0, -uFlip)), vUv.y);
    float t = uTime;
    float y = uv.y;

    // aerial backdrop: hazy daylight high in the canopy -> shadowed floor low
    // (LED emission values run bright — the wall is a light source)
    vec3 hazeHi = vec3(0.46, 0.52, 0.47);
    vec3 hazeLo = vec3(0.10, 0.13, 0.10);
    vec3 col = mix(hazeLo, hazeHi, smoothstep(-0.15, 1.05, y));

    // warm sun break + god-rays
    float sun = exp(-pow((uv.x - 0.62) / 0.18, 2.0));
    col += vec3(1.0, 0.84, 0.58) * sun * smoothstep(0.35, 1.0, y) * 0.34;
    float ray = sin((uv.x - 0.62) * 24.0 + 1.7) * 0.5 + 0.5;
    ray = pow(ray, 4.0) * smoothstep(1.0, 0.15, y) * sun;
    col += vec3(1.0, 0.9, 0.7) * ray * 0.20;

    // five depth layers of foliage: far pale/hazy, near near-black
    for (int L = 0; L < 5; L++) {
      float fl = float(L);
      float depth = fl / 4.0;
      float freq = mix(2.5, 9.0, depth);
      float wind = sin(t * (0.3 + depth * 0.7) + fl * 2.1) * (0.006 + depth * 0.02);
      float x = uv.x + wind;
      float crown = 0.32 + depth * 0.15
        + 0.10 * (0.5 + 0.5 * sin(x * freq + fl * 4.0))
        + 0.04 * sin(x * freq * 3.3 + fl * 2.0);
      float below = smoothstep(crown + 0.02, crown - 0.02, y);
      float tid = floor(x * freq);
      float trunkX = fract(x * freq);
      float trunk = step(0.62, hash(vec2(tid, fl)))
                  * smoothstep(0.12, 0.0, abs(trunkX - 0.5))
                  * step(y, crown) * step(crown - 0.55, y);
      float mask = max(below, trunk * 0.9);
      vec3 leaf = mix(vec3(0.26, 0.40, 0.26), vec3(0.04, 0.09, 0.05), depth);
      leaf += vec3(0.95, 0.85, 0.58) * sun * (1.0 - depth) * 0.22;
      col = mix(col, leaf, mask);
    }

    // drifting ground mist
    float mist = smoothstep(0.22, 0.0, y) * (0.4 + 0.3 * sin(uv.x * 4.0 - t * 0.35));
    col = mix(col, vec3(0.20, 0.23, 0.20), clamp(mist, 0.0, 0.5) * 0.6);

    gl_FragColor = vec4(col * uAmp, 1.0);
  }
`;
