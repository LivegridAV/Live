"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMedia, useScreenTexture } from "../media/MediaContext";
import { createLEDMaterial, createProjectionMaterial, type LEDOptions } from "./ledMaterial";
import { useVenue } from "../systems/store";
import { show } from "../systems/journey";
import { MEDIA } from "../data/media";
import { LocalPointLight } from "./LocalLights";

/**
 * The LED product range.
 *
 * Every screen in the venue is one of these. They all share the same material
 * and the same media pipeline, so a curved wall, a floor tile and a corner
 * illusion are the same object with different geometry — which is what makes
 * the whole gallery buildable, and maintainable.
 */

type Vec3 = [number, number, number];

interface BaseProps {
  media: string;
  position?: Vec3;
  rotation?: Vec3;
  /** pixel pitch in mm */
  pitch?: number;
  brightness?: number;
  tint?: string;
  /** metres — how far away the screen still deserves frame-rate updates */
  range?: number;
  /** show the physical frame behind the emitters */
  frame?: boolean;
  /** cast a coloured point light into the room */
  spill?: number;
  spillColor?: string;
}

/* ── shared plumbing ───────────────────────────────────── */

/**
 * `opts` describes a fixed physical panel, but it is rebuilt on every render.
 * This signature is what actually decides whether a new material is needed, so
 * the shader is compiled once per screen rather than once per frame.
 */
function ledKey(o: LEDOptions) {
  return [
    o.width, o.height, o.pitch, o.cabinet, o.brightness, o.tint, o.dot, o.doubleSided,
    o.swap, o.flip?.[0], o.flip?.[1], o.flat, o.fit, o.wrapX, o.mirrorX,
    o.repeat?.[0], o.repeat?.[1], o.offset?.[0], o.offset?.[1],
  ].join("|");
}

function useLED(
  media: string,
  meshRef: React.RefObject<THREE.Mesh | null>,
  opts: LEDOptions,
  range: number,
) {
  const texture = useScreenTexture(media, meshRef, range);
  // The manifest may trim a surface's output — a panel a metre from the camera
  // and a wall forty metres away are not run at the same level in a real
  // venue, and that decision belongs with the content, not with the geometry.
  const trim = useMedia().trim(media);
  opts = { ...opts, brightness: (opts.brightness ?? 1) * trim };
  const descriptor = MEDIA[media];
  const isBrand = descriptor?.kind === "canvas" && ["wordmark", "brandFascia"].includes(descriptor.painter);
  if (isBrand) opts = { ...opts, brightness: 1, flat: true, dot: 0 };
  const key = ledKey(opts);
  const material = useMemo(() => {
    const result = createLEDMaterial(texture, opts);
    result.toneMapped = !isBrand;
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers every field of `opts`
  }, [texture, key, isBrand]);
  const reduced = useVenue((s) => s.reducedMotion);
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = reduced ? 0 : clock.elapsedTime;
    const descriptor = MEDIA[media];
    const motion = descriptor?.kind === "image" ? descriptor.motion : undefined;
    material.uniforms.uMotion.value = !reduced && descriptor?.kind === "image" && !motion && !media.startsWith("av-") ? 1 : 0;
    material.uniforms.uFlow.value = motion === "ribbon" ? 1 : motion === "waterfall" ? 2 : motion === "still" ? 3 : 0;
    const image = texture.image as { width?: number; height?: number } | undefined;
    if (opts.fit && MEDIA[media]?.kind === "image" && image?.width && image?.height) {
      const ratio = (opts.width / opts.height) / (image.width / image.height);
      material.uniforms.uFit.value.set(Math.min(1, ratio), Math.min(1, 1 / ratio));
    }
  });
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

/**
 * Screens power on as the venue comes alive, and dim for the finale.
 * `override` may be a function so a screen can follow the journey frame by
 * frame (the finale crossfade) without re-rendering React sixty times a second.
 */
export type Power = number | (() => number);

/**
 * A dark LED panel is still an opaque object. Screens that crossfade — the
 * finale taking over the main wall, the contact wall taking over from the
 * finale — must leave the scene entirely when they are off, or they sit in
 * front of the wall they are fading into and black it out.
 */
