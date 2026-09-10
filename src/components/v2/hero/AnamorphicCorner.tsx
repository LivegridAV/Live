"use client";
/* eslint-disable react-hooks/immutability -- imperative three.js: the content
   scene and render target are built/mutated in useMemo and each frame. */
import { useMemo, useEffect, type ReactNode } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { anamorphicVertex, anamorphicFragment } from "./anamorphic";

const WALL_W = 9, WALL_H = 5, CORNER_Z = -6, SPLAY = 0.56;

// The fixed sweet spot — MUST match the Canvas camera's default (§18).
export const SWEET_POS = new THREE.Vector3(0, 1.7, 8.4);
export const SWEET_TARGET = new THREE.Vector3(0, 1.15, -3);
export const SWEET_FOV = 43;

/**
 * The anamorphic LED corner. `children` are rendered (via a portal) into a
 * virtual content scene — the world the LED pretends to be a window onto. That
 * scene is rendered from the FIXED sweet-spot camera into a texture, then
 * projective-mapped onto the two physical LED panels. Correct at the sweet
 * spot, distorted off-axis (brief §19/§20).
 */
export default function AnamorphicCorner({ children }: { children: ReactNode }) {
  const { gl, size } = useThree();

  const rt = useMemo(
    () => new THREE.WebGLRenderTarget(1280, 1280, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType,
    }),
    [],
  );

  const sweetCam = useMemo(() => {
    const c = new THREE.PerspectiveCamera(SWEET_FOV, 1, 0.1, 120);
    c.position.copy(SWEET_POS);
    c.lookAt(SWEET_TARGET);
    return c;
  }, []);

  const content = useMemo(() => {
    const s = new THREE.Scene();
    s.background = new THREE.Color("#060807");
    return s;
  }, []);

  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: anamorphicVertex,
      fragmentShader: anamorphicFragment,
      uniforms: {
        uSweetVP: { value: new THREE.Matrix4() },
        uTex: { value: rt.texture },
        uOff: { value: new THREE.Color("#090b0a") },
      },
      toneMapped: false,
    }),
    [rt],
  );

  useEffect(() => { sweetCam.aspect = 1; sweetCam.updateProjectionMatrix(); }, [sweetCam, size]);

  const vp = useMemo(() => new THREE.Matrix4(), []);
  useFrame(() => {
    sweetCam.updateMatrixWorld();
    vp.multiplyMatrices(sweetCam.projectionMatrix, sweetCam.matrixWorldInverse);
    (mat.uniforms.uSweetVP.value as THREE.Matrix4).copy(vp);
    // default priority: runs before R3F's automatic main render (don't disable it)
    const prevRT = gl.getRenderTarget();
    gl.setRenderTarget(rt);
    gl.clear();
    gl.render(content, sweetCam);
    gl.setRenderTarget(prevRT);
  });

  useEffect(() => () => rt.dispose(), [rt]);

  return (
    <group>
      {createPortal(children, content)}
      {[1, -1].map((side) => (
        <group key={side} position={[0, 0, CORNER_Z]} rotation={[0, side * SPLAY, 0]}>
          <group position={[side * (WALL_W / 2), WALL_H / 2, 0]}>
            <mesh position={[0, 0, -0.14]}>
              <boxGeometry args={[WALL_W + 0.18, WALL_H + 0.18, 0.28]} />
              <meshStandardMaterial color="#0c0b0a" metalness={0.6} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.01]} material={mat}>
              <planeGeometry args={[WALL_W, WALL_H, 1, 1]} />
            </mesh>
          </group>
          <pointLight position={[side * (WALL_W / 2), 1.8, 1.8]} color="#bfe6d6" intensity={16} distance={14} decay={1.6} />
        </group>
      ))}
    </group>
  );
}
