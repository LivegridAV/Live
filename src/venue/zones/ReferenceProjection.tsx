"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ExpoAsset, expoAssetUrl } from "../three/ExpoAsset";
import { displayGeometry, type DisplayAperture } from "../three/displayGeometry";
import { useMedia, useScreenTexture } from "../media/MediaContext";
import { createLEDMaterial } from "../three/ledMaterial";
import { LocalPointLight } from "../three/LocalLights";
import { ProjectionContactShadow } from "../three/ProjectionContactShadow";
import { applySculptureProjection, sculptureProjectionUniforms } from "../three/sculptureProjection";
import { ProjectionRays, type ProjectorRay } from "../three/ProjectionRays";
import { PROJECTION_ROOT, PROJECTION_ROTATION, PROJECTION_SCALE, PROJECTION_SCULPTURE_OFFSET, PROJECTION_SCULPTURE_SCALE, inProjectionShowcase } from "../data/projection";
import { useVenue } from "../systems/store";
import { journey } from "../systems/journey";
import { preloadProjectionArtwork } from "../media/projectionPainters";
import { useLiteMode } from "../loading/liteMode";
import { useModelUrl } from "../loading/useModelUrl";
import { gltfExtender } from "../three/textureLoading";
import layout from "../../../public/models/expo/projection-finish-v2-blender-layout.json";
import sculptureLayout from "../../../public/models/expo/projection-finish-v2-crystals-layout.json";

type Vec3=[number,number,number];
type Hotspot={position:number[];rotation:number[];w:number;h:number};
type OpticalPath={path:number[][];color:string;role:string;spillEligible:boolean;verticalScale?:number};
const projectionLayout=layout as unknown as {apertures:DisplayAperture[];projectors:ProjectorRay[];interaction:Hotspot;deckPolygonXZ:[number,number][];opticalPaths:OpticalPath[]};

/** Optical halos follow the real millimetre-scale opal lenses. The material
 * does not add global bloom or replace the solid channels in the GLB. */
function ProjectionRopeSpill(){
  const diagnostic=useVenue(s=>s.stallVisit?.stall==="projection"&&(s.stallVisit.view==="plan"||s.stallVisit.view==="section"));
  const top=useVenue(s=>s.projectionAngle==="top");
  const geometry=useMemo(()=>{
    const paths=projectionLayout.opticalPaths.filter(path=>path.spillEligible);
    return paths.flatMap(path=>{
      const curve=new THREE.CurvePath<THREE.Vector3>();
      for(let i=1;i<path.path.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(...path.path[i-1] as Vec3),new THREE.Vector3(...path.path[i] as Vec3)));
      const floorOptic=path.role==="floor-optic";
      return (floorOptic?[.018,.028,.055]:[.028,.055]).map((radius,index)=>{
        const geometry=new THREE.TubeGeometry(curve,Math.max(8,Math.min(192,path.path.length*2)),radius,5,false);
        if(path.verticalScale){
          const positions=geometry.getAttribute("position"),floorY=path.path[0][1];
          for(let i=0;i<positions.count;i++)positions.setY(i,floorY+(positions.getY(i)-floorY)*path.verticalScale);
          positions.needsUpdate=true;geometry.computeVertexNormals();
        }
        // The opal face sits just above the contact-shadow receiver. It follows
        // the exported flush channel, with no second floor or raised threshold.
        const emitter=floorOptic&&index===0;
        if(emitter)geometry.translate(0,.004,0);
        return {geometry,color:path.color,emitter,opacity:emitter?1:index?.014:.065,overhead:path.role==="overhead"};
      });
    });
  },[]);
  useEffect(()=>()=>geometry.forEach(item=>item.geometry.dispose()),[geometry]);
  return <group visible={!diagnostic}>{geometry.map((item,index)=><mesh key={index} geometry={item.geometry} visible={!top||!item.overhead}>
    <meshBasicMaterial color={item.color} transparent={!item.emitter} opacity={item.opacity} depthWrite={item.emitter} side={THREE.DoubleSide} blending={item.emitter?THREE.NormalBlending:THREE.AdditiveBlending} toneMapped={false}/>
  </mesh>)}</group>;
}

function ProjectionDisplay({a}:{a:DisplayAperture&{flipU?:boolean}}){
  const mesh=useRef<THREE.Mesh>(null),texture=useScreenTexture(a.mediaHint,mesh,80*PROJECTION_SCALE);
  const entered=useVenue(s=>s.entered),media=useMedia(),trim=media.trim(a.mediaHint);
  const geometry=useMemo(()=>{
    const geometry=displayGeometry(a);
    if(a.flipU){const uv=geometry.getAttribute("uv");for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));uv.needsUpdate=true;}
    return geometry;
  },[a]);
  const material=useMemo(()=>{
    const material=createLEDMaterial(texture,{width:a.w,height:a.h,pitch:1.2,brightness:.93*trim,
      flat:true,dot:.08,doubleSided:true});
    if(a.mediaHint==="projection-hero"||a.mediaHint.startsWith("projection-application-")){
      const aspect=a.w/a.h,sourceAspect=16/9;
      material.uniforms.uFit.value.set(Math.min(1,aspect/sourceAspect),Math.min(1,sourceAspect/aspect));
    }
    return material;
  },[a,texture,trim]);
  useFrame(()=>{
    material.uniforms.uOn.value=entered?1:0;
    // The concave display is viewed from inside its cylinder. A generic +Z
    // facing test describes its back, so retain full live-content priority.
    if(entered&&(inProjectionShowcase(journey.progress)||useVenue.getState().stallVisit?.stall==="projection")
      &&(a.mediaHint==="projection-backdrop"||a.mediaHint==="projection-ceiling"))media.touch(a.mediaHint,.92);
  });
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  return <mesh ref={mesh} position={[a.x,a.y,a.z]} rotation={a.rotation as Vec3} geometry={geometry} material={material}/>;
}