function usePowerState(
  material: THREE.ShaderMaterial,
  override?: Power,
  hideRef?: React.RefObject<THREE.Object3D | null>,
) {
  const entered = useVenue((s) => s.entered);
  useFrame((_, dt) => {
    const o = typeof override === "function" ? override() : override;
    // The house dip during a stage-mode cue. It is what hides the content
    // swap: by the time the new package is loaded the panels are almost dark.
    const dip = 1 - show.cue * 0.86;
    const target = (o ?? (entered ? 1 : 0.22)) * dip;
    const u = material.uniforms.uOn;
    // Falling fast and recovering slowly reads as a rig responding to a cue.
    u.value += (target - u.value) * Math.min(1, dt * (target < u.value ? 7 : 2.4));

    if (hideRef?.current) {
      const visible = u.value > 0.015;
      if (hideRef.current.visible !== visible) hideRef.current.visible = visible;
    }
  });
}

function Spill({
  intensity,
  color,
  distance,
  offset = 1.2,
}: {
  intensity: number;
  color: string;
  distance: number;
  offset?: number;
}) {
  const quality = useVenue((s) => s.quality);
  if (quality === "low") return null;
  return (
    <LocalPointLight
      position={[0, 0, offset]}
      intensity={intensity}
      color={color}
      distance={distance}
      decay={2}
    />
  );
}

/* ── flat panel ────────────────────────────────────────── */

export interface ScreenProps extends BaseProps {
  width: number;
  height: number;
  /** slice of the source texture: [repeatX, repeatY, offsetX, offsetY] */
  uv?: [number, number, number, number];
  /** 0..1 forced power state, or a per-frame function (finale, dark stage) */
  power?: Power;
  cabinet?: number;
  dot?: number;
  /** sample the content with u/v exchanged — long surfaces, tunnel walls */
  swap?: boolean;
  flip?: [boolean, boolean];
  /** no off-axis falloff — for panels whose neighbours sit at another angle */
  flat?: boolean;
  wrapX?: boolean;
  mirrorX?: boolean;
  /**
   * A lit reveal around the panel edge, as a colour.
   *
   * This is set architecture, not a cabinet join. A stage built from discrete
   * panels reads as *designed* when each one is outlined in light and as a
   * pile of rectangles when it is not — which is why every real multi-screen
   * set does it. It is never used on a continuous surface, where an outline
   * would be exactly the fault the venue is claiming not to have.
   */
  edge?: string;
  edgeWidth?: number;
}

export function Screen({
  media,
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 3.9,
  brightness = 1,
  tint,
  range = 70,
  frame = true,
  spill = 0,
  spillColor = "#8fb9b2",
  uv,
  power,
  cabinet,
  dot,
  swap,
  flip,
  flat,
  wrapX,
  mirrorX,
  edge,
  edgeWidth = 0.09,
}: ScreenProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const material = useLED(
    media,
    mesh,
    {
      width,
      height,
      pitch,
      brightness,
      tint,
      cabinet,
      dot,
      swap,
      flip,
      flat,
      wrapX,
      mirrorX,
      fit: !uv,
      repeat: uv ? [uv[0], uv[1]] : [1, 1],
      offset: uv ? [uv[2], uv[3]] : [0, 0],
    },
    range,
  );
  // Only crossfading screens are allowed to disappear; a permanently dimmed
  // panel is still part of the room.
  usePowerState(material, power, typeof power === "function" ? group : undefined);

  return (
    <group ref={group} position={position} rotation={rotation}>
      {frame && (
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[width + 0.05, height + 0.05, 0.11]} />
          <meshStandardMaterial color="#0b0e0f" roughness={0.62} metalness={0.75} />
        </mesh>
      )}
      {edge && (
        <mesh position={[0, 0, -0.012]}>
          <planeGeometry args={[width + edgeWidth * 2, height + edgeWidth * 2]} />
          <meshBasicMaterial color={edge} toneMapped />
        </mesh>
      )}
      <mesh ref={mesh} material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      {spill > 0 && <Spill intensity={spill} color={spillColor} distance={Math.max(width, height) * 3.2} />}
    </group>
  );
}

/* ── curved wall ───────────────────────────────────────── */

export interface CurvedScreenProps extends BaseProps {
  radius: number;
  /** arc in radians */
  arc: number;
  height: number;
  /** face the concave side (true) or the convex side */
  inward?: boolean;
  segments?: number;
  flip?: [boolean, boolean];
  uv?: [number, number, number, number];
  /** Reflect the outer artwork crop into the return, without a hard UV seam. */
  mirrorX?: boolean;
}

