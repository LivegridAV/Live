"use client";
import { Suspense, type JSX, type ReactNode } from "react";
import { LiteMode } from "./liteMode";

/**
 * A load group's light pack: the zone's own children rendered in lite mode,
 * so every model sits at exactly the transform of its full asset (the lite
 * GLBs keep the source's node hierarchy). The gate mounts it only once the
 * group's lite files are in memory (fetched right after opening for the
 * groups that stream in later). No loading text or spinner.
 */
export function LiteGroup({ id, children }: { id: string; children?: ReactNode }): JSX.Element {
  return <LiteMode.Provider value={true}>
    <Suspense fallback={null}>
      <group name={`${id} light pack`} userData={{ lightPack: id }}>{children}</group>
    </Suspense>
  </LiteMode.Provider>;
}
