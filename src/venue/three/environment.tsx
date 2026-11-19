"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { AreaPanel } from "./areaPanel";
import { createTechnicalEnvironment } from "./technicalEnvironment";
import { createProjectionEnvironment } from "./projectionEnvironment";
import { createRental2026Environment } from "./rental2026Environment";
import { inRental2026, rental2026World } from "../data/ledRental2026";
import { journey, show } from "../systems/journey";
import { useEntranceFinishes } from "../systems/entranceFinishes";
import { zoneAt } from "../data/zones";
import { VENUE_PAVILIONS } from "../data/pavilions";
import { PROJECTION_SCALE, projectionWorldPosition, inProjectionShowcase } from "../data/projection";
import { grandWorld } from "../data/grand";
import { EXHIBITION_PROGRESS as EP, inExhibitionRange, transformOldWorldToNew, type InstallationId } from "../data/placements";

/** Image-based fill strength in the shared hall (stalls set their own). */
const HOUSE_ENVIRONMENT = .45;

/**
 * Lighting and reflection environment.
 *
 * A dark venue lives or dies on how metal and glass respond, so the scene gets
 * a real (if small) environment map — generated procedurally, so nothing is
 * downloaded. Direct light is deliberately scarce: a handful of fixtures that
 * travel with the camera and are re-coloured per zone, rather than hundreds of
 * static lights the GPU would have to evaluate everywhere at once.
 */

export function VenueEnvironment() {
  const { gl, scene } = useThree();
  const environments = useRef<{ regular: THREE.Texture; technical: THREE.Texture; rental:THREE.Texture; projection:THREE.Texture } | null>(null);

  useEffect(() => {
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(gl);
    const rt = pmrem.fromScene(room, 0.04);
    const technical = createTechnicalEnvironment(gl);
    const projection=createProjectionEnvironment(gl);
    const rental=createRental2026Environment(gl);
    environments.current = { regular: rt.texture, technical: technical.texture, rental:rental.texture, projection:projection.texture };
    scene.environment = rt.texture;
    scene.environmentIntensity = HOUSE_ENVIRONMENT;
    // The public floor belongs to the hall. Keep its indirect material
    // response on one house environment while exhibits retain local IBLs.
    // Its planar buffer still reflects the actual scene and emitting screens.
    const floorMaterials:THREE.MeshStandardMaterial[]=[];
    scene.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||!object.userData.venuePlanarReflection)return;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        if(!(material instanceof THREE.MeshStandardMaterial))continue;
        material.envMap=rt.texture;material.needsUpdate=true;floorMaterials.push(material);
      }
    });
    room.dispose();
    pmrem.dispose();
    return () => {
      scene.environment = null;
      for(const material of floorMaterials){material.envMap=null;material.needsUpdate=true;}
      environments.current = null;
      rt.dispose();
      technical.dispose();
      projection.dispose();
      rental.dispose();
    };
  }, [gl, scene]);

  useFrame((_, dt) => {
    const maps = environments.current;
    if (!maps) return;
    const technical = inExhibitionRange("technical",journey.progress);
    const projection=inProjectionShowcase(journey.progress);
    const rental=inRental2026(journey.progress);
    const texture = technical ? maps.technical : rental ? maps.rental : projection ? maps.projection : maps.regular;
    if (scene.environment !== texture) scene.environment = texture;
    // The house environment is a soft, even fill: enough for gloss, glaze and
    // wet surfaces to read, without lifting the dark room into flat grey.
    scene.environmentIntensity = THREE.MathUtils.damp(scene.environmentIntensity, technical ? .68 : rental ? .62 : projection ? .70 : HOUSE_ENVIRONMENT, 4, Math.min(dt, .1));
  }, -4);

  return null;
}

/* ── the travelling light rig ──────────────────────────── */

interface ZoneLight {
  /** key light colour */
  key: string;
  /** fill colour */
  fill: string;
  keyI: number;
  fillI: number;
  /** ambient level */
  amb: number;
  fog: string;
  fogDensity: number;
}