export function CurvedScreen({
  media,
  radius,
  arc,
  height,
  inward = true,
  segments = 48,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 5.2,
  brightness = 1,
  tint,
  range = 70,
  spill = 0,
  spillColor = "#8fb9b2",
  flip,
  uv,
  mirrorX,
}: CurvedScreenProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useLED(
    media,
    mesh,
    { width: radius * arc, height, pitch, brightness, tint, cabinet: 0.5, doubleSided: true, flip, mirrorX,
      repeat:uv?[uv[0],uv[1]]:[1,1],offset:uv?[uv[2],uv[3]]:[0,0] },
    range,
  );
  usePowerState(material);

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={mesh} material={material} rotation={[0, inward ? 0 : Math.PI, 0]}>
        <cylinderGeometry
          args={[radius, radius, height, segments, 1, true, -arc / 2, arc]}
        />
      </mesh>
      {spill > 0 && (
        <LocalPointLight position={[0, 0, 0]} intensity={spill} color={spillColor} distance={radius * 4} decay={2} />
      )}
    </group>
  );
}

/* ── full cylinder ─────────────────────────────────────── */

export function CylinderScreen({
  media,
  radius,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 6.9,
  brightness = 1,
  tint,
  range = 70,
  spill = 0,
  spillColor = "#c49a62",
  segments = 56,
  mirrorArtwork = false,
}: BaseProps & { radius: number; height: number; segments?: number; mirrorArtwork?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useLED(
    media,
    mesh,
    { width: 2 * Math.PI * radius, height, pitch, brightness, tint, cabinet: 0.5,
      wrapX: MEDIA[media]?.kind === "image", mirrorX: mirrorArtwork, repeat: [mirrorArtwork ? 2 : 1, 1] },
    range,
  );
  usePowerState(material);

  return (
    <group position={position} rotation={rotation}>
      {/* rigging cap + base so the cylinder reads as a hung product */}
      <mesh position={[0, height / 2 + 0.06, 0]}>
        <cylinderGeometry args={[radius + 0.04, radius + 0.04, 0.12, segments]} />
        <meshStandardMaterial color="#0d1112" roughness={0.5} metalness={0.85} />
      </mesh>
      <mesh position={[0, -height / 2 - 0.06, 0]}>
        <cylinderGeometry args={[radius + 0.04, radius + 0.04, 0.12, segments]} />
        <meshStandardMaterial color="#0d1112" roughness={0.5} metalness={0.85} />
      </mesh>
      <mesh ref={mesh} material={material}>
        <cylinderGeometry args={[radius, radius, height, segments, 1, true]} />
      </mesh>
      {spill > 0 && (
        <LocalPointLight intensity={spill} color={spillColor} distance={radius * 8} decay={2} />
      )}
    </group>
  );
}

/* ── suspended ring ────────────────────────────────────── */

export function RingScreen({
  media,
  radius,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 8,
  brightness = 1.1,
  tint,
  range = 90,
  spill = 0,
  spillColor = "#7fb3aa",
  segments = 64,
  inward = false,
  repeats = 4,
  mirrorArtwork = false,
}: BaseProps & { radius: number; height: number; segments?: number; inward?: boolean; repeats?: number; mirrorArtwork?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useLED(
    media,
    mesh,
    { width: 2 * Math.PI * radius, height, pitch, brightness, tint, cabinet: 0.6, doubleSided: true,
      wrapX: MEDIA[media]?.kind === "image", mirrorX: mirrorArtwork,
      repeat: MEDIA[media]?.kind === "image" ? [repeats * (mirrorArtwork ? 2 : 1),1] : [1,1] },
    range,
  );
  usePowerState(material);

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={mesh} material={material} rotation={[0, inward ? Math.PI : 0, 0]}>
        <cylinderGeometry args={[radius, radius, height, segments, 1, true]} />
      </mesh>
      {/* hang points */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * radius, height / 2 + 1.6, Math.sin(a) * radius]}>
            <cylinderGeometry args={[0.018, 0.018, 3.2, 6]} />
            <meshStandardMaterial color="#14181a" roughness={0.45} metalness={0.9} />
          </mesh>
        );
      })}
      {spill > 0 && <LocalPointLight intensity={spill} color={spillColor} distance={radius * 6} decay={2} />}
    </group>
  );
}

