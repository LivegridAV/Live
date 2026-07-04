"use client";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { audio } from "../audio";
import { THEMES, useExperience } from "../store";
import { PROJECTS, Project } from "@/content/site";

/**
 * Scene 7 — the projects gallery: a floating city of glass cubes,
 * one per delivered event. Hover expands a cube into its project card;
 * click steps inside (detail view rendered as a DOM overlay).
 * Project data is the shared source of truth in src/content/site.ts.
 */

const CENTER_Z = -200;
const tmpV = new THREE.Vector3();

export type { Project };
export { PROJECTS };

function ProjectCube({ project, index }: { project: Project; index: number }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const setActiveProject = useExperience((s) => s.setActiveProject);

  // city layout: staggered 3×3 grid, varied heights
  const col = index % 3;
  const row = Math.floor(index / 3);
  const x = (col - 1) * 5 + (row % 2 ? 1.2 : -0.8);
  const y = 2 + ((index * 37) % 5) * 0.9;
  const z = CENTER_Z - row * 4 + (col % 2 ? 1 : -1);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = y + Math.sin(t * 0.5 + index * 2.1) * 0.3;
    group.current.rotation.y = t * 0.12 + index;
    group.current.scale.lerp(tmpV.setScalar(hovered ? 1.6 : 1), 0.09);
  });

  return (
    <group ref={group} position={[x, y, z]}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); audio.blip(1); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
        onClick={(e) => { e.stopPropagation(); audio.click(undefined, 1.2); setActiveProject(index); }}
      >
        <boxGeometry args={[1.7, 1.7, 1.7]} />
        <meshPhysicalMaterial
          color="#a8ccc6"
          transparent
          opacity={0.2}
          roughness={0.1}
          emissive={project.vibe}
          emissiveIntensity={hovered ? 0.9 : 0.25}
        />
      </mesh>
      {/* inner light core — each event has its own color memory */}
      <mesh scale={0.5}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={project.vibe} toneMapped={false} transparent opacity={hovered ? 1 : 0.5} />
      </mesh>
      {hovered && (
        <Html center distanceFactor={13} position={[0, 1.6, 0]} style={{ pointerEvents: "none" }}>
          <div className="lg-label lg-label-project">
            <span className="lg-label-name">{project.name}</span>
            <span className="lg-label-role">{project.client} · {project.year}</span>
            <span className="lg-label-meta">{project.location}</span>
            <span className="lg-label-meta">{project.led}</span>
            <span className="lg-label-hint">click to step inside</span>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function ProjectsCity() {
  const th = THEMES[useExperience((s) => s.theme)];
  return (
    <group>
      {PROJECTS.map((p, i) => (
        <ProjectCube key={p.name} project={p} index={i} />
      ))}
      {/* city "streets": glowing grid below the cubes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, CENTER_Z - 4]}>
        <planeGeometry args={[36, 26, 18, 13]} />
        <meshBasicMaterial color={th.accent} wireframe transparent opacity={0.12} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 8, CENTER_Z + 6]} intensity={20} color="#bfe8e2" distance={30} />
    </group>
  );
}
