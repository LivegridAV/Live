"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PROJECTION_SCALE, PROJECTION_DECK_POLYGON, inProjectionShowcase } from "../data/projection";
import { useVenue } from "../systems/store";
import { technicalFloorSurface } from "./technicalMaterials";
import { placeholderTexture } from "./textureLoading";

/** Raised island, in physical local X/Z metres. The deck is kept
 * separate from the existing hall reflector at Y=.009. */
export { PROJECTION_DECK_POLYGON } from "../data/projection";

type StoneMaps = { map: THREE.Texture; roughnessMap: THREE.Texture; normalMap: THREE.Texture };
const STONE_PLACEHOLDERS: StoneMaps = { map: placeholderTexture("#808080"), roughnessMap: placeholderTexture("#ff8000"), normalMap: placeholderTexture("#8080ff") };
let loadedStone: StoneMaps | null = null;

/** The licensed stone photography (the technical floor's shared maps), once loaded. */
function useStoneMaps() {
  const gl = useThree(state => state.gl);
  const [maps, setMaps] = useState(() => loadedStone ?? STONE_PLACEHOLDERS);
  useEffect(() => {
    let live = true;
    technicalFloorSurface(gl).ready.then(result => { loadedStone = result; if (live) setMaps(result); }, () => {});
    return () => { live = false; };
  }, [gl]);
  return maps;
}

function stoneTextures(source: StoneMaps) {
  // Reuse the licensed stone photography, with independent native-metre UVs.
  function texture(original:THREE.Texture) {
    const result=original.clone(); result.repeat.set(.4,.4);
    result.anisotropy=8; result.needsUpdate=true; return result;
  }
  return {colour:texture(source.map),roughness:texture(source.roughnessMap),normal:texture(source.normalMap)};
}

function reflectiveSurface(object: THREE.Object3D) {
  if ((object as THREE.Object3D & { isReflector?: boolean }).isReflector) return true;
  if (object.userData.venuePlanarReflection) return true;
  if (!(object instanceof THREE.Mesh)) return false;
  // These public getters are present in the installed drei reflector class.
  // Its reflection runs in useFrame, whereas Three Reflector uses onBeforeRender.
  const materials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
  return materials.some(material => "tDiffuse" in material && "textureMatrix" in material)
    || object.name === "Reflective L-shaped basin water";
}

/** Actual raised stone-deck reflection. Mount inside the projection booth's
 * existing root/rotation group; the current layout supplies its physical deck outline. */