/* ── anamorphic 90° corner ─────────────────────────────── */

export interface CornerProjector {
  position: Vec3;
  look: Vec3;
  fov: number;
  aspect: number;
  /** Projected LED bounds: left, bottom, width, height in the hero frame. */
  bounds: [number, number, number, number];
}

/** One fixed perspective field sampled by both physical faces of an LED fold. */
export function ProjectedCornerScreen({media,leftWidth,rightWidth,height,bottom,projector,
  position=[0,0,0],uv=[1,1,0,0],leftCutout}:{
  media:string;leftWidth:number;rightWidth:number;height:number;bottom:number;
  projector:CornerProjector;position?:Vec3;uv?:[number,number,number,number];
  /** The studio occupies this lower left opening; it contains no LED panel. */
  leftCutout?:{right:number;top:number};
}) {
  const mesh=useRef<THREE.Mesh>(null);
  const material=useLED(media,mesh,{width:leftWidth+rightWidth,height,pitch:1.2,
    brightness:1,flat:true,repeat:[uv[0],uv[1]],offset:[uv[2],uv[3]]},100);
  const cutRight=leftCutout?.right,cutTop=leftCutout?.top;
  const geometry=useMemo(()=>{
    const g=new THREE.BufferGeometry();
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
    const quad=(corners:Vec3[],coords:number[])=>{
      const start=positions.length/3;
      corners.forEach(p=>positions.push(...p));uvs.push(...coords);
      indices.push(start,start+1,start+2,start,start+2,start+3);
    };
    const left=(x0:number,x1:number,y0:number,y1:number)=>quad(
      [[x0,y0,0],[x1,y0,0],[x1,y1,0],[x0,y1,0]],
      [(x0+leftWidth)/leftWidth*.5,(y0-bottom)/height,(x1+leftWidth)/leftWidth*.5,(y0-bottom)/height,
        (x1+leftWidth)/leftWidth*.5,(y1-bottom)/height,(x0+leftWidth)/leftWidth*.5,(y1-bottom)/height]);
    if(cutRight!==undefined&&cutTop!==undefined){
      left(-leftWidth,0,cutTop,bottom+height);
      left(cutRight,0,bottom,cutTop);
    }else left(-leftWidth,0,bottom,bottom+height);
    quad([[0,bottom,0],[0,bottom,-rightWidth],[0,bottom+height,-rightWidth],[0,bottom+height,0]],
      [.5,0,1,0,1,1,.5,1]);
    g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
    g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
    return g;
  },[leftWidth,rightWidth,height,bottom,cutRight,cutTop]);
  useMemo(()=>{
    const camera=new THREE.PerspectiveCamera(projector.fov,projector.aspect,.1,400);
    camera.position.set(...projector.position);camera.lookAt(...projector.look);camera.updateMatrixWorld();
    material.uniforms.uProjector={value:new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)};
    material.uniforms.uProjectorBounds={value:new THREE.Vector4(...projector.bounds)};
    if(material.userData.fixedCornerProjection) return;
    material.userData.fixedCornerProjection=true;
    material.vertexShader=material.vertexShader
      .replace("varying vec2 vUv;","varying vec2 vUv;\nuniform mat4 uProjector;\nvarying vec4 vSourceClip;")
      .replace("vUv = uv;","vUv = uv;\nvSourceClip = uProjector * modelMatrix * vec4(position, 1.0);");
    material.fragmentShader=material.fragmentShader
      .replace("varying vec2 vUv;","varying vec2 vUv;\nvarying vec4 vSourceClip;\nuniform vec4 uProjectorBounds;")
      .replace("vec2 src = mix(vUv, vUv.yx, uSwap);",`vec2 hero = vSourceClip.xy / vSourceClip.w * .5 + .5;
        vec2 src = (hero - uProjectorBounds.xy) / uProjectorBounds.zw;`)
      .replace("vec3 content = texture2D(uMap, uv).rgb;",`// Only the lake moves; the sculptural head stays anchored to the mark.
        float lake = 1.0 - smoothstep(.03, .24, uv.y);
        vec2 ripple = lake * vec2(.0014*sin(uv.y*100.0+phase*4.0),.001*sin(uv.x*80.0-phase*3.0));
        vec3 content = texture2D(uMap, uv+ripple).rgb;`);
    material.needsUpdate=true;
  },[material,projector]);
  usePowerState(material);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh ref={mesh} position={position} geometry={geometry} material={material}/>;
}

