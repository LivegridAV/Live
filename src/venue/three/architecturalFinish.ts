import * as THREE from "three";
import { placementWorldMatrix, type InstallationId } from "../data/placements";

type FinishFrame={worldToBaseline:THREE.Matrix4;baselineToWorldRotation:THREE.Matrix3};
const finishFrames=new Map<InstallationId,FinishFrame>();
/** Preserve the accepted world-projected grain in each installation's old frame. */
export function installationFinishFrame(id:InstallationId):FinishFrame {
  let frame=finishFrames.get(id);
  if(!frame){
    const current=new THREE.Matrix4().fromArray(placementWorldMatrix(id));
    const baseline=new THREE.Matrix4().fromArray(placementWorldMatrix(id,true));
    const worldToBaseline=baseline.multiply(current.invert());
    frame={worldToBaseline,baselineToWorldRotation:new THREE.Matrix3().setFromMatrix4(worldToBaseline.clone().invert())};
    finishFrames.set(id,frame);
  }
  return frame;
}

// A fine, world-space finish shared by the authored buildings. This adds
// subtle honed-stone / powder-coat roughness without stretching an image map
// over differently sized pieces. Baked GLB vertex colours supply contact AO.
const prepared = new WeakSet<THREE.Material>();
export function prepareArchitecture(model: THREE.Object3D,installation?:InstallationId) {
  const frame=installation?installationFinishFrame(installation):null;
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial) || prepared.has(material)) continue;
      prepared.add(material);
      // The photographed skin, hair and clothing maps already carry their
      // surface detail; architectural world-space grain would damage it.
      if (/^Rocketbox\s*\|/i.test(material.name)) continue;
      if (/Technical.*concealed warm white LED/i.test(material.name)) {
        material.emissive.set("#ffd19a"); material.emissiveIntensity = 1.45;
      }
      if (/glass|(?:clear|frosted).*acrylic/i.test(material.name)) { material.depthWrite = false; material.side = THREE.DoubleSide; continue; }
      if (/light|porcelain|substrate|leaf|water/i.test(material.name)) continue;
      const stone = /stone|travertine/i.test(material.name);
      const pathway = /honed pathway/i.test(material.name);
      const granite = /granite/i.test(material.name);
      const castCounter = /Technical.*rough cast black metal counter/i.test(material.name);
      const fabric = /upholstery/i.test(material.name);
      if (castCounter) { material.roughness = .43; material.metalness = .56; }
      if (stone) material.roughness = Math.max(.48, material.roughness);
      material.onBeforeCompile = shader => {
        if(frame)Object.assign(shader.uniforms,{
          uFinishWorldToBaseline:{value:frame.worldToBaseline},
          uFinishBaselineToWorldRotation:{value:frame.baselineToWorldRotation},
        });
        shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vFinishPosition;"+(frame?"\nuniform mat4 uFinishWorldToBaseline;":""))
          .replace("#include <begin_vertex>",frame?"#include <begin_vertex>\nvFinishPosition = (uFinishWorldToBaseline * modelMatrix * vec4(position,1.0)).xyz;":"#include <begin_vertex>\nvFinishPosition = (modelMatrix * vec4(position,1.0)).xyz;");
        shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
          varying vec3 vFinishPosition;${frame?"\n          uniform mat3 uFinishBaselineToWorldRotation;":""}
          float finishHash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
          float finishNoise(vec3 p){vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(mix(finishHash(i),finishHash(i+vec3(1,0,0)),f.x),mix(finishHash(i+vec3(0,1,0)),finishHash(i+vec3(1,1,0)),f.x),f.y),
              mix(mix(finishHash(i+vec3(0,0,1)),finishHash(i+vec3(1,0,1)),f.x),mix(finishHash(i+vec3(0,1,1)),finishHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
          .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
            float grain=finishNoise(vFinishPosition*${stone ? "14.0" : "95.0"});
            roughnessFactor=clamp(roughnessFactor+(grain-.5)*${castCounter ? ".18" : stone ? ".06" : ".035"},.05,1.0);`)
          .replace("#include <color_fragment>", `#include <color_fragment>
            diffuseColor.rgb *= ${pathway ? `.76+.28*finishNoise(vFinishPosition*1.5)+.12*pow(abs(sin(vFinishPosition.x*1.7+vFinishPosition.z*2.3+finishNoise(vFinishPosition*.8)*2.4)),22.0)` : granite ? `.68+.38*finishNoise(vFinishPosition*8.0)+.20*finishNoise(vFinishPosition*75.0)` : stone ? ".965 + .04 * finishNoise(vFinishPosition*3.8) + .01*finishNoise(vFinishPosition*34.0)" : fabric ? ".97+.03*finishNoise(vFinishPosition*110.0)" : ".985+.015*finishNoise(vFinishPosition*75.0)"};
            ${castCounter ? "diffuseColor.rgb += smoothstep(.62,.96,finishHash(floor(vFinishPosition*135.0)))*.055;" : ""}`);
        if(granite || castCounter) shader.fragmentShader=shader.fragmentShader.replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
          vec3 graniteGrain=vec3(finishNoise(vFinishPosition*92.0),finishNoise(vFinishPosition.yzx*97.0+7.0),finishNoise(vFinishPosition.zxy*89.0+13.0))-.5;
          normal=normalize(normal+mat3(viewMatrix)*${frame?"uFinishBaselineToWorldRotation*":""}graniteGrain*${castCounter ? ".36" : ".18"});`);
      };
      material.customProgramCacheKey = () => `architectural-finish-v4-${stone}-${fabric}-${pathway}-${granite}-${castCounter}${installation?`-rigid-${installation}`:""}`;
      material.needsUpdate = true;
    }
  });
}
