/**
 * LED content surfaces (brief §7/§35): each world's stage screens run a live
 * GLSL shader instead of a still image. One shared vertex shader; one fragment
 * shader per world. Colours stay cinematic/natural — cyan is an accent, not a
 * global wash (brief §10).
 */

export const contentVertex = /* glsl */ `
  uniform vec2 uUvOffset; uniform vec2 uUvScale;
  varying vec2 vUv;
  void main() {
    vUv = uv * uUvScale + uUvOffset;   // per-panel slice of the global wall image
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NOISE = /* glsl */ `
  float hash(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
  }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.02; a*=.5; } return v; }
`;

const HEADER = /* glsl */ `
  precision highp float;
  uniform float uTime; uniform vec2 uRes; uniform float uMood;
  varying vec2 vUv;
  ${NOISE}
`;

/** 01 — Anamorphic: rugged rocky MOUNTAINS + bright blue sky, drifting clouds,
 *  god-rays. Cinematic blue with warm sun (matches the reference moodboard). */
export const skyRockFragment = /* glsl */ `
  ${HEADER}
  // one layer of mountains at a given base height / scale / colour
  float ridgeH(float x, float scale, float base){
    return base + 0.12*fbm(vec2(x*scale, 2.3)) + 0.05*fbm(vec2(x*scale*3.1, 5.1));
  }
  void main(){
    vec2 uv=vUv;
    // bright sky gradient: deep blue up top -> luminous pale-blue horizon
    vec3 top=vec3(0.06,0.20,0.45), hor=vec3(0.55,0.74,0.92);
    vec3 col=mix(hor, top, smoothstep(0.1,1.0,uv.y));
    // sun + glow (upper centre-right)
    vec2 sun=vec2(0.60,0.80); float sd=distance(uv,sun);
    col += vec3(1.0,0.93,0.78)*exp(-sd*6.0)*0.9;
    // drifting volumetric clouds
    float cl=fbm(vec2(uv.x*2.4 + uTime*0.02, uv.y*1.8 - uTime*0.008));
    float cl2=fbm(vec2(uv.x*5.0 - uTime*0.015, uv.y*3.0));
    float clouds=smoothstep(0.5,0.95,cl)*smoothstep(0.25,0.9,uv.y);
    col=mix(col, vec3(0.96,0.97,1.0), clouds*0.7);
    col=mix(col, vec3(0.80,0.86,0.95), smoothstep(0.55,0.9,cl2)*0.25*smoothstep(0.3,1.0,uv.y));
    // god-rays from the sun
    float ray=pow(max(0.0,1.0-sd*1.1),3.0)*(0.4+0.6*fbm(vec2(atan(uv.y-sun.y,uv.x-sun.x)*3.0, uTime*0.05)));
    col += vec3(1.0,0.95,0.85)*ray*0.15;
    // far mountain layer (blue haze)
    float m1=ridgeH(uv.x,3.0,0.34);
    col=mix(col, vec3(0.34,0.45,0.62), smoothstep(m1+0.01,m1-0.02,uv.y)*0.85);
    // mid mountain layer with snowy tops
    float m2=ridgeH(uv.x+3.7,4.5,0.26);
    float mid=smoothstep(m2+0.01,m2-0.01,uv.y);
    vec3 rock2=mix(vec3(0.16,0.19,0.26), vec3(0.75,0.82,0.92), smoothstep(m2-0.06,m2,uv.y)); // snow near ridge
    col=mix(col, rock2, mid);
    // near rugged rock (dark, detailed)
    float m3=ridgeH(uv.x*1.2+9.0,6.5,0.17);
    float near=smoothstep(m3+0.01,m3-0.01,uv.y);
    vec3 rock3=mix(vec3(0.06,0.07,0.10), vec3(0.16,0.15,0.14), fbm(uv*22.0));
    col=mix(col, rock3, near);
    gl_FragColor=vec4(col,1.0);
  }
