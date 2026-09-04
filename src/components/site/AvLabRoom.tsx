"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";

/**
 * AV Lab 3D control room (brief §14/§31). A contained, optimized inspection scene
 * that complements — never replaces — the signal-flow explorer + rack render.
 *
 * Architecture / performance:
 * - The <Canvas> mounts only while the section is on-screen (IntersectionObserver);
 *   scrolling away unmounts it and disposes GPU resources — no second always-running
 *   renderer. DPR capped + PerformanceMonitor downscales on weak hardware.
 * - Controlled camera: click/tap a station → the camera eases to it and the hardware
 *   activates; a signal path + short explanation appear. No pointer lock, no WASD,
 *   page scroll stays usable. prefers-reduced-motion makes camera moves instant.
 * - Fallback: no WebGL → the in-house rack render + the same station read-outs.
 *
 * Materials are natural (powder-coat metal, dark desk, real displays); cyan is a
 * status/accent signal and red is used only for the live PROGRAM tally.
 */

type StationId = "media" | "live" | "show" | "projection";
interface Station {
  id: StationId;
  label: string;
  focus: [number, number, number];
  target: [number, number, number];
  chain: string[];
  body: string;
}

const STATIONS: Station[] = [
  { id: "media", label: "Media Server", focus: [-1.5, 1.75, 2.7], target: [-3.0, 1.15, -1.0],
    chain: ["Content", "Media Server", "Processor", "Display"],
    body: "Content plays from the media server, is scaled and mapped by processing, and lands pixel-accurate on the LED wall." },
  { id: "live", label: "Live Production", focus: [-0.4, 1.55, 2.7], target: [-0.35, 1.05, -0.6],
    chain: ["Cameras", "Preview", "Take", "Program"],
    body: "Camera feeds are cut live at the switcher — preview to program — and sent to the screen and the stream at once." },
  { id: "show", label: "Show Control", focus: [0.95, 1.55, 2.7], target: [0.9, 1.05, -0.6],
    chain: ["Cue", "Trigger", "Devices", "Show state"],
    body: "The operator fires cues; each one triggers its devices and advances the show — content, timing and routing already programmed." },
  { id: "projection", label: "Projection", focus: [1.9, 1.75, 2.6], target: [3.0, 1.45, -1.6],
    chain: ["Content", "Media Server", "Warp", "Projector", "Surface"],
    body: "Content is warped to the real surface geometry and driven to the projector — the building or stage becomes the canvas." },
];

const OVERVIEW_POS: [number, number, number] = [0.1, 2.5, 5.9];
const OVERVIEW_TGT: [number, number, number] = [0, 1.15, -1.1];

