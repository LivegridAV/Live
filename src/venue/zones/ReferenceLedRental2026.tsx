"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ExpoAsset, expoAssetUrl } from "../three/ExpoAsset";
import { displayGeometry, type DisplayAperture } from "../three/displayGeometry";
import { createLEDMaterial } from "../three/ledMaterial";
import { useMedia, useScreenTexture } from "../media/MediaContext";
import { LocalPointLight } from "../three/LocalLights";
import { ProjectionContactShadow } from "../three/ProjectionContactShadow";
import { RENTAL2026_ROOT, RENTAL2026_ROTATION, inRental2026 } from "../data/ledRental2026";
import { useVenue } from "../systems/store";
import { journey } from "../systems/journey";
import { preloadLedRental2026Artwork } from "../media/ledRental2026Painters";
import { useLiteMode } from "../loading/liteMode";
import layout from "../../../public/models/expo/grand-rental-finish-v2-layout.json";

type Vec3=[number,number,number];
type Product={id:string;type:string;position:number[];baseYaw?:number;width?:number;height?:number;radius?:number;arc?:number;side?:number};
const products=layout.products as Product[];

/** A few centimetres of optical spill around the authored opal diffusers.
 * The solid channels and lenses remain in the GLB; no full-screen bloom. */
function RentalRopeSpill(){
  const diagnostic=useVenue(s=>s.stallVisit?.view==="plan"||s.stallVisit?.view==="section"||s.rentalAngle==="top");
  const geometry=useMemo(()=>{
    const paths:{points:Vec3[];color:string}[]=[
      {points:[[-11.9,.13,-7.9],[-11.9,.13,7.86],[11.9,.13,7.86],[11.9,.13,-7.9]],color:"#ffd3a4"},
      {points:[[-11.3,.15,6.96],[-3.7,.15,6.96]],color:"#2ee3c8"},
      {points:[[5.1,.15,6.46],[10.5,.15,6.46]],color:"#ffdcaf"},
      ...layout.architecture.frontage.map(f=>{
        const nx=Math.sin(f.yaw),nz=Math.cos(f.yaw);
        return {points:[[f.a[0]+nx*.018,8.938,f.a[1]+nz*.018],[f.b[0]+nx*.018,8.938,f.b[1]+nz*.018]] as Vec3[],color:"#26ddc3"};
      }),
    ];
    return paths.flatMap(({points,color})=>{
      const curve=new THREE.CurvePath<THREE.Vector3>();
      for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i-1]),new THREE.Vector3(...points[i])));
      return [.035,.075].map((radius,i)=>({geometry:new THREE.TubeGeometry(curve,Math.max(2,points.length*8),radius,6,false),color,opacity:i?.018:.09}));
    });
  },[]);
  useEffect(()=>()=>geometry.forEach(item=>item.geometry.dispose()),[geometry]);
  return <group visible={!diagnostic}>{geometry.map((item,i)=><mesh key={i} geometry={item.geometry}>
    <meshBasicMaterial color={item.color} transparent opacity={item.opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/>
  </mesh>)}</group>;
}

function RentalDisplay({a}:{a:DisplayAperture}){
  const ref=useRef<THREE.Mesh>(null),texture=useScreenTexture(a.mediaHint,ref,90);
  const engine=useMedia();
  const geometry=useMemo(()=>displayGeometry(a),[a]);
  const material=useMemo(()=>{
    const material=createLEDMaterial(texture,{width:a.w,height:a.h,flat:true,doubleSided:true,dot:.05,
      brightness:.93,repeat:a.uv?[a.uv[0],a.uv[1]]:undefined,offset:a.uv?[a.uv[2],a.uv[3]]:undefined});
    if(a.transparent){
      material.transparent=true;material.depthWrite=false;
      material.fragmentShader=material.fragmentShader.replace("gl_FragColor = vec4(col, 1.0);",
        "float openMeshAlpha=smoothstep(.002,.055,max(content.r,max(content.g,content.b))); gl_FragColor = vec4(col*1.2,openMeshAlpha*.92);");
    }
    return material;
  },[a,texture]);
  useFrame(({clock})=>{
    material.uniforms.uOn.value=useVenue.getState().entered?1:0;
    material.uniforms.uTime.value=clock.elapsedTime;
    if(inRental2026(journey.progress)||useVenue.getState().stallVisit?.stall==="led-rental")engine.touch(a.mediaHint,.9);
  });
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  return <mesh ref={ref} position={[a.x,a.y,a.z]} rotation={a.rotation as Vec3} geometry={geometry} material={material}/>;
}

