import { GRAND, grandWorld, type Vec3 } from "./grand";
import { inExhibitionRange } from "./placements";

/** Authored metres: shell, visitors, furniture and sculpture are independent. */
export const PROJECTION_ROOT=GRAND.placements.projection.root as Vec3;
export const PROJECTION_ROTATION:Vec3=[0,GRAND.placements.projection.yaw,0];
export const PROJECTION_SCALE=1;
export const PROJECTION_HALL_HEIGHT_SCALE=1.9;
export const PROJECTION_HALL_WIDTH_SCALE=2.3;
export const PROJECTION_NATIVE_DIMENSIONS={width:GRAND.master.width,depth:GRAND.master.depth,height:GRAND.master.height,floorTop:GRAND.master.floor,receptionWidth:6.20};
export const PROJECTION_DECK_POLYGON:readonly (readonly [number,number])[]=[
  [-12,-8],[12,-8],[12,7.25],[11.25,8],[-11.25,8],[-12,7.25],
];
export const PROJECTION_DIMENSIONS=Object.fromEntries(Object.entries(PROJECTION_NATIVE_DIMENSIONS)
  .map(([key,value])=>[key,value*PROJECTION_SCALE])) as typeof PROJECTION_NATIVE_DIMENSIONS;
/** Author-local metres to world metres at the pavilion's fixed -90 degree yaw. */
export function projectionWorldPosition([x,y,z]:[number,number,number]):[number,number,number]{
  return grandWorld("projection",[x,y,z]);
}
export const PROJECTION_SCULPTURE_OFFSET:Vec3=[0,.915,-2.8];
export const PROJECTION_SCULPTURE_SCALE:Vec3=[1,1,1];
export const PROJECTION_VIEW={
  position:projectionWorldPosition([-2,2.8,28.5]),
  look:projectionWorldPosition([0,6.5,.5]),
  fov:37,
  aspect:1672/941,
};
/** The same pavilion from the four reference-board angles. */
export const PROJECTION_VIEWS={
  front:PROJECTION_VIEW,
  left:{position:projectionWorldPosition([-10.5,2.8,30]),look:projectionWorldPosition([0,6.5,.5]),fov:37,aspect:1672/941},
  right:{position:projectionWorldPosition([10.5,2.8,30]),look:projectionWorldPosition([0,6.5,.5]),fov:37,aspect:1672/941},
  top:{position:projectionWorldPosition([0,32,.01]),look:projectionWorldPosition([0,.12,0]),fov:44,aspect:1.5},
};
export function inProjectionShowcase(progress:number){return inExhibitionRange("projection",progress);}