function MappedSculpture(){
  const url=useModelUrl(expoAssetUrl("projection-finish-v2-crystals",sculptureLayout.sha256));
  return url?<MappedSculptureModel url={url}/>:null;
}
function MappedSculptureModel({url}:{url:string}){
  const gl=useThree(state=>state.gl);
  const {scene}=useGLTF(url,false,true,gltfExtender(gl));
  const media=useMedia(),entered=useVenue(s=>s.entered);
  const texture=useMemo(()=>media.acquire("projection-crystal-pattern"),[media]);
  const projection=useMemo(()=>{
    const model=scene.clone(true),uniforms=sculptureProjectionUniforms(texture,projectionLayout.projectors.map(p=>p.position),sculptureLayout.projectionDomain);
    model.position.set(...PROJECTION_SCULPTURE_OFFSET);
    model.scale.set(...PROJECTION_SCULPTURE_SCALE);
    const materials=applySculptureProjection(model,uniforms);
    return {model,uniforms,materials};
  },[scene,texture]);
  useEffect(()=>()=>media.release("projection-crystal-pattern"),[media]);
  useEffect(()=>()=>{
    projection.materials.forEach(material=>material.dispose());
    projection.model.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();});
  },[projection]);
  useFrame(()=>{
    projection.uniforms.uSculptureOn.value=entered?1:0;
    if(inProjectionShowcase(journey.progress)||useVenue.getState().stallVisit?.stall==="projection")media.touch("projection-crystal-pattern",.95);
  });
  return <primitive object={projection.model} dispose={null}/>;
}

export function ReferenceProjection(){
  const open=useVenue(s=>s.openPavilion),hotspot=projectionLayout.interaction;
  const visit=useVenue(s=>s.stallVisit);
  // The light pack shows plain screens: no artwork fetch until the full group.
  const lite=useLiteMode();
  useEffect(()=>lite?undefined:preloadProjectionArtwork(),[lite]);
  useEffect(()=>()=>{document.body.style.cursor="";},[]);
  return <group position={PROJECTION_ROOT} rotation={PROJECTION_ROTATION} scale={PROJECTION_SCALE}
    userData={{projectionPavilion:true,placementId:"S4"}} name="Projection mapping · crystalline architecture pavilion">
    <ExpoAsset name="projection-finish-v2-blender-shell" revision={layout.stats.shell.sha256}/>
    <ExpoAsset name="projection-finish-v2-blender-interior" revision={layout.stats.interior.sha256}/>
    <ExpoAsset name="projection-finish-v2-visitors" revision={layout.stats.visitors.sha256}/>
    <ExpoAsset name="projection-finish-v2-hall" revision={layout.stats.hall.sha256}/>
    <ProjectionRopeSpill/>
    <Suspense fallback={null}><ProjectionContactShadow
      boothUrl={expoAssetUrl("projection-finish-v2-blender-shell",layout.stats.shell.sha256)}
      detailsUrl={expoAssetUrl("projection-finish-v2-blender-interior",layout.stats.interior.sha256)}
      visitorsUrl={expoAssetUrl("projection-finish-v2-visitors",layout.stats.visitors.sha256)}
      width={24} depth={16} floorHeight={.12}/></Suspense>
    <MappedSculpture/>
    {projectionLayout.apertures.map(a=><group key={a.id} visible={!(visit?.stall==="projection"&&(visit.view==="plan"||visit.view==="section")&&a.mediaHint==="projection-ceiling")}><ProjectionDisplay a={a}/></group>)}
    <group visible={!(visit?.stall==="projection"&&(visit.view==="plan"||visit.view==="section"))}><ProjectionRays projectors={projectionLayout.projectors}/></group>
    <LocalPointLight position={[0,11.8,10]} color="#e2e9ef" intensity={40} distance={23} decay={2}/>
    <LocalPointLight position={[-8.7,9.8,3.5]} color="#ffe5cb" intensity={65} distance={20} decay={2}/>
    <LocalPointLight position={[8.7,9.8,3.5]} color="#ffe5cb" intensity={65} distance={20} decay={2}/>
    <LocalPointLight position={[-7,4.8,7.8]} color="#ffe8d2" intensity={40} distance={13} decay={2}/>
    <LocalPointLight position={[8.3,4.8,5.7]} color="#ffe8d2" intensity={40} distance={13} decay={2}/>
    <LocalPointLight position={[0,5.5,-4]} color="#bcd7ef" intensity={42} distance={14} decay={2}/>
    <group position={hotspot.position as Vec3} rotation={hotspot.rotation as Vec3}
      onClick={event=>{event.stopPropagation();open("spatial");}}
      onPointerOver={()=>{document.body.style.cursor="pointer";}}
      onPointerOut={()=>{document.body.style.cursor="";}}>
      <mesh><planeGeometry args={[hotspot.w,hotspot.h]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/></mesh>
    </group>
  </group>;
}
