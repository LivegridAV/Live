"use client";
import { useMemo, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { entranceUniforms, finishEntranceMaterial } from "../three/entranceF01";
import { createEntranceWater, captureEntranceWater } from "../three/entranceReflection";
import { createEntranceClock, advanceEntranceClock, useEntranceFinishes } from "../systems/entranceFinishes";
import { LocalPointLight } from "../three/LocalLights";

/** P01 local +Y maps to world -Z. Landing Y14 meets the existing -28.4 m ramp. */
export function EntranceP01() {
  const worldScene=useThree(s=>s.scene);
  const { scene } = useGLTF("/models/entrance/entrance-refined.glb");
  const finish = useMemo(() => {
    const copy = scene.clone(true);
    const uniforms=entranceUniforms(),water=createEntranceWater(uniforms),waterMeshes:THREE.Mesh[]=[];
    const materials=new Map<string,THREE.Material>();
    copy.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        const update=(source:THREE.Material)=>{
          if(source.name.includes("M15")){
            waterMeshes.push(object);object.castShadow=false;object.receiveShadow=false;return water.material;
          }
          if(!materials.has(source.uuid))materials.set(source.uuid,source instanceof THREE.MeshStandardMaterial?finishEntranceMaterial(source,uniforms):source.clone());
          return materials.get(source.uuid)!;
        };
        object.material=Array.isArray(object.material)?object.material.map(update):update(object.material);
      }
    });
    return {model:copy,uniforms,water,waterMeshes,materials,clock:createEntranceClock(),ready:0};
  }, [scene]);
  useEffect(()=>{
    // The isolated GLB loads after the fixed light rig. Refresh its cached
    // depth map once so the newly mounted fascia and plants cast shadows.
    worldScene.traverse(o=>{
      if((o instanceof THREE.SpotLight || o instanceof THREE.DirectionalLight) && o.castShadow)o.shadow.needsUpdate=true;
    });
  },[finish,worldScene]);
  useEffect(()=>()=>{finish.materials.forEach(m=>m.dispose());finish.water.material.dispose();finish.water.target.dispose();},[finish]);
  useFrame(({gl,scene,camera,clock},dt)=>{
    const state=useEntranceFinishes.getState();
    advanceEntranceClock(finish.clock,dt,{...state,reducedMotion:state.reducedMotion&&!state.allowMotion},!document.hidden);
    finish.uniforms.uEntrancePhase.value=finish.clock.time*Math.PI*2/24;
    finish.uniforms.uEntranceGain.value=finish.clock.gain;
    finish.ready=Math.min(1,finish.ready+Math.min(dt,.1));
    finish.uniforms.uEntranceReady.value=state.fallback?0:finish.ready*finish.ready*(3-2*finish.ready);
    const diagnostic=document.querySelector<HTMLOutputElement>("[data-entrance-motion]");
    if(diagnostic){
      diagnostic.dataset.motion=JSON.stringify({time:+finish.clock.time.toFixed(4),cycles:finish.clock.cycles,gain:+finish.clock.gain.toFixed(3),ready:finish.uniforms.uEntranceReady.value,paused:state.paused,reduced:state.reducedMotion&&!state.allowMotion,mode:state.mode,visible:!document.hidden});
      diagnostic.value=`24 s shared loop · ${state.reducedMotion&&!state.allowMotion||state.mode==='static'?'still':state.paused?'paused':finish.clock.time.toFixed(1)+' s'} · ${finish.clock.cycles} repeats`;
    }
    captureEntranceWater(finish.water,gl,scene,camera,finish.waterMeshes,clock.elapsedTime);
  });
  return <group name="Entrance refined · graphite and Emerald Current" position={[0,0,-14.4]}>
    <primitive object={finish.model} />
    {[-1,1].flatMap(side=>[-10.4,-6.95,-3.5].map(y=><LocalPointLight key={`${side}/${y}`} position={[side*11.8,.64,-y]} color="#ffce91" intensity={3.2} distance={5} decay={2}/>))}
  </group>;
}
