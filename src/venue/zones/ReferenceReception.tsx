"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CurvedScreen, CylinderScreen, RingScreen } from "../three/screens";
import { ExpoAsset } from "../three/ExpoAsset";
import { LocalPointLight } from "../three/LocalLights";
import { LightPool } from "../three/environment";
import { GRAND } from "../data/grand";
import layout from "../../../public/models/expo/grand-reception-layout.json";
import brandingLayout from "../../../public/models/expo/grand-reception-brand-wall-v2-layout.json";
import { useVenue } from "../systems/store";
import { drawWordmark } from "../media/brandMarks";

type Brand = "cylinder" | "ring" | "ring-field" | "counter" | "panorama";

function identity(id: Brand){
  const canvas=document.createElement("canvas");
  canvas.width=id==="counter"?3072:1024;
  canvas.height=id==="counter"?471:id==="cylinder"?1024:id==="panorama"?768:384;
  const c=canvas.getContext("2d")!;
  const wash=c.createLinearGradient(0,0,1024,0);
  wash.addColorStop(0,"rgba(5,12,26,0)");
  const ink=id==="ring-field"?.96:id==="ring"?0:.10;
  wash.addColorStop(.16,`rgba(5,12,26,${ink})`);
  wash.addColorStop(.84,`rgba(5,12,26,${ink})`);
  wash.addColorStop(1,"rgba(5,12,26,0)");
  if(id!=="panorama"&&id!=="counter"){c.fillStyle=wash;c.fillRect(0,0,1024,canvas.height);}
  c.fillStyle=id==="panorama"?"#182738":"#f5f5fa";
  c.textBaseline="top";
  if(id==="cylinder"){
    drawWordmark(c,72,235+72,144,{ink:c.fillStyle as string,maxWidth:880});
    c.font="400 48px Arial, sans-serif";c.letterSpacing="11px";
    ["IDEAS","IN HIGHER","DEFINITION"].forEach((s,i)=>c.fillText(s,92,530+i*82));
  }else if(id==="ring"){
    c.font="400 56px Arial, sans-serif";c.letterSpacing="13px";
    ["PEOPLE","PLACES","POSSIBILITIES"].forEach((s,i)=>c.fillText(s,160,72+i*87,800));
  }else if(id==="counter"){
    // One full-fascia UV layout keeps the wordmark proportionate to the 7.44m
    // arc. The artwork supplies the calm navy field behind this live type.
    drawWordmark(c,canvas.width*.438922,canvas.height*.376677,96,{align:"center",ink:c.fillStyle as string});
    c.textAlign="left";c.font="400 30px Arial, sans-serif";c.letterSpacing="8px";
    const sloganY=canvas.height*.216146+c.measureText("GOOD").actualBoundingBoxAscent;
    ["GOOD","EVENTS","BRIGHTER","PEOPLE"].forEach((s,i)=>c.fillText(s,canvas.width*.564681,sloganY+i*48));
    c.fillRect(canvas.width*.564681,canvas.height*.72,76,3);
  }else if(id==="panorama"){
    c.font="400 66px Arial, sans-serif";c.letterSpacing="10px";
    ["MORE","THAN SCREENS","A BRIGHTER","TOMORROW"].forEach((s,i)=>c.fillText(s,95,215+i*99,850));
    c.fillRect(95,685,155,4);
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  return texture;
}

/** Actual type on a curved LED layer, independent of the fluid artwork. */
function CurvedIdentity({id,radius,height,arc,start,position,back=false}:{
  id:Brand;radius:number;height:number;arc:number;start:number;
  position:[number,number,number];back?:boolean;
}){
  const texture=useMemo(()=>identity(id),[id]);
  const geometry=useMemo(()=>{
    const g=new THREE.CylinderGeometry(radius,radius,height,64,1,true,start,arc);
    if(back){
      g.rotateY(Math.PI);
      const uv=g.getAttribute("uv");
      for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
      uv.needsUpdate=true;
    }
    return g;
  },[radius,height,arc,start,back]);
  useEffect(()=>()=>{texture.dispose();geometry.dispose();},[texture,geometry]);
  return <mesh position={position} geometry={geometry} renderOrder={id==="ring-field"?2:3}>
    <meshBasicMaterial map={texture} transparent depthWrite={false}
      toneMapped={false} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1}/>
  </mesh>;
}

