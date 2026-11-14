import * as THREE from "three";

export function entranceUniforms() {
  return { uEntrancePhase:{value:0}, uEntranceGain:{value:1}, uEntranceReady:{value:0} };
}
export type EntranceUniforms = ReturnType<typeof entranceUniforms>;

/** Authored in physical metres: perimeter F 0–16, R 16–24, C 24–40, L 40–48.
 * The glTF U coordinate stores perimeter / 48; physical Y comes from world Z.
 * Each trigonometric phase has an integer harmonic, so the 24 s loop closes. */
const emeraldCurrent = `
  vec3 emeraldCurrent(float s, float y, float phase) {
    float a = s * 6.28318530718 / 48.0;
    float bend=.92*sin(y*.28-phase)+.24*sin(y*.65-2.0*phase)
      +.18*sin(a*5.0+y*.16-phase);
    float q=a*3.0+bend;
    float v=sin(q);
    float lace=.035*sin(a*17.0+y*1.4-2.0*phase)+.018*sin(a*39.0-y*2.1+phase);
    float width=.30+.09*sin(a*2.0+y*.22-phase);
    float body=exp(-pow((v-lace)/width,2.0)*2.3);
    float fold=exp(-pow((v-width*.53-lace)*22.0,2.0));
    float rim=exp(-pow((v+width*.60-lace)*70.0,2.0));
    float filaments=pow(max(0.0,sin(v*185.0+sin(a*11.0+y*.8-phase)*3.0)),18.0)*body;
    float secondary=exp(-pow((sin(q+.53+.1*sin(y*.4-phase)))*38.0,2.0));
    float colorMix=.5+.5*sin(a*2.0+y*.18-phase);
    vec3 ribbon=mix(vec3(.001,.28,.075),vec3(.001,.19,.22),colorMix)*body;
    ribbon+=fold*vec3(.008,.38,.17)+rim*vec3(.02,.36,.22)
      +filaments*vec3(.008,.10,.066)+secondary*vec3(.003,.065,.14);
    float exitFade=1.0-.88*smoothstep(7.0,10.0,y);
    float centerCalm=1.0-.58*pow(sin(3.14159265359*clamp(s/16.0,0.0,1.0)),2.0)*(1.0-step(16.001,s));
    return vec3(.0015,.008,.014)+ribbon*exitFade*centerCalm;
  }
`;

