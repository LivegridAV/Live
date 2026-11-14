import * as THREE from "three";
import { ANAMORPHIC_VIEW } from "./anamorphic";
import { TECHNICAL_VIEW } from "./technical";
import { PROJECTION_VIEW } from "./projection";
import { RENTAL2026_VIEWS } from "./ledRental2026";
import { PLACEMENTS, transformOldWorldToNew, type InstallationId } from "./placements";

/**
 * The camera path through the venue.
 *
 * The visitor's scroll is a single number 0 → 1; this file turns it into a
 * position, a look-at target and a field of view. Keyframes carry their own
 * `p` (progress) so the *timing* of the walkthrough is authored explicitly —
 * dense keyframes slow the camera down for the moments worth lingering on —
 * while a Catmull-Rom style Hermite interpolation keeps the actual motion
 * curved and continuous, never a sequence of straight lines.
 *
 * World units are metres. The venue runs along -Z, floor at y = 0.
 */

export interface Keyframe {
  /** progress 0 → 1 */
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
}

/** The arena retains its original 61-frame tangent multiplier and boundary neighbours, independent of exhibition edits. */
const ARENA_BASELINE_FRAMES:Keyframe[]=[
  {"p":0.767,"pos":[0,2.2,-228],"look":[0,4,-246],"fov":56},
  {"p":0.789,"pos":[0,2.2,-229],"look":[0,4.8,-249],"fov":56},
  {"p":0.812,"pos":[0,2.05,-237],"look":[0,4.8,-252],"fov":54},
  {"p":0.83,"pos":[0,2.6,-248],"look":[0,8.5,-266],"fov":60},
  {"p":0.846,"pos":[0,3.2,-256],"look":[0,12,-284],"fov":64},
  {"p":0.862,"pos":[0,4.2,-276],"look":[0,11,-338],"fov":56},
  {"p":0.884,"pos":[-2.6,4.6,-288],"look":[0,10,-346],"fov":52},
  {"p":0.906,"pos":[2.2,5,-297],"look":[0,9.4,-350],"fov":48},
  {"p":0.932,"pos":[0,3.5,-297],"look":[0,7.2,-353],"fov":52},
  {"p":0.95,"pos":[0,3.8,-301],"look":[0,7.2,-353],"fov":53},
  {"p":0.968,"pos":[0,6.6,-311],"look":[0,9.2,-353],"fov":42},
  {"p":0.986,"pos":[0,8.2,-307],"look":[0,9.8,-353],"fov":40},
  {"p":1,"pos":[0,7,-309],"look":[0,8.8,-353],"fov":39},
];
export const ARENA_PATH_START=.812;
const FROZEN_CONNECTION_START=.789, ORIGINAL_TANGENT_MULTIPLIER=60, ORIGINAL_ARENA_FRAME_OFFSET=48;
const receptionPosition=transformOldWorldToNew("R",[-1.445,2.448,-64]);
const receptionLook=transformOldWorldToNew("R",[1.05,4.56,-83.79]);
/** Forum positions are tied to installation anchors, never imported pivots. */
const forum=(id:InstallationId,x:number,y:number,offsetZ:number):[number,number,number]=>[x,y,PLACEMENTS[id].root[2]+offsetZ];
const focus=(id:InstallationId,y:number):[number,number,number]=>[PLACEMENTS[id].root[0],y,PLACEMENTS[id].root[2]];


