"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useVenue } from "./store";
import { reviewToolsAllowed } from "./reviewAccess";

/**
 * Explicit local QA cutaway. Never changes a venue/stall transform or path.
 * Runs only where the review modes run (reviewAccess.ts); every caller
 * (Scene, ZoneGroup) goes through this function. The `typeof` guard keeps the
 * single-expression body that scripts/verify-placement-protection.mjs
 * evaluates on its own, without this module's imports.
 */
export function placementInspectionEnabled() {
  return typeof location!=="undefined"&&new URLSearchParams(location.search).get("inspect")==="placement"&&(typeof reviewToolsAllowed!=="function"||reviewToolsAllowed());
}

function fingerprint(array:ArrayLike<number>) {
  let hash=2166136261;
  const bytes=ArrayBuffer.isView(array)?new Uint8Array(array.buffer,array.byteOffset,array.byteLength):new Uint8Array(new Float64Array(Array.from(array)).buffer);
  for(const value of bytes)hash=Math.imul(hash^value,16777619);
  return (hash>>>0).toString(16).padStart(8,"0");
}

export function PlacementInspection() {
  const {set,gl,scene,size}=useThree();
  const original=useRef(useThree(s=>s.camera));
  const camera=useMemo(()=>new THREE.OrthographicCamera(-225,225,125,-125,.1,1200),[]);
  const output=useRef<HTMLOutputElement|null>(null),frames=useRef(0),captured=useRef(false);
  const scope=new URLSearchParams(location.search).get("scope");
  useEffect(()=>{
    const previousFog=scene.fog,planes=gl.clippingPlanes,previousCamera=original.current;
    scene.fog=null;
    // Labelled horizontal cutaway: retain everything at/below 3 m. The intact
    // source geometry is still measured; this only opens roofs for inspection.
    gl.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),3)];
    const node=document.createElement("output");
    node.dataset.placementInspection="measuring";
    node.setAttribute("aria-label","Placement inspection status");
    node.style.cssText="position:fixed;left:16px;bottom:16px;z-index:9999;padding:8px 12px;background:#071116;color:#e5d2a4;font:12px monospace;max-width:90vw";
    node.value="IMPLEMENTED REARRANGEMENT · 3 m CUTAWAY · ALL ZONES · ARENA RETAINED";
    document.body.appendChild(node);output.current=node;
    set({camera});
    return()=>{scene.fog=previousFog;gl.clippingPlanes=planes;set({camera:previousCamera});node.remove();};
  },[camera,gl,original,scene,set]);
  useFrame(()=>{
    // These two installations also have their own journey visibility gates.
    // Override only those gates in this explicit all-installations survey.
    scene.traverse(object=>{if(object.userData.rental2026Pavilion||object.userData.projectionPavilion)object.visible=true;});
    const close=scope==="exhibition",aspect=size.width/Math.max(1,size.height),halfWidth=close?112:225;
    camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfWidth/aspect;camera.bottom=-halfWidth/aspect;
    camera.position.set(0,500,close?-134:-167);
    // Entry at right; entire 426 m existing venue fits across the frame.
    camera.up.set(1,0,0);camera.lookAt(0,0,close?-134:-167);
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
    if(!useVenue.getState().loaded||!useVenue.getState().entered||captured.current||++frames.current<45)return;
    scene.updateMatrixWorld(true);
    const records:unknown[]=[];
    const visit=(object:THREE.Object3D,path:string,visible:boolean)=>{
      const effective=visible&&object.visible;
      if(object instanceof THREE.Mesh){
        const geometry=object.geometry;
        const bounds=new THREE.Box3().setFromObject(object);
        const materials=Array.isArray(object.material)?object.material:[object.material];
        records.push({id:path,name:object.name,type:object.type,visible:effective,
          worldMatrix:object.matrixWorld.toArray(),localMatrix:object.matrix.toArray(),
          worldBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
          geometry:{attributes:Object.fromEntries(Object.entries(geometry.attributes as Record<string,THREE.BufferAttribute>).map(([name,attribute])=>[name,{count:attribute.count,itemSize:attribute.itemSize,hash:fingerprint(attribute.array)}])),index:geometry.index?{count:geometry.index.count,hash:fingerprint(geometry.index.array)}:null},
          material:materials.map(material=>({name:material.name,type:material.type,color:(material as THREE.MeshStandardMaterial).color?.getHexString(),roughness:(material as THREE.MeshStandardMaterial).roughness,metalness:(material as THREE.MeshStandardMaterial).metalness,opacity:material.opacity})),userData:object.userData});
      } else if(object instanceof THREE.Light)records.push({id:path,name:object.name,type:object.type,worldMatrix:object.matrixWorld.toArray(),color:object.color.getHexString(),intensity:object.intensity,visible:effective});
      object.children.forEach((child,index)=>visit(child,`${path}/${index}:${child.name||child.type}`,effective));
    };
    visit(scene,"scene",true);
    if(output.current){
      output.current.dataset.sceneManifest=JSON.stringify({capturedAt:new Date().toISOString(),url:location.href,method:"Actual mounted Three.js scene; full world matrices and uncut geometry bounds; FNV1a hashes of native attribute bytes",cutawayHeight:3,allZones:true,camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom},records});
      output.current.dataset.placementInspection="ready";
    }
    captured.current=true;
  },-1);
  return null;
}
