/**
 * Absolute, author-metre installation placements. Only complete installation
 * parents move; the building/arena/stage never inherit this registry.
 *
 * Baseline = current tree captured before the 19 October rearrangement.
 * Target = authorized rigid relocation, including measured court spreading.
 * Native child geometry, asset scale and all local relationships stay intact.
 */
export type PlacementVec3 = [number, number, number];
export type InstallationId = "S1" | "S2" | "S3" | "S4" | "R" | "L" | "P1" | "P2" | "P3" | "P4";
export type StallId = "anamorphic" | "led-rental" | "technical" | "projection" | "reception";
type Pose = { root: PlacementVec3; yaw: number };
type Bounds = { min: PlacementVec3; max: PlacementVec3 };
type InstallationPlacement = Pose & {
  id: InstallationId;
  label: string;
  baseline: Pose;
  nativeFloorAnchor: PlacementVec3;
  nativeFront: PlacementVec3;
  nativeCompleteBounds: Bounds;
  scale: 1;
};

const HALF_TURN = Math.PI / 2;
/**
 * The hall used to leave an empty 26.5 m bay between the gallery and the first
 * stall pair, and another between the two pairs. Both bays are gone: each pair
 * moves forward by whole bays, so the roof and column rhythm still lines up.
 * Baselines stay as recorded; every rebased input follows the new roots.
 */
export const HALL_BAY_LENGTH = 26.5;
export const FIRST_PAIR_SHIFT = HALL_BAY_LENGTH;
export const SECOND_PAIR_SHIFT = 2 * HALL_BAY_LENGTH;
const define = (placement: InstallationPlacement) => Object.freeze(placement);