export function ReferenceReception(){
  const diagnostic=useVenue(s=>s.stallVisit?.view==="plan"||s.stallVisit?.view==="section");
  return <group position={GRAND.placements.reception.root as [number,number,number]} rotation={[0,GRAND.placements.reception.yaw,0]} userData={{grandStall:"reception",placementId:"R"}} name="Reception curved LED installation">
    <ExpoAsset name="grand-reception-brand-wall-v2" revision={brandingLayout.geometry.sha256}/>
    <ExpoAsset name="grand-reception-visitors" revision={layout.people.sha256}/>
    <CylinderScreen media="reception-cylinder" position={[-7,4.66,0]}
      radius={1.85} height={8.6} rotation={[0,-Math.PI/2+.47,0]} pitch={1.5} brightness={1} segments={128} mirrorArtwork/>
    <CurvedIdentity id="cylinder" position={[-7,5.47,0]} radius={1.857} height={2.87} start={-.305} arc={1.55}/>
    {/* Assembly pivots/scales match LAYOUT in the Blender authoring script. */}
    <group name="Suspended elliptical LED halo" position={[2.2,10.23994,-3.5]} scale={[7.6/4.9,2,3.85/4.9]} visible={!diagnostic} userData={{grandRole:"overhead"}}>
    <group position={[-1,-8,3]}>
    <RingScreen media="reception-ring" position={[1,8,-3]} radius={4.9} height={1.4}
      pitch={1.5} brightness={1} repeats={1} segments={112} mirrorArtwork/>
    <RingScreen media="reception-ring" position={[1,8,-3]} radius={4.78} height={1.36}
      pitch={1.5} brightness={.012} repeats={1} segments={112} inward mirrorArtwork/>
    <CurvedIdentity id="ring-field" position={[1,8,-3]} radius={4.906} height={1.32} start={.12} arc={.68}/>
    <CurvedIdentity id="ring" position={[1,8.138,-3]} radius={4.908} height={.454} start={.12} arc={.68}/>
    </group></group>
    <group name="Concave panoramic LED wall" position={[.7,4.57,4]} rotation={[0,-.5,0]} scale={[11.6/9,8.4/6.6,11.6/9]}>
    <group position={[-8,-3.55,-2]}>
    <CurvedScreen media="reception-panorama" position={[8,3.55,2]}
      radius={9} arc={1.48} height={6.6} inward={false} flip={[true,false]}
      pitch={1.5} brightness={1} segments={112} uv={[.90,1,0,0]}/>
    <CurvedIdentity id="panorama" position={[8,3.915,2]} radius={8.992} height={2.645}
      start={-.70216} arc={.32156} back/>
    </group></group>
    <group name="Curved LED reception counter" position={[4.8863,.12,-.2692]} rotation={[0,-.23157,0]}>
    <group position={[-4,0,.6]}>
    <CurvedScreen media="reception-counter" position={[4,.72,-.6]}
      radius={6.2} arc={1.2} height={1.14} pitch={1.2} brightness={1} segments={128}
      uv={[1.25,1,0,0]} mirrorX/>
    <CurvedIdentity id="counter" position={[4,.72,-.6]} radius={6.207} height={1.14} start={-.6} arc={1.2}/>
    </group>
    {/* Warm toe-kick spill follows the real curved cabinet, below the blue LED. */}
    {[-.44,0,.44].map(angle=><LocalPointLight key={angle}
      position={[Math.sin(angle)*6.27,.28,Math.cos(angle)*6.27]}
      intensity={1.2} color="#ffd097" distance={4.5} decay={2}/>)}
    {[-.44,0,.44].map(angle=><LightPool key={`footlight-${angle}`}
      position={[Math.sin(angle)*6.65,.047,Math.cos(angle)*6.65]}
      size={[3.1,2.6]} color="#efb474" opacity={.14}/>)}
    <LocalPointLight position={[0,3.5,4.5]} intensity={8} color="#ffe0b3" distance={8} decay={2}/>
    </group>
    <LocalPointLight position={[-7,2.2,1.4]} intensity={25} color="#a6bcf4" distance={12} decay={2}/>
    <LocalPointLight position={[3.4,.85,6.2]} intensity={8} color="#a7c3ff" distance={8} decay={2}/>
    <LocalPointLight position={[4,2.5,-3]} intensity={31} color="#e5c19b" distance={14} decay={2}/>
    <LightPool position={[-7,.045,0]} size={10} color="#d8bb96" opacity={.10}/>
    <LightPool position={[3.5,.046,7]} size={[9,5]} color="#8aa8d8" opacity={.09}/>
  </group>;
}
