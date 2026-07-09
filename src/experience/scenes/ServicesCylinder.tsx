"use client";
import { useMemo, useRef, useState } from "react";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { audio } from "../audio";
import { signals, THEMES, useChapterActive, useExperience } from "../store";
import { SERVICES } from "@/content/site";

/**
 * Scene 4 — a gigantic frosted-glass cylinder of services.
 * Grab and throw it: real momentum + inertia, no auto-rotate.
 * Clicking a panel pulls it forward and plays a 3D demonstration
 * in the middle of the ring. Service data is shared with the classic
 * site via src/content/site.ts.
 */

const CENTER = new THREE.Vector3(0, 3, -80);
const RADIUS = 7.5;
const tmpV = new THREE.Vector3();

/** One frosted glass panel on the ring. */
function Panel({
  index, angle, spin,
}: {
  index: number;
  angle: number;
  spin: React.MutableRefObject<{ angle: number }>;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [facing, setFacing] = useState(true);
  const active = useExperience((s) => s.activeService) === index;
  const setActiveService = useExperience((s) => s.setActiveService);
  const th = THEMES[useExperience((s) => s.theme)];
  const service = SERVICES[index];
  const labelOn = useChapterActive(0.4, 0.6); // DOM labels only in-chapter

  useFrame(() => {
    if (!group.current) return;
    const a = angle + spin.current.angle;
    // active panel pulls in toward the camera side (positive z of ring)
    const r = active ? RADIUS - 2.2 : RADIUS;
    tmpV.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    group.current.position.lerp(tmpV, 0.12);
    group.current.rotation.y = a; // face outward
    const s = active ? 1.18 : hovered ? 1.05 : 1;
    group.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
    // hide the DOM label when the panel faces away — otherwise mirrored
    // text from the far side of the ring shows through the glass
    const front = Math.cos(a) > 0.1;
    setFacing((prev) => (prev === front ? prev : front));
  });

  return (
    <group ref={group}>
      {/* chrome frame */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[2.5, 4.3, 0.05]} />
        <meshStandardMaterial color="#3a4643" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* frosted glass face */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); audio.blip(0.9); }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          audio.click(undefined, 1.1);
          setActiveService(active ? null : index);
        }}
      >
        <boxGeometry args={[2.3, 4.1, 0.08]} />
        <meshPhysicalMaterial
          color="#bfe0db"
          metalness={0}
          roughness={0.55}
          transparent
          opacity={0.35}
          emissive={active || hovered ? th.glow : th.accent}
          emissiveIntensity={active ? 0.5 : hovered ? 0.32 : 0.15}
        />
      </mesh>
      {/* internal glow bar — the panel's animated "icon" */}
      <mesh position={[0, 1.4, 0.06]}>
        <planeGeometry args={[1.6, 0.08]} />
        <meshBasicMaterial color={th.glow} toneMapped={false} transparent opacity={active || hovered ? 1 : 0.4} />
      </mesh>
      {labelOn && facing && (
        // transform-mode Html scales with the world — the wrapper group
        // sets its physical size on the panel face
        <group position={[0, -0.2, 0.1]} scale={0.38}>
          <Html center style={{ pointerEvents: "none" }} transform occlude={false}>
            <div className={`lg-panel-label ${active ? "is-active" : ""}`}>
              <span className="lg-panel-num">{String(index + 1).padStart(2, "0")}</span>
              <span className="lg-panel-name">{service.name}</span>
              {active && <span className="lg-panel-desc">{service.desc}</span>}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

/** Center-stage demo that plays for the selected service. */
function CenterDemo() {
  const active = useExperience((s) => s.activeService);
  const group = useRef<THREE.Group>(null);
  const cells = useRef<THREE.InstancedMesh>(null);
  const tmpObj = useMemo(() => new THREE.Object3D(), []);
  const th = THEMES[useExperience((s) => s.theme)];
  const demo = active !== null ? SERVICES[active].demo : null;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.visible = demo !== null;
    if (demo === null) return;
    group.current.rotation.y = t * 0.35;

    if (cells.current) {
      // 5×3 mini LED wall that assembles / animates per demo type
      let n = 0;
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 3; y++) {
          const fly =
            demo === "wall"
              ? Math.max(0, 1 - ((t * 0.9 + (x + y) * 0.15) % 3))
              : 0;
          const wobble =
            demo === "morph" ? Math.sin(t * 2 + x + y) * 0.35 :
            demo === "mix" ? Math.sin(t * 3 + x * 2) * 0.15 : 0;
          const px = (x - 2) * 0.65 + fly * (x - 2) * 2;
          const py = 2 + (y - 1) * 0.65 + wobble + fly * 2;
          const pz = demo === "popout" ? Math.max(0, Math.sin(t * 1.4 + x * 0.8)) * (y === 1 ? 1.4 : 0.2) : 0;
          const orbitA = t * 0.8 + n;
          tmpObj.position.set(
            demo === "orbit" ? Math.cos(orbitA) * 2.2 : px,
            demo === "orbit" ? 2 + Math.sin(orbitA * 1.3) * 1.2 : py,
            demo === "orbit" ? Math.sin(orbitA) * 2.2 : pz,
          );
          if (demo === "timeline") {
            tmpObj.position.set((((x + t * 0.6) % 5) - 2) * 0.8, 2 + (y - 1) * 0.5, 0);
          }
          if (demo === "converge") {
            const f = (Math.sin(t * 0.9 + n) + 1) / 2;
            tmpObj.position.multiplyScalar(1 - f * 0.75);
            tmpObj.position.y = py * (1 - f * 0.4) + 0.8 * f;
          }
          tmpObj.scale.setScalar(0.28);
          tmpObj.rotation.set(0, demo === "orbit" ? orbitA : 0, 0);
          tmpObj.updateMatrix();
          cells.current.setMatrixAt(n++, tmpObj.matrix);
        }
      }
      cells.current.instanceMatrix.needsUpdate = true;
      (cells.current.material as THREE.MeshBasicMaterial).color.set(th.glow);
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={cells} args={[undefined, undefined, 15]}>
        <boxGeometry args={[1, 1, 0.25]} />
        <meshBasicMaterial color="#3fd6c8" toneMapped={false} />
      </instancedMesh>
      <pointLight position={[0, 2, 2]} intensity={12} color={th.glow} distance={12} />
    </group>
  );
}

