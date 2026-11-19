import dimensions from "../../../public/models/expo/grand-dimensions.json";
import { HALL_BAY_LENGTH, STALL_PLACEMENTS } from "./placements";

// Building/master dimensions are preserved. Only movable installation poses
// come from the absolute placement registry, never a whole-venue transform.
/**
 * The authored hall has eight 26.5 m bays. Three were empty runs of aisle (after
 * the gallery, between the stall pairs, and before the arena), so they are left
 * out: the stall pairs move forward (placements.ts), the hall ends three bays
 * sooner, and the arena, its approach and its camera frames sit 79.5 m closer.
 * The authored dimensions file is left untouched.
 */
export const HALL_BAY = HALL_BAY_LENGTH;
export const HALL_BAYS = 5;
/** +Z offset applied to everything from the hall/arena joint onward. */
export const ARENA_SHIFT = (8 - HALL_BAYS) * HALL_BAY;

export const GRAND = {...dimensions,hall:{...dimensions.hall,to:dimensions.hall.to+ARENA_SHIFT},placements:{
  reception:{...dimensions.placements.reception,...STALL_PLACEMENTS.reception},
  anamorphic:{...dimensions.placements.anamorphic,...STALL_PLACEMENTS.anamorphic},
  technical:{...dimensions.placements.technical,...STALL_PLACEMENTS.technical},
  "led-rental":{...dimensions.placements["led-rental"],...STALL_PLACEMENTS["led-rental"]},
  projection:{...dimensions.placements.projection,...STALL_PLACEMENTS.projection},
}};
export type GrandStall = keyof typeof dimensions.placements;
export type Vec3 = [number,number,number];
export function grandWorld(stall:GrandStall,[x,y,z]:Vec3):Vec3{
  const {root,yaw}=GRAND.placements[stall];
  return [root[0]+Math.cos(yaw)*x+Math.sin(yaw)*z,root[1]+y,root[2]-Math.sin(yaw)*x+Math.cos(yaw)*z];
}
