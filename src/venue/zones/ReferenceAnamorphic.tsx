"use client";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { ExpoAsset, expoAssetUrl } from "../three/ExpoAsset";
import { ProjectionContactShadow } from "../three/ProjectionContactShadow";
import { BasinWater } from "../three/BasinWater";
import { ProjectedCornerScreen, Screen } from "../three/screens";
import { LocalPointLight } from "../three/LocalLights";
import { LightPool } from "../three/environment";
import { ANAMORPHIC_ROOT, ANAMORPHIC_ROTATION, ANAMORPHIC_VIEW } from "../data/anamorphic";
import layout from "../../../public/models/expo/grand-anamorphic-shape-v3-layout.json";

type Aperture={name:string;x:number;y:number;z:number;w:number;h:number;rotation:number[];mediaHint:string;continuousCorner?:boolean};
const apertures=layout.apertures as Aperture[];
const jets=layout.waterJets as {position:number[];target:number[]}[];
const main=layout.mainCorner;
const projector=(()=>{
  const camera=new THREE.PerspectiveCamera(ANAMORPHIC_VIEW.fov,ANAMORPHIC_VIEW.aspect,.1,400);
  camera.position.set(...ANAMORPHIC_VIEW.position);camera.lookAt(...ANAMORPHIC_VIEW.look);camera.updateMatrixWorld();
  // Calibrate against the actual cut perimeter, including the occupied portal
  // opening, rather than a full rectangle that no longer exists physically.
  const corners=[...main.contours.leftXY.map(([x,y])=>[x,y,0]),
    ...main.contours.rightZY.map(([z,y])=>[0,y,z])];
  const transform=new THREE.Matrix4().makeRotationY(ANAMORPHIC_ROTATION[1]);
  transform.setPosition(...ANAMORPHIC_ROOT);
  const points=corners.map(p=>new THREE.Vector3(p[0]+main.fold[0],p[1],p[2]+main.fold[2]).applyMatrix4(transform).project(camera));
  const xs=points.map(p=>p.x*.5+.5),ys=points.map(p=>p.y*.5+.5);
  return {...ANAMORPHIC_VIEW,bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)] as [number,number,number,number]};
})();

type Copy="corner"|"coastal"|"interior";
function copyTexture(copy:Copy){
  const canvas=document.createElement("canvas");canvas.width=768;canvas.height=copy==="interior"?480:1280;
  const c=canvas.getContext("2d")!;c.textBaseline="top";
  if(copy==="corner"){
    c.fillStyle="#182332";c.font="400 96px Arial, sans-serif";c.letterSpacing="11px";
    ["MORE","THAN","SCREENS"].forEach((s,i)=>c.fillText(s,48,120+i*133));
    c.fillRect(48,560,106,5);c.font="400 80px Arial, sans-serif";c.letterSpacing="8px";
    ["A BRIGHTER","REALITY"].forEach((s,i)=>c.fillText(s,48,686+i*113));
  }else if(copy==="coastal"){
    c.fillStyle="rgba(5,13,27,.16)";c.fillRect(0,0,768,1280);
    c.fillStyle="#f7f6f2";c.font="500 65px Arial, sans-serif";c.letterSpacing="8px";
    ["BOLD VISUALS","BRIGHTER","POSSIBILITIES"].forEach((s,i)=>c.fillText(s,50,610+i*112,680));
    c.fillRect(50,985,112,5);
  }else{
    c.fillStyle="rgba(10,16,30,.62)";c.fillRect(0,0,768,480);
    c.fillStyle="#f5f3ef";c.font="500 43px Arial, sans-serif";c.letterSpacing="7px";
    ["A BRIGHTER","REALITY","TOGETHER"].forEach((s,i)=>c.fillText(s,105,136+i*65));
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;return tex;
}
function CopyLayer({copy,w,h}:{copy:Copy;w:number;h:number}){
  const texture=useMemo(()=>copyTexture(copy),[copy]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <mesh position={[0,0,.014]} renderOrder={3}>
    <planeGeometry args={[w,h]}/><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-1}/>
  </mesh>;
}
function screenContent(hint:string):{media:string;uv?:[number,number,number,number];copy?:Copy}{
  if(hint==="studio-coastal-portrait") return {media:"studio-chrome",uv:[.28,.89,.05,.01],copy:"coastal"};
  if(hint==="studio-brighter-reality") return {media:"studio-sculpture",uv:[.34,.7,.66,0],copy:"interior"};
  if(hint==="studio-mountain-portrait"||hint==="gallery-alpine"||hint==="gallery-landscape") return {media:"studio-sculpture",uv:[.34,.7,.66,0]};
  if(hint==="studio-forest") return {media:"studio-forest"};
  if(hint==="gallery-human") return {media:"studio-portrait",uv:[1,.65,0,.35]};
  if(hint==="gallery-silver-object") return {media:"studio-chrome",uv:[.36,.8,.43,.2]};
  if(hint==="gallery-orb") return {media:"studio-chrome"};
  return {media:"studio-fluid"};
}

function WaterJet({position,target}:{position:number[];target:number[]}){
  const geometry=useMemo(()=>{
    const a=new THREE.Vector3(...position as [number,number,number]);const b=new THREE.Vector3(...target as [number,number,number]);
    const mid=a.clone().lerp(b,.5);mid.y+=.24;
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a,mid,b),20,.006,5,false);
  },[position,target]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshPhysicalMaterial color="#c8dce5" metalness={.25} roughness={.08} transparent opacity={.58}/></mesh>;
}

