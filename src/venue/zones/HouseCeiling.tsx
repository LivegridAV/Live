"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** Recessed warm fixtures: one instanced draw, not 600 separate meshes. */
export function HouseCeiling() {
  const lights = useRef<THREE.InstancedMesh>(null);
  const baffles = useRef<THREE.InstancedMesh>(null);
  const points = useMemo(() => Array.from({ length: 23 }, (_, row) =>
    [-36,-28,-20,-12,-4,4,12,20,28,36].map(x => [x, -275-row*3.7])).flat(), []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    points.forEach(([x,z],i) => {
      o.position.set(x,16.3,z); o.scale.set(1.15,.06,.32); o.updateMatrix();
      lights.current?.setMatrixAt(i,o.matrix);
    });
    for (let i=0;i<56;i++) {
      o.position.set(0,16.52,-270-i*1.65); o.scale.set(87,.12,.11);o.updateMatrix();
      baffles.current?.setMatrixAt(i,o.matrix);
    }
    if(lights.current)lights.current.instanceMatrix.needsUpdate=true;
    if(baffles.current)baffles.current.instanceMatrix.needsUpdate=true;
  },[points]);
  return <group>
    <mesh position={[0,16.7,-318]}><boxGeometry args={[88,.2,120]} /><meshStandardMaterial color="#28201c" roughness={.88} /></mesh>
    <instancedMesh ref={lights} args={[undefined,undefined,points.length]} frustumCulled={false}>
      <boxGeometry /><meshBasicMaterial color="#ffba68" toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={baffles} args={[undefined,undefined,56]} frustumCulled={false}>
      <boxGeometry /><meshStandardMaterial color="#191b20" roughness={.75} />
    </instancedMesh>
  </group>;
}