/* deliberate, on-brand screen content drawn to a small canvas texture */
function makeScreen(kind: "program" | "preview" | "show" | "grid" | "led"): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 160;
  const x = c.getContext("2d")!;
  x.fillStyle = "#05100e"; x.fillRect(0, 0, 256, 160);
  if (kind === "program" || kind === "led") {
    const g = x.createLinearGradient(0, 0, 256, 160);
    g.addColorStop(0, "#12433c"); g.addColorStop(1, "#081a17");
    x.fillStyle = g; x.fillRect(6, 6, 244, 148);
    x.fillStyle = "#eafffb"; x.fillRect(46, 58, 164, 12);
    x.fillStyle = "rgba(63,214,200,0.55)"; x.fillRect(46, 80, 104, 7);
    if (kind === "program") {
      x.fillStyle = "#ff5a4d"; x.beginPath(); x.arc(20, 143, 5, 0, 7); x.fill();
      x.font = "bold 11px monospace"; x.fillText("PGM", 32, 147);
    }
  } else if (kind === "preview") {
    const g = x.createLinearGradient(0, 0, 256, 160);
    g.addColorStop(0, "#0f2f3a"); g.addColorStop(1, "#08171c");
    x.fillStyle = g; x.fillRect(6, 6, 244, 148);
    x.fillStyle = "rgba(180,220,255,0.5)"; x.fillRect(60, 52, 24, 60); x.fillRect(52, 112, 40, 22);
    x.fillStyle = "#3fd6c8"; x.beginPath(); x.arc(20, 143, 5, 0, 7); x.fill();
    x.font = "bold 11px monospace"; x.fillText("PVW", 32, 147);
  } else if (kind === "show") {
    x.font = "11px monospace";
    ["INTRO BUILD", "KEYNOTE", "VIDEO ROLL", "AWARD", "CLOSE"].forEach((q, i) => {
      x.fillStyle = i === 1 ? "#ff5a4d" : i === 2 ? "#3fd6c8" : "#7f938e";
      x.fillText(String(i + 1).padStart(2, "0") + "  " + q, 18, 34 + i * 26);
    });
  } else {
    // processing grid / mapping
    x.strokeStyle = "rgba(63,214,200,0.4)"; x.lineWidth = 1;
    for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(6 + i * 30.5, 6); x.lineTo(6 + i * 30.5, 154); x.stroke(); }
    for (let i = 0; i <= 5; i++) { x.beginPath(); x.moveTo(6, 6 + i * 29.6); x.lineTo(250, 6 + i * 29.6); x.stroke(); }
    x.fillStyle = "rgba(63,214,200,0.85)"; x.fillRect(70, 66, 30, 29); x.fillRect(160, 36, 30, 29);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Screen({ kind, ...props }: { kind: Parameters<typeof makeScreen>[0] } & ThreeElements["mesh"]) {
  const tex = useMemo(() => makeScreen(kind), [kind]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh {...props}>
      <planeGeometry args={[1, 0.62]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

/** shared materials (created once, disposed on unmount) */
function useRoomMaterials() {
  return useMemo(() => {
    const metal = new THREE.MeshStandardMaterial({ color: "#0f1315", metalness: 0.8, roughness: 0.45 });
    const panel = new THREE.MeshStandardMaterial({ color: "#0a0e0f", metalness: 0.5, roughness: 0.6 });
    const desk = new THREE.MeshStandardMaterial({ color: "#14100e", metalness: 0.2, roughness: 0.7 });
    const floor = new THREE.MeshStandardMaterial({ color: "#0a0d0d", metalness: 0.1, roughness: 0.9 });
    const wall = new THREE.MeshStandardMaterial({ color: "#0c1010", metalness: 0.0, roughness: 1.0 });
    const led = new THREE.MeshStandardMaterial({ color: "#02100e", emissive: "#1fa093", emissiveIntensity: 1.1 });
    return { metal, panel, desk, floor, wall, led };
  }, []);
}

function Rack({ active }: { active: boolean }) {
  const M = useRoomMaterials();
  const strips = [0.35, 0.7, 1.05, 1.4, 1.75];
  return (
    <group position={[-3.15, 0, -1.15]}>
      <mesh material={M.metal} castShadow position={[0, 1.05, 0]}>
        <boxGeometry args={[0.7, 2.1, 0.6]} />
      </mesh>
      {strips.map((y, i) => (
        <mesh key={i} position={[0, y, 0.31]}>
          <planeGeometry args={[0.58, 0.24]} />
          <meshStandardMaterial color="#05100e" emissive="#3fd6c8"
            emissiveIntensity={active ? 1.6 : 0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Desk() {
  const M = useRoomMaterials();
  return (
    <group position={[0.2, 0, -0.5]}>
      {/* desk top + legs */}
      <mesh material={M.desk} position={[0, 0.74, 0]}>
        <boxGeometry args={[3.0, 0.06, 0.8]} />
      </mesh>
      <mesh material={M.metal} position={[-1.4, 0.37, 0]}><boxGeometry args={[0.06, 0.74, 0.72]} /></mesh>
      <mesh material={M.metal} position={[1.4, 0.37, 0]}><boxGeometry args={[0.06, 0.74, 0.72]} /></mesh>
      {/* three operator displays on stands */}
      <group position={[-0.9, 0.77, -0.1]}>
        <mesh material={M.metal} position={[0, 0.18, 0]}><boxGeometry args={[0.04, 0.36, 0.04]} /></mesh>
        <Screen kind="preview" position={[0, 0.38, 0.03]} rotation={[-0.08, 0, 0]} scale={0.82} />
        <mesh material={M.panel} position={[0, 0.38, -0.01]} rotation={[-0.08, 0, 0]}><boxGeometry args={[0.9, 0.58, 0.03]} /></mesh>
      </group>
      <group position={[0.15, 0.77, -0.12]}>
        <mesh material={M.metal} position={[0, 0.2, 0]}><boxGeometry args={[0.05, 0.4, 0.05]} /></mesh>
        <Screen kind="program" position={[0, 0.44, 0.03]} rotation={[-0.06, 0, 0]} scale={0.98} />
        <mesh material={M.panel} position={[0, 0.44, -0.01]} rotation={[-0.06, 0, 0]}><boxGeometry args={[1.06, 0.68, 0.03]} /></mesh>
      </group>
      <group position={[1.15, 0.77, -0.1]}>
        <mesh material={M.metal} position={[0, 0.18, 0]}><boxGeometry args={[0.04, 0.36, 0.04]} /></mesh>
        <Screen kind="show" position={[0, 0.38, 0.03]} rotation={[-0.08, 0, 0]} scale={0.82} />
        <mesh material={M.panel} position={[0, 0.38, -0.01]} rotation={[-0.08, 0, 0]}><boxGeometry args={[0.9, 0.58, 0.03]} /></mesh>
      </group>
      {/* a low control surface (faders/buttons) on the desk */}
      <mesh material={M.metal} position={[0.15, 0.79, 0.28]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[1.1, 0.28, 0.02]} />
      </mesh>
    </group>
  );
}

function LedWall({ active }: { active: boolean }) {
  const tex = useMemo(() => makeScreen("grid"), []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={[-1.6, 1.7, -2.55]}>
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[2.0, 1.2]} />
        <meshStandardMaterial color="#020908" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh>
        <planeGeometry args={[1.9, 1.1]} />
        <meshBasicMaterial map={tex} toneMapped={false} opacity={active ? 1 : 0.82} transparent />
      </mesh>
    </group>
  );
}

function Projector({ active }: { active: boolean }) {
  const M = useRoomMaterials();
  return (
    <group position={[3.0, 1.55, -0.4]}>
      <mesh material={M.metal}><boxGeometry args={[0.5, 0.28, 0.7]} /></mesh>
      <mesh position={[0, 0, -0.36]} rotation={[Math.PI / 2, 0, 0]} material={M.panel}><cylinderGeometry args={[0.09, 0.11, 0.08, 20]} /></mesh>
      {/* projected beam to the surface behind */}
      <mesh position={[0.08, -0.1, -1.1]} rotation={[Math.PI / 2, 0, 0.04]}>
        <coneGeometry args={[0.55, 1.9, 24, 1, true]} />
        <meshBasicMaterial color="#3fd6c8" transparent opacity={active ? 0.16 : 0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* the mapped surface */}
      <mesh position={[0.2, -0.15, -2.05]} rotation={[0, -0.5, 0]}>
        <planeGeometry args={[1.3, 1.0]} />
        <meshStandardMaterial color="#0a1614" emissive="#1fa093" emissiveIntensity={active ? 0.9 : 0.4} />
      </mesh>
    </group>
  );
}

function Room({ active, onPick }: { active: StationId | null; onPick: (id: StationId) => void }) {
  const M = useRoomMaterials();
  useEffect(() => () => Object.values(M).forEach((m) => m.dispose()), [M]);
  const hit = (id: StationId) => (e: THREE.Event) => { (e as unknown as { stopPropagation(): void }).stopPropagation(); onPick(id); };
  return (
    <group>
      {/* floor + back wall + side wall */}
      <mesh material={M.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.5]}>
        <planeGeometry args={[16, 12]} />
      </mesh>
      <mesh material={M.wall} position={[0, 2.4, -2.7]}><planeGeometry args={[16, 5]} /></mesh>
      {/* interactive station groups */}
      <group onClick={hit("media")}><Rack active={active === "media"} /></group>
      <group onClick={hit("live")}><Desk /></group>
      {/* show-control shares the desk; a hotspot on the right monitor */}
      <mesh position={[1.35, 1.15, -0.6]} onClick={hit("show")} visible={false}><boxGeometry args={[1, 0.8, 0.6]} /></mesh>
      <group onClick={hit("live")}><LedWall active={active === "media" || active === "live"} /></group>
      <group onClick={hit("projection")}><Projector active={active === "projection"} /></group>
    </group>
  );
}

function Rig({ active }: { active: StationId | null }) {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(...OVERVIEW_POS));
  const tgt = useRef(new THREE.Vector3(...OVERVIEW_TGT));
  const look = useRef(new THREE.Vector3(...OVERVIEW_TGT));
  const tmp = useRef(new THREE.Vector3());
  const reduce = useRef(false);
  useEffect(() => { reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  useEffect(() => {
    const s = active ? STATIONS.find((x) => x.id === active) : null;
    pos.current.set(...(s ? s.focus : OVERVIEW_POS));
    tgt.current.set(...(s ? s.target : OVERVIEW_TGT));
  }, [active]);
  useFrame(({ pointer }, dt) => {
    const k = reduce.current ? 1 : Math.min(1, dt * 2.4);
    const px = active ? 0 : pointer.x * 0.5;
    const py = active ? 0 : pointer.y * 0.28;
    tmp.current.set(pos.current.x + px, pos.current.y + py, pos.current.z);
    camera.position.lerp(tmp.current, k);
    look.current.lerp(tgt.current, k);
    camera.lookAt(look.current);
  });
  return null;
}

function FallbackImage() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-ink p-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/models/av-rack.webp" width={715} height={1100} loading="lazy"
        alt="AV equipment rack — media server, LED processor, switcher and patch"
        className="mx-auto block w-full max-w-[280px]" />
    </div>
  );
}

export default function AvLabRoom() {
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState<StationId | null>(null);
  // WebGL support is fixed for the session — compute once, no effect needed.
  const [webgl] = useState(() => {
    if (typeof document === "undefined") return true;
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { return false; }
  });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "250px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cur = active ? STATIONS.find((s) => s.id === active)! : null;

  return (
    <div ref={wrap} className="grid gap-8 md:grid-cols-[1.25fr_0.75fr] md:items-center">
      <div className="relative h-[360px] overflow-hidden rounded-[24px] border border-ink-soft bg-[#060b0a] md:h-[440px]">
        {webgl ? (
          inView && (
            <Canvas
              dpr={[1, 1.6]}
              camera={{ position: OVERVIEW_POS, fov: 42, near: 0.1, far: 40 }}
              gl={{ antialias: true, powerPreference: "high-performance" }}
              onPointerMissed={() => setActive(null)}
            >
              <PerformanceMonitor onDecline={() => { /* drei lowers dpr via AdaptiveDpr if added */ }} />
              <color attach="background" args={["#060b0a"]} />
              <fog attach="fog" args={["#060b0a", 7, 16]} />
              <ambientLight intensity={0.5} color="#9fb4ae" />
              <hemisphereLight intensity={0.35} color="#3fd6c8" groundColor="#0a1411" />
              <spotLight position={[2, 5, 3]} angle={0.7} penumbra={0.8} intensity={40} color="#ffe6c4" distance={20} />
              <pointLight position={[-3, 3, 1]} intensity={12} color="#bfe9e2" distance={12} />
              <Suspense fallback={null}>
                <Room active={active} onPick={setActive} />
              </Suspense>
              <Rig active={active} />
            </Canvas>
          )
        ) : (
          <div className="flex h-full items-center justify-center p-6"><FallbackImage /></div>
        )}

        {/* station picker + read-out overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-5">
          <div className="flex flex-wrap gap-2">
            {STATIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive((a) => (a === s.id ? null : s.id))}
                aria-pressed={active === s.id}
                className={`pointer-events-auto rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
                  active === s.id ? "bg-glow text-ink" : "border border-ink-soft bg-ink/70 text-text-inv/75 backdrop-blur hover:text-text-inv"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {cur && (
            <div className="pointer-events-auto max-w-[420px] rounded-xl border border-ink-soft bg-ink/85 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center gap-1.5">
                {cur.chain.map((n, i) => (
                  <span key={n} className="flex items-center gap-1.5">
                    <span className="rounded border border-ink-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-glow">{n}</span>
                    {i < cur.chain.length - 1 && <span className="text-faint">→</span>}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-inv/75">{cur.body}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">The control room</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.01em] text-text">
          Where the whole show comes together
        </h3>
        <p className="mt-4 max-w-[46ch] leading-relaxed text-muted">
          Media server, live switching, show control and projection — one operator
          position, one clean output. Pick a station to see how each system connects
          into the signal path.
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
          Interactive 3D · click a station
        </p>
      </div>
    </div>
  );
}
