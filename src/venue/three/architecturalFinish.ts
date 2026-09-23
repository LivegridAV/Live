import * as THREE from "three";

// A fine, world-space finish shared by the authored buildings. This adds
// subtle honed-stone / powder-coat roughness without stretching an image map
// over differently sized pieces. Baked GLB vertex colours supply contact AO.
const prepared = new WeakSet<THREE.Material>();
export function prepareArchitecture(model: THREE.Object3D) {
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial) || prepared.has(material)) continue;
      prepared.add(material);
      if (/glass/i.test(material.name)) { material.depthWrite = false; material.side = THREE.DoubleSide; continue; }
      if (/light|porcelain|substrate|leaf|water/i.test(material.name)) continue;
      const stone = /stone|travertine/i.test(material.name);
      const fabric = /upholstery/i.test(material.name);
      if (stone) material.roughness = Math.max(.48, material.roughness);
      material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vFinishPosition;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFinishPosition = (modelMatrix * vec4(position,1.0)).xyz;");
        shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
          varying vec3 vFinishPosition;
          float finishHash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
          float finishNoise(vec3 p){vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(mix(finishHash(i),finishHash(i+vec3(1,0,0)),f.x),mix(finishHash(i+vec3(0,1,0)),finishHash(i+vec3(1,1,0)),f.x),f.y),
              mix(mix(finishHash(i+vec3(0,0,1)),finishHash(i+vec3(1,0,1)),f.x),mix(finishHash(i+vec3(0,1,1)),finishHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
          .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
            float grain=finishNoise(vFinishPosition*${stone ? "14.0" : "95.0"});
            roughnessFactor=clamp(roughnessFactor+(grain-.5)*${stone ? ".06" : ".035"},.05,1.0);`)
          .replace("#include <color_fragment>", `#include <color_fragment>
            diffuseColor.rgb *= ${stone ? ".965 + .04 * finishNoise(vFinishPosition*3.8) + .01*finishNoise(vFinishPosition*34.0)" : fabric ? ".97+.03*finishNoise(vFinishPosition*110.0)" : ".985+.015*finishNoise(vFinishPosition*75.0)"};`);
      };
      material.customProgramCacheKey = () => `architectural-finish-v2-${stone}-${fabric}`;
      material.needsUpdate = true;
    }
  });
}
