import * as THREE from "three";
import { warmupHold } from "./warmScene";
import type { EntranceUniforms } from "./entranceF01";

/** One planar capture serves both 1.2 m side rills. Real basin geometry remains
 * visible through the water; only the reflection is composited over it. */
export function createEntranceWater(uniforms: EntranceUniforms) {
  const target=new THREE.WebGLRenderTarget(384,384,{type:THREE.HalfFloatType,depthBuffer:true});
  target.texture.name="F01 shared side-water reflection";
  const waterUniforms={...uniforms,uRillReflection:{value:target.texture},uRillMatrix:{value:new THREE.Matrix4()},uRillReady:{value:0}};
  const material=new THREE.MeshPhysicalMaterial({name:"LG_ENT_M15_Clear side water · live",color:"#D7E4DF",
    metalness:0,roughness:.09,ior:1.333,transparent:true,opacity:.18,depthWrite:false,envMapIntensity:.35});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,waterUniforms);
    shader.vertexShader=shader.vertexShader.replace("#include <common>",`#include <common>
      varying vec3 vRillWorld; varying vec4 vRillReflection; uniform mat4 uRillMatrix;`)
      .replace("#include <begin_vertex>",`#include <begin_vertex>
        vRillWorld=(modelMatrix*vec4(position,1.0)).xyz;
        vRillReflection=uRillMatrix*vec4(vRillWorld,1.0);`);
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>",`#include <common>
      varying vec3 vRillWorld; varying vec4 vRillReflection;
      uniform sampler2D uRillReflection; uniform float uRillReady; uniform float uEntrancePhase;`)
      .replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
        float rillY=-vRillWorld.z-14.4;
        float slope=.0015*10.4719755*cos(rillY*10.4719755-uEntrancePhase)
          +.0005*20.943951*cos(rillY*20.943951-2.0*uEntrancePhase);
        normal=normalize(normal+mat3(viewMatrix)*vec3(0.0,0.0,slope));`)
      .replace("#include <opaque_fragment>",`
        vec2 rillUV=vRillReflection.xy/vRillReflection.w+vec2(slope*.008,slope*.014);
        float inside=step(0.0,rillUV.x)*step(rillUV.x,1.0)*step(0.0,rillUV.y)*step(rillUV.y,1.0);
        float fresnel=.02+.86*pow(1.0-saturate(dot(normal,geometryViewDir)),5.0);
        vec3 reflected=texture2D(uRillReflection,clamp(rillUV,vec2(.002),vec2(.998))).rgb;
        outgoingLight=mix(outgoingLight,reflected*vec3(.96,1.0,.98),uRillReady*inside*.94);
        diffuseColor.a=.12+.86*fresnel;
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>"f01-shared-planar-rill-v1";
  const r={target,material,uniforms:waterUniforms,camera:new THREE.PerspectiveCamera(),normal:new THREE.Vector3(0,1,0),
    origin:new THREE.Vector3(0,-.07,-7.4),position:new THREE.Vector3(),rotation:new THREE.Matrix4(),view:new THREE.Vector3(),
    look:new THREE.Vector3(),aim:new THREE.Vector3(),plane:new THREE.Plane(),clip:new THREE.Vector4(),q:new THREE.Vector4(),
    viewport:new THREE.Vector4(),scissor:new THREE.Vector4(),last:-Infinity,lastPhase:-1,lastGain:-1,
    lastCamera:new THREE.Matrix4(),frustum:new THREE.Frustum(),projectionView:new THREE.Matrix4(),sphere:new THREE.Sphere()};
  return r;
}

export function captureEntranceWater(r:ReturnType<typeof createEntranceWater>,gl:THREE.WebGLRenderer,
  scene:THREE.Scene,camera:THREE.Camera,water:THREE.Mesh[],elapsed:number) {
  // Behind the loader the warm-up owns every full-scene draw.
  if (warmupHold.active) return;
  if (!(camera instanceof THREE.PerspectiveCamera) || !water.length || elapsed-r.last<1/12 || camera.position.y<0) return;
  if(camera.position.distanceToSquared(r.origin)>70*70) return;
  for(let p:THREE.Object3D|null=water[0];p;p=p.parent)if(!p.visible)return;
  camera.updateMatrixWorld();r.position.setFromMatrixPosition(camera.matrixWorld);
  r.projectionView.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  r.frustum.setFromProjectionMatrix(r.projectionView);
  if(!water.some(m=>{
    m.updateWorldMatrix(true,false);if(!m.geometry.boundingSphere)m.geometry.computeBoundingSphere();
    return r.frustum.intersectsSphere(r.sphere.copy(m.geometry.boundingSphere!).applyMatrix4(m.matrixWorld));
  }))return;
  // A paused or reduced-motion still needs a new reflection when the visitor
  // moves, but a stationary still frame must not render the whole hall twice.
  if(r.uniforms.uRillReady.value && r.lastCamera.equals(r.projectionView)
    && r.lastPhase===r.uniforms.uEntrancePhase.value && r.lastGain===r.uniforms.uEntranceGain.value)return;
  r.view.subVectors(r.origin,r.position).reflect(r.normal).negate().add(r.origin);
  r.rotation.extractRotation(camera.matrixWorld);
  r.look.set(0,0,-1).applyMatrix4(r.rotation).add(r.position);
  r.aim.subVectors(r.origin,r.look).reflect(r.normal).negate().add(r.origin);
  r.camera.position.copy(r.view);r.camera.up.set(0,1,0).applyMatrix4(r.rotation).reflect(r.normal);r.camera.lookAt(r.aim);
  r.camera.near=camera.near;r.camera.far=camera.far;r.camera.updateMatrixWorld();
  r.camera.projectionMatrix.copy(camera.projectionMatrix);
  r.uniforms.uRillMatrix.value.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1)
    .multiply(r.camera.projectionMatrix).multiply(r.camera.matrixWorldInverse);
  r.plane.setFromNormalAndCoplanarPoint(r.normal,r.origin).applyMatrix4(r.camera.matrixWorldInverse);
  r.clip.set(r.plane.normal.x,r.plane.normal.y,r.plane.normal.z,r.plane.constant);
  const e=r.camera.projectionMatrix.elements;
  r.q.set((Math.sign(r.clip.x)+e[8])/e[0],(Math.sign(r.clip.y)+e[9])/e[5],-1,(1+e[10])/e[14]);
  r.clip.multiplyScalar(2/r.clip.dot(r.q));e[2]=r.clip.x;e[6]=r.clip.y;e[10]=r.clip.z+1-.001;e[14]=r.clip.w;
  r.camera.projectionMatrixInverse.copy(r.camera.projectionMatrix).invert();
  const previous=gl.getRenderTarget(),xr=gl.xr.enabled,shadow=gl.shadowMap.autoUpdate,scissor=gl.getScissorTest();
  gl.getViewport(r.viewport);gl.getScissor(r.scissor);
  water.forEach(m=>m.visible=false);
  try {
    gl.xr.enabled=false;gl.shadowMap.autoUpdate=false;gl.setRenderTarget(r.target);gl.setScissorTest(false);
    gl.state.buffers.depth.setMask(true);if(!gl.autoClear)gl.clear();gl.render(scene,r.camera);
    r.uniforms.uRillReady.value=1;r.last=elapsed;r.lastCamera.copy(r.projectionView);
    r.lastPhase=r.uniforms.uEntrancePhase.value;r.lastGain=r.uniforms.uEntranceGain.value;
  } finally {
    water.forEach(m=>m.visible=true);gl.xr.enabled=xr;gl.shadowMap.autoUpdate=shadow;
    gl.setRenderTarget(previous);gl.setViewport(r.viewport);gl.setScissor(r.scissor);gl.setScissorTest(scissor);
  }
}