export const INSTALLATION_PLACEMENTS: Record<InstallationId, InstallationPlacement> = {
  S1: define({ id:"S1",label:"Content / Anamorphic Studio",
    baseline:{root:[-18,0,-113],yaw:HALF_TURN},root:[-20,0,-109.15+FIRST_PAIR_SHIFT],yaw:HALF_TURN,
    nativeFloorAnchor:[0,.12,0],nativeFront:[0,0,1],scale:1,
    nativeCompleteBounds:{min:[-12,0,-8],max:[12,12.8210001,8]} }),
  S2: define({ id:"S2",label:"LED Rental Solutions",
    baseline:{root:[-18,0,-175],yaw:HALF_TURN},root:[20,0,-109.15+FIRST_PAIR_SHIFT],yaw:-HALF_TURN,
    nativeFloorAnchor:[0,.12,0],nativeFront:[0,0,1],scale:1,
    nativeCompleteBounds:{min:[-16.00371933,0,-11],max:[16.00371933,12.46199989,12]} }),
  S3: define({ id:"S3",label:"AV Engineering / Show Control / Live Production",
    baseline:{root:[-18,0,-145],yaw:HALF_TURN},root:[-20,0,-179.28+SECOND_PAIR_SHIFT],yaw:HALF_TURN,
    nativeFloorAnchor:[0,.12,0],nativeFront:[0,0,1],scale:1,
    nativeCompleteBounds:{min:[-20.00264359,0,-15.00263786],max:[20.00264359,10.29399967,19.00263786]} }),
  S4: define({ id:"S4",label:"Projection Mapping",
    baseline:{root:[18,0,-205],yaw:-HALF_TURN},root:[20,0,-179.28+SECOND_PAIR_SHIFT],yaw:-HALF_TURN,
    nativeFloorAnchor:[0,.12,0],nativeFront:[0,0,1],scale:1,
    nativeCompleteBounds:{min:[-18.00382805,.025,-11],max:[18.19300079,16.52300072,12]} }),
  R: define({ id:"R",label:"Reception / Curved LED",
    baseline:{root:[0,0,-80],yaw:0},root:[20,0,-47.195],yaw:-HALF_TURN,
    nativeFloorAnchor:[0,.12,0],nativeFront:[0,0,1],scale:1,
    // Includes the accepted asymmetric branding wall and live halo hangers.
    nativeCompleteBounds:{min:[-11.82499981,.11999989,-7.76729441],max:[13.70334339,18.03994,5.97574663]} }),
  L: define({ id:"L",label:"Shared gallery / arrival lounge",
    baseline:{root:[-9,.111,-50],yaw:0},root:[-18.24749994,.111,-47.85125],yaw:HALF_TURN,
    // This measured footprint centre is not the imported GLB's origin.
    nativeFloorAnchor:[-.65625,.009,-1.75250006],nativeFront:[0,0,1],scale:1,
    nativeCompleteBounds:{min:[-11.20000076,0,-9.2300005],max:[9.88750076,7.23999977,5.72500038]} }),
  P1: define({ id:"P1",label:"Hero four-sided LED pillar",
    baseline:{root:[-7.7,.111,-51.5],yaw:0},root:[-7.5,.111,-42.195],yaw:0,
    nativeFloorAnchor:[0,.009,0],nativeFront:[0,0,1],scale:1,
    nativeCompleteBounds:{min:[-1.175,0,-1.175],max:[1.175,12.734,1.175]} }),
  P2: define({ id:"P2",label:"Companion four-sided LED pillar",
    baseline:{root:[-15.6,.111,-51.8],yaw:0},root:[7.5,.111,-42.195],yaw:0,
    nativeFloorAnchor:[0,.009,0],nativeFront:[0,0,1],scale:1,
    nativeCompleteBounds:{min:[-1.075,0,-1.075],max:[1.075,11.034,1.075]} }),
  P3: define({ id:"P3",label:"Alpine four-sided LED pillar",
    baseline:{root:[-3.6,.111,-54.2],yaw:0},root:[-7.5,.111,-52.195],yaw:0,
    nativeFloorAnchor:[0,.009,0],nativeFront:[0,0,1],scale:1,
    nativeCompleteBounds:{min:[-1.05,0,-1.05],max:[1.05,11.334,1.05]} }),
  P4: define({ id:"P4",label:"Forest four-sided LED pillar",
    baseline:{root:[-17.6,.111,-55.5],yaw:0},root:[7.5,.111,-52.195],yaw:0,
    nativeFloorAnchor:[0,.009,0],nativeFront:[0,0,1],scale:1,
    nativeCompleteBounds:{min:[-1,0,-1],max:[1,8.634,1]} }),
};

/** Concise alias for diagnostics and the numerical preservation manifest. */
export const PLACEMENTS = INSTALLATION_PLACEMENTS;
export const STALL_INSTALLATION_IDS: Record<StallId, InstallationId> = {
  anamorphic:"S1","led-rental":"S2",technical:"S3",projection:"S4",reception:"R",
};
export const STALL_PLACEMENTS = {
  anamorphic:PLACEMENTS.S1,"led-rental":PLACEMENTS.S2,technical:PLACEMENTS.S3,
  projection:PLACEMENTS.S4,reception:PLACEMENTS.R,
};
export const PILLAR_INSTALLATION_IDS = {
  hero:"P1",companion:"P2",alpine:"P3",forest:"P4",
} as const;

const chapter=(start:number,end:number,overview:number,hold:[number,number])=>({
  start,end,range:[start,end] as [number,number],overview,hold,
});
// The walk visits LED Rental before the Content Studio: the studio's artwork is
// calibrated from a point beyond both stalls, so this keeps the camera moving
// forward. See path.ts for the moves inside each chapter.
const RENTAL_PROGRESS=chapter(.500,.575,.541,[.535,.548]);
const CONTENT_PROGRESS=chapter(.575,.640,.605,[.596,.614]);
/** Shared exhibition timing; arena p>=.812 is authored independently. */
export const EXHIBITION_PROGRESS = {
  pillars:chapter(.318,.400,.340,[.340,.354]),
  reception:chapter(.400,.500,.446,[.440,.462]),
  anamorphic:CONTENT_PROGRESS,
  content:CONTENT_PROGRESS,
  rental:RENTAL_PROGRESS,
  "led-rental":RENTAL_PROGRESS,
  technical:chapter(.640,.704,.681,[.672,.690]),
  projection:chapter(.704,.754,.728,[.718,.738]),
} as const;

