"use client";
import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Link from "next/link";
import { Scene } from "../../venue/Scene";
import { useVenue } from "../../venue/systems/store";
import { PerspectiveCamera, ACESFilmicToneMapping } from "three";
import { EntranceFinishes } from "../../venue/ui/EntranceFinishes";

const VIEWS:Record<string,{position:[number,number,number];target:[number,number,number]}>= {
  "Human arrival":{position:[0,1.7,8],target:[0,5.2,-14.4]},
  "Human interior":{position:[0,1.7,-18],target:[0,2.4,-42]},
  "Human reverse":{position:[0,1.7,-28],target:[0,4.2,-8]},
  "Front right":{position:[23,16,24],target:[0,4,-13]},
  "Front":{position:[0,5,29],target:[0,5,-14.4]},
  "Front left":{position:[-25,15,22],target:[0,4,-13]},
  "Rear":{position:[23,17,-52],target:[0,4,-19]},
  "Rear left":{position:[-24,15,-51],target:[0,4,-20]},
  "Left side":{position:[-38,10,-12],target:[0,4,-14]},
  "Right side":{position:[38,10,-12],target:[0,4,-14]},
  "Above":{position:[22,35,11],target:[0,2,-14]},
  "Inside":{position:[0,3.5,-14.8],target:[0,4,-25]},
  "Looking out":{position:[0,3.4,-23.3],target:[0,4,4]},
  "Water and stone":{position:[7.5,2.2,-.3],target:[10.3,.2,-6.4]},
  "Flutes and crown":{position:[16,10,-5],target:[10.7,8.9,-15]},
  "Brand detail":{position:[3,10.1,-5],target:[1,10.4,-14]},
};
function ReviewCamera({view}:{view:string}) {
  const camera=useThree(s=>s.camera);
  const size=useThree(s=>s.size);
  const preset=VIEWS[view];
  useEffect(()=>{
    const interior=view==="Inside"||view==="Looking out"||view.startsWith("Human");
    const fit=interior?1:Math.max(1,1.15/(size.width/size.height));
    camera.position.set(...preset.position.map((v,i)=>preset.target[i]+(v-preset.target[i])*fit) as [number,number,number]);
    if(view==="Human arrival")camera.position.set(0,1.7,8+Math.max(0,1.5/(size.width/size.height)-1)*24);
    camera.lookAt(...preset.target);
    if(camera instanceof PerspectiveCamera){
      // R3F owns a mutable Three camera; lens changes are imperative renderer state.
      // eslint-disable-next-line react-hooks/immutability
      camera.fov=view==="Human arrival"?52:interior?60:45;
      camera.updateProjectionMatrix();
    }
  },[camera,preset,view,size.width,size.height]);
  return <OrbitControls target={preset.target} minDistance={2} maxDistance={160} maxPolarAngle={Math.PI*.94}/>;
}

/** Lightweight geometry review of the same asset mounted in the full venue. */
export default function EntranceReview() {
  const [view,setView]=useState("Human arrival");
  const loaded=useVenue(s=>s.loaded);
  useEffect(()=>{if(loaded)useVenue.setState({entered:true});},[loaded]);
  return <main style={{position:"fixed",inset:0,background:"#10191d"}}>
    <Canvas shadows="percentage" camera={{position:[23,16,24],fov:45,near:.1,far:340}} dpr={[1,1.5]}
      onCreated={({gl})=>{gl.toneMapping=ACESFilmicToneMapping;gl.toneMappingExposure=1.15;}}>
      <color attach="background" args={["#10191d"]}/>
      <Suspense fallback={null}><Scene inspection/></Suspense>
      <ReviewCamera view={view}/>
    </Canvas>
    <div style={{position:"absolute",top:24,left:24,maxWidth:"calc(100% - 48px)",color:"#edf0ec",fontFamily:"sans-serif",fontSize:13}}>
      <strong>LIVEGRID AV · Entrance refinement</strong><p>Full exhibition context · drag to orbit · scroll to zoom</p>
      <select aria-label="Entrance review view" value={view} onChange={e=>setView(e.target.value)} style={{padding:8,background:"#203033",color:"#edf0ec",marginRight:16}}>
        {Object.keys(VIEWS).map(name=><option key={name}>{name}</option>)}
      </select>
      <Link href="/?shot=entrance&perf=1" style={{color:"inherit"}}>Open full venue walkthrough →</Link>
    </div>
    {!loaded && <div style={{position:"absolute",top:140,left:24,color:"white"}}>Loading the entrance and exhibition…</div>}
    <output data-render-metrics data-reset="0" aria-label="Render metrics" style={{position:"absolute",right:24,top:24,color:"#ccd8d3",fontSize:11}}/>
    <EntranceFinishes review/>
  </main>;
}
