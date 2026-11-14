"use client";
import { useMemo } from "react";
/** Circulation architecture between the retained stalls. */

/* ── aisle treatment ───────────────────────────────────── */

/**
 * The walkway itself. A hall with one uniform polished floor from end to end
 * has no scale; inlaid bands crossing it every few metres give the eye
 * something to measure the distance against.
 */
export function Aisle({ from, to, width = 7.2 }: { from: number; to: number; width?: number }) {
  const bands = useMemo(() => {
    const out: number[] = [];
    for (let z = from; z > to; z -= 9) out.push(z);
    return out;
  }, [from, to]);
  const len = Math.abs(to - from);
  const mid = (from + to) / 2;

  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2), 0.016, mid]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.05, len]} />
          <meshBasicMaterial color="#b79a70" toneMapped />
        </mesh>
      ))}
      {bands.map((z) => (
        <mesh key={z} position={[0, 0.016, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, 0.09]} />
          <meshBasicMaterial color="#53504a" toneMapped />
        </mesh>
      ))}
    </group>
  );
}
