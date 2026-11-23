import * as THREE from "three";
import { isPremiumSignMaterial, stylePremiumSign } from "./premiumSignMaterials";

const prepared = new WeakSet<THREE.Material>();

/** Projection stall only: the header key light (ReferenceProjection.tsx:142) washes the aqua AV face out to white, so it is rougher and darker here. */
export const PROJECTION_AQUA_FACE = { roughness: .9, colorScale: .25 } as const;

function tuneProjectionAquaFace(material: THREE.MeshStandardMaterial) {
  // The flag lives in userData so a clone of a tuned material is never darkened twice.
  if (material.name !== "Premium Sign | aqua lit face" || material.userData.projectionAquaFace) return;
  material.userData.projectionAquaFace = true;
  material.roughness = PROJECTION_AQUA_FACE.roughness;
  material.color.multiplyScalar(PROJECTION_AQUA_FACE.colorScale);
}

/** Metre-scale, low-contrast surface finish; the geometry carries the reveals
 * and the lights carry the reflections. No painted highlights on metal. */
function finish(material: THREE.MeshStandardMaterial, kind: "metal" | "paint" | "fabric", specular=1, opticalGradient=false) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vProjectionFinish;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvProjectionFinish=position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vProjectionFinish;
        float projectionMicrograin(vec3 p){
          return fract(sin(dot(floor(p),vec3(127.1,311.7,74.7)))*43758.5453);
        }`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        float grainAA=1.0-smoothstep(.35,1.1,max(length(dFdx(vProjectionFinish)),length(dFdy(vProjectionFinish)))*150.0);
        float fineGrain=projectionMicrograin(vProjectionFinish*150.0)-.5;
        roughnessFactor=clamp(roughnessFactor+fineGrain*grainAA*${kind === "fabric" ? ".045" : ".022"},.08,.98);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        ${opticalGradient ? `#if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
          totalEmissiveRadiance*=mix(.20,1.30,smoothstep(.30,1.0,vColor.r));
        #endif` : ""}`)
      .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
        reflectedLight.directSpecular *= ${specular.toFixed(3)};
        reflectedLight.indirectSpecular *= ${specular.toFixed(3)};`);
  };
  material.customProgramCacheKey = () => `projection-physical-finish-v8-${kind}-${specular}-${opticalGradient}`;
}

/** Finishes calibrated independently for the newly authored projection stand. */
export function applyProjectionBoothMaterials(model: THREE.Object3D) {
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof THREE.MeshStandardMaterial) || prepared.has(material)) continue;
      prepared.add(material);
      const name = material.name;
      if (isPremiumSignMaterial(name)) { stylePremiumSign(material); continue; }
      material.onBeforeCompile = () => {};
      material.emissive.set(0x000000);
      material.emissiveIntensity = 0;
      material.toneMapped = true;

      if (/concealed.*(?:teal|green)|teal.*(?:reveal|cove)|mint cyan|livegrid teal folded emblem/i.test(name)) {
        material.color.set("#024333"); material.emissive.set("#43e3c1");
        material.emissiveIntensity = 1.3; material.toneMapped = false;
      } else if (/warm pearl concealed LED|concealed.*white|central optic|optical lens|lens core|integrated warm optic/i.test(name)) {
        material.color.set("#211b14"); material.emissive.set(/lens|optic/i.test(name) ? "#c4e2ff" : "#ffe3b3");
        material.emissiveIntensity = /lens|optic/i.test(name) ? 2.1 : 1.25; material.toneMapped = false;
      } else if (/smoked bronze recessed arch soffit/i.test(name)) {
        material.color.set("#30251a"); material.metalness = .82; material.roughness = .34;
        material.envMapIntensity = .72; finish(material, "metal", .8);
      } else if (/satin black service branding return/i.test(name)) {
        material.color.set("#11171b"); material.metalness = .08; material.roughness = .58;
        material.envMapIntensity = .55; finish(material, "paint", .55);
      } else if (/satin black structural arch depth/i.test(name)) {
        material.color.set("#11171b"); material.metalness = .16; material.roughness = .48;
        material.envMapIntensity = .60; finish(material, "paint", .60);
      } else if (/champagne|gold.*(?:return|trim|metal)/i.test(name)) {
        material.color.set("#b99a66"); material.metalness = .94; material.roughness = .23;
        material.envMapIntensity = .85; finish(material, "metal");
      } else if (/illuminated folded reception wedge/i.test(name)) {
        material.color.set("#01452f"); material.emissive.set("#06ab7e");
        material.emissiveIntensity = .30; material.metalness = .72; material.roughness = .23;
        material.envMapIntensity = 1.1; finish(material, "metal", 1, true);
      } else if (/deep green|sculpted.*green|emerald metallic/i.test(name)) {
        material.color.set("#034b38"); material.metalness = .72; material.roughness = .235;
        material.envMapIntensity = 1.2; finish(material, "metal");
      } else if (/satin black curved fascia/i.test(name)) {
        material.color.set("#11171b"); material.metalness = .20; material.roughness = .39;
        material.envMapIntensity = .65; finish(material, "paint", .65);
      } else if (/satin black (?:gallery surround|recessed gallery soffit)|fluted charcoal anodized pilaster/i.test(name)) {
        material.color.set("#171a1b"); material.metalness = .22; material.roughness = .52;
        material.envMapIntensity = .30; finish(material, "paint", .35);
      } else if (/black satin ceramic planter body/i.test(name)) {
        material.color.set("#151b1a"); material.metalness = .24; material.roughness = .32;
        material.envMapIntensity = .8; finish(material, "paint");
      } else if (/polished black stone tabletop/i.test(name)) {
        material.color.set("#141918"); material.metalness = .08; material.roughness = .27;
        material.envMapIntensity = .65; finish(material, "paint");
      } else if (/quartz.*(?:worktop|rail)|quartz.*reception/i.test(name)) {
        material.color.set("#b6b7b1"); material.metalness = .02; material.roughness = .35;
        material.envMapIntensity = .6; finish(material, "paint", .6);
      } else if (/matte black architectural|satin graphite wall|black.*(?:soffit|canopy)/i.test(name)) {
        material.color.set("#0b0e10"); material.metalness = 0; material.roughness = .76;
        material.envMapIntensity = .12; finish(material, "paint", .24);
      } else if (/glossy charcoal honed pathway stone/i.test(name)) {
        material.color.set("#4d5356"); material.metalness = .04; material.roughness = .31;
        material.envMapIntensity = .55;
      } else if (/upholstery/i.test(name)) {
        material.color.set("#c8bfb0"); material.metalness = 0; material.roughness = .83;
        material.envMapIntensity = .5; finish(material, "fabric");
      } else if (/letter|branding|wordmark/i.test(name)) {
        material.color.set("#e8ece9"); material.emissive.set("#d4ddd9"); material.emissiveIntensity = .24;
        material.metalness = 0; material.roughness = .8;
      } else if (/glass/i.test(name)) {
        if (material instanceof THREE.MeshPhysicalMaterial) material.transmission = 0;
        material.color.set("#d1e0dd"); material.transparent = true; material.opacity = .24;
        material.depthWrite = false; material.metalness = 0; material.roughness = .12;
      } else if (/projector|brushed.*cabinet/i.test(name)) {
        material.color.set("#151a1e"); material.metalness = .26; material.roughness = .43;
        material.envMapIntensity = .4; finish(material, "paint");
      }
      material.needsUpdate = true;
    }
  });
}

/** The V2 installation owns these finishes. Earlier stands retain their
 * accepted materials; pigment maps on the new leaves remain unmodified. */
export function applyProjectionFinishV2Materials(model: THREE.Object3D) {
  const seen=new Set<THREE.Material>();
  model.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    object.castShadow=true;object.receiveShadow=true;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(!(material instanceof THREE.MeshStandardMaterial)||seen.has(material))continue;
      seen.add(material);
      const name=material.name;
      if(isPremiumSignMaterial(name)){stylePremiumSign(material);tuneProjectionAquaFace(material);continue;}
      material.onBeforeCompile=()=>{};
      material.emissive.set(0);material.emissiveIntensity=0;material.toneMapped=true;
      if(/Rocketbox/i.test(name)){
        material.envMapIntensity=.52;
        if(/\| body(?:\.\d+)?$/i.test(name))material.roughness=.86;
      }else if(/foliage|leaf|pinnae/i.test(name)){
        material.color.set("#ffffff");material.metalness=0;material.roughness=.78;
        material.envMapIntensity=.28;material.side=THREE.DoubleSide;
        finish(material,"fabric",.48);
      }else if(/bark|stem|branch|soil/i.test(name)){
        material.metalness=0;material.roughness=.93;material.envMapIntensity=.25;
      }else if(/(?:teal|green).*(?:optic|reveal|cove|emblem)|concealed.*(?:teal|green)|mint cyan/i.test(name)){
        material.color.set("#073e32");material.emissive.set("#57e7ca");
        material.emissiveIntensity=1.05;material.toneMapped=false;
      }else if(/(?:downlight|hall|venue|projector|central).*optic|warm pearl concealed LED|concealed.*white|optical lens|lens core/i.test(name)){
        const lens=/lens|projector.*optic/i.test(name);
        material.color.set("#171611");material.emissive.set(lens?"#cbe5ff":"#ffdfb2");
        material.emissiveIntensity=lens?1.7:1.6;material.toneMapped=false;material.side=THREE.DoubleSide;
      }else if(/champagne|gold.*(?:return|trim|metal)/i.test(name)){
        material.color.set("#af9872");material.metalness=.90;material.roughness=.29;
        material.envMapIntensity=.70;finish(material,"metal",.86);
      }else if(/folded reception wedge/i.test(name)){
        material.color.set("#02412f");material.emissive.set("#00a77b");material.emissiveIntensity=.22;
        material.metalness=.65;material.roughness=.27;material.envMapIntensity=.8;finish(material,"metal",.85,true);
      }else if(/deep green|sculpted.*green|emerald/i.test(name)){
        material.color.set("#034936");material.metalness=.65;material.roughness=.27;
        material.envMapIntensity=.85;finish(material,"metal",.85);
      }else if(/letter|branding|wordmark/i.test(name)){
        material.color.set("#e7eeed");material.emissive.set("#d4e0dc");material.emissiveIntensity=.22;
        material.metalness=0;material.roughness=.78;
      }else if(/upholstery|woven|boucle/i.test(name)){
        material.color.set("#c5c1b6");material.metalness=0;material.roughness=.90;
        material.envMapIntensity=.40;finish(material,"fabric",.6);
      }else if(/quartz|stone worktop/i.test(name)){
        material.color.set("#b9bab2");material.metalness=.01;material.roughness=.38;
        material.envMapIntensity=.55;finish(material,"paint",.65);
      }else if(/planter|tabletop/i.test(name)){
        material.color.set("#141c1a");material.metalness=.18;material.roughness=.35;
        material.envMapIntensity=.65;finish(material,"paint",.8);
      }else if(/glass/i.test(name)){
        material.color.set("#d1e0dd");material.transparent=true;material.opacity=.24;
        material.depthWrite=false;material.roughness=.12;
        if(material instanceof THREE.MeshPhysicalMaterial)material.transmission=0;
      }else if(/(?:hall|venue).*(?:steel|truss|purlin)|graphite.*(?:steel|truss)|lattice|rigging/i.test(name)){
        material.color.set("#526173");material.metalness=.52;material.roughness=.48;
        material.envMapIntensity=.7;material.emissive.set("#243142");material.emissiveIntensity=.20;
      }else if(/fascia|service branding|structural arch/i.test(name)){
        material.color.set("#10171b");material.metalness=.20;material.roughness=.51;
        material.envMapIntensity=.55;finish(material,"paint",.38);
      }else if(/flut|raised flute/i.test(name)){
        material.color.set("#080e11");material.metalness=.07;material.roughness=.65;
        material.envMapIntensity=.22;finish(material,"paint",.12);
      }else if(/black|charcoal|graphite|soffit|gallery/i.test(name)){
        material.color.set("#101619");material.metalness=.12;material.roughness=.59;
        material.envMapIntensity=.38;finish(material,"paint",.48);
      }
      material.needsUpdate=true;
    }
  });
}
