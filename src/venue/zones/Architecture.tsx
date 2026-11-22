"use client";
import { useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import { useWarmupOpen } from "../three/warmScene";
import * as THREE from "three";
import { ExpoAsset } from "../three/ExpoAsset";
import { M } from "../three/materials";
import { Truss } from "../three/rig";
import { ZoneGroup } from "../three/ZoneGroup";
import { LightPool } from "../three/environment";
import { useVenue } from "../systems/store";
import { preparePolishedFloor } from "../three/polishedFloor";
import { GRAND, ARENA_SHIFT, HALL_BAYS } from "../data/grand";
import { VENUE_FLOOR, useVenueFloorMaps } from "../three/venueFloor";

/**
 * The building.
 *
 * Everything the visitor walks through is one continuous structure: a plaza,
 * an entrance, a long exhibition hall and an arena, joined end to end along
 * -Z. Long surfaces are cut into segments so the frustum can actually reject
 * them — a single 210 m wall is never off-screen as far as the culler is
 * concerned, and that alone costs more than the geometry ever will.
 */

/* ── venue dimensions (metres) ─────────────────────────── */
export const V = {
  hall: { x: GRAND.hall.halfWidth, y: GRAND.hall.roofHeight, from: GRAND.hall.from, to: GRAND.hall.to },
  arena: { x: 44, y: 34, from: -244 + ARENA_SHIFT, to: -380 + ARENA_SHIFT },
  plaza: { from: 46, to: -1 },
} as const;

/** The polished hall floor: from the entrance ramp to the arena ramp. */
const HALL_FLOOR = (() => {
  const near = -30, far = GRAND.hall.to - 2;
  return { depth: near - far, centerZ: (near + far) / 2 };
})();

function segments(from: number, to: number, size: number) {
  const out: { z: number; len: number }[] = [];
  const total = Math.abs(to - from);
  const n = Math.ceil(total / size);
  const len = total / n;
  for (let i = 0; i < n; i++) out.push({ z: from - len * (i + 0.5), len });
  return out;
}

/* ── ground ────────────────────────────────────────────── */

export function Ground() {
  const quality = useVenue((s) => s.quality);
  const reflect = useWarmupOpen();
  const stone = useVenueFloorMaps();
  const geometry = useMemo(() => {
    const width = GRAND.hall.halfWidth * 2 + 16, depth = HALL_FLOOR.depth, centerZ = HALL_FLOOR.centerZ;
    const plane = new THREE.PlaneGeometry(width, depth);
    const position = plane.getAttribute("position"), uv = plane.getAttribute("uv");
    // Equivalent to world-space mapping: all UVs derive from the same world
    // origin in metres, independent of active zone, mesh size or camera.
    for (let i=0;i<position.count;i++) uv.setXY(i,
      (position.getX(i)-VENUE_FLOOR.origin[0])/VENUE_FLOOR.textureMetres,
      (-position.getY(i)+centerZ-VENUE_FLOOR.origin[1])/VENUE_FLOOR.textureMetres);
    uv.needsUpdate=true;
    return plane;
  }, []);
  return <group><mesh name="Continuous venue stone · world registered 2 m joints"
    receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,GRAND.master.floor,HALL_FLOOR.centerZ]}
    geometry={geometry} userData={{venuePlanarReflection:true,grandRole:"venue-floor"}}>
    {/* The live reflection draws the whole scene every frame, so it waits
        for the warm-up; before then the loader hides the plain stone. */}
    {!reflect ? <meshStandardMaterial color={VENUE_FLOOR.colour} map={stone.map} roughnessMap={stone.roughnessMap}
      normalMap={stone.normalMap} normalScale={[.045,.045]} metalness={.035} roughness={.43} envMapIntensity={.48}/> :
    <MeshReflectorMaterial color={VENUE_FLOOR.colour}
      onUpdate={material=>preparePolishedFloor(material)}
      map={stone.map} roughnessMap={stone.roughnessMap} normalMap={stone.normalMap}
      normalScale={[.045,.045]} metalness={.035} roughness={.43} envMapIntensity={.48}
      resolution={quality==="high"?1024:512}
      blur={quality==="low"?[100,45]:[240,100]} mixBlur={1.5}
      mixStrength={1.3} mirror={.46} depthScale={0}
      minDepthThreshold={.85} maxDepthThreshold={1} />}
  </mesh>
    {/* Existing arrival and arena retain their original floor datum. The brief
        standardizes the exhibition hall; transition ramps meet those areas. */}
    <mesh receiveShadow rotation={[-Math.PI/2,0,0]} position={[0,0,21.8]}>
      <planeGeometry args={[96,48.4]}/>
      <meshStandardMaterial color="#252d30" roughness={.75}/>
    </mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,-204]} material={M.floor}>
      <planeGeometry args={[96,352]}/>
    </mesh>
    <FloorTransition from={-28.4} to={-30} fromY={0} toY={GRAND.master.floor}/>
    <FloorTransition from={-240+ARENA_SHIFT} to={-244+ARENA_SHIFT} fromY={GRAND.master.floor} toY={0}/>
  </group>;
}

