import * as THREE from "three";

const prepared=new WeakSet<THREE.Material>();
/** Restrained black metal, champagne highlights and the reference's warm white edge. */
export function applyRental2026Materials(model:THREE.Object3D,referenceFinish=false){
  model.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(!(material instanceof THREE.MeshStandardMaterial)||prepared.has(material))continue;
      prepared.add(material);
      const name=material.name;
      if(/Rocketbox/i.test(name)){material.envMapIntensity=.65;continue;}
      if(referenceFinish){
        // The new pavilion has its own finish tuning. Older reception and
        // four-sided pillar assets keep their previously accepted materials.
        if(/matte.*black|satin black|black.*counter/i.test(name)){
          material.color.set("#11151a");material.metalness=.36;material.roughness=.40;material.envMapIntensity=.8;
        }
        if(/charcoal architectural panel/i.test(name)){
          material.color.set("#10151b");material.metalness=.08;material.roughness=.67;material.envMapIntensity=.46;
        }
        if(/truss|graphite aluminium/i.test(name)){
          material.color.set("#35414d");material.metalness=.65;material.roughness=.43;material.envMapIntensity=.7;
        }
        if(/champagne|satin.*metal|brushed.*metal/i.test(name)){
          material.color.set("#a99b7f");material.metalness=.86;material.roughness=.31;material.envMapIntensity=.85;
        }
        if(/teal.*(?:light|rope|strip|reveal|edge|emblem)|illuminated teal/i.test(name)){
          material.color.set("#2ce3c7");material.emissive.set("#27dbc2");material.emissiveIntensity=1.05;material.toneMapped=false;
        }
        if(/warm.*(?:light|rope|optic|strip|cove|lens)|(?:light|strip).*warm/i.test(name)){
          material.color.set("#ffe7cd");material.emissive.set("#ffe2bf");material.emissiveIntensity=1.45;material.toneMapped=false;
        }
        if(/foliage|leaf|leaves|tropical/i.test(name)){
          material.color.set(/broad tropical/i.test(name)?"#c0c6a7":"#c5c9a9");material.side=THREE.DoubleSide;
          material.roughness=/broad tropical/i.test(name)?.53:.83;material.metalness=0;material.envMapIntensity=.24;
        }
        if(/upholstery/i.test(name)){material.envMapIntensity=.42;material.roughness=.88;}
        continue;
      }
      if(/matte.*black|black.*panel|black.*aluminium|charcoal.*panel|satin black|brushed dark aluminium edge/i.test(name)){
        material.color.set("#090c10");material.metalness=.18;material.roughness=.62;material.envMapIntensity=.42;
        const finish=material.onBeforeCompile;
        const fascia=/brushed dark aluminium edge/i.test(name);
        material.onBeforeCompile=(shader,renderer)=>{finish.call(material,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace("#include <lights_fragment_end>",`#include <lights_fragment_end>\nreflectedLight.directSpecular*=${fascia?".02":".08"}; reflectedLight.indirectSpecular*=.25; ${fascia?"reflectedLight.directDiffuse*=.25; reflectedLight.indirectDiffuse*=.65;":""}`);};
        material.customProgramCacheKey=()=>`rental2026-restrained-black-finish-v4-${fascia}`;material.needsUpdate=true;
      }
      if(/charcoal architectural panel/i.test(name)){material.color.set("#06090c");material.metalness=.025;material.roughness=.84;material.envMapIntensity=.22;}
      if(/black truss steel/i.test(name)){material.color.set("#1c252d");material.roughness=.5;material.envMapIntensity=.55;}
      if(/brushed|champagne|satin.*metal/i.test(name)&&!/brushed dark aluminium edge/i.test(name)){material.metalness=.82;material.roughness=.29;material.envMapIntensity=1.2;}
      if(/teal.*(?:light|strip|reveal|edge|emblem)|(?:light|strip).*teal/i.test(name)){material.color.set("#17d3bd");material.emissive.set("#17d3bd");material.emissiveIntensity=1.1;material.toneMapped=false;}
      if(/warm.*(?:light|strip|cove)|(?:light|strip|cove).*warm/i.test(name)){material.emissive.set("#ffe2b6");material.emissiveIntensity=1.5;material.toneMapped=false;}
      if(/foliage|leaf|leaves/i.test(name)){material.color.set("#b1bd88");material.side=THREE.DoubleSide;material.roughness=.85;material.metalness=0;material.envMapIntensity=.2;}
      if(/broad tropical waxy/i.test(name)){material.color.set("#99af7f");material.roughness=.43;material.envMapIntensity=.4;}
      if(/upholstery/i.test(name))material.envMapIntensity=.3;
      if(/reception metal returns/i.test(name)){material.envMapIntensity=.7;material.roughness=.36;}
    }
  });
}