const LOOKS: Record<string, ZoneLight> = {
  arrival: { key: "#fff1dc", fill: "#e6eff3", keyI: 35, fillI: 22, amb: .2, fog: "#10191d", fogDensity: 0.002 },
  tunnel: { key: "#fff1dc", fill: "#e6eff3", keyI: 35, fillI: 22, amb: .2, fog: "#10191d", fogDensity: 0.002 },
  hall: { key: "#c6d2d4", fill: "#557880", keyI: 64, fillI: 44, amb: 0.58, fog: "#070c0e", fogDensity: 0.0038 },
  gallery: { key: "#d2c4a8", fill: "#56787f", keyI: 60, fillI: 42, amb: 0.57, fog: "#070c0e", fogDensity: 0.004 },
  reception: { key: "#ddd3c4", fill: "#7d89aa", keyI: 58, fillI: 38, amb: .34, fog: "#080b12", fogDensity: .0038 },
  "gallery-finish": { key: "#e0d1bd", fill: "#87939f", keyI: 54, fillI: 35, amb: .34, fog: "#090b0e", fogDensity: .0036 },
  technical: { key: "#f4dfc6", fill: "#a8bacd", keyI: 24, fillI: 16, amb: .16, fog: "#090c11", fogDensity: .0027 },
  boulevard: { key: "#c6cdd0", fill: "#5a7884", keyI: 58, fillI: 40, amb: 0.55, fog: "#060b0d", fogDensity: 0.0044 },
  approach: { key: "#e8c08c", fill: "#587a86", keyI: 60, fillI: 40, amb: 0.52, fog: "#060a0c", fogDensity: 0.0048 },
  arena: { key: "#c6d2d8", fill: "#4c6f7a", keyI: 54, fillI: 38, amb: 0.42, fog: "#04080a", fogDensity: 0.0042 },
  stage: { key: "#d6e0e4", fill: "#50727e", keyI: 48, fillI: 34, amb: 0.36, fog: "#04080a", fogDensity: 0.0042 },
  finale: { key: "#aebec4", fill: "#3a5860", keyI: 24, fillI: 18, amb: 0.2, fog: "#020607", fogDensity: 0.0056 },
  contact: { key: "#a0b4ba", fill: "#355058", keyI: 22, fillI: 16, amb: 0.19, fog: "#020607", fogDensity: 0.0056 },
};

const FESTIVAL_OVERRIDE: Partial<ZoneLight> = {
  key: "#b678e0",
  fill: "#d4643f",
  keyI: 34,
  fillI: 26,
  amb: 0.34,
  fog: "#0a0410",
  fogDensity: 0.0038,
};
const PROJECTION_LOOK:ZoneLight={key:"#ffe6c7",fill:"#cedde9",keyI:82,fillI:46,amb:.16,fog:"#101820",fogDensity:.0008/PROJECTION_SCALE};
const PROJECTION_LIGHT_POWER=PROJECTION_SCALE*PROJECTION_SCALE;
const RENTAL2026_LOOK:ZoneLight={key:"#ffe5c7",fill:"#e1e7ed",keyI:92,fillI:48,amb:.17,fog:"#10161e",fogDensity:.0011};

/**
 * Stalls need their own light, but nine point lights would be evaluated by
 * every shader in the venue. One fixture that moves to whichever pavilion the
 * visitor is closest to costs the same as one light and reads as nine.
 */
const BASELINE_FEATURES:Record<string,{id:InstallationId;z:number;side:number}>={
  "av-engineering":{id:"S3",z:-134,side:-1},"show-control":{id:"S3",z:-142,side:-1},
  "live-production":{id:"S3",z:-150,side:-1},"led-solutions":{id:"S2",z:-168,side:-1},
  spatial:{id:"S4",z:-187,side:1},
};
const STALLS = VENUE_PAVILIONS.map(p=>{
  const original=BASELINE_FEATURES[p.id],x=original.side*12.5;
  return {p:p.p,position:transformOldWorldToNew(original.id,[x*.65,10.5,original.z+2]),
    target:transformOldWorldToNew(original.id,[x,0,original.z-1])};
});

