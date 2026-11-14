"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GRAND, grandWorld, type Vec3 } from "../data/grand";
import { useVenue } from "../systems/store";
import { isStallDiagnostic, stallSectionX } from "../data/stallVisits";
import technical from "../../../public/models/expo/grand-technical-shape-v3-layout.json";
import anamorphic from "../../../public/models/expo/grand-anamorphic-shape-v3-layout.json";
import projection from "../../../public/models/expo/projection-finish-v2-layout.json";
import rental from "../../../public/models/expo/grand-rental-finish-v2-layout.json";

const CLEARANCES:Partial<Record<keyof typeof GRAND.placements,number>>={
  reception:8.60994, // Measured halo housing underside8.72994 minus common floor.12.
  technical:technical.architecturalDimensions.clearHeight,
  anamorphic:anamorphic.architecturalDimensions.clearHeight,
  projection:projection.architecture.hClear,
  "led-rental":rental.clearOverhead,
};

function Label({text,position,width=5}:{text:string;position:Vec3;width?:number}) {
  const texture=useMemo(()=>{
    const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=128;
    const ctx=canvas.getContext("2d")!;
    ctx.fillStyle="rgba(7,13,16,.92)";ctx.fillRect(0,0,1024,128);
    ctx.font="500 46px Arial";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillStyle="#f4e5c1";ctx.fillText(text,512,64,990);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
  },[text]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <sprite position={position} scale={[width,width/8,1]} renderOrder={1000}>
    <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false}/>
  </sprite>;
}

function Dimensions({segments}:{segments:Vec3[]}) {
  const geometry=useMemo(()=>new THREE.BufferGeometry().setFromPoints(segments.map(p=>new THREE.Vector3(...p))),[segments]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <lineSegments geometry={geometry} renderOrder={999}><lineBasicMaterial color="#efd69a" depthTest={false} depthWrite={false} toneMapped={false}/></lineSegments>;
}

/** Dimension geometry is registered to the actual common shell axes. These
 * labelled design-envelope datums accompany real orthographic scene cutaways. */
export function StallDimensions() {
  const visit=useVenue(s=>s.stallVisit);
  if(!visit||!isStallDiagnostic(visit))return null;
  const {root,yaw}=GRAND.placements[visit.stall], m=GRAND.master;
  const x=m.width/2,z=m.depth/2,y=m.floor;
  const top=visit.stall==="technical"?technical.architecturalDimensions.fasciaTop
    :visit.stall==="led-rental"?rental.architecturalDimensions.fasciaTop:m.fasciaTop;
  const clear=CLEARANCES[visit.stall];
  const plan=visit.view==="plan";
  const segments:Vec3[]=plan?[
    [-x,y+.02,z+1.2],[x,y+.02,z+1.2],[-x,y+.02,z+.8],[-x,y+.02,z+1.6],[x,y+.02,z+.8],[x,y+.02,z+1.6],
    [x+1.2,y+.02,-z],[x+1.2,y+.02,z],[x+.8,y+.02,-z],[x+1.6,y+.02,-z],[x+.8,y+.02,z],[x+1.6,y+.02,z],
  ]:[
    [-.08,y-1,-z],[-.08,y-1,z],[-.08,y-1.35,-z],[-.08,y-.65,-z],[-.08,y-1.35,z],[-.08,y-.65,z],
    [-.08,y,z+1.2],[-.08,top,z+1.2],[-.08,y,z+.8],[-.08,y,z+1.6],[-.08,top,z+.8],[-.08,top,z+1.6],
    ...(clear?[[-.08,y,-z-1.2],[-.08,y+clear,-z-1.2],[-.08,y,-z-1.6],[-.08,y,-z-.8],[-.08,y+clear,-z-1.6],[-.08,y+clear,-z-.8]] as Vec3[]:[]),
  ];
  const origin=plan?root as Vec3:grandWorld(visit.stall,[stallSectionX(visit.stall),0,0]);
  return <group position={origin} rotation={[0,yaw,0]} userData={{grandDiagnostic:true}}>
    <Dimensions segments={segments}/>
    {plan?<>
      <Label text={`WIDTH ${m.width.toFixed(3)} m`} position={[0,y+.08,z+1.65]}/>
      <Label text={`DEPTH ${m.depth.toFixed(3)} m`} position={[x+1.7,y+.08,0]} width={4}/>
    </>:<>
      <Label text={`DEPTH ${m.depth.toFixed(3)} m`} position={[-.15,y-1.4,0]} width={4}/>
      <Label text={`HEIGHT ${(top-y).toFixed(3)} m`} position={[-.15,(y+top)/2,z+1.65]} width={4.6}/>
      {clear&&<Label text={`H_CLEAR ${clear.toFixed(3)} m`} position={[-.15,y+clear/2,-z-1.65]} width={4.4}/>}
    </>}
  </group>;
}
