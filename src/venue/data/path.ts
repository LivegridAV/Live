import * as THREE from "three";
import { ANAMORPHIC_VIEW } from "./anamorphic";
import { TECHNICAL_VIEW } from "./technical";
import { PROJECTION_VIEW, PROJECTION_VIEWS } from "./projection";
import { RENTAL2026_VIEWS } from "./ledRental2026";
import { PLACEMENTS, SECOND_PAIR_SHIFT, transformOldWorldToNew, type InstallationId } from "./placements";
import { ARENA_SHIFT } from "./grand";

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
  /**
   * Viewport heights of scrolling spent arriving at this frame. Frames without
   * it use the base rate (BASE_SCROLL_VH for the whole 0 → 1 journey). The
   * exhibition walk sets it per move so that turns and dollies stay gentle:
   * about 60° of turn and 18 m of travel per screen of scroll at most.
   */
  scroll?: number;
}

/** The arena retains its original 61-frame tangent multiplier and boundary neighbours, independent of exhibition edits. */
const ARENA_AUTHORED_FRAMES:Keyframe[]=[
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
/** Same frames and timing, carried with the arena when the last hall bay was removed. */
const ARENA_BASELINE_FRAMES:Keyframe[]=ARENA_AUTHORED_FRAMES.map(frame=>({...frame,
  pos:[frame.pos[0],frame.pos[1],frame.pos[2]+ARENA_SHIFT],look:[frame.look[0],frame.look[1],frame.look[2]+ARENA_SHIFT]}));
export const ARENA_PATH_START=.812;
const FROZEN_CONNECTION_START=.789, ORIGINAL_TANGENT_MULTIPLIER=60, ORIGINAL_ARENA_FRAME_OFFSET=48;
const receptionPosition=transformOldWorldToNew("R",[-1.445,2.448,-64]);
const receptionLook=transformOldWorldToNew("R",[1.05,4.56,-83.79]);
/** Forum positions are tied to installation anchors, never imported pivots. */
const forum=(id:InstallationId,x:number,y:number,offsetZ:number):[number,number,number]=>[x,y,PLACEMENTS[id].root[2]+offsetZ];
/** A point offset (world axes, metres) from an installation's anchor. */
const rel=(id:InstallationId,dx:number,y:number,dz:number):[number,number,number]=>[PLACEMENTS[id].root[0]+dx,y,PLACEMENTS[id].root[2]+dz];


export const KEYFRAMES:Keyframe[]=[
  {p:0,pos:[0,1.7,8],look:[0,5.2,-14.4],fov:52},
  {p:.03,pos:[-.25,1.7,6],look:[0,4.8,-14.4],fov:54},
  {p:.062,pos:[.25,1.7,3],look:[0,4.2,-16],fov:56},
  {p:.095,pos:[.2,1.7,1],look:[0,3.2,-19],fov:54},
  {p:.122,pos:[0,1.7,-5],look:[0,3,-22],fov:56,scroll:.45},
  {p:.15,pos:[0,1.7,-12],look:[0,3,-26],fov:60,scroll:.5},
  {p:.186,pos:[-.52,1.7,-16.8],look:[.35,3,-30],fov:66},
  {p:.222,pos:[.56,1.7,-20],look:[-.3,2.5,-34],fov:66},
  {p:.256,pos:[-.26,1.7,-24],look:[.16,2.1,-38],fov:64},
  {p:.282,pos:[0,1.7,-27.6],look:[0,2.45,-40],fov:60},
  {p:.3,pos:[0,1.82,-31.5],look:[0,3.3,-44],fov:58,scroll:.3},
  // Pillar gallery: walk straight in between the four LED pillars, hold on all
  // of them, then a gentle glance left and right. The look stays far ahead so
  // the view never whips round a pillar the camera is passing.
  {p:.318,pos:rel("P1",7.5,1.8,9.2),look:rel("P3",7.5,5,5.2),fov:60,scroll:.3},
  {p:.34,pos:rel("P1",7.5,1.8,7.7),look:rel("P3",7.5,5.2,4.2),fov:62,scroll:.3},
  {p:.354,pos:rel("P1",7.5,1.8,6.7),look:rel("P3",7.5,5.2,3.2),fov:62,scroll:.4},
  {p:.376,pos:rel("P1",7.2,1.8,2.7),look:rel("P3",2.5,5,-1.8),fov:60,scroll:.5},
  {p:.4,pos:rel("P4",-7,1.85,8.7),look:rel("P4",-1.5,5,-4.8),fov:60,scroll:.9},
  // Reception: turn right onto the curved LED and hold.
  {p:.42,pos:rel("R",-17.6,2,.7),look:rel("R",-4,4.6,-4.8),fov:62,scroll:.8},
  {p:.44,pos:receptionPosition,look:receptionLook,fov:64.924,scroll:.7},
  {p:.462,pos:receptionPosition,look:receptionLook,fov:64.924,scroll:.5},
  {p:.48,pos:rel("R",-17.5,2.4,-5.8),look:rel("R",2,4.6,-10.8),fov:60,scroll:.5},
  // LED Rental from across the aisle: right angle, front (hold), left angle.
  {p:.5,pos:rel("S2",-20,2.4,23.65),look:rel("S2",0,5,8.65),fov:52,scroll:.6},
  {p:.512,pos:rel("S2",-24.5,2.8,15.15),look:rel("S2",0,5,2.65),fov:44,scroll:.6},
  {p:.525,pos:RENTAL2026_VIEWS.right.position,look:RENTAL2026_VIEWS.right.look,fov:RENTAL2026_VIEWS.right.fov,scroll:.5},
  {p:.535,pos:RENTAL2026_VIEWS.front.position,look:RENTAL2026_VIEWS.front.look,fov:RENTAL2026_VIEWS.front.fov,scroll:1.1},
  {p:.548,pos:RENTAL2026_VIEWS.front.position,look:RENTAL2026_VIEWS.front.look,fov:RENTAL2026_VIEWS.front.fov,scroll:.5},
  {p:.56,pos:RENTAL2026_VIEWS.left.position,look:RENTAL2026_VIEWS.left.look,fov:RENTAL2026_VIEWS.left.fov,scroll:.5},
  // Content Studio: its folded artwork resolves only from its calibrated point
  // beyond the stall, so the view turns slowly back over the right shoulder.
  {p:.578,pos:rel("S1",13.5,2.6,-17.35),look:rel("S2",-20,4.5,6.75),fov:38,scroll:1.2},
  {p:.596,pos:ANAMORPHIC_VIEW.position,look:ANAMORPHIC_VIEW.look,fov:ANAMORPHIC_VIEW.fov,scroll:1.2},
  {p:.614,pos:ANAMORPHIC_VIEW.position,look:ANAMORPHIC_VIEW.look,fov:ANAMORPHIC_VIEW.fov,scroll:.5},
  // AV Engineering: its near corner, then its calibrated front (hold).
  {p:.64,pos:rel("S3",22.5,2.2,12.28),look:rel("S3",.3,3.6,18.28),fov:44,scroll:.8},
  {p:.672,pos:TECHNICAL_VIEW.position,look:TECHNICAL_VIEW.look,fov:TECHNICAL_VIEW.fov,scroll:1},
  {p:.69,pos:TECHNICAL_VIEW.position,look:TECHNICAL_VIEW.look,fov:TECHNICAL_VIEW.fov,scroll:.5},
  // Projection Mapping: look ahead down the aisle, then round to its front
  // (hold) and on to its far angle.
  {p:.704,pos:rel("S3",24,2.3,-4.72),look:rel("S3",12,3.8,-18.72),fov:48,scroll:1.1},
  {p:.711,pos:rel("S3",20,2.4,-5.22),look:rel("S4",-16,4,-31.72),fov:50,scroll:.9},
  {p:.718,pos:PROJECTION_VIEW.position,look:PROJECTION_VIEW.look,fov:PROJECTION_VIEW.fov,scroll:1.8},
  {p:.738,pos:PROJECTION_VIEW.position,look:PROJECTION_VIEW.look,fov:PROJECTION_VIEW.fov,scroll:.5},
  {p:.754,pos:PROJECTION_VIEWS.left.position,look:PROJECTION_VIEWS.left.look,fov:PROJECTION_VIEWS.left.fov,scroll:.7},
  // Leaving the projection stall: turn down the last stretch of hall to the portal.
  // Turn from the projection stall back to the portal, spread evenly.
  {p:.7605,pos:rel("S4",-25.5,2.5,-16.22),look:rel("S4",-5,4.2,-30.52),fov:45,scroll:1.1},
  {p:.767,pos:forum("S4",0,2.2,-36.72+(ARENA_SHIFT-SECOND_PAIR_SHIFT)*.6),look:[0,3.8,-244+ARENA_SHIFT],fov:54,scroll:1.1},
  ...ARENA_BASELINE_FRAMES.filter(frame=>frame.p>=FROZEN_CONNECTION_START),
];

/* ── scroll plan ───────────────────────────────────────── */

/** Viewport heights the whole journey would take at the base rate. */
export const BASE_SCROLL_VH = 13;
/**
 * Cumulative [progress, viewport heights] at every keyframe: the page's scroll
 * position maps piecewise-linearly onto progress through this table, so a
 * frame's `scroll` budget is exactly the scrolling its move takes.
 */
/**
 * The arena frames are authored and protected; only the scrolling they take
 * is set here, so the dolly, crane-up and zooms read at a walking pace.
 */
const ARENA_SCROLL:Record<number,number>={.789:.45,.812:.6,.83:.5,.846:.55,.862:1,.884:.6,.906:.55,.932:.35,.95:.3,.968:.55,.986:.35,1:.25};
export const SCROLL_PLAN:[number,number][]=(()=>{
  const plan:[number,number][]=[[0,0]];
  for(let i=1;i<KEYFRAMES.length;i++){
    const k=KEYFRAMES[i],prev=KEYFRAMES[i-1];
    plan.push([k.p,plan[i-1][1]+(k.scroll??ARENA_SCROLL[k.p]??(k.p-prev.p)*BASE_SCROLL_VH)]);
  }
  return plan;
})();
export const SCROLL_PLAN_VH=SCROLL_PLAN[SCROLL_PLAN.length-1][1];

/** Fraction of the scroll track (0 → 1) to journey progress, and back. */
export function scrollFractionToProgress(fraction:number){
  const vh=THREE.MathUtils.clamp(fraction,0,1)*SCROLL_PLAN_VH;
  let i=1;while(i<SCROLL_PLAN.length-1&&SCROLL_PLAN[i][1]<vh)i++;
  const [p0,v0]=SCROLL_PLAN[i-1],[p1,v1]=SCROLL_PLAN[i];
  return p0+(p1-p0)*(v1>v0?(vh-v0)/(v1-v0):0);
}
export function progressToScrollFraction(progress:number){
  const p=THREE.MathUtils.clamp(progress,0,1);
  let i=1;while(i<SCROLL_PLAN.length-1&&SCROLL_PLAN[i][0]<p)i++;
  const [p0,v0]=SCROLL_PLAN[i-1],[p1,v1]=SCROLL_PLAN[i];
  return (v0+(v1-v0)*(p1>p0?(p-p0)/(p1-p0):0))/SCROLL_PLAN_VH;
}

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
