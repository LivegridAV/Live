"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { show } from "../systems/journey";

/** Individual seating, tapered shoulders, head/hair and varied clothing.
 * The entire audience is instanced; no per-person React component or light. */
export function Audience() {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const people = useRef<THREE.Group>(null);
  const positions = useMemo(() => [-1, 1].flatMap(side =>
    Array.from({ length: 24 }, (_, row) => Array.from({ length: 35 }, (_, col) =>
      [side * (4.3 + col * .82), -302 - row * 1.15] as const)).flat()), []);
  const parts = useMemo(() => [
    { y: .48, z: 0, scale: [.64,.11,.62] },
    { y: .86, z: .29, scale: [.64,.75,.11] },
    { y: 0, z: 0, scale: [1,1,1] },
    { y: .96, z: -.04, scale: [.48,.64,.33] },
    { y: 1.34, z: -.06, scale: [.24,.28,.24] },
    { y: 1.39, z: -.035, scale: [.25,.2,.25] },
  ], []);
  const legs = useMemo(() => {
    const pieces=[-1,1].flatMap(x=>[-1,1].map(z=>new THREE.BoxGeometry(.035,.44,.035).translate(x*.25,.23,z*.23)));
    const merged=mergeGeometries(pieces); pieces.forEach(g=>g.dispose()); return merged;
  },[]);
  useLayoutEffect(() => {
    const transform = new THREE.Object3D();
    parts.forEach((part, p) => {
      const mesh = refs.current[p]; if (!mesh) return;
      positions.forEach(([x,z], i) => {
        const variation=Math.sin(i*17)*.065;
        transform.position.set(x+(p>2?Math.sin(i*9)*.035:0), part.y + (p > 2 ? variation : 0), z + part.z);
        transform.rotation.y=p>2?Math.sin(i*11)*.18:0;
        transform.scale.set(...part.scale as [number,number,number]);
        if(p>2 && i%17===0)transform.scale.setScalar(0);
        transform.updateMatrix(); mesh.setMatrixAt(i,transform.matrix);
        const palette=p===3?['#262a31','#413931','#1a1f27','#3c3e42','#55504a']:p===4?['#9d7963','#6e4c3c','#b5927a','#745748']:['#1f1c19','#30231d','#443328'];
        if(p>2)mesh.setColorAt(i,new THREE.Color(palette[(i*7)%palette.length]));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    });
  }, [positions, parts]);
  useFrame(() => { if (people.current) people.current.visible = show.mode < .5; });
  const part = (p: number) => <instancedMesh key={p} ref={m => { refs.current[p] = m; }} args={[undefined, undefined, positions.length]} frustumCulled={false}>
    {p===2?<primitive object={legs} attach="geometry" />:p === 3 ? <cylinderGeometry args={[.4,.5,1,7]} />:p>3 ? <sphereGeometry args={[.5,8,6]} /> : <boxGeometry />}
    <meshStandardMaterial color={p > 2 ? "#ffffff" : "#191b20"} metalness={p===2?.65:.02} roughness={p===2?.3:.86} />
  </instancedMesh>;
  return <group>{[0,1,2].map(part)}<group ref={people}>{[3,4,5].map(part)}</group>
    {[-1,1].map(side => <mesh key={side} position={[side*3.6,.025,-315]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[.05,34]} /><meshBasicMaterial color="#d9a96b" />
    </mesh>)}
  </group>;
}