const _blend: ZoneLight = { ...LOOKS.arena };
const HOUSE_BACKGROUND = new THREE.Color("#05090a");
function blendLook(base: ZoneLight, over: Partial<ZoneLight>, f: number): ZoneLight {
  _blend.key = f > 0.5 ? (over.key ?? base.key) : base.key;
  _blend.fill = f > 0.5 ? (over.fill ?? base.fill) : base.fill;
  _blend.keyI = base.keyI + ((over.keyI ?? base.keyI) - base.keyI) * f;
  _blend.fillI = base.fillI + ((over.fillI ?? base.fillI) - base.fillI) * f;
  _blend.amb = base.amb + ((over.amb ?? base.amb) - base.amb) * f;
  _blend.fog = f > 0.5 ? (over.fog ?? base.fog) : base.fog;
  _blend.fogDensity = base.fogDensity + ((over.fogDensity ?? base.fogDensity) - base.fogDensity) * f;
  return _blend;
}

export function LightRig() {
  const scene = useThree((s) => s.scene);
  const stallRef = useRef<THREE.SpotLight>(null);
  const keyRef = useRef<THREE.PointLight>(null);
  const fillRef = useRef<THREE.PointLight>(null);
  const rimRef = useRef<THREE.PointLight>(null);
  const ambRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const cachedShadow = useRef<"entrance"|"technical"|"projection"|"rental2026"|null>(null);
  const technicalAreas = useMemo(() => {
    // Soft panels rendered as calibrated spot lights; see areaPanel.ts for why
    // these are no longer RectAreaLights (first-visit shader compile time).
    const canopy = new AreaPanel("#ffe7c6", 0, 24, 1.8);
    canopy.position.set(-8.6, 5.85, -142); canopy.up.set(1, 0, 0); canopy.lookAt(-6.2, .1, -142);
    const reception = new AreaPanel("#edf2ff", 0, 5.6, 2.6);
    reception.position.set(4.4, 3.4, -144.9); reception.lookAt(.6, 1, -144.9);
    // Fixed down-facing emitters light the recessed gallery bays without a
    // point source shining back into its own nearby black soffit.
    const galleries=[{x:-8.72,width:3.4},{x:8.72,width:3.4}].map(({x,width})=>{
      const light=new AreaPanel("#ffe5c6",0,width,2.6);
      light.position.set(...projectionWorldPosition([x,10.9,2.1]));
      light.up.set(1,0,0);light.lookAt(...projectionWorldPosition([x,.12,.8]));
      return light;
    });
    const rentalFascia=new AreaPanel("#f2e8da",0,24,3);
    rentalFascia.position.set(...rental2026World([-2,12,14]));
    rentalFascia.lookAt(...rental2026World([0,9.8,4.7]));
    const projectionFascia=new AreaPanel("#eee4d6",0,22,2.2);
    projectionFascia.position.set(...projectionWorldPosition([0,14,13]));
    projectionFascia.lookAt(...projectionWorldPosition([0,11.6,7.4]));
    return [canopy, reception,...galleries,rentalFascia,projectionFascia];
  }, []);
  useEffect(() => () => technicalAreas.forEach(light => light.dispose()), [technicalAreas]);
  const authoredAreas=useMemo(()=>technicalAreas.map(light=>({position:light.position.clone(),quaternion:light.quaternion.clone(),aim:light.aim.clone(),width:light.width,height:light.height,color:light.color.clone()})),[technicalAreas]);

  const cur = useRef({
    key: new THREE.Color(LOOKS.arrival.key),
    fill: new THREE.Color(LOOKS.arrival.fill),
    keyI: LOOKS.arrival.keyI,
    fillI: LOOKS.arrival.fillI,
    amb: LOOKS.arrival.amb,
    fog: new THREE.Color(LOOKS.arrival.fog),
    fogDensity: LOOKS.arrival.fogDensity,
  });
  const targetKey = useMemo(() => new THREE.Color(), []);
  const targetFill = useMemo(() => new THREE.Color(), []);
  const targetFog = useMemo(() => new THREE.Color(), []);

  const fog = useMemo(() => new THREE.FogExp2(LOOKS.arrival.fog, LOOKS.arrival.fogDensity), []);
  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  useFrame(({ camera, clock }, dt) => {
    const d = Math.min(0.1, dt);
    const zone = zoneAt(journey.progress);
    const entranceActive=journey.progress<.285;
    const entranceNeutral=useEntranceFinishes.getState().mode==="neutral";
    for(let i=2;i<6;i++){
      const light=technicalAreas[i],authored=authoredAreas[i];
      light.position.copy(authored.position);light.quaternion.copy(authored.quaternion);light.aim.copy(authored.aim);
      light.width=authored.width;light.height=authored.height;light.color.copy(authored.color);
    }
    const technicalBlend = THREE.MathUtils.smoothstep(journey.progress, EP.technical.start, EP.technical.start+.012)
      * (1 - THREE.MathUtils.smoothstep(journey.progress, EP.technical.end-.007, EP.technical.end));
    const projection=inProjectionShowcase(journey.progress);
    const rental=inRental2026(journey.progress);
    const studioActive=inExhibitionRange("anamorphic",journey.progress);
    // Area lights remain registered in every zone; only output varies.
    technicalAreas[2].intensity=projection?3.6:0;
    technicalAreas[3].intensity=projection?3.6:0;
    // A broad outward hall softbox reveals the folded black fascia's satin
    // highlights, independently of the lower interior ceiling practicals.
    technicalAreas[4].intensity=rental?3.5:0;
    technicalAreas[5].intensity=projection?2.0:0;
    if(entranceActive){
      const [canopy,reception]=technicalAreas;
      canopy.position.set(-5,15,2);canopy.lookAt(0,6,-14.4);
      canopy.width=22;canopy.height=7;canopy.color.set("#fff2df");canopy.intensity=entranceNeutral?3:2.2;
      reception.position.set(0,7.65,-19.5);reception.lookAt(0,0,-19.5);
      reception.width=15;reception.height=9;reception.color.set(entranceNeutral?"#f0eeea":"#5db8a2");reception.intensity=entranceNeutral?1.4:useEntranceFinishes.getState().mode==="calm"?.35:.65;
      // L03 paired flute grazers, L06 neutral landing: reuse existing light slots.
      for(let i=2;i<4;i++){const side=i===2?-1:1;const light=technicalAreas[i];
        light.position.set(side*10.8,7,-12.5);light.lookAt(side*10.8,4,-14.9);
        light.width=.65;light.height=5;light.color.set(entranceNeutral?"#f0eeea":"#ffd2a0");light.intensity=2.8;}
      technicalAreas[4].position.set(0,7,-27);technicalAreas[4].lookAt(0,0,-31);
      technicalAreas[4].width=15;technicalAreas[4].height=6;technicalAreas[4].color.set("#e5e3da");technicalAreas[4].intensity=2.4;
      technicalAreas[5].position.set(0,9,-11);technicalAreas[5].lookAt(0,10,-14.6);
      technicalAreas[5].width=15;technicalAreas[5].height=1.5;technicalAreas[5].color.set("#f0f0e9");technicalAreas[5].intensity=.7;
    }else if(projection){
      const [canopy,reception]=technicalAreas;
      // Positions use the same authored booth space as its scaled architecture.
      // Area intensity is luminance; enlarging its physical emitter preserves it.
      canopy.position.set(...projectionWorldPosition([0,10.95,-.7]));
      canopy.lookAt(...projectionWorldPosition([0,.3,-.65]));
      canopy.width=18.8;canopy.height=11.5;
      canopy.color.set("#ffe6c9");canopy.intensity=2.2;
      reception.position.set(...projectionWorldPosition([-2,7.4,10]));
      reception.lookAt(...projectionWorldPosition([0,1.9,0]));
      reception.width=18;reception.height=4.5;
      reception.color.set("#e1ebf2");reception.intensity=1.4;
    }else if(rental){
      const [canopy,reception]=technicalAreas;
      // Native 8.413 m practical optics sit below the open truss. The broad
      // bounce stays below that rig too, leaving the black crown substantial.
      canopy.position.set(...rental2026World([0,8.36,-.4]));canopy.lookAt(...rental2026World([0,.12,-.8]));
      canopy.width=18.8;canopy.height=8.8;canopy.color.set("#ffe6cb");canopy.intensity=3.0;
      reception.position.set(...rental2026World([5.7,4.9,8.9]));reception.lookAt(...rental2026World([6.8,1.0,3.9]));
      reception.width=8.2;reception.height=2.6;reception.color.set("#f4ebe0");reception.intensity=1.7;
    }else if(studioActive){
      const [canopy,reception]=technicalAreas;
      canopy.position.set(...grandWorld("anamorphic",[-6.2,6.8,-.6]));canopy.lookAt(...grandWorld("anamorphic",[-6.2,.12,-.6]));
      canopy.width=8;canopy.height=11;canopy.color.set("#ffe3bf");canopy.intensity=4.6;
      reception.position.set(...grandWorld("anamorphic",[0,13.3,10]));reception.lookAt(...grandWorld("anamorphic",[0,8.4,0]));
      reception.width=22;reception.height=3;reception.color.set("#e9e0d6");reception.intensity=1.4;
    }else{
      const [canopy,reception]=technicalAreas;
      canopy.position.set(...grandWorld("technical",[0,5.18,.7]));canopy.lookAt(...grandWorld("technical",[0,.12,-1.5]));canopy.width=18.5;canopy.height=8.2;canopy.color.set("#ffe7ce");canopy.intensity=technicalBlend*3.8;
      reception.position.set(...grandWorld("technical",[0,4.6,9]));reception.lookAt(...grandWorld("technical",[0,1.2,3]));reception.width=18;reception.height=3;reception.color.set("#f2e9dd");reception.intensity=technicalBlend*2.6;
    }
    for (const panel of technicalAreas) panel.sync();
    const base = rental ? RENTAL2026_LOOK : projection ? PROJECTION_LOOK : LOOKS[zone.id] ?? LOOKS.hall;
    // Blended, not switched: the room arrives at the festival look across the
    // cue, in step with the screens and the fixtures.
    const inRoom = zone.id === "stage" || zone.id === "arena" || zone.id === "finale";
    const f = inRoom ? show.mode : 0;
    const look = f > 0.001 ? blendLook(base, FESTIVAL_OVERRIDE, f) : base;

    // Finale dims the house — a real venue getting ready for the last cue.
    const finaleFade = zone.id === "finale" || zone.id === "contact" ? 1 : 0;

    targetKey.set(look.key);
    targetFill.set(look.fill);
    targetFog.set(look.fog);
    const k = Math.min(1, d * 1.6);
    cur.current.key.lerp(targetKey, k);
    cur.current.fill.lerp(targetFill, k);
    cur.current.fog.lerp(targetFog, k);
    // The house dips during a cue as well — the screens are not doing it alone.
    const dip = 1 - show.cue * 0.6;
    cur.current.keyI += (look.keyI * (1 - finaleFade * 0.55) * dip - cur.current.keyI) * k;
    cur.current.fillI += (look.fillI * (1 - finaleFade * 0.6) * dip - cur.current.fillI) * k;
    cur.current.amb += (look.amb - cur.current.amb) * k;
    cur.current.fogDensity += (look.fogDensity - cur.current.fogDensity) * k;

    fog.color.copy(cur.current.fog);
    fog.density = cur.current.fogDensity;
    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(journey.progress < .285 ? cur.current.fog : HOUSE_BACKGROUND, k);
    }

    const t = clock.elapsedTime;
    // Lights ride with the camera so the whole 375 m venue is lit by four
    // fixtures. A slow wander keeps the room from ever looking static.
    if (keyRef.current) {
      keyRef.current.color.copy(cur.current.key);
      keyRef.current.intensity = cur.current.keyI * (0.9 + 0.1 * Math.sin(t * 0.5));
      keyRef.current.distance=58*(projection?PROJECTION_SCALE:1);
      keyRef.current.position.set(
        camera.position.x + Math.sin(t * 0.18) * 3.5,
        camera.position.y + 4.4,
        camera.position.z - 7 + Math.sin(t * 0.13) * 1.6,
      );
    }
    if (fillRef.current) {
      fillRef.current.color.copy(cur.current.fill);
      fillRef.current.intensity = cur.current.fillI;
      fillRef.current.distance=44*(projection?PROJECTION_SCALE:1);
      fillRef.current.position.set(
        camera.position.x - Math.sin(t * 0.15) * 5,
        camera.position.y + 1.6,
        camera.position.z - 2.2,
      );
    }
    if (rimRef.current) {
      rimRef.current.color.copy(cur.current.key);
      rimRef.current.intensity = cur.current.keyI * 0.35;
      rimRef.current.distance=34*(projection?PROJECTION_SCALE:1);
      rimRef.current.position.set(camera.position.x, camera.position.y + 2.4, camera.position.z + 6);
    }
    if(projection){
      // Fixed overhead exhibition fixtures: no camera-following floor hotspot
      // or changing metal highlights while the visitor inspects the booth.
      keyRef.current?.position.set(...projectionWorldPosition([-2,10.5,5]));
      fillRef.current?.position.set(...projectionWorldPosition([4.5,9.8,4]));
      rimRef.current?.position.set(...projectionWorldPosition([0,9.6,-3.2]));
      // These emitters retain inverse-square decay, so power follows scale².
      if(keyRef.current)keyRef.current.intensity=PROJECTION_LOOK.keyI*PROJECTION_LIGHT_POWER;
      if(fillRef.current)fillRef.current.intensity=PROJECTION_LOOK.fillI*PROJECTION_LIGHT_POWER;
      if(rimRef.current)rimRef.current.intensity=28*PROJECTION_LIGHT_POWER;
    }
    if(rental){
      // Fixed warm ceiling keys retain stable material highlights while the
      // visitor moves. Blue comes from program displays, not the house fill.
      keyRef.current?.position.set(...rental2026World([-5.4,8.25,5]));
      fillRef.current?.position.set(...rental2026World([6.5,8.15,3.6]));
      rimRef.current?.position.set(...rental2026World([2.3,8.25,-4.8]));
      if(keyRef.current)keyRef.current.intensity=RENTAL2026_LOOK.keyI;
      if(fillRef.current)fillRef.current.intensity=RENTAL2026_LOOK.fillI;
      if(rimRef.current)rimRef.current.intensity=34;
    }
    if(studioActive){
      keyRef.current?.position.set(...grandWorld("anamorphic",[-4,10.3,5]));
      fillRef.current?.position.set(...grandWorld("anamorphic",[6,8.8,4]));
      rimRef.current?.position.set(...grandWorld("anamorphic",[-7,6.6,-4]));
      if(keyRef.current)keyRef.current.intensity=100;
      if(fillRef.current)fillRef.current.intensity=60;
      if(rimRef.current)rimRef.current.intensity=40;
    }
    if(entranceActive){
      keyRef.current?.position.set(-11,10,-6);
      fillRef.current?.position.set(11,9,-10);
      rimRef.current?.position.set(0,7,-27);
      if(keyRef.current)keyRef.current.intensity=35;
      if(fillRef.current)fillRef.current.intensity=22;
      if(rimRef.current)rimRef.current.intensity=45;
    }
    if(technicalBlend>.999){
      keyRef.current?.position.set(...grandWorld("technical",[-7,5.0,3.5]));
      fillRef.current?.position.set(...grandWorld("technical",[7,4.9,3.5]));
      rimRef.current?.position.set(...grandWorld("technical",[0,4.9,-3]));
      if(keyRef.current)keyRef.current.intensity=70;
      if(fillRef.current)fillRef.current.intensity=50;
      if(rimRef.current)rimRef.current.intensity=28;
    }
    // Feature light: snap to the nearest stall, fade with distance.
    if (stallRef.current) {
      const lightScale=projection?PROJECTION_SCALE:1;
      const entrance = journey.progress < .285;
      stallRef.current.distance=entrance?65:28*lightScale;
      stallRef.current.shadow.normalBias=.035*lightScale;
      const shadowCamera=stallRef.current.shadow.camera;
      const shadowFar=entrance?65:28*lightScale;
      if(shadowCamera.near!==.5*lightScale||shadowCamera.far!==shadowFar){
        shadowCamera.near=.5*lightScale;shadowCamera.far=shadowFar;
        shadowCamera.updateProjectionMatrix();
        stallRef.current.shadow.needsUpdate=true;
      }
      let best = STALLS[0];
      let bestD = Infinity;
      for (const st of STALLS) {
        const d = Math.abs(journey.progress - st.p);
        if (d < bestD) {
          bestD = d;
          best = st;
        }
      }
      const near = Math.max(0, 1 - bestD / 0.03);
      stallRef.current.position.set(...best.position);
      stallRef.current.target.position.set(...best.target);
      stallRef.current.target.updateMatrixWorld();
      stallRef.current.color.set("#ffe3ba");
      stallRef.current.intensity = near * 310;
      if (entrance) {
        stallRef.current.position.set(-12,22,3);
        stallRef.current.target.position.set(0,4,-14.4);
        stallRef.current.target.updateMatrixWorld();
        stallRef.current.color.set("#fff7ed");
        stallRef.current.intensity=600;
      }
      const reception = THREE.MathUtils.smoothstep(journey.progress, EP.reception.start, EP.reception.start+.016)
        * (1 - THREE.MathUtils.smoothstep(journey.progress, EP.reception.end-.016, EP.reception.end));
      if (reception > .001) {
        // The same fixed shadow slot becomes the reception's ceiling softbox.
        stallRef.current.position.set(...transformOldWorldToNew("R",[-1.5,11.6,-71.5]));
        stallRef.current.target.position.set(...transformOldWorldToNew("R",[2,0,-78]));
        stallRef.current.target.updateMatrixWorld();
        stallRef.current.intensity = reception * 600;
      }
      const studio = THREE.MathUtils.smoothstep(journey.progress, EP.anamorphic.start, EP.anamorphic.start+.01)
        * (1 - THREE.MathUtils.smoothstep(journey.progress, EP.anamorphic.end-.013, EP.anamorphic.end));
      if (studio > .001) {
        // Warm canopy downlight reaches the floor and furniture through the
        // open entrance rather than washing the outside of the LED cabinet.
        stallRef.current.position.set(...grandWorld("anamorphic",[-6.4,6.4,4.5]));
        stallRef.current.target.position.set(...grandWorld("anamorphic",[-6.4,.2,-2.5]));
        stallRef.current.target.updateMatrixWorld();
        stallRef.current.intensity = studio * 300;
      }
      const technical = technicalBlend;
      if (technical > .001) {
        stallRef.current.position.set(...grandWorld("technical",[0,5.15,3]));
        stallRef.current.target.position.set(...grandWorld("technical",[0,.5,-2.8]));
        stallRef.current.target.updateMatrixWorld();
        stallRef.current.color.set("#fff0dc");
        stallRef.current.intensity = technical * 180;
      }
      if(projection){
        stallRef.current.position.set(...projectionWorldPosition([.2,10.45,2.5]));
        stallRef.current.target.position.set(...projectionWorldPosition([0,.12,-2.8]));
        stallRef.current.target.updateMatrixWorld();
        stallRef.current.color.set("#ffe8c4");
        stallRef.current.intensity=340*PROJECTION_LIGHT_POWER;
      }
      if(rental){
        stallRef.current.position.set(...rental2026World([.05,8.413,.412]));
        stallRef.current.target.position.set(...rental2026World([1,.12,-1.8]));
        stallRef.current.target.updateMatrixWorld();stallRef.current.color.set("#ffe6c9");stallRef.current.intensity=310;
      }
      // Keep the shader's light/shadow counts stable. Zero intensity is dark;
      // toggling visible recompiles every lit material when entering a stand.
      const fixedLight = entrance ? "entrance" : technical > .999 ? "technical" : rental ? "rental2026" : projection ? "projection" : null;
      // The booth, crew and overhead fixture are static. Reuse their depth
      // map once the light arrives; the scrolling camera does not change it.
      if (fixedLight && cachedShadow.current !== fixedLight) stallRef.current.shadow.needsUpdate = true;
      cachedShadow.current = fixedLight;
      stallRef.current.shadow.autoUpdate = !fixedLight && (near > 0.01 || reception > .01 || studio > .01 || technical > .01);
    }

    if (ambRef.current) ambRef.current.intensity = cur.current.amb;
    if (hemiRef.current) {
      hemiRef.current.intensity = cur.current.amb * 2.1;
      hemiRef.current.color.copy(cur.current.fill);
    }
  });

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.14} color="#a6bcc0" />
      {technicalAreas.map(panel => <primitive key={panel.uuid} object={panel.spot} />)}
      <hemisphereLight ref={hemiRef} args={["#9fbcc2", "#201a12", 0.92]} />
      <pointLight ref={keyRef} distance={58} decay={2} intensity={26} />
      <pointLight ref={fillRef} distance={44} decay={2} intensity={14} />
      <pointLight ref={rimRef} distance={34} decay={2} intensity={8} />
      <spotLight ref={stallRef} distance={28} angle={0.85} penumbra={0.65} decay={2}
        intensity={0} castShadow shadow-mapSize={[1024,1024]}
        shadow-bias={-.0002} shadow-normalBias={.035} />
    </>
  );
}