`;

/** 02 — Corporate: glowing wireframe globe + data city, restrained cyan. */
export const globeFragment = /* glsl */ `
  ${HEADER}
  void main(){
    vec2 uv=vUv; vec2 p=(uv-0.5)*vec2(uRes.x/uRes.y,1.0);
    vec3 col=vec3(0.02,0.04,0.07);
    // city light field lower half
    float city=step(0.75, hash(floor(vec2(uv.x*90.0, uv.y*50.0))))*smoothstep(0.5,0.0,uv.y);
    col += vec3(0.10,0.45,0.6)*city*0.7;
    // globe
    float r=length(p*1.6); float globe=smoothstep(0.62,0.60,r);
    float lat=sin((p.y+uTime*0.02)*40.0), lon=sin((atan(p.x,p.y)+uTime*0.15)*24.0);
    float grid=max(smoothstep(0.9,1.0,lat), smoothstep(0.9,1.0,lon));
    col=mix(col, vec3(0.12,0.7,0.8)*(0.35+grid), globe);
    col += vec3(0.2,0.8,0.9)*smoothstep(0.64,0.60,r)*smoothstep(0.55,0.62,r)*1.2; // rim
    gl_FragColor=vec4(col,1.0);
  }
`;

/** 03 — Festival: deep-space nebula + stars, energetic magenta/cyan. */
export const spaceFragment = /* glsl */ `
  ${HEADER}
  void main(){
    vec2 uv=vUv;
    vec3 col=vec3(0.01,0.01,0.03);
    float n=fbm(uv*3.0+vec2(uTime*0.02,0.0));
    float n2=fbm(uv*5.0-vec2(0.0,uTime*0.03));
    col += mix(vec3(0.35,0.08,0.45), vec3(0.05,0.4,0.6), n2)*n*1.1;
    // planet glow
    vec2 pl=vec2(0.5,0.6); float d=distance(uv*vec2(uRes.x/uRes.y,1.0), pl*vec2(uRes.x/uRes.y,1.0));
    col += vec3(0.5,0.45,0.7)*exp(-d*4.0)*0.5;
    // stars
    float st=step(0.996, hash(floor(uv*vec2(220.0,130.0))));
    col += st*(0.6+0.4*sin(uTime*3.0+uv.x*50.0));
    gl_FragColor=vec4(col,1.0);
  }
`;

/** 04 — Social: warm golden nature bokeh + soft light, natural warm. */
export const natureFragment = /* glsl */ `
  ${HEADER}
  void main(){
    vec2 uv=vUv;
    vec3 top=vec3(0.10,0.06,0.03), warm=vec3(0.85,0.55,0.22);
    vec3 col=mix(warm, top, smoothstep(0.2,1.0,uv.y));
    // waterfall shimmer center
    float wf=smoothstep(0.12,0.0,abs(uv.x-0.5))*fbm(vec2(uv.x*20.0, uv.y*6.0 - uTime*1.2));
    col=mix(col, vec3(1.0,0.9,0.7), wf*0.5);
    // foliage bokeh
    for(int i=0;i<3;i++){
      float fi=float(i);
      vec2 c=vec2(hash(vec2(fi,1.0)), hash(vec2(fi,2.0)));
      float d=distance(uv,c); col += vec3(0.3,0.5,0.2)*exp(-d*8.0)*0.25;
    }
    // warm particles
    float sp=step(0.994, hash(floor(uv*vec2(70.0,40.0)+vec2(0.0,-uTime*1.5))));
    col += sp*vec3(1.0,0.8,0.5)*0.6;
    gl_FragColor=vec4(col,1.0);
  }
`;

/** 05 — Installation: underwater caustics + light shafts, cool blue-green. */
export const oceanFragment = /* glsl */ `
  ${HEADER}
  void main(){
    vec2 uv=vUv;
    vec3 deep=vec3(0.01,0.05,0.09), up=vec3(0.05,0.28,0.35);
    vec3 col=mix(deep, up, smoothstep(0.0,1.0,uv.y));
    // caustics
    float c=0.0; vec2 q=uv*6.0;
    for(int i=0;i<3;i++){ q+=vec2(sin(uTime*0.5+q.y), cos(uTime*0.4+q.x)); c+=abs(sin(q.x)*sin(q.y)); }
    col += vec3(0.2,0.6,0.7)*pow(c*0.33,3.0)*0.6;
    // light shafts from top
    float sh=smoothstep(0.4,1.0,uv.y)*fbm(vec2(uv.x*8.0, uTime*0.1))*smoothstep(0.9,0.2,abs(uv.x-0.5));
    col += vec3(0.4,0.7,0.8)*sh*0.5;
    gl_FragColor=vec4(col,1.0);
  }
`;

export const FRAGMENTS: Record<string, string> = {
  anamorphic: skyRockFragment,
  corporate: globeFragment,
  festival: spaceFragment,
  social: natureFragment,
  installation: oceanFragment,
};