export function ProjectionFloor({polygonXZ=PROJECTION_DECK_POLYGON,active=inProjectionShowcase,scale=PROJECTION_SCALE,height=.102,tint="#66758b"}:{
  polygonXZ?:readonly (readonly [number,number])[];active?:(progress:number)=>boolean;scale?:number;height?:number;tint?:string;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const quality = useVenue(state => state.quality);
  const resolution = quality === "high" ? 1024 : 512;
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    polygonXZ.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
    shape.closePath();
    const result = new THREE.ShapeGeometry(shape);
    const positions = result.getAttribute("position"), uv = result.getAttribute("uv");
    for (let i = 0; i < positions.count; i++) uv.setXY(i, positions.getX(i) / 1.6, positions.getY(i) / 1.6);
    uv.needsUpdate = true;
    result.computeBoundingBox();
    return result;
  }, [polygonXZ]);
  const source = useStoneMaps();
  const stone = useMemo(() => stoneTextures(source), [source]);
  const reflection = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(resolution, resolution, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: true, stencilBuffer: false,
    });
    target.texture.name = "Projection Mapping raised stone deck reflection";
    const uniforms = {
      uProjectionDeckReflection: { value: target.texture },
      uProjectionDeckMatrix: { value: new THREE.Matrix4() },
      uProjectionDeckReady: { value: 0 },
      uProjectionDeckResolution: { value: resolution },
    };
    const material = new THREE.MeshPhysicalMaterial({
      name: "Projection Mapping polished charcoal deck",
      color: tint, map: stone.colour, roughnessMap: stone.roughness,
      normalMap:stone.normal,normalScale:new THREE.Vector2(.055,.055),
      metalness: .035, roughness: .34, clearcoat: .15, clearcoatRoughness: .32,
      envMapIntensity: .75,
    });
    material.userData.venuePlanarReflection = true;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
        uniform mat4 uProjectionDeckMatrix;
        varying vec4 vProjectionDeckReflection;
        varying vec2 vProjectionDeckLocal;`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          vProjectionDeckReflection=uProjectionDeckMatrix*vec4(position,1.0);
          vProjectionDeckLocal=position.xy;`);
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
        uniform sampler2D uProjectionDeckReflection;
        uniform float uProjectionDeckReady;
        uniform float uProjectionDeckResolution;
        varying vec4 vProjectionDeckReflection;
        varying vec2 vProjectionDeckLocal;`)
        .replace("#include <color_fragment>", `#include <color_fragment>
          float deckMineralLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
          diffuseColor.rgb=mix(vec3(deckMineralLuma),diffuseColor.rgb,.22)*vec3(.96,1.0,1.035);
          vec2 deckCell=(vProjectionDeckLocal+vec2(.31,.17))/1.6;
          vec2 deckEdge=min(fract(deckCell),1.0-fract(deckCell));
          vec2 deckAA=max(fwidth(deckCell),vec2(.0002));
          vec2 deckLines=1.0-smoothstep(vec2(.0007),vec2(.0015)+deckAA,deckEdge);
          float deckJoint=max(deckLines.x,deckLines.y);
          diffuseColor.rgb*=1.0-.32*deckJoint;`)
        .replace("#include <lights_fragment_end>", `#include <lights_fragment_end>
          reflectedLight.directSpecular*=.12;
          reflectedLight.indirectSpecular*=.70;
          #ifdef USE_CLEARCOAT
            clearcoatSpecularDirect*=.10;
            clearcoatSpecularIndirect*=.70;
          #endif`)
        .replace("#include <opaque_fragment>", `
          vec2 deckUV=vProjectionDeckReflection.xy/vProjectionDeckReflection.w;
          float deckInBounds=step(0.0,deckUV.x)*step(deckUV.x,1.0)*step(0.0,deckUV.y)*step(deckUV.y,1.0)
            *step(.0001,vProjectionDeckReflection.w);
          // Static rough-stone scatter, with no water waves or time distortion.
          vec2 deckSpread=vec2(1.6,3.2)*(.5+roughnessFactor)/uProjectionDeckResolution;
          vec2 deckMin=vec2(.002),deckMax=vec2(.998);
          vec3 deckReflected=texture2D(uProjectionDeckReflection,clamp(deckUV,deckMin,deckMax)).rgb*.40;
          deckReflected+=texture2D(uProjectionDeckReflection,clamp(deckUV+vec2(deckSpread.x,0.0),deckMin,deckMax)).rgb*.15;
          deckReflected+=texture2D(uProjectionDeckReflection,clamp(deckUV-vec2(deckSpread.x,0.0),deckMin,deckMax)).rgb*.15;
          deckReflected+=texture2D(uProjectionDeckReflection,clamp(deckUV+vec2(0.0,deckSpread.y),deckMin,deckMax)).rgb*.15;
          deckReflected+=texture2D(uProjectionDeckReflection,clamp(deckUV-vec2(0.0,deckSpread.y),deckMin,deckMax)).rgb*.15;
          float deckFresnel=.38+.25*pow(1.0-saturate(dot(normal,geometryViewDir)),3.0);
          float deckMix=uProjectionDeckReady*deckInBounds*deckFresnel*(1.0-.12*deckJoint);
          outgoingLight=mix(outgoingLight*vec3(.78,.86,1.0),deckReflected*vec3(.90,.91,.92),deckMix);
          float deckEdgeDistance=100.0;
          ${polygonXZ.map(([x,z],i)=>{const [nx,nz]=polygonXZ[(i+1)%polygonXZ.length];return `{vec2 a=vec2(${x.toFixed(4)},${(-z).toFixed(4)}),b=vec2(${nx.toFixed(4)},${(-nz).toFixed(4)});vec2 ab=b-a;float t=clamp(dot(vProjectionDeckLocal-a,ab)/dot(ab,ab),0.0,1.0);deckEdgeDistance=min(deckEdgeDistance,length(vProjectionDeckLocal-a-ab*t));}`;}).join("\n")}
          outgoingLight+=vec3(.12,.078,.036)*exp(-deckEdgeDistance*9.0);
          #include <opaque_fragment>`);
    };
    material.customProgramCacheKey = () => `raised-stone-planar-reflection-v13-${polygonXZ.flat().join(",")}`;
    return {
      target, material, uniforms, camera: new THREE.PerspectiveCamera(),
      plane: new THREE.Plane(), normal: new THREE.Vector3(), position: new THREE.Vector3(),
      eye: new THREE.Vector3(), rotation: new THREE.Matrix4(), view: new THREE.Vector3(),
      look: new THREE.Vector3(), lookTarget: new THREE.Vector3(), clip: new THREE.Vector4(), q: new THREE.Vector4(),
      frustum: new THREE.Frustum(), viewProjection: new THREE.Matrix4(), bounds: new THREE.Box3(),
      viewport: new THREE.Vector4(), scissor: new THREE.Vector4(), clearColour: new THREE.Color(),
      hidden: [] as { object: THREE.Object3D; visible: boolean }[], last: -Infinity,
    };
  }, [resolution, stone, polygonXZ,tint]);

  useFrame(({ gl, scene, camera, clock }) => {
    const state = useVenue.getState(), surface = mesh.current, r = reflection;
    if (!surface || !state.entered || state.pastVenue || !active(state.progress)) return;
    if (clock.elapsedTime - r.last < 1 / 15 || !(camera instanceof THREE.PerspectiveCamera)) return;
    for (let ancestor: THREE.Object3D | null = surface; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
    surface.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    r.position.setFromMatrixPosition(surface.matrixWorld);
    r.eye.setFromMatrixPosition(camera.matrixWorld);
    if (r.eye.distanceToSquared(r.position) > (40*scale)**2) return;
    r.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    r.frustum.setFromProjectionMatrix(r.viewProjection);
    r.bounds.copy(geometry.boundingBox!).applyMatrix4(surface.matrixWorld);
    if (!r.frustum.intersectsBox(r.bounds)) return;

    // Same reflection and oblique near-plane construction as the installed
    // Three Reflector and BasinWater, with this mesh's actual transformed plane.
    r.rotation.extractRotation(surface.matrixWorld);
    r.normal.set(0, 0, 1).applyMatrix4(r.rotation);
    r.view.subVectors(r.position, r.eye);
    if (r.view.dot(r.normal) > 0) return;
    r.view.reflect(r.normal).negate().add(r.position);
    r.rotation.extractRotation(camera.matrixWorld);
    r.look.set(0, 0, -1).applyMatrix4(r.rotation).add(r.eye);
    r.lookTarget.subVectors(r.position, r.look).reflect(r.normal).negate().add(r.position);
    r.camera.position.copy(r.view);
    r.camera.up.set(0, 1, 0).applyMatrix4(r.rotation).reflect(r.normal);
    r.camera.lookAt(r.lookTarget);
    r.camera.near = camera.near;
    r.camera.far = camera.far;
    r.camera.updateMatrixWorld();
    r.camera.projectionMatrix.copy(camera.projectionMatrix);
    r.uniforms.uProjectionDeckMatrix.value.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1)
      .multiply(r.camera.projectionMatrix).multiply(r.camera.matrixWorldInverse).multiply(surface.matrixWorld);
    r.plane.setFromNormalAndCoplanarPoint(r.normal, r.position).applyMatrix4(r.camera.matrixWorldInverse);
    r.clip.set(r.plane.normal.x, r.plane.normal.y, r.plane.normal.z, r.plane.constant);
    const projection = r.camera.projectionMatrix, e = projection.elements;
    r.q.set((Math.sign(r.clip.x) + e[8]) / e[0], (Math.sign(r.clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    const denominator = r.clip.dot(r.q);
    if (Math.abs(denominator) < 1e-6) return;
    r.clip.multiplyScalar(2 / denominator);
    e[2] = r.clip.x; e[6] = r.clip.y; e[10] = r.clip.z + 1 - .001; e[14] = r.clip.w;
    r.camera.projectionMatrixInverse.copy(projection).invert();

    const previousTarget = gl.getRenderTarget(), previousFace = gl.getActiveCubeFace(), previousMip = gl.getActiveMipmapLevel();
    const previousXr = gl.xr.enabled, previousShadowAuto = gl.shadowMap.autoUpdate, previousShadowUpdate = gl.shadowMap.needsUpdate;
    const previousScissorTest = gl.getScissorTest(), previousClearAlpha = gl.getClearAlpha();
    gl.getViewport(r.viewport); gl.getScissor(r.scissor); gl.getClearColor(r.clearColour);
    r.hidden.length = 0;
    // Remove active reflection surfaces for this capture. In particular, a
    // Three Reflector's onBeforeRender could otherwise start a nested render.
    scene.traverse(object => {
      if (object.visible && (object === surface || reflectiveSurface(object))) {
        r.hidden.push({ object, visible: object.visible });
        object.visible = false;
      }
    });
    try {
      gl.xr.enabled = false;
      gl.shadowMap.autoUpdate = false;
      gl.shadowMap.needsUpdate = false;
      gl.setRenderTarget(r.target);
      gl.setScissorTest(false);
      gl.state.buffers.depth.setMask(true);
      if (!gl.autoClear) gl.clear();
      gl.render(scene, r.camera);
      r.uniforms.uProjectionDeckReady.value = 1;
      r.last = clock.elapsedTime;
    } finally {
      for (const hidden of r.hidden) hidden.object.visible = hidden.visible;
      r.hidden.length = 0;
      gl.xr.enabled = previousXr;
      gl.shadowMap.autoUpdate = previousShadowAuto;
      gl.shadowMap.needsUpdate = previousShadowUpdate;
      gl.setRenderTarget(previousTarget, previousFace, previousMip);
      gl.setViewport(r.viewport); gl.setScissor(r.scissor); gl.setScissorTest(previousScissorTest);
      gl.setClearColor(r.clearColour, previousClearAlpha);
    }
  });

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => { stone.colour.dispose(); stone.roughness.dispose(); stone.normal.dispose(); }, [stone]);
  useEffect(() => () => { reflection.target.dispose(); reflection.material.dispose(); }, [reflection]);
  return <mesh ref={mesh} name="Raised reflective stone exhibition deck" position={[0, height, 0]}
    rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} material={reflection.material}
    receiveShadow userData={{ venuePlanarReflection: true }} />;
}