export function finishEntranceMaterial(source: THREE.MeshStandardMaterial, uniforms: EntranceUniforms) {
  const code = source.name.match(/M\d\d/)?.[0] ?? "M24";
  const led = code === "M09" || code === "M10";
  const material = led ? new THREE.MeshPhysicalMaterial({name:source.name,color:source.color,roughness:.36,
    metalness:0,emissive:source.emissive,side:source.side,specularIntensity:code==="M10"?.08:.02,ior:1.45}) : source.clone();
  const plant = ["M19","M20","M21"].includes(code);
  if(code==="M01")material.color.set("#20272a");
  if(code==="M02")material.color.set("#1c2325");
  if(code==="M18")material.color.set(source.map?"#c0b7a6":"#493f32");
  const stone = ["M11","M12","M13","M14","M16","M17"].includes(code);
  material.envMapIntensity = code === "M10" ? .18 : code === "M09" ? .12 : .7;
  if(code==="M05") {
    // Opal lit from within: exterior fill must not turn the warm line white.
    material.color.multiplyScalar(.18);material.emissive.set("#ffbe78");material.emissiveIntensity=1.25;
  }
  // Keep the floor normal perfectly flat: reflectance must not suggest water.
  if (led) { material.emissiveMap=null; material.emissive.set("#ffffff"); }
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
      varying vec3 vEntranceWorld; varying vec2 vEntranceUV;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        ${plant ? `float leafWeight=pow(clamp(uv.y,0.0,1.0),2.0);
        transformed.x+=.018*leafWeight*sin(uEntrancePhase+position.y*1.7+position.z*.8);
        transformed.z+=.008*leafWeight*sin(2.0*uEntrancePhase+position.x*.9);` : ""}
        vEntranceWorld=(modelMatrix*vec4(transformed,1.0)).xyz; vEntranceUV=uv;`);
    if(plant)shader.vertexShader=shader.vertexShader.replace("varying vec3 vEntranceWorld;", "uniform float uEntrancePhase; varying vec3 vEntranceWorld;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
      varying vec3 vEntranceWorld; varying vec2 vEntranceUV;
      uniform float uEntrancePhase; uniform float uEntranceGain; uniform float uEntranceReady;
      float entranceNoise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        vec4 n=vec4(dot(i,vec3(127.1,311.7,74.7)),dot(i+vec3(1,0,0),vec3(127.1,311.7,74.7)),
          dot(i+vec3(0,1,0),vec3(127.1,311.7,74.7)),dot(i+vec3(1,1,0),vec3(127.1,311.7,74.7)));
        vec4 a=fract(sin(n)*43758.5453), b=fract(sin(n+74.7)*43758.5453);
        vec4 c=mix(a,b,f.z); return mix(mix(c.x,c.y,f.x),mix(c.z,c.w,f.x),f.y);
      }
      ${led ? emeraldCurrent : ""}`);
    if (led) {
      shader.fragmentShader=shader.fragmentShader.replace("#include <emissivemap_fragment>", `
        vec3 current=emeraldCurrent(vEntranceUV.x*48.0,-vEntranceWorld.z-14.4,uEntrancePhase);
        totalEmissiveRadiance=mix(vec3(.0033,.0296,.0382),current*1.55,uEntranceReady)*uEntranceGain;
      `);
    } else if (!["M05","M06","M07"].includes(code)) {
      shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        float grain=entranceNoise(vEntranceWorld*${plant?"9.0":stone?"18.0":"120.0"});
        float macro=entranceNoise(vEntranceWorld*${code==="M18"?"vec3(15.0,1.0,15.0)":"2.2"});
        diffuseColor.rgb *= ${plant?".83+.32*macro":stone?".89+.18*macro+.045*grain":".975+.05*grain"};
        ${code==="M11" ? `vec2 tileUV=vEntranceWorld.xz/2.0;
        vec2 edge=min(fract(tileUV),1.0-fract(tileUV))*2.0;
        float joint=1.0-smoothstep(.002,.002+max(fwidth(vEntranceWorld.x),fwidth(vEntranceWorld.z)),min(edge.x,edge.y));
        diffuseColor.rgb*=1.0-.22*joint;` : ""}
        ${plant ? `float vein=exp(-pow((vEntranceUV.x-.5)*70.0,2.0));
        float lamina=.96+.04*sin(vEntranceUV.y*95.0+abs(vEntranceUV.x-.5)*20.0);
        diffuseColor.rgb*=lamina*(1.0+.12*vein);
        if(!gl_FrontFacing)diffuseColor.rgb*=vec3(.94,1.08,.81);` : ""}
        ${code==="M13" ? `float wet=(1.0-smoothstep(-.065,-.005,vEntranceWorld.y));diffuseColor.rgb*=1.0-.27*wet;` : ""}`);
      shader.fragmentShader=shader.fragmentShader.replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor=clamp(roughnessFactor+(grain-.5)*${stone?".08":".04"},.06,.95);
        ${code==="M13"?"roughnessFactor=mix(roughnessFactor,.24,wet);":""}`);
      if(!plant)shader.fragmentShader=shader.fragmentShader.replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
        vec3 grainP=vEntranceWorld*${code==="M18"?"vec3(22.0,1.2,22.0)":stone?"18.0":"120.0"};
        float grainH=entranceNoise(grainP);
        vec3 microSlope=vec3(entranceNoise(grainP+vec3(.04,0,0))-grainH,
          entranceNoise(grainP+vec3(0,.04,0))-grainH,entranceNoise(grainP+vec3(0,0,.04))-grainH);
        normal=normalize(normal-mat3(viewMatrix)*microSlope*${code==="M18"?"2.8":stone?".55":".3"});`);
    }
  };
  material.customProgramCacheKey=()=>`entrance-refined-${code}-v3`;
  return material;
}
