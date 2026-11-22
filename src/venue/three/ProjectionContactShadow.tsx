"use client";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { programsReady, useAfterWarmup } from "./warmScene";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";

/** A single geometry-derived capture grounds guests, chair legs and planters. */
export function ProjectionContactShadow({boothUrl,visitorsUrl,detailsUrl,width,depth:depthSize,centerZ=0,floorHeight=.10}:{boothUrl:string;visitorsUrl:string;detailsUrl?:string;width:number;depth:number;centerZ?:number;floorHeight?:number}) {
  const {scene:booth}=useGLTF(boothUrl,false),{scene:visitors}=useGLTF(visitorsUrl,false);
  const {scene:details}=useGLTF(detailsUrl??boothUrl,false);
  const {gl}=useThree();
  const target=useMemo(()=>new THREE.WebGLRenderTarget(1024,512,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}),[]);
  // Baked once every shader is ready (the venue's, or the streamed group's), so
  // the bake never compiles inside a frame.
  const schedule=useAfterWarmup();
  useEffect(()=>{let cancelled=false;const cancel=schedule(async()=>{
    if(cancelled)return;
    const stage=new THREE.Scene();
    for(const source of detailsUrl?[booth,visitors,details]:[booth,visitors]){
      const model=source.clone(true);
      model.traverse(object=>{
        if(!(object instanceof THREE.Mesh))return;
        const materials=Array.isArray(object.material)?object.material:[object.material];
        if(materials.every(m=>m.transparent&&m.opacity<.4||/glass|light|LED|optic|letter|floor|pathway/i.test(m.name.replace(/^LED Rental 2026\s*\|\s*/i,""))))object.visible=false;
      });
      stage.add(model);
    }
    const depth=new THREE.MeshDepthMaterial({side:THREE.DoubleSide});
    depth.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace("vec4( vec3( 1.0 - fragCoordZ ), opacity )","vec4(vec3(.012),pow(1.0-fragCoordZ,5.0))");
    };
    stage.overrideMaterial=depth;
    const camera=new THREE.OrthographicCamera(-width/2,width/2,depthSize/2,-depthSize/2,.005,2.7);
    camera.position.set(0,floorHeight+.013,centerZ);camera.up.set(0,0,1);camera.lookAt(0,3,centerZ);camera.updateMatrixWorld();
    const horizontal=new THREE.ShaderMaterial(HorizontalBlurShader),vertical=new THREE.ShaderMaterial(VerticalBlurShader);
    const temporary=new THREE.WebGLRenderTarget(1024,512),geometry=new THREE.PlaneGeometry(2,2);
    const quad=new THREE.Mesh(geometry,horizontal),blurCamera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);
    blurCamera.position.z=1;
    try{
    // Submit the bake's own programs first and let the driver finish them off
    // the frame. The materials are new for every bake, so drawn cold they
    // would compile inside this task, after the venue has opened.
    const swapped:[THREE.Mesh,THREE.Material|THREE.Material[]][]=[],previous=gl.getRenderTarget();
    try{
      stage.traverse(object=>{if(object instanceof THREE.Mesh){swapped.push([object,object.material]);object.material=depth;}});
      gl.setRenderTarget(target);gl.compile(stage,camera);
      for(const [mesh,material] of swapped)mesh.material=material;
      swapped.length=0;
      gl.setRenderTarget(temporary);gl.compile(quad,blurCamera);
      quad.material=vertical;gl.setRenderTarget(target);gl.compile(quad,blurCamera);
    }finally{
      for(const [mesh,material] of swapped)mesh.material=material;
      quad.material=horizontal;gl.setRenderTarget(previous);
    }
    await programsReady(gl,()=>cancelled,undefined,30_000);
    if(cancelled)return;
    const before={target:gl.getRenderTarget(),color:gl.getClearColor(new THREE.Color()),alpha:gl.getClearAlpha(),autoClear:gl.autoClear,shadow:gl.shadowMap.autoUpdate};
    try{
      gl.autoClear=true;gl.shadowMap.autoUpdate=false;gl.setClearColor(0,0);
      gl.setRenderTarget(target);gl.clear();gl.render(stage,camera);
      horizontal.uniforms.tDiffuse.value=target.texture;horizontal.uniforms.h.value=1.3/1024;
      gl.setRenderTarget(temporary);gl.render(quad,blurCamera);
      quad.material=vertical;vertical.uniforms.tDiffuse.value=temporary.texture;vertical.uniforms.v.value=1.3/512;
      gl.setRenderTarget(target);gl.render(quad,blurCamera);
      target.texture.repeat.y=-1;target.texture.offset.y=1;
    }finally{
      gl.setRenderTarget(before.target);gl.setClearColor(before.color,before.alpha);gl.autoClear=before.autoClear;gl.shadowMap.autoUpdate=before.shadow;
    }
    }finally{
      depth.dispose();horizontal.dispose();vertical.dispose();temporary.dispose();geometry.dispose();
    }
  });return()=>{cancelled=true;cancel();};},[schedule,booth,visitors,details,detailsUrl,gl,target,width,depthSize,centerZ,floorHeight]);
  useEffect(()=>()=>target.dispose(),[target]);
  return <mesh position={[0,floorHeight+.005,centerZ]} rotation={[-Math.PI/2,0,0]} renderOrder={2}>
    <planeGeometry args={[width,depthSize]}/>
    <meshBasicMaterial map={target.texture} transparent opacity={.55} depthWrite={false} toneMapped={false}/>
  </mesh>;
}