export function inExhibitionRange(id:keyof typeof EXHIBITION_PROGRESS,progress:number) {
  const range=EXHIBITION_PROGRESS[id];
  return progress>=range.start&&progress<range.end;
}

function posePoint(pose:Pose,[x,y,z]:readonly number[]):PlacementVec3 {
  const c=Math.cos(pose.yaw),s=Math.sin(pose.yaw);
  return [pose.root[0]+c*x+s*z,pose.root[1]+y,pose.root[2]-s*x+c*z];
}

/** Author-local point to the installed world frame; no scale or reflection. */
export function placementWorldPoint(id:InstallationId,point:readonly number[]):PlacementVec3 {
  return posePoint(PLACEMENTS[id],point);
}

/** Stable old-world point to its preserved installation-local coordinates. */
export function baselineWorldToLocal(id:InstallationId,point:readonly number[]):PlacementVec3 {
  const {root,yaw}=PLACEMENTS[id].baseline;
  const x=point[0]-root[0],y=point[1]-root[1],z=point[2]-root[2];
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return [c*x-s*z,y,s*x+c*z];
}

/**
 * Rebase detached calibration/camera/light inputs from the saved baseline.
 * Call with original world coordinates, never an already transformed result.
 * Runtime parents use absolute registry poses, so remounting cannot accumulate D.
 */
export function transformOldWorldToNew(id:InstallationId,point:readonly number[]):PlacementVec3 {
  return placementWorldPoint(id,baselineWorldToLocal(id,point));
}

/** Same rigid delta for a direction; translation must not affect light rays. */
export function transformOldWorldDirectionToNew(id:InstallationId,[x,y,z]:readonly number[]):PlacementVec3 {
  const delta=PLACEMENTS[id].yaw-PLACEMENTS[id].baseline.yaw;
  const c=Math.cos(delta),s=Math.sin(delta);
  return [c*x+s*z,y,-s*x+c*z];
}

/** Column-major rigid world matrix for source/renderer comparison. */
export function placementWorldMatrix(id:InstallationId,baseline=false):number[] {
  const {root,yaw}=baseline?PLACEMENTS[id].baseline:PLACEMENTS[id];
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return [c,0,-s,0,0,1,0,0,s,0,c,0,...root,1];
}

/** Complete installed bounds include every owned rig, not only the stall deck. */
export function placementWorldBounds(id:InstallationId):Bounds {
  const b=PLACEMENTS[id].nativeCompleteBounds;
  const min:PlacementVec3=[Infinity,Infinity,Infinity],max:PlacementVec3=[-Infinity,-Infinity,-Infinity];
  for(const x of[b.min[0],b.max[0]])for(const y of[b.min[1],b.max[1]])for(const z of[b.min[2],b.max[2]]){
    const p=placementWorldPoint(id,[x,y,z]);
    for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}
  }
  return {min,max};
}

export function placementZRange(...ids:InstallationId[]) {
  const bounds=ids.map(placementWorldBounds);
  return {from:Math.max(...bounds.map(b=>b.max[2])),to:Math.min(...bounds.map(b=>b.min[2]))};
}

export const EXHIBITION_RANGES = {
  gallery:placementZRange("R","L","P1","P2","P3","P4","S1"),
  pillars:placementZRange("L","P1","P2","P3","P4"),
  reception:placementZRange("R"),
  anamorphic:placementZRange("S1"),
  technical:placementZRange("S3"),
  rental:placementZRange("S2"),
  projection:placementZRange("S4"),
};
