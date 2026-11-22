"use client";
import { Suspense, type JSX, type ReactNode } from "react";
import { LiteMode } from "./liteMode";

/**
 * A load group's light pack: the zone's own children rendered in lite mode,
 * so every model sits at exactly the transform of its full asset (the lite
 * GLBs keep the source's node hierarchy). Its files belong to the start group,
 * so they are in memory and warmed with the entrance. No loading text or
 * spinner: anything still arriving simply is not drawn yet.
 */
export function LiteGroup({ id, children }: { id: string; children?: ReactNode }): JSX.Element {
  return <LiteMode.Provider value={true}>
    <Suspense fallback={null}>
      <group name={`${id} light pack`} userData={{ lightPack: id }}>{children}</group>
    </Suspense>
  </LiteMode.Provider>;
}
