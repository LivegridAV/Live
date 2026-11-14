import { GRAND, grandWorld } from "./grand";
import { inExhibitionRange } from "./placements";
/** Authoring metres: X right, Y up, open entrance towards +Z. */
export const RENTAL2026_ROOT=GRAND.placements["led-rental"].root as [number,number,number];
export const RENTAL2026_ROTATION:[number,number,number]=[0,GRAND.placements["led-rental"].yaw,0];
/** Actual rebuilt crown; the shared reservation stays 24 × 16 metres. */
export const RENTAL2026_FASCIA_TOP=10.5;
export const RENTAL2026_ARCHITECTURE_HEIGHT=RENTAL2026_FASCIA_TOP-GRAND.master.floor;
export const RENTAL2026_CLEAR_HEIGHT=8.293;
export const RENTAL2026_DIMENSIONS=Object.freeze({...GRAND.master,
  height:RENTAL2026_ARCHITECTURE_HEIGHT,fasciaTop:RENTAL2026_FASCIA_TOP});
export const RENTAL2026_DECK=Object.freeze([
  [-12,-8],[12,-8],[12,8],[-12,8],
] as const);
export function rental2026World([x,y,z]:[number,number,number]):[number,number,number]{
  return grandWorld("led-rental",[x,y,z]);
}
export const RENTAL2026_VIEWS={
  front:{position:rental2026World([-5,3.0,28]),look:rental2026World([0,5.0,0]),fov:37,aspect:1672/941},
  left:{position:rental2026World([-11,3.1,31]),look:rental2026World([0,5.0,0]),fov:37,aspect:667/459},
  right:{position:rental2026World([10,3.1,31]),look:rental2026World([0,5.0,0]),fov:38,aspect:710/490},
  top:{position:rental2026World([0,34,.001]),look:rental2026World([0,.12,0]),fov:43,aspect:668/489},
};
export function inRental2026(progress:number){return inExhibitionRange("led-rental",progress);}
