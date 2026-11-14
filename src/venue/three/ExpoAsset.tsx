"use client";
import { Suspense, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { prepareArchitecture } from "./architecturalFinish";
import { applyTechnicalMaterials } from "./technicalMaterials";
import { applyProjectionBoothMaterials, applyProjectionFinishV2Materials } from "./projectionMaterials";
import { prepareArchitecturalLettering } from "./architecturalLettering";
import signageRevisions from "../../../public/models/expo/signage-revisions.json";
import { useVenue } from "../systems/store";
import { inProjectionShowcase } from "../data/projection";
import { inRental2026 } from "../data/ledRental2026";
import { applyRental2026Materials } from "./rental2026Materials";
import type { InstallationId } from "../data/placements";

function installationFinishId(name:string):InstallationId|undefined {
  if(name.startsWith("grand-anamorphic"))return "S1";
  if(name.startsWith("grand-rental"))return "S2";
  if(name.startsWith("grand-technical")||name==="technical-reference-hall-rig-v3")return "S3";
  if(name.startsWith("projection-finish-v2-"))return "S4";
  if(name.startsWith("grand-reception"))return "R";
  if(name.startsWith("grand-pillar"))return "L";
  return undefined;
}

export function expoAssetUrl(name:string,revision?:string){
  const fingerprint=(signageRevisions as Record<string,string>)[name];
  const version=[revision,fingerprint].filter(Boolean).join("-");
  return `/models/expo/${name}.glb${version?`?v=${encodeURIComponent(version)}`:""}`;
}
type AssetProps = { name: string; revision?:string; darkHall?: boolean; hideHallColumns?: boolean };
const avatarTextures=new Map<string,THREE.Texture>();
/** The licensed avatar exports repeat identical atlases for the same named
 * clothing variant and channel. Share only that exact semantic material/slot
 * and sampler combination; generic image names are not unique across people. */
function shareAvatarTextures(model:THREE.Object3D){
  model.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(!(material instanceof THREE.MeshStandardMaterial)||!/^Rocketbox\s*\|/i.test(material.name))continue;
      for(const slot of ["map","normalMap","alphaMap","roughnessMap","metalnessMap"] as const){
        const texture=material[slot];if(!texture)continue;
        const image=texture.image as {width?:number;height?:number}|undefined;
        const key=[material.name,slot,image?.width,image?.height,texture.colorSpace,texture.flipY,texture.wrapS,texture.wrapT,...texture.repeat.toArray(),...texture.offset.toArray(),texture.rotation].join("|");
        const shared=avatarTextures.get(key);
        if(shared)material[slot]=shared;else avatarTextures.set(key,texture);
      }
    }
  });
}
function Model({ name, revision, darkHall=false, hideHallColumns=false }: AssetProps) {
  const { scene } = useGLTF(expoAssetUrl(name,revision), false);
  const {clone,owned,overhead,sectionWalls} = useMemo(() => {
    const model = scene.clone(true);
    shareAvatarTextures(model);
    const owned:THREE.Material[]=[];
    if(darkHall || hideHallColumns){
      const finishes=new Map<THREE.Material,THREE.Material>();
      model.traverse(object=>{
        if(!(object instanceof THREE.Mesh)) return;
        const source=Array.isArray(object.material)?object.material:[object.material];
        // The connected technical booth owns its structure. The repeatable
        // hall's aluminium column batch would intersect its clear upper box.
        if (hideHallColumns && name === "hall-bay" && source.every(material => /satin aluminium/i.test(material.name))) object.visible = false;
        if (!darkHall) return;
        if(source.some(material=>/integrated light/i.test(material.name))) object.visible=false;
        const materials=source.map(material=>{
          const existing=finishes.get(material);
          if(existing) return existing;
          const copy=material.clone();
          if(copy instanceof THREE.MeshStandardMaterial){
            copy.color.set(/aluminium/i.test(copy.name)?"#101318":/stone/i.test(copy.name)?"#171a20":"#080a0d");
            copy.roughness=.76;copy.metalness=/aluminium/i.test(copy.name)?.28:.05;
          }
          finishes.set(material,copy);owned.push(copy);return copy;
        });
        object.material=Array.isArray(object.material)?materials:materials[0];
      });
    }
    // Botanical leaves and bark carry authored UV maps and normals.
    if (!name.startsWith("projection-botanical-")&&!name.startsWith("projection-grand-botanical")) prepareArchitecture(model,installationFinishId(name));
    else model.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      object.castShadow=true;object.receiveShadow=true;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        if(!(material instanceof THREE.MeshStandardMaterial))continue;
        if(/planter champagne/i.test(material.name))material.envMapIntensity=1.4;
        // The authored leaf maps include their own varied olive pigment.
        // Preserve that colour under the brighter, warm exhibition fixtures.
        if(/foliage/i.test(material.name))material.color.set(/mature ficus/i.test(material.name)?"#b0bc81":/small climbing/i.test(material.name)?"#b5be73":"#96a768");
        if(/foliage fine fern pinnae/i.test(material.name)){
          material.color.set("#55743e");material.roughness=.85;material.metalness=0;material.envMapIntensity=.15;
          material.onBeforeCompile=shader=>{
            shader.fragmentShader=shader.fragmentShader.replace("#include <lights_fragment_end>",`#include <lights_fragment_end>
              reflectedLight.directSpecular*=.20;
              reflectedLight.indirectSpecular*=.30;`);
          };
          material.customProgramCacheKey=()=>"projection-botanical-needles-v9";
        }
      }
    });
    if(name.startsWith("projection-hall-rig"))model.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      for(const material of materials)if(material instanceof THREE.MeshStandardMaterial&&/graphite steel box truss|brushed charcoal aluminium triangulated lattice|dark grey rolled roof purlins/i.test(material.name)){
        material.color.set("#526174");material.metalness=.55;material.roughness=.43;material.envMapIntensity=.85;
        material.emissive.set("#18212c");material.emissiveIntensity=.12;
      }
    });
    if(name.startsWith("projection-visitors-"))model.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        if(!(material instanceof THREE.MeshStandardMaterial)||!/Rocketbox/i.test(material.name))continue;
        material.envMapIntensity=.55;
        if(/\| body(?:\.\d+)?$/i.test(material.name)){
          material.roughness=.86;
          material.onBeforeCompile=shader=>{
            shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
              float redTie=step(diffuseColor.g*1.8,diffuseColor.r)*step(diffuseColor.b*1.7,diffuseColor.r);
              diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))*.28),redTie*.92);`);
          };
          material.customProgramCacheKey=()=>"projection-visitors-charcoal-tailoring-v10";
        }
      }
    });
    if (name === "technical-showcase"||name.startsWith("grand-technical")) applyTechnicalMaterials(model);
    if(name.startsWith("led-rental-2026-")||name.startsWith("grand-rental")||name.startsWith("grand-reception")||name.startsWith("grand-pillar"))applyRental2026Materials(model,name.startsWith("grand-rental-finish-v2-"));
    if (name.startsWith("projection-mapping-stall")||name.startsWith("projection-interior-details")||name.startsWith("projection-projectors")||name==="projection-grand-v1") applyProjectionBoothMaterials(model);
    if(name.startsWith("projection-finish-v2-"))applyProjectionFinishV2Materials(model);
    prepareArchitecturalLettering(model);
    const overhead:THREE.Object3D[]=[];
    const sectionWalls:THREE.Object3D[]=[];
    model.traverse(object=>{
      if(object.userData.grandRole==="floor"||object.userData.grandRole==="shared-floor"||object.userData.grandSharedFloor)object.visible=false;
      if(object.userData.grandRole==="overhead"||object.userData.grandOverhead)overhead.push(object);
      if(object.userData.grandRole==="section-wall")sectionWalls.push(object);
    });
    if(name.startsWith("projection-mapping-stall"))model.traverse(object=>{
      if(object.userData.projectionOverhead)overhead.push(object);
    });
    if(name==="led-rental-2026-shell"||name.startsWith("grand-rental-finish-v2-"))model.traverse(object=>{
      if(object.userData.ledRentalOverhead)overhead.push(object);
    });
    return {clone:model,owned,overhead,sectionWalls};
  }, [scene,darkHall,hideHallColumns,name]);
  useEffect(()=>()=>owned.forEach(material=>material.dispose()),[owned]);
  useFrame(()=>{
    const state=useVenue.getState();
    const diagnostic=state.stallVisit?.view==="plan"||state.stallVisit?.view==="section";
    const visible=name==="led-rental-2026-shell"||name.startsWith("grand-rental-finish-v2-")
      ?state.rentalAngle!=="top"||!inRental2026(state.progress)
      :state.projectionAngle!=="top"||!inProjectionShowcase(state.progress);
    overhead.forEach(object=>{object.visible=visible&&!diagnostic;});
    sectionWalls.forEach(object=>{object.visible=state.stallVisit?.view!=="section";});
  },-2);
  return <primitive object={clone} dispose={null} />;
}
export function ExpoAsset(props: AssetProps) {
  return <Suspense fallback={null}><Model {...props}/></Suspense>;
}
