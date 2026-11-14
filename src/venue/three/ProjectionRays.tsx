"use client";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVenue } from "../systems/store";

export type ProjectorRay={position:number[];target:number[];radius?:number;opacity?:number};
const DOWN=new THREE.Vector3(0,-1,0);

/** Open frusta are depth-tested against the actual sculpture and furniture. */
function Ray({source,index}:{source:ProjectorRay;index:number}){
  const entered=useVenue(s=>s.entered),reduced=useVenue(s=>s.reducedMotion);
  const beam=useMemo(()=>{
    const start=new THREE.Vector3().fromArray(source.position),end=new THREE.Vector3().fromArray(source.target);
    const direction=end.clone().sub(start),length=direction.length();
    const material=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
      uniforms:{uOn:{value:0},uTime:{value:0},uSeed:{value:index},uStrength:{value:(source.opacity??.042)*28}},
      vertexShader:`varying vec2 vUv;varying vec3 vNormalView;varying vec3 vView;
        void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.0);vView=-p.xyz;vNormalView=normalMatrix*normal;gl_Position=projectionMatrix*p;}`,
      fragmentShader:`varying vec2 vUv;varying vec3 vNormalView;varying vec3 vView;
        uniform float uOn;uniform float uTime;uniform float uSeed;uniform float uStrength;
        void main(){float t=1.0-vUv.y;float face=pow(abs(dot(normalize(vNormalView),normalize(vView))),1.6);
          float strands=pow(.5+.5*sin(vUv.x*113.1+sin(vUv.x*37.7+uSeed)*2.0),8.0);
          float shimmer=.96+.04*sin(uTime*.4+vUv.x*9.0);
          float density=face*(.14+.34*exp(-t*4.5))*(.48+.52*strands)*(1.0-smoothstep(.78,1.0,t))*shimmer*uOn*uStrength;
          gl_FragColor=vec4(mix(vec3(.57,.77,1.0),vec3(1.0,.93,.68),strands*.55),density);}`,
    });
    return {geometry:new THREE.CylinderGeometry(.045,source.radius??1.65,length,64,1,true),material,
      center:start.add(end).multiplyScalar(.5),rotation:new THREE.Quaternion().setFromUnitVectors(DOWN,direction.normalize())};
  },[source,index]);
  useFrame(({clock},dt)=>{beam.material.uniforms.uOn.value=THREE.MathUtils.damp(beam.material.uniforms.uOn.value,entered?1:0,4,Math.min(.1,dt));beam.material.uniforms.uTime.value=reduced?0:clock.elapsedTime;});
  useEffect(()=>()=>{beam.geometry.dispose();beam.material.dispose();},[beam]);
  return <group>
    <mesh position={beam.center} quaternion={beam.rotation} geometry={beam.geometry} material={beam.material} renderOrder={3}/>
    <mesh position={source.position as [number,number,number]} visible={entered}>
      <sphereGeometry args={[.027,12,8]}/><meshBasicMaterial color="#cceaff" toneMapped={false}/>
    </mesh>
    <mesh position={source.position as [number,number,number]} visible={entered}>
      <sphereGeometry args={[.062,12,8]}/><meshBasicMaterial color="#79bdff" toneMapped={false} transparent opacity={.18} depthWrite={false} blending={THREE.AdditiveBlending}/>
    </mesh>
  </group>;
}

export function ProjectionRays({projectors}:{projectors:ProjectorRay[]}){
  return <group name="Visible projector light frusta">{projectors.map((source,i)=><Ray key={i} source={source} index={i}/>)}</group>;
}