function FloorTransition({from,to,fromY,toY}:{from:number;to:number;fromY:number;toY:number}) {
  const stone=useVenueFloorMaps();
  const geometry=useMemo(()=>{
    const width=GRAND.hall.halfWidth*2+16;
    const vertices=[[-width/2,fromY,from],[width/2,fromY,from],[-width/2,toY,to],[width/2,toY,to]];
    const result=new THREE.BufferGeometry();
    result.setAttribute("position",new THREE.Float32BufferAttribute(vertices.flat(),3));
    result.setAttribute("uv",new THREE.Float32BufferAttribute(vertices.flatMap(p=>[(p[0]-VENUE_FLOOR.origin[0])/VENUE_FLOOR.textureMetres,(p[2]-VENUE_FLOOR.origin[1])/VENUE_FLOOR.textureMetres]),2));
    result.setIndex([0,1,2,2,1,3]);result.computeVertexNormals();return result;
  },[from,to,fromY,toY]);
  return <mesh name="Venue floor datum transition ramp" geometry={geometry} receiveShadow>
    <meshStandardMaterial color={VENUE_FLOOR.colour} map={stone.map} roughnessMap={stone.roughnessMap} normalMap={stone.normalMap} normalScale={[.045,.045]} metalness={.035} roughness={.43} envMapIntensity={.48}/>
  </mesh>;
}

/* ── exhibition hall shell ─────────────────────────────── */

/**
 * The hall is built in chunks rather than as one long room, and each chunk is
 * gated on the camera's position. Without that, standing at the entrance
 * submits every wall, column and truss of a 212 m hall that is entirely hidden
 * behind the façade — three.js culls by frustum, and a corridor is exactly the
 * shape that defeats it.
 */
export function HallShell() {
  const visit = useVenue(s=>s.stallVisit);
  const diagnostic = visit?.view==="plan" || visit?.view==="section";
  // A fixed building envelope. Diagnostic views deliberately remove the hall
  // roof; entering a stall never resizes walls, columns or the shared floor.
  return <group visible={!diagnostic}>{Array.from({length:HALL_BAYS},(_,i)=>{
    const z=-39.25-i*26.5;
    return <ZoneGroup key={i} from={z+13.25} to={z-13.25} ahead={82} behind={48}>
      <group position={[0,0,z]} scale={[GRAND.hall.halfWidth/19,GRAND.hall.roofHeight/15,26.5/26]}>
        <ExpoAsset name="hall-bay" darkHall={i>=1} hideHallColumns={i>=1}/>
      </group>
    </ZoneGroup>;
  })}</group>;
}

/* ── arena shell ───────────────────────────────────────── */

