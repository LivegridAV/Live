"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVenue } from "../systems/store";
import { phoneRendering } from "../systems/device";
import { inExhibitionRange, placementWorldMatrix } from "../data/placements";
import { useLiteMode } from "../loading/liteMode";

/** The basin reflects the real LED leaves, rocks and visitors. Its render target
 * updates only while the basin is in view; the material itself stays mounted so
 * the loader can warm the same shader that is used during the walkthrough. */
type BasinProps={polygonXZ:number[][];height:number};
/** Skipped in the zone's light pack (lite mode): no reflection render target until the full group is warm. */
export function BasinWater(props:BasinProps){
  return useLiteMode()?null:<BasinReflection {...props}/>;
}
function BasinReflection({polygonXZ,height}:BasinProps) {
  const mesh=useRef<THREE.Mesh>(null);
  const quality=useVenue(s=>s.quality);
  const resolution=quality==="high"?256:128;
  const geometry=useMemo(()=>{
    const shape=new THREE.Shape();
    polygonXZ.forEach((p,i)=>i?shape.lineTo(p[0],-p[1]):shape.moveTo(p[0],-p[1]));
    shape.closePath();
    const result=new THREE.ShapeGeometry(shape);
    result.computeBoundingSphere();
    return result;
  },[polygonXZ]);
  const reflection=useMemo(()=>{
    const target=new THREE.WebGLRenderTarget(resolution,resolution,{
      type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
      depthBuffer:true,stencilBuffer:false,
    });
    target.texture.name="Content Studio basin reflection";
    const uniforms={
      uBasinReflection:{value:target.texture},uBasinTextureMatrix:{value:new THREE.Matrix4()},
      uBasinTime:{value:0},uBasinReady:{value:0},
      uBasinBaselineWorld:{value:new THREE.Matrix4().fromArray(placementWorldMatrix("S1",true))
        .multiply(new THREE.Matrix4().fromArray(placementWorldMatrix("S1")).invert())},
    };
    const material=new THREE.MeshPhysicalMaterial({
      color:"#263c47",metalness:.12,roughness:.13,ior:1.333,
      clearcoat:1,clearcoatRoughness:.09,envMapIntensity:.65,
    });
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=shader.vertexShader.replace("#include <common>",`#include <common>
        uniform mat4 uBasinTextureMatrix;
        varying vec4 vBasinReflection;
        varying vec3 vBasinWorld;`)
        .replace("#include <begin_vertex>",`#include <begin_vertex>
          vBasinReflection=uBasinTextureMatrix*vec4(position,1.0);
          vBasinWorld=(modelMatrix*vec4(position,1.0)).xyz;`);
      shader.fragmentShader=shader.fragmentShader.replace("#include <common>",`#include <common>
        uniform sampler2D uBasinReflection;
        uniform float uBasinTime;
        uniform float uBasinReady;
        uniform mat4 uBasinBaselineWorld;
        varying vec4 vBasinReflection;
        varying vec3 vBasinWorld;`)
        .replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
          vec3 basinAuthoredWorld=(uBasinBaselineWorld*vec4(vBasinWorld,1.0)).xyz;
          float basinWaveA=sin(basinAuthoredWorld.x*15.0+basinAuthoredWorld.z*10.0+uBasinTime*1.1);
          float basinWaveB=sin(basinAuthoredWorld.z*24.0-basinAuthoredWorld.x*5.0-uBasinTime*.8);
          normal=normalize(normal+mat3(viewMatrix)*vec3(basinWaveA*.026,0.0,basinWaveB*.019));`)
        .replace("#include <opaque_fragment>",`
          vec2 basinUV=vBasinReflection.xy/vBasinReflection.w;
          basinUV+=vec2(basinWaveA,basinWaveB)*.0019;
          float basinInBounds=step(0.0,basinUV.x)*step(basinUV.x,1.0)*step(0.0,basinUV.y)*step(basinUV.y,1.0);
          float basinFresnel=.32+.50*pow(1.0-saturate(dot(normal,geometryViewDir)),3.0);
          vec3 basinReflected=texture2D(uBasinReflection,clamp(basinUV,vec2(.002),vec2(.998))).rgb;
          outgoingLight=mix(outgoingLight,basinReflected*vec3(.90,.96,1.0),uBasinReady*basinInBounds*basinFresnel);
          #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=>"content-studio-planar-water-v1";
    return {target,uniforms,material,camera:new THREE.PerspectiveCamera(),
      plane:new THREE.Plane(),normal:new THREE.Vector3(),waterPosition:new THREE.Vector3(),
      cameraPosition:new THREE.Vector3(),rotation:new THREE.Matrix4(),look:new THREE.Vector3(),
      clip:new THREE.Vector4(),view:new THREE.Vector3(),lookTarget:new THREE.Vector3(),q:new THREE.Vector4(),
      frustum:new THREE.Frustum(),viewProjection:new THREE.Matrix4(),sphere:new THREE.Sphere(),
      viewport:new THREE.Vector4(),scissor:new THREE.Vector4(),last:-Infinity};
  },[resolution]);

  useFrame(({gl,scene,camera,clock})=>{
    const state=useVenue.getState();
    reflection.uniforms.uBasinTime.value=state.reducedMotion?0:clock.elapsedTime;
    const surface=mesh.current;
    // A phone has no live reflections (device.ts): the basin keeps its water shading.
    if(phoneRendering()||!surface||!state.entered||state.pastVenue||!inExhibitionRange("anamorphic",state.progress)) return;
    if(clock.elapsedTime-reflection.last<1/15) return;
    // A ZoneGroup remains mounted while hidden. Do not pay for a second scene
    // render just because the basin's material is still alive behind that group.
    for(let ancestor:THREE.Object3D|null=surface;ancestor;ancestor=ancestor.parent) if(!ancestor.visible) return;
    if(!(camera instanceof THREE.PerspectiveCamera)) return;
    surface.updateWorldMatrix(true,false);
    camera.updateMatrixWorld();
    const r=reflection;
    r.waterPosition.setFromMatrixPosition(surface.matrixWorld);
    r.cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    if(r.cameraPosition.distanceToSquared(r.waterPosition)>48*48) return;
    r.viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    r.frustum.setFromProjectionMatrix(r.viewProjection);
    r.sphere.copy(geometry.boundingSphere!).applyMatrix4(surface.matrixWorld);
    if(!r.frustum.intersectsSphere(r.sphere)) return;
    // Reflection and oblique near-plane math follow the installed Three.js
    // Reflector implementation, with the actual horizontal mesh transform.
    r.rotation.extractRotation(surface.matrixWorld);
    r.normal.set(0,0,1).applyMatrix4(r.rotation);
    r.view.subVectors(r.waterPosition,r.cameraPosition);
    if(r.view.dot(r.normal)>0) return;
    r.view.reflect(r.normal).negate().add(r.waterPosition);
    r.rotation.extractRotation(camera.matrixWorld);
    r.look.set(0,0,-1).applyMatrix4(r.rotation).add(r.cameraPosition);
    r.lookTarget.subVectors(r.waterPosition,r.look).reflect(r.normal).negate().add(r.waterPosition);
    r.camera.position.copy(r.view);
    r.camera.up.set(0,1,0).applyMatrix4(r.rotation).reflect(r.normal);
    r.camera.lookAt(r.lookTarget);
    r.camera.near=camera.near;r.camera.far=camera.far;
    r.camera.updateMatrixWorld();
    r.camera.projectionMatrix.copy(camera.projectionMatrix);
    r.uniforms.uBasinTextureMatrix.value.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1)
      .multiply(r.camera.projectionMatrix).multiply(r.camera.matrixWorldInverse).multiply(surface.matrixWorld);
    r.plane.setFromNormalAndCoplanarPoint(r.normal,r.waterPosition).applyMatrix4(r.camera.matrixWorldInverse);
    r.clip.set(r.plane.normal.x,r.plane.normal.y,r.plane.normal.z,r.plane.constant);
    const projection=r.camera.projectionMatrix;
    const e=projection.elements;
    r.q.set((Math.sign(r.clip.x)+e[8])/e[0],(Math.sign(r.clip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);
    r.clip.multiplyScalar(2/r.clip.dot(r.q));
    e[2]=r.clip.x;e[6]=r.clip.y;e[10]=r.clip.z+1-.001;e[14]=r.clip.w;
    r.camera.projectionMatrixInverse.copy(projection).invert();
    const previousTarget=gl.getRenderTarget();
    const previousXr=gl.xr.enabled;
    const previousShadow=gl.shadowMap.autoUpdate;
    const previousScissorTest=gl.getScissorTest();
    gl.getViewport(r.viewport);gl.getScissor(r.scissor);
    surface.visible=false;
    try{
      gl.xr.enabled=false;gl.shadowMap.autoUpdate=false;
      gl.setRenderTarget(r.target);gl.setScissorTest(false);
      gl.state.buffers.depth.setMask(true);
      if(!gl.autoClear) gl.clear();
      gl.render(scene,r.camera);
      r.uniforms.uBasinReady.value=1;
      r.last=clock.elapsedTime;
    }finally{
      surface.visible=true;gl.xr.enabled=previousXr;gl.shadowMap.autoUpdate=previousShadow;
      gl.setRenderTarget(previousTarget);gl.setViewport(r.viewport);gl.setScissor(r.scissor);gl.setScissorTest(previousScissorTest);
    }
  });
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>()=>{reflection.target.dispose();reflection.material.dispose();},[reflection]);
  return <mesh ref={mesh} name="Reflective L-shaped basin water" position={[0,height,0]}
    rotation={[-Math.PI/2,0,0]} geometry={geometry} material={reflection.material}/>;
}
