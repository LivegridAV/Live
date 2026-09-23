"use client";
import { Suspense, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { prepareArchitecture } from "./architecturalFinish";
function Model({ name }: { name: string }) {
  const { scene } = useGLTF(`/models/expo/${name}.glb`, false);
  const clone = useMemo(() => {
    const model = scene.clone(true);
    prepareArchitecture(model);
    return model;
  }, [scene]);
  return <primitive object={clone} dispose={null} />;
}
export function ExpoAsset({ name }: { name: string }) {
  return <Suspense fallback={null}><Model name={name} /></Suspense>;
}
