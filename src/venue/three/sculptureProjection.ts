import * as THREE from "three";
import { PROJECTION_ROOT, PROJECTION_ROTATION, PROJECTION_SCALE, PROJECTION_SCULPTURE_OFFSET, PROJECTION_SCULPTURE_SCALE } from "../data/projection";

export type SculptureProjectionUniforms={
  uSculpturePattern:{value:THREE.Texture};uSculptureOn:{value:number};
  uSculptureWorldToModel:{value:THREE.Matrix4};
  uSculptureDomain:{value:THREE.Vector4};
  uSculptureProjector0:{value:THREE.Vector3};uSculptureProjector1:{value:THREE.Vector3};uSculptureProjector2:{value:THREE.Vector3};
};

/** The light field follows the actual crystal facets in model space. Metallic
 * returns retain their physical reflections beneath the moving projection. */
export function sculptureProjectionUniforms(texture:THREE.Texture,projectors:number[][],domain:{min:number[];max:number[]}):SculptureProjectionUniforms{
  const root=new THREE.Matrix4().compose(new THREE.Vector3(...PROJECTION_ROOT),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...PROJECTION_ROTATION)),new THREE.Vector3().setScalar(PROJECTION_SCALE));
  const model=root.clone().multiply(new THREE.Matrix4().makeTranslation(...PROJECTION_SCULPTURE_OFFSET))
    .multiply(new THREE.Matrix4().makeScale(...PROJECTION_SCULPTURE_SCALE));
  const source=(i:number)=>new THREE.Vector3().fromArray(projectors[i]??[0,4.72,1.25]).applyMatrix4(root);
  return {uSculpturePattern:{value:texture},uSculptureOn:{value:1},uSculptureWorldToModel:{value:model.invert()},
    uSculptureDomain:{value:new THREE.Vector4(domain.min[0],domain.min[1],domain.max[0]-domain.min[0],domain.max[1]-domain.min[1])},
    uSculptureProjector0:{value:source(0)},uSculptureProjector1:{value:source(1)},uSculptureProjector2:{value:source(2)}};
}