/**
 * Two panels folded at 90°, each carrying half of a single image rendered from
 * the viewer's position. The fold supplies the geometry the illusion needs, so
 * from the intended standing point the content reads as a volume cut into the
 * building rather than a picture stuck on it.
 */
export function CornerScreen({
  media,
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 2.9,
  brightness = 1.05,
  range = 70,
  spill = 0,
  spillColor = "#b9ab93",
}: BaseProps & { width: number; height: number }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Left leaf — runs away from the corner along -X.
          `frame` is off on both leaves and that is not a detail. A framed
          Screen carries a backing box 25 mm wider than the panel on each side;
          folded at 90 deg, each leaf's box therefore protruded 25 mm past the
          fold and stood 110 mm proud of its neighbour's emitter plane. The
          result was a dark vertical bar straight down the middle of the
          illusion — the visible line in the anamorphic screen. The structure
          the leaves need is already there: the two building faces behind them.
          `flat` removes the other half of the problem, the brightness step
          between two surfaces the viewer necessarily sees at two angles. */}
      <Screen
        media={media}
        width={width}
        height={height}
        uv={[0.5, 1, 0, 0]}
        position={[-width / 2, height / 2, 0]}
        pitch={pitch}
        brightness={brightness}
        range={range}
        frame={false}
        flat
        spill={spill}
        spillColor={spillColor}
      />
      {/* right leaf — folds back along -Z */}
      <Screen
        media={media}
        width={width}
        height={height}
        uv={[0.5, 1, 0.5, 0]}
        position={[0, height / 2, -width / 2]}
        rotation={[0, Math.PI / 2, 0]}
        pitch={pitch}
        brightness={brightness}
        range={range}
        frame={false}
        flat
      />
      {/* floor return, so the volume looks like it stands on something */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-width / 2, 0.01, -width / 2]} receiveShadow>
        <planeGeometry args={[width * 1.6, width * 1.6]} />
        <meshStandardMaterial color="#0a0d0e" roughness={0.32} metalness={0.2} />
      </mesh>
    </group>
  );
}

/* ── LED bar counter ───────────────────────────────────── */

export function BarScreen({
  media,
  width,
  height = 1.05,
  depth = 0.7,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pitch = 3.9,
  brightness = 0.95,
  range = 50,
  spill = 1.4,
  spillColor = "#7fd3c6",
}: BaseProps & { width: number; height?: number; depth?: number }) {
  return (
    <group position={position} rotation={rotation}>
      {/* worktop */}
      <mesh position={[0, height + 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.18, 0.06, depth + 0.16]} />
        <meshStandardMaterial color="#15181a" roughness={0.28} metalness={0.65} />
      </mesh>
      {/* carcass */}
      <mesh position={[0, height / 2, -0.06]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#0a0d0e" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* LED fascia */}
      <Screen
        media={media}
        width={width}
        height={height - 0.14}
        position={[0, (height - 0.14) / 2 + 0.06, depth / 2 - 0.05]}
        pitch={pitch}
        brightness={brightness}
        range={range}
        frame={false}
        spill={spill}
        spillColor={spillColor}
      />
      {/* back bar shelf catches the spill */}
      <mesh position={[0, height + 0.5, -depth * 0.9]}>
        <boxGeometry args={[width * 0.9, 0.04, 0.3]} />
        <meshStandardMaterial color="#12161a" roughness={0.4} metalness={0.7} />
      </mesh>
    </group>
  );
}

/* ── projection surface ────────────────────────────────── */

export function ProjectionSurface({
  media,
  width,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  brightness = 0.9,
  range = 80,
}: BaseProps & { width: number; height: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useScreenTexture(media, mesh, range);
  const material = useMemo(() => createProjectionMaterial(texture, brightness), [texture, brightness]);
  useEffect(() => () => material.dispose(), [material]);
  usePowerState(material);
  return (
    <mesh ref={mesh} material={material} position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
    </mesh>
  );
}