export const KEYFRAMES:Keyframe[]=[
  {p:0,pos:[0,1.7,8],look:[0,5.2,-14.4],fov:52},
  {p:.03,pos:[-.25,1.7,6],look:[0,4.8,-14.4],fov:54},
  {p:.062,pos:[.25,1.7,3],look:[0,4.2,-16],fov:56},
  {p:.095,pos:[.2,1.7,1],look:[0,3.2,-19],fov:54},
  {p:.122,pos:[0,1.7,-5],look:[0,3,-22],fov:56},
  {p:.15,pos:[0,1.7,-12],look:[0,3,-26],fov:62},
  {p:.186,pos:[-.52,1.7,-16.8],look:[.35,3,-30],fov:66},
  {p:.222,pos:[.56,1.7,-20],look:[-.3,2.5,-34],fov:66},
  {p:.256,pos:[-.26,1.7,-24],look:[.16,2.1,-38],fov:64},
  {p:.282,pos:[0,1.7,-27.6],look:[0,2.45,-40],fov:60},
  {p:.3,pos:[0,1.82,-31.5],look:[0,3.3,-44],fov:56},
  {p:.318,pos:forum("P1",0,1.82,6.695),look:focus("P1",6.5),fov:58},
  {p:.34,pos:forum("P1",1.5,1.82,3.695),look:focus("P1",6.5),fov:52},
  {p:.354,pos:forum("P2",0,1.82,.195),look:focus("P2",5.9),fov:52},
  {p:.366,pos:forum("P3",-1.2,1.82,6.695),look:focus("P3",5.3),fov:54},
  {p:.376,pos:forum("P4",-1,1.82,2.195),look:focus("P4",4.8),fov:56},
  {p:.4,pos:forum("R",0,1.82,-6.805),look:focus("R",4.3),fov:60},
  {p:.42,pos:[receptionPosition[0],1.82,receptionPosition[2]],look:receptionLook,fov:64.924},
  {p:.446,pos:receptionPosition,look:receptionLook,fov:64.924},
  {p:.462,pos:receptionPosition,look:receptionLook,fov:64.924},
  {p:.48,pos:forum("R",4,2.1,-9.805),look:focus("R",4),fov:62},
  {p:.5,pos:forum("R",1,2.1,-18.805),look:focus("R",4),fov:58},
  {p:.52,pos:forum("S1",0,2.1,29.15),look:focus("S1",4.5),fov:56},
  {p:.536,pos:forum("S1",0,2.15,6.15),look:focus("S1",5.6),fov:48},
  {p:.552,pos:ANAMORPHIC_VIEW.position,look:ANAMORPHIC_VIEW.look,fov:ANAMORPHIC_VIEW.fov},
  {p:.568,pos:ANAMORPHIC_VIEW.position,look:ANAMORPHIC_VIEW.look,fov:ANAMORPHIC_VIEW.fov},
  {p:.58,pos:forum("S1",-1,2.15,-19.35),look:focus("S1",5.6),fov:44},
  {p:.59,pos:forum("S2",-4,2.4,-13.85),look:focus("S2",5),fov:45},
  {p:.605,pos:RENTAL2026_VIEWS.front.position,look:RENTAL2026_VIEWS.front.look,fov:RENTAL2026_VIEWS.front.fov},
  {p:.622,pos:RENTAL2026_VIEWS.front.position,look:RENTAL2026_VIEWS.front.look,fov:RENTAL2026_VIEWS.front.fov},
  {p:.635,pos:forum("S2",-3,2.3,-19.85),look:focus("S2",4.5),fov:52},
  {p:.647,pos:forum("S3",0,2.2,31.28),look:focus("S3",3.5),fov:54},
  {p:.659,pos:forum("S3",3,2.2,10.28),look:focus("S3",3.5),fov:45},
  {p:.672,pos:TECHNICAL_VIEW.position,look:TECHNICAL_VIEW.look,fov:TECHNICAL_VIEW.fov},
  {p:.69,pos:TECHNICAL_VIEW.position,look:TECHNICAL_VIEW.look,fov:TECHNICAL_VIEW.fov},
  {p:.702,pos:forum("S3",1,2.2,-13.72),look:focus("S3",3.4),fov:48},
  {p:.708,pos:forum("S4",-3,2.7,-10.72),look:focus("S4",6.5),fov:45},
  {p:.718,pos:PROJECTION_VIEW.position,look:PROJECTION_VIEW.look,fov:PROJECTION_VIEW.fov},
  {p:.738,pos:PROJECTION_VIEW.position,look:PROJECTION_VIEW.look,fov:PROJECTION_VIEW.fov},
  {p:.754,pos:forum("S4",-2,2.2,-18.72),look:forum("S4",16,4,-5.72),fov:52},
  {p:.767,pos:forum("S4",0,2.2,-36.72),look:[0,3.8,-244],fov:54},
  ...ARENA_BASELINE_FRAMES.filter(frame=>frame.p>=FROZEN_CONNECTION_START),
];

/* ── Hermite interpolation with Catmull-Rom tangents ───── */

const _v = new THREE.Vector3();

function hermite(
  out: THREE.Vector3,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  m0: THREE.Vector3,
  m1: THREE.Vector3,
  t: number,
) {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  out.set(
    h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x,
    h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y,
    h00 * p0.z + h10 * m0.z + h01 * p1.z + h11 * m1.z,
  );
  return out;
}