export function ReferenceAnamorphic(){
  return <group position={ANAMORPHIC_ROOT} rotation={ANAMORPHIC_ROTATION} userData={{grandStall:"anamorphic"}} name="Grand anamorphic corner and occupied Content Studio">
    <ExpoAsset name="grand-anamorphic-shape-v3-shell" revision={layout.assets["grand-anamorphic-shape-v3-shell"].sha256}/>
    <ExpoAsset name="grand-anamorphic-shape-v3-interior" revision={layout.assets["grand-anamorphic-shape-v3-interior"].sha256}/>
    <ExpoAsset name="grand-anamorphic-shape-v3-visitors" revision={layout.assets["grand-anamorphic-shape-v3-visitors"].sha256}/>
    <ProjectedCornerScreen media="studio-sculpture" leftWidth={main.leftWidth} rightWidth={main.rightWidth}
      bottom={main.bottom} height={main.top-main.bottom} projector={projector} uv={[.77,.8,-.025,.195]}
      leftCutout={main.leftCutout}
      position={[main.fold[0]+.006,0,main.fold[2]+.006]}/>
    <group position={[main.fold[0]+.014,9.2,main.fold[2]-(main.rightWidth-1.9)]} rotation={[0,Math.PI/2,0]}><CopyLayer copy="corner" w={3.4} h={3.9}/></group>
    {apertures.filter(a=>!a.continuousCorner).map(a=>{
      const content=screenContent(a.mediaHint);
      return <group key={a.name} position={[a.x,a.y,a.z]} rotation={a.rotation as [number,number,number]}>
        <Screen media={content.media} width={a.w} height={a.h} frame={false} flat pitch={1.2} brightness={.95} range={100} uv={content.uv}/>
        {content.copy&&<CopyLayer copy={content.copy} w={a.w} h={a.h}/>}
      </group>;
    })}
    <BasinWater polygonXZ={layout.water.polygonXZ} height={layout.water.y}/>
    {jets.map((jet,i)=><WaterJet key={i} position={jet.position} target={jet.target}/>)}
    <Suspense fallback={null}><ProjectionContactShadow boothUrl={expoAssetUrl("grand-anamorphic-shape-v3-interior",layout.assets["grand-anamorphic-shape-v3-interior"].sha256)} visitorsUrl={expoAssetUrl("grand-anamorphic-shape-v3-visitors",layout.assets["grand-anamorphic-shape-v3-visitors"].sha256)} width={24} depth={16} floorHeight={.12}/></Suspense>
    <LocalPointLight position={[-7,6.9,4.8]} color="#ffe3bf" intensity={56} distance={14} decay={2}/>
    <LocalPointLight position={[-7,5.9,-4]} color="#f4d5b0" intensity={52} distance={13} decay={2}/>
    <LocalPointLight position={[3,5.2,4.2]} color="#d1d7e0" intensity={36} distance={14} decay={2}/>
    <LocalPointLight position={[10.5,6.2,-1.8]} color="#e6ceae" intensity={42} distance={12} decay={2}/>
    <LightPool position={[-7,.13,2]} size={[8,12]} color="#dfbb87" opacity={.06}/>
  </group>;
}
