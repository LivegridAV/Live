"use client";
import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { anamorphicVertex, anamorphicFragment } from "./anamorphic";

const WALL_W = 9, WALL_H = 5, CORNER_Z = -6, SPLAY = 0.56;

// The fixed sweet spot — MUST match the Canvas camera's default (§18).
export const SWEET_POS = new THREE.Vector3(0, 2.35, 9.2);
export const SWEET_TARGET = new THREE.Vector3(0, 2.35, -3);
export const SWEET_FOV = 40;

/**
 * The anamorphic LED corner. Renders `buildContent` (a THREE scene of the
 * virtual world — ground + subject) from the sweet-spot camera into a texture,
 * then projective-maps it onto the two physical LED panels. Correct at the
 * sweet spot, distorted off-axis.
 */
export default function AnamorphicCorner({
  buildContent,
  onFrame,
}: {
  buildContent: (scene: THREE.Scene) => void;
  onFrame?: (scene: THREE.Scene, t: number) => void;
}) {
  const { gl, size } = useThree();

  const rt = useMemo(
    () => new THREE.WebGLRenderTarget(1280, 1280, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
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
    buildContent(s);
    return s;
  }, [buildContent]);

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

  // sweet-spot aspect must match the render-target (square), not the viewport,
  // so the projection is stable regardless of window size.
  useEffect(() => {
    sweetCam.aspect = 1;
    sweetCam.updateProjectionMatrix();
  }, [sweetCam, size]);

  const vp = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    onFrame?.(content, clock.elapsedTime);
    sweetCam.updateMatrixWorld();
    vp.multiplyMatrices(sweetCam.projectionMatrix, sweetCam.matrixWorldInverse);
    (mat.uniforms.uSweetVP.value as THREE.Matrix4).copy(vp);

    // priority 0 (no arg): this runs BEFORE R3F's automatic main render, so the
    // render target is ready when the walls sample it — without taking over the
    // render loop (a non-zero priority would disable the main render).
    const prevRT = gl.getRenderTarget();
    gl.setRenderTarget(rt);
    gl.clear();
    gl.render(content, sweetCam);
    gl.setRenderTarget(prevRT);
  });

  useEffect(() => () => rt.dispose(), [rt]);

  return (
    <group>
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