function Case({size,position=[0,0,0],rotation=[0,0,0]}:{size:Vec3;position?:Vec3;rotation?:Vec3}){
  return <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={size}/><meshStandardMaterial color="#101419" metalness={.55} roughness={.42}/>
  </mesh>;
}

function Rim({radius,height,arc=Math.PI*2}:{radius:number;height:number;arc?:number}){
  const geometry=useMemo(()=>{
    const path=new THREE.CatmullRomCurve3(Array.from({length:97},(_,i)=>{
      const angle=-arc/2+i/96*arc;return new THREE.Vector3(radius*Math.sin(angle),0,radius*Math.cos(angle));
    }));
    return new THREE.TubeGeometry(path,96,.012,6,false);
  },[radius,arc]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <>{[-1,1].map(side=><mesh key={side} position={[0,side*height/2,0]} geometry={geometry}>
    <meshStandardMaterial color="#e7ded0" metalness={.45} roughness={.22} emissive="#d6c9ac" emissiveIntensity={.6}/>
  </mesh>)}</>;
}

function ProductShape({p}:{p:Product}){
  const w=p.width??(p.radius??.65)*2,h=p.height??(p.radius??.65)*2;
  const base={id:p.id,x:0,y:0,z:0,w,h,rotation:[0,0,0],mediaHint:`rental2026-${p.id}`};
  if(p.type==="sphere")return <>
    <RentalDisplay a={{...base,type:"sphere",radius:p.radius}}/>
    <mesh><sphereGeometry args={[(p.radius??.72)+.018,48,32]}/><meshBasicMaterial color="#268af5" transparent opacity={.065} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false}/></mesh>
  </>;
  if(p.type==="cylinder"||p.type==="curved"){
    const radius=p.radius??1.2,arc=p.type==="cylinder"?Math.PI*2:p.arc??2.04;
    return <>
      <mesh><cylinderGeometry args={[radius-.025,radius-.025,h,96,1,true,-arc/2,arc]}/><meshStandardMaterial color="#0b0f13" metalness={.6} roughness={.36} side={THREE.DoubleSide}/></mesh>
      <RentalDisplay a={{...base,type:p.type,radius,arc,w:radius*arc,rotation:p.type==="cylinder"?[0,Math.PI/2,0]:[0,0,0]}}/>
      <Rim radius={radius+.006} height={h} arc={arc}/>
      {p.type==="curved"&&[-1,1].map(side=><mesh key={side} position={[0,side*(h/2-.009),0]} rotation={[-Math.PI/2,0,0]} castShadow>
        <ringGeometry args={[radius-.040,radius+.006,96,1,-Math.PI/2-arc/2,arc]}/>
        <meshStandardMaterial color="#b6b4ad" metalness={.8} roughness={.28} side={THREE.DoubleSide}/>
      </mesh>)}
      {p.type==="curved"&&[-1,1].map(side=>{
        const angle=side*arc/2;
        return <Case key={side} size={[.030,h,.046]} position={[(radius-.014)*Math.sin(angle),0,(radius-.014)*Math.cos(angle)]} rotation={[0,angle,0]}/>;
      })}
      {p.type==="cylinder"&&[-1,1].map(side=><mesh key={side} position={[0,side*(h/2-.01),0]}>
        <cylinderGeometry args={[radius-.015,radius-.015,.025,64]}/><meshStandardMaterial color="#171b20" metalness={.7} roughness={.3}/>
      </mesh>)}
    </>;
  }
  if(p.type==="corner"){
    const side=p.side??1.2,d=side/(2*Math.sqrt(2));
    return <>{[-1,1].map((s,i)=><group key={s} position={[s*d,0,-d]} rotation={[0,s*Math.PI/4,0]}>
      <Case size={[side,h,.055]} position={[0,0,-.033]}/>
      <RentalDisplay a={{...base,w:side,z:0,uv:[.5,1,i*.5,0]}}/>
      {[-1,1].map(edge=><mesh key={edge} position={[0,edge*(h/2+.004),.001]} castShadow>
        <boxGeometry args={[side+.014,.012,.07]}/><meshStandardMaterial color="#66717d" metalness={.8} roughness={.31}/>
      </mesh>)}
    </group>)}</>;
  }
  if(p.type==="dna")return <>{Array.from({length:7},(_,i)=><group key={i} position={[Math.sin(i*1.03)*.16,(3-i)*(h-.305)/6,Math.cos(i*.73)*.07]} rotation={[0,(i-3)*.11,0]}>
    <Case size={[[1,.85,.62,.58,.65,.84,1][i],.305,.075]}/>
    <RentalDisplay a={{...base,w:[1,.85,.62,.58,.65,.84,1][i],h:.305,z:.041,uv:[1,1,0,i*.13]}}/>
    <RentalDisplay a={{...base,w:[1,.85,.62,.58,.65,.84,1][i],h:.305,z:-.041,rotation:[0,Math.PI,0],uv:[1,1,0,i*.13]}}/>
  </group>)}</>;
  if(p.type==="transparent")return <>
    <RentalDisplay a={{...base,transparent:true}}/>
    {[-1,1].map(s=><group key={s}>
      <Case size={[.022,h+.036,.035]} position={[s*(w/2+.008),0,0]}/>
      <Case size={[w,.022,.035]} position={[0,s*(h/2+.008),0]}/>
    </group>)}
  </>;
  return <>
    <Case size={[w+.035,h+.035,.075]}/>
    <RentalDisplay a={{...base,z:.041}}/>
    <RentalDisplay a={{...base,z:-.041,rotation:[0,Math.PI,0]}}/>
  </>;
}

