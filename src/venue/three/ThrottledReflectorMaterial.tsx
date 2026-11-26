"use client";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState, type ComponentProps } from "react";
import * as THREE from "three";
import { extend, useFrame, useThree } from "@react-three/fiber";
import type { MeshReflectorMaterial as DreiMeshReflectorMaterial } from "@react-three/drei";
import { BlurPass } from "@react-three/drei/materials/BlurPass";
import { MeshReflectorMaterial as MeshReflectorMaterialImpl } from "@react-three/drei/materials/MeshReflectorMaterial";

/**
 * drei 10.7's MeshReflectorMaterial with one addition: `interval`, the least
 * time in seconds between two reflection renders. drei draws the whole venue
 * into the reflection on every frame; a phone redraws it at 15 Hz instead
 * (BasinWater and ProjectionFloor already do), so the floor costs a quarter
 * of a scene pass at 60 fps instead of a whole one. The texture matrix is
 * updated with the render it belongs to, so a held reflection stays put.
 *
 * Otherwise a faithful copy (same props, defaults, targets and render order);
 * polishedFloor.ts patches the same material class it renders.
 */
type Props = ComponentProps<typeof DreiMeshReflectorMaterial> & { interval?: number };

extend({ MeshReflectorMaterialImpl });

export const ThrottledReflectorMaterial = forwardRef<MeshReflectorMaterialImpl, Props>(function ThrottledReflectorMaterial({
  mixBlur = 0, mixStrength = 1, resolution = 256, blur = [0, 0], minDepthThreshold = 0.9, maxDepthThreshold = 1,
  depthScale = 0, depthToBlurRatioBias = 0.25, mirror = 0, distortion = 1, mixContrast = 1, distortionMap,
  reflectorOffset = 0, interval = 0, ...props
}, ref) {
  const gl = useThree(s => s.gl);
  const camera = useThree(s => s.camera);
  const scene = useThree(s => s.scene);
  const [blurX, blurY] = Array.isArray(blur) ? blur : [blur, blur];
  const hasBlur = blurX + blurY > 0;
  const materialRef = useRef<MeshReflectorMaterialImpl>(null!);
  useImperativeHandle(ref, () => materialRef.current, []);
  const [s] = useState(() => ({
    plane: new THREE.Plane(), normal: new THREE.Vector3(), reflectorWorld: new THREE.Vector3(), cameraWorld: new THREE.Vector3(),
    rotation: new THREE.Matrix4(), lookAt: new THREE.Vector3(0, 0, -1), clip: new THREE.Vector4(), view: new THREE.Vector3(),
    target: new THREE.Vector3(), q: new THREE.Vector4(), textureMatrix: new THREE.Matrix4(), virtualCamera: new THREE.PerspectiveCamera(),
    last: -Infinity,
  }));

  const parentOf = () => {
    const material = materialRef.current as MeshReflectorMaterialImpl & { parent?: THREE.Object3D; __r3f?: { parent?: { object?: THREE.Object3D } } };
    return material?.parent || material?.__r3f?.parent?.object;
  };

  /** drei's beforeRender: the virtual camera, texture matrix and oblique clip. */
  const beforeRender = useCallback((parent: THREE.Object3D) => {
    s.reflectorWorld.setFromMatrixPosition(parent.matrixWorld);
    s.cameraWorld.setFromMatrixPosition(camera.matrixWorld);
    s.rotation.extractRotation(parent.matrixWorld);
    s.normal.set(0, 0, 1).applyMatrix4(s.rotation);
    s.reflectorWorld.addScaledVector(s.normal, reflectorOffset);
    s.view.subVectors(s.reflectorWorld, s.cameraWorld);
    if (s.view.dot(s.normal) > 0) return false;
    s.view.reflect(s.normal).negate().add(s.reflectorWorld);
    s.rotation.extractRotation(camera.matrixWorld);
    s.lookAt.set(0, 0, -1).applyMatrix4(s.rotation).add(s.cameraWorld);
    s.target.subVectors(s.reflectorWorld, s.lookAt).reflect(s.normal).negate().add(s.reflectorWorld);
    const v = s.virtualCamera;
    v.position.copy(s.view);
    v.up.set(0, 1, 0).applyMatrix4(s.rotation).reflect(s.normal);
    v.lookAt(s.target);
    v.far = camera.far;
    v.updateMatrixWorld();
    v.projectionMatrix.copy(camera.projectionMatrix);
    s.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(v.projectionMatrix).multiply(v.matrixWorldInverse).multiply(parent.matrixWorld);
    // Oblique near plane: http://www.terathon.com/code/oblique.html
    s.plane.setFromNormalAndCoplanarPoint(s.normal, s.reflectorWorld).applyMatrix4(v.matrixWorldInverse);
    s.clip.set(s.plane.normal.x, s.plane.normal.y, s.plane.normal.z, s.plane.constant);
    const e = v.projectionMatrix.elements;
    s.q.set((Math.sign(s.clip.x) + e[8]) / e[0], (Math.sign(s.clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    s.clip.multiplyScalar(2 / s.clip.dot(s.q));
    e[2] = s.clip.x; e[6] = s.clip.y; e[10] = s.clip.z + 1; e[14] = s.clip.w;
    return true;
  }, [camera, reflectorOffset, s]);

  const [fbo1, fbo2, blurpass, reflectorProps] = useMemo(() => {
    const parameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType };
    const fbo1 = new THREE.WebGLRenderTarget(resolution, resolution, parameters);
    fbo1.depthBuffer = true;
    fbo1.depthTexture = new THREE.DepthTexture(resolution, resolution);
    fbo1.depthTexture.format = THREE.DepthFormat;
    fbo1.depthTexture.type = THREE.UnsignedShortType;
    const fbo2 = new THREE.WebGLRenderTarget(resolution, resolution, parameters);
    const blurpass = new BlurPass({ gl, resolution, width: blurX, height: blurY, minDepthThreshold, maxDepthThreshold, depthScale, depthToBlurRatioBias });
    const reflectorProps = {
      mirror, textureMatrix: s.textureMatrix, mixBlur, tDiffuse: fbo1.texture, tDepth: fbo1.depthTexture, tDiffuseBlur: fbo2.texture,
      hasBlur, mixStrength, minDepthThreshold, maxDepthThreshold, depthScale, depthToBlurRatioBias, distortion, distortionMap, mixContrast,
      "defines-USE_BLUR": hasBlur ? "" : undefined,
      "defines-USE_DEPTH": depthScale > 0 ? "" : undefined,
      "defines-USE_DISTORTION": distortionMap ? "" : undefined,
    };
    return [fbo1, fbo2, blurpass, reflectorProps] as const;
  }, [gl, blurX, blurY, s, resolution, mirror, hasBlur, mixBlur, mixStrength, minDepthThreshold, maxDepthThreshold, depthScale, depthToBlurRatioBias, distortion, distortionMap, mixContrast]);

  useFrame(({ clock }) => {
    const parent = parentOf();
    if (!parent) return;
    if (interval > 0 && clock.elapsedTime - s.last < interval) return;
    s.last = clock.elapsedTime;
    parent.visible = false;
    const xr = gl.xr.enabled, shadowAuto = gl.shadowMap.autoUpdate;
    // As drei: a plane facing away keeps the last camera and still renders.
    beforeRender(parent);
    gl.xr.enabled = false;
    gl.shadowMap.autoUpdate = false;
    gl.setRenderTarget(fbo1);
    gl.state.buffers.depth.setMask(true);
    if (!gl.autoClear) gl.clear();
    gl.render(scene, s.virtualCamera);
    if (hasBlur) blurpass.render(gl, fbo1, fbo2);
    gl.xr.enabled = xr;
    gl.shadowMap.autoUpdate = shadowAuto;
    parent.visible = true;
    gl.setRenderTarget(null);
  });

  return <meshReflectorMaterialImpl attach="material" ref={materialRef}
    key={`key${reflectorProps["defines-USE_BLUR"]}${reflectorProps["defines-USE_DEPTH"]}${reflectorProps["defines-USE_DISTORTION"]}`}
    {...reflectorProps} {...props} />;
});