export default function ServicesCylinder() {
  const spin = useRef({ angle: 0, velocity: 0.15, dragging: false, lastX: 0 });
  const setActiveService = useExperience((s) => s.setActiveService);

  useFrame((_, delta) => {
    const s = spin.current;
    if (!s.dragging) {
      s.angle += s.velocity * delta;
      s.velocity *= 1 - Math.min(1, delta * 1.1); // realistic inertia decay
      // keep the tiniest drift so it never feels dead
      if (Math.abs(s.velocity) < 0.02) s.velocity = Math.sign(s.velocity || 1) * 0.02;
    }
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    spin.current.dragging = true;
    signals.sceneGrab = true; // the cylinder owns this drag, not free-look
    spin.current.lastX = e.clientX;
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const s = spin.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.lastX;
    s.lastX = e.clientX;
    s.angle += dx * 0.006;
    s.velocity = dx * 0.35; // throw = momentum
    if (Math.abs(dx) > 2 && useExperience.getState().activeService !== null) {
      setActiveService(null); // dragging closes the open panel
    }
  };
  const onUp = () => {
    spin.current.dragging = false;
    signals.sceneGrab = false;
  };

  return (
    <group position={CENTER}>
      {/* invisible drag surface wrapping the whole ring */}
      <mesh
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        visible={false}
      >
        <cylinderGeometry args={[RADIUS + 1.5, RADIUS + 1.5, 6, 24, 1, true]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>

      {SERVICES.map((_, i) => (
        <Panel
          key={i}
          index={i}
          angle={(i / SERVICES.length) * Math.PI * 2}
          spin={spin}
        />
      ))}

      <CenterDemo />

      {/* floor ring glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]}>
        <ringGeometry args={[RADIUS - 0.4, RADIUS + 0.4, 64]} />
        <meshBasicMaterial color="#1fa093" transparent opacity={0.25} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