export function ArenaShell() {
  const quality = useVenue((s) => s.quality);
  const wall = useMemo(() => segments(V.arena.from, V.arena.to, 56), []);
  const trusses = useMemo(() => {
    const out: number[] = [];
    for (let z = V.arena.from - 14; z > V.arena.to + 10; z -= 18) out.push(z);
    return out;
  }, []);

  return (
    <ZoneGroup from={V.arena.from} to={V.arena.to} ahead={70} behind={40}>
      {wall.map((s, i) =>
        [-1, 1].map((side) => (
          <mesh
            key={`aw${i}${side}`}
            position={[side * V.arena.x, V.arena.y / 2, s.z]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            material={M.concrete}
          >
            <planeGeometry args={[s.len, V.arena.y]} />
          </mesh>
        )),
      )}

      {/* Architectural lighting. The hall learned this lesson already: a room
          this size cannot be lit by fixtures with physical falloff, so the
          building carries its own light. Without it the arena reveal is a
          stage floating in black. */}
      {wall.map((seg, i) =>
        [-1, 1].map((side) => (
          <group key={`al${i}${side}`}>
            {/* a full-height slot every bay */}
            {[0.22, 0.5, 0.78].map((f) => (
              <mesh
                key={f}
                position={[side * (V.arena.x - 0.12), 7.4, seg.z + (f - 0.5) * seg.len]}
                rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
              >
                <planeGeometry args={[0.18, 12.4]} />
                <meshBasicMaterial color="#6d8a8e" toneMapped />
              </mesh>
            ))}
            {/* a warm architectural wash at mid height between the slots —
                the side walls of a room this wide are most of what the eye
                sees in peripheral vision, and unlit they read as nothing */}
            <LightPool
              position={[side * (V.arena.x - 0.3), 6.2, seg.z]}
              rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
              size={[seg.len * 0.9, 13]}
              color="#8a6f4c"
              opacity={0.1}
            />
            {/* a low wash along the base of the wall */}
            <mesh
              position={[side * (V.arena.x - 0.1), 0.12, seg.z]}
              rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
            >
              <planeGeometry args={[seg.len, 0.12]} />
              <meshBasicMaterial color="#2c5651" toneMapped />
            </mesh>
            <LightPool
              position={[side * (V.arena.x - 5), 0.05, seg.z]}
              size={[12, seg.len * 0.8]}
              color="#5c757e"
              opacity={0.06}
            />
          </group>
        )),
      )}

      {/* House lighting used to hang at thirty-one metres, above the top of
          every frame. The ceiling in `zones/Arena` carries it now, at a height
          the camera can see. What is left here is the light on the *floor*,
          which is what gives the room its foreground. */}
      {trusses.map((z) => (
        <LightPool
          key={`fl${z}`}
          position={[0, 0.045, z]}
          size={[70, 26]}
          color="#8a6f4c"
          opacity={0.05}
        />
      ))}

      {/* back wall behind the stage */}
      <mesh position={[0, V.arena.y / 2, V.arena.to]} material={M.concrete}>
        <planeGeometry args={[V.arena.x * 2, V.arena.y]} />
      </mesh>

      {/* roof */}
      {wall.map((s, i) => (
        <mesh key={`ac${i}`} position={[0, V.arena.y, s.z]} rotation={[Math.PI / 2, 0, 0]} material={M.void}>
          <planeGeometry args={[V.arena.x * 2, s.len]} />
        </mesh>
      ))}

      {/* roof grid */}
      {quality !== "low" &&
        trusses.map((z) => (
          <Truss key={`at${z}`} length={V.arena.x * 2 - 6} size={0.52} position={[0, V.arena.y - 2.4, z]} braceEvery={1.4} />
        ))}

      {/* high-level cove down each side wall, so a thirty-four metre room has
          a top edge the eye can find */}
      {wall.map((s, i) =>
        [-1, 1].map((side) => (
          <mesh
            key={`ac${i}${side}`}
            position={[side * (V.arena.x - 0.1), 14.8, s.z]}
            rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
          >
            <planeGeometry args={[s.len, 0.3]} />
            <meshBasicMaterial color="#7d9498" toneMapped />
          </mesh>
        )),
      )}

    </ZoneGroup>
  );
}

/* ── the joint between hall and arena ──────────────────── */

export function ArenaPortal({ z = -241 + ARENA_SHIFT }: { z?: number }) {
  const h = 11;
  const w = 14;
  return (
    <group position={[0, 0, z]}>
      {/* the wall the portal is cut into */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (V.hall.x / 2 + w / 4), V.hall.y / 2, 0]} material={M.charcoal}>
          <boxGeometry args={[V.hall.x - w / 2, V.hall.y, 1.2]} />
        </mesh>
      ))}
      <mesh position={[0, (V.hall.y + h) / 2, 0]} material={M.charcoal}>
        <boxGeometry args={[w, V.hall.y - h, 1.2]} />
      </mesh>
      {/* portal reveal — warm light spilling from the arena beyond */}
      {[-1, 1].map((side) => (
        <mesh key={`r${side}`} position={[side * (w / 2 + 0.06), h / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[h, 0.12]} />
          <meshBasicMaterial color="#5a4429" toneMapped />
        </mesh>
      ))}
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, 0.12]} />
        <meshBasicMaterial color="#5a4429" toneMapped />
      </mesh>
    </group>
  );
}

/* ── shared helper: a pavilion-sized floor plinth ──────── */

export function Plinth({
  position,
  size,
  height = 0.12,
  material = M.deck,
}: {
  position: [number, number, number];
  size: [number, number];
  height?: number;
  material?: THREE.Material;
}) {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} material={material} receiveShadow>
      <boxGeometry args={[size[0], height, size[1]]} />
    </mesh>
  );
}