function RotatingProduct({p,index}:{p:Product;index:number}){
  const ref=useRef<THREE.Group>(null),phase=useRef(0);
  useFrame((_,dt)=>{
    const state=useVenue.getState();
    if(state.entered&&inRental2026(journey.progress)&&state.rentalModelsRotate&&!state.reducedMotion)phase.current+=Math.min(dt,.1)*(p.type==="dna"?.19:p.type==="sphere"?.12:.08);
    // Keep single-faced rental panels readable as they turn. Volumetric formats
    // rotate continuously; flat, corner and curved samples sweep their profile.
    const volumetric=p.type==="dna"||p.type==="sphere"||p.type==="cylinder";
    if(ref.current)ref.current.rotation.y=(p.baseYaw??0)+(state.rentalModelsRotate?(volumetric?phase.current:Math.sin(phase.current)*.32):0);
  });
  return <group name={`${p.id} LED rotating physical model ${index+1}`} position={p.position as Vec3} rotation={[0,p.baseYaw??0,0]} ref={ref}>
    <ProductShape p={p}/>
  </group>;
}

export function ReferenceLedRental2026(){
  const open=useVenue(s=>s.openPavilion);
  // The light pack shows plain screens: no artwork fetch until the full group.
  const lite=useLiteMode();
  useEffect(()=>lite?undefined:preloadLedRental2026Artwork(),[lite]);
  return <group name="LED Rental Solutions · October 2026 pavilion" userData={{rental2026Pavilion:true,placementId:"S2"}} position={RENTAL2026_ROOT} rotation={RENTAL2026_ROTATION}>
    <ExpoAsset name="grand-rental-finish-v2-shell" revision={layout.stats.shell.sha256}/>
    <ExpoAsset name="grand-rental-finish-v2-interior" revision={layout.stats.interior.sha256}/>
    <ExpoAsset name="grand-rental-finish-v2-visitors" revision={layout.stats.visitors.sha256}/>
    <ExpoAsset name="grand-rental-finish-v2-hall" revision={layout.stats.hall.sha256}/>
    <RentalRopeSpill/>
    <Suspense fallback={null}><ProjectionContactShadow
      boothUrl={expoAssetUrl("grand-rental-finish-v2-interior",layout.stats.interior.sha256)}
      visitorsUrl={expoAssetUrl("grand-rental-finish-v2-visitors",layout.stats.visitors.sha256)}
      width={24} depth={16} floorHeight={.12}/></Suspense>
    {layout.apertures.map(a=><RentalDisplay key={a.id} a={{id:a.id,x:a.position[0],y:a.position[1],z:a.position[2]+.012,w:a.w,h:a.h,rotation:a.rotation,mediaHint:a.id==="main-backdrop"?"rental2026-backdrop":`rental2026-${a.id}`}}/>)}
    {products.map((p,i)=><RotatingProduct key={p.id} p={p} index={i}/>)}
    {[[-8,8.32,1.5],[0,8.32,1],[8,8.32,2.5],[-5,3.8,-2.3],[3,3.8,-2.6],[7.8,2.6,5.8]].map((p,i)=><LocalPointLight key={i} position={p as Vec3} color={i<3?"#ffe4cb":i===5?"#ffe8d1":"#e0e5e8"} intensity={i<3?58:18} distance={15} decay={2}/>)}
    <group position={[7.8,.8,6.3]} onClick={e=>{e.stopPropagation();open("led-solutions");}} onPointerOver={()=>{document.body.style.cursor="pointer";}} onPointerOut={()=>{document.body.style.cursor="";}}>
      <mesh><boxGeometry args={[5.2,1.25,.5]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/></mesh>
    </group>
  </group>;
}