/** Pre-baked vectors so sampling allocates nothing per frame. */
const POS = KEYFRAMES.map((k) => new THREE.Vector3(...k.pos));
const LOOK = KEYFRAMES.map((k) => new THREE.Vector3(...k.look));
const ARENA_POS=ARENA_BASELINE_FRAMES.map(frame=>new THREE.Vector3(...frame.pos));
const ARENA_LOOK=ARENA_BASELINE_FRAMES.map(frame=>new THREE.Vector3(...frame.look));

/** Catmull-Rom tangents, scaled to the (uneven) progress spacing. */
function tangents(points: THREE.Vector3[]) {
  return points.map((point, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    if ((i > 0 && point.equals(prev)) || (i < points.length - 1 && point.equals(next))) {
      return new THREE.Vector3();
    }
    return new THREE.Vector3().subVectors(next, prev).multiplyScalar(0.5);
  });
}
const ARENA_POS_T=tangents(ARENA_POS),ARENA_LOOK_T=tangents(ARENA_LOOK);
/** Component-monotone derivatives keep the exhibition dolly inside each authored waypoint corridor. */
function exhibitionTangents(points:THREE.Vector3[],frozenTangents:THREE.Vector3[]){
  return points.map((point,i)=>{
    const frozen=ARENA_BASELINE_FRAMES.findIndex(frame=>frame.p===KEYFRAMES[i].p);
    if(KEYFRAMES[i].p>=FROZEN_CONNECTION_START&&frozen>=0)return frozenTangents[frozen].clone().multiplyScalar(ORIGINAL_TANGENT_MULTIPLIER);
    const prev=Math.max(0,i-1),next=Math.min(points.length-1,i+1),out=new THREE.Vector3();
    for(const axis of ["x","y","z"] as const){
      const before=(point[axis]-points[prev][axis])/Math.max(1e-8,KEYFRAMES[i].p-KEYFRAMES[prev].p);
      const after=(points[next][axis]-point[axis])/Math.max(1e-8,KEYFRAMES[next].p-KEYFRAMES[i].p);
      out[axis]=i===0?after:i===points.length-1?before:before*after>0?2*before*after/(before+after):0;
    }
    return out;
  });
}
const POS_T=exhibitionTangents(POS,ARENA_POS_T),LOOK_T=exhibitionTangents(LOOK,ARENA_LOOK_T);

const _m0 = new THREE.Vector3();
const _m1 = new THREE.Vector3();

export interface PathSample {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  /** index of the keyframe segment, useful for debugging */
  segment: number;
}

const _outPos = new THREE.Vector3();
const _outLook = new THREE.Vector3();

/**
 * Sample the path. Mutates and returns shared vectors — copy them if you need
 * to keep the values past the current frame.
 */
export function samplePath(progress:number,out:PathSample):PathSample{
  const p=THREE.MathUtils.clamp(progress,0,1),frozen=p>=FROZEN_CONNECTION_START;
  const frames=frozen?ARENA_BASELINE_FRAMES:KEYFRAMES,positions=frozen?ARENA_POS:POS,looks=frozen?ARENA_LOOK:LOOK;
  const positionTangents=frozen?ARENA_POS_T:POS_T,lookTangents=frozen?ARENA_LOOK_T:LOOK_T;
  let i=0;while(i<frames.length-2&&frames[i+1].p<p)i++;
  const a=frames[i],b=frames[i+1],span=Math.max(1e-6,b.p-a.p),t=THREE.MathUtils.clamp((p-a.p)/span,0,1);
  const scale=span*(frozen?ORIGINAL_TANGENT_MULTIPLIER:1);
  _m0.copy(positionTangents[i]).multiplyScalar(scale);_m1.copy(positionTangents[i+1]).multiplyScalar(scale);
  hermite(_outPos,positions[i],positions[i+1],_m0,_m1,t);
  _m0.copy(lookTangents[i]).multiplyScalar(scale);_m1.copy(lookTangents[i+1]).multiplyScalar(scale);
  hermite(_outLook,looks[i],looks[i+1],_m0,_m1,t);
  out.pos.copy(_outPos);out.look.copy(_outLook);out.fov=THREE.MathUtils.lerp(a.fov,b.fov,smooth(t));
  out.segment=frozen?ORIGINAL_ARENA_FRAME_OFFSET+i:i;
  return out;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function createSample(): PathSample {
  return { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50, segment: 0 };
}

/** Total path length in metres — used for the "distance travelled" HUD. */
export const PATH_LENGTH = (() => {
  let total = 0;
  for (let i = 0; i < POS.length - 1; i++) total += _v.subVectors(POS[i + 1], POS[i]).length();
  return total;
})();