/* ── light pools ───────────────────────────────────────── */

let poolTex: THREE.Texture | null = null;
export function getPoolTexture() {
  if (poolTex) return poolTex;
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.35, "rgba(255,255,255,0.28)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  poolTex = new THREE.CanvasTexture(c);
  poolTex.colorSpace = THREE.SRGBColorSpace;
  return poolTex;
}

/**
 * The pool of light a screen throws onto the floor. An additive decal costs
 * nothing, where a real light would cost every shader in the scene — and at
 * these angles it is indistinguishable.
 */
export function LightPool({
  position,
  rotation = [-Math.PI / 2, 0, 0],
  size = 6,
  color = "#7fd3c6",
  opacity = 0.16,
  pulse = 0,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: number | [number, number];
  color?: string;
  opacity?: number;
  pulse?: number;
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => getPoolTexture(), []);
  const [w, h] = Array.isArray(size) ? size : [size, size];

  useFrame(({ clock }) => {
    if (!mat.current || pulse === 0) return;
    mat.current.opacity = opacity * (1 - pulse + pulse * (0.6 + 0.4 * Math.sin(clock.elapsedTime * 0.9)));
  });

  return (
    <mesh position={position} rotation={rotation} renderOrder={2}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        ref={mat}
        map={tex}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
