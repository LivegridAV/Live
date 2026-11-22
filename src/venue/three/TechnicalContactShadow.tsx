"use client";
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { afterWarmup } from "./warmScene";
import { gltfExtender } from "./textureLoading";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";

/** Static, geometry-derived contact occlusion. A separate capture scene keeps
 * the result independent of the camera's distance-gated venue visibility. */
export function TechnicalContactShadow() {
  const { gl } = useThree();
  const { scene: source } = useGLTF("/models/expo/technical-showcase.glb", false, true, gltfExtender(gl));
  const target = useMemo(() => new THREE.WebGLRenderTarget(1024, 1024, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true,
  }), []);
  // Baked once every shader is ready, so the bake never compiles inside a frame.
  useEffect(() => afterWarmup(() => {
    const stage = new THREE.Scene();
    const model = source.clone(true);
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.every(m => m.transparent && m.opacity < .4 || /glass|acrylic|light|porcelain/i.test(m.name))) object.visible = false;
    });
    stage.add(model);
    const depth = new THREE.MeshDepthMaterial();
    depth.side = THREE.DoubleSide;
    depth.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "vec4( vec3( 1.0 - fragCoordZ ), opacity )",
        "vec4( vec3( 0.015 ), pow( 1.0 - fragCoordZ, 4.0 ) )",
      );
    };
    stage.overrideMaterial = depth;
    const camera = new THREE.OrthographicCamera(-16, 16, 13, -13, .005, 3.5);
    camera.position.set(.5, .102, 3.5); camera.up.set(0, 0, 1); camera.lookAt(.5, 3.6, 3.5);
    camera.updateMatrixWorld();
    const horizontal = new THREE.ShaderMaterial(HorizontalBlurShader);
    const vertical = new THREE.ShaderMaterial(VerticalBlurShader);
    const temporary = new THREE.WebGLRenderTarget(1024, 1024);
    const blurGeometry = new THREE.PlaneGeometry(2, 2);
    const blurMesh = new THREE.Mesh(blurGeometry, horizontal);
    const blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
    blurCamera.position.z = 1;
    const before = {
      target: gl.getRenderTarget(), color: gl.getClearColor(new THREE.Color()), alpha: gl.getClearAlpha(),
      autoClear: gl.autoClear, shadow: gl.shadowMap.autoUpdate,
    };
    try {
      gl.autoClear = true; gl.shadowMap.autoUpdate = false; gl.setClearColor(0x000000, 0);
      gl.setRenderTarget(target); gl.clear(); gl.render(stage, camera);
      horizontal.uniforms.tDiffuse.value = target.texture; horizontal.uniforms.h.value = .85 / 256;
      gl.setRenderTarget(temporary); gl.render(blurMesh, blurCamera);
      blurMesh.material = vertical;
      vertical.uniforms.tDiffuse.value = temporary.texture; vertical.uniforms.v.value = .85 / 256;
      gl.setRenderTarget(target); gl.render(blurMesh, blurCamera);
      target.texture.repeat.y = -1; target.texture.offset.y = 1;
    } finally {
      gl.setRenderTarget(before.target); gl.setClearColor(before.color, before.alpha);
      gl.autoClear = before.autoClear; gl.shadowMap.autoUpdate = before.shadow;
      depth.dispose(); horizontal.dispose(); vertical.dispose(); blurGeometry.dispose(); temporary.dispose();
    }
  }), [gl, source, target]);
  useEffect(() => () => target.dispose(), [target]);
  return <mesh position={[.5, .099, 3.5]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
    <planeGeometry args={[32, 26]} />
    <meshBasicMaterial map={target.texture} transparent opacity={.56} depthWrite={false} toneMapped={false} />
  </mesh>;
}