export function applySculptureProjection(model:THREE.Object3D,uniforms:SculptureProjectionUniforms){
  const copies=new Map<THREE.Material,THREE.MeshStandardMaterial>();
  model.updateMatrixWorld(true);
  const toRoot=model.matrixWorld.clone().invert(),point=new THREE.Vector3(),domain=uniforms.uSculptureDomain.value;
  model.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    object.castShadow=true;object.receiveShadow=true;
    // Register the projected field once on the native model, before the whole
    // pavilion moves into the venue. This avoids large world coordinates and
    // glTF node axes changing the image's sampling domain.
    const geometry=object.geometry.clone(),positions=geometry.getAttribute("position");
    const uv=new Float32Array(positions.count*2),toModel=toRoot.clone().multiply(object.matrixWorld);
    for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i).applyMatrix4(toModel);
      uv[i*2]=(point.x-domain.x)/domain.z;uv[i*2+1]=(point.y-domain.y)/domain.w;
    }
    geometry.setAttribute("sculptureUv",new THREE.BufferAttribute(uv,2));object.geometry=geometry;
    const source=Array.isArray(object.material)?object.material:[object.material];
    const materials=source.map(original=>{
      if(!(original instanceof THREE.MeshStandardMaterial))return original;
      const existing=copies.get(original);if(existing)return existing;
      const material=original.clone();copies.set(original,material);
      const moon=/moon|porcelain/i.test(original.name),dark=/dark.*(?:recess|niche|alcove)|shadow.*vault/i.test(original.name);
      const warm=/warm.*rib|ivory.*return/i.test(original.name);
      const ice=/pale blue secondary facet/i.test(original.name);
      const amber=/mapped amber primary facet/i.test(original.name);
      const gold=/crystal champagne gold/i.test(original.name),silver=/crystal brushed silver/i.test(original.name);
      material.color.set(amber?"#b9a77e":gold?"#cbbb9d":silver?"#96a5b1":moon?"#f4ebd8":dark?"#101d2b":warm?"#ddd9cf":ice?"#89a7bd":"#b1b9bd");
      if(silver&&/crystal brushed silver contrast facet/i.test(original.name))material.color.multiplyScalar(.82);
      material.metalness=gold?.65:silver?.60:0;material.roughness=gold||silver?.34:moon?.46:.48;
      material.envMapIntensity=gold?.85:silver?.65:moon?.42:warm?.28:.38;
      material.emissive.set(moon?"#edd7ad":warm?"#e7c082":"#000000");
      material.emissiveIntensity=moon?.32:warm?.025:0;
      if(moon)return material;
      material.onBeforeCompile=shader=>{
        Object.assign(shader.uniforms,uniforms);
        shader.vertexShader=shader.vertexShader.replace("#include <common>",`#include <common>
          attribute vec2 sculptureUv; varying vec2 vSculptureUv;
          varying vec3 vSculptureWorld; varying vec3 vSculptureNormal;`)
          .replace("#include <begin_vertex>",`#include <begin_vertex>
            vSculptureUv=sculptureUv;
            vSculptureWorld=(modelMatrix*vec4(transformed,1.0)).xyz;
            vSculptureNormal=inverseTransformDirection(transformedNormal,viewMatrix);`);
        shader.fragmentShader=shader.fragmentShader.replace("#include <common>",`#include <common>
          uniform sampler2D uSculpturePattern; uniform float uSculptureOn;
          uniform mat4 uSculptureWorldToModel;
          uniform vec4 uSculptureDomain;
          uniform vec3 uSculptureProjector0; uniform vec3 uSculptureProjector1; uniform vec3 uSculptureProjector2;
          varying vec2 vSculptureUv;
          varying vec3 vSculptureWorld; varying vec3 vSculptureNormal;`)
          .replace("#include <opaque_fragment>",`
            vec2 sculptureUV=vSculptureUv;
            vec3 mappedLight=texture2D(uSculpturePattern,clamp(sculptureUV,vec2(.001),vec2(.999))).rgb;
            // Dark blue troughs and amber bodies carry the projection; the
            // narrow near-white vein cores retain their own highlight colour.
            vec3 causticField=pow(max(mappedLight,vec3(0.0)),vec3(1.45));
            float causticCore=smoothstep(.62,.96,max(mappedLight.r,max(mappedLight.g,mappedLight.b)));
            ${amber ? `float amberEnergy=dot(causticField,vec3(.25,.50,.25));
            mappedLight=mix(amberEnergy*vec3(1.28,.62,.14),amberEnergy*vec3(1.35,1.12,.70),causticCore*.72);`
              : !dark&&!gold&&!silver&&!warm ? `mappedLight=mix(causticField*${ice?"vec3(.24,.59,1.10)":"vec3(.40,.70,1.06)"},causticField*vec3(.92,.98,1.04),causticCore*.52);`
              : "mappedLight=causticField;"}
            vec3 sculptureNormal=normalize(vSculptureNormal);
            float primary=max(0.0,dot(sculptureNormal,normalize(uSculptureProjector0-vSculptureWorld)));
            float leftFill=max(0.0,dot(sculptureNormal,normalize(uSculptureProjector1-vSculptureWorld)));
            float rightFill=max(0.0,dot(sculptureNormal,normalize(uSculptureProjector2-vSculptureWorld)));
            float sculptureShape=.24+.76*max(primary,max(leftFill,rightFill)*.72);
            float sculptureAO=1.0;
            #ifdef USE_COLOR
              sculptureAO=clamp(dot(vColor.rgb,vec3(.333333)),.30,1.0);
            #endif
            vec3 sculptureLight=mappedLight*sculptureShape*sculptureAO*${dark?".10":gold?".12":silver?".15":warm?".07":amber?"1.20":"1.15"};
            outgoingLight=mix(outgoingLight,outgoingLight*${dark?".24":gold||silver?".86":warm?".96":ice?".12":".16"}+sculptureLight,uSculptureOn);
            #include <opaque_fragment>`);
      };
      material.customProgramCacheKey=()=>`projection-crystals-caustics-v11-native-uv-${dark}-${warm}-${gold}-${silver}-${ice}-${amber}`;
      return material;
    });
    object.material=Array.isArray(object.material)?materials:materials[0];
  });
  return [...copies.values()];
}
