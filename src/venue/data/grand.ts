import dimensions from "../../../public/models/expo/grand-dimensions.json";
import { STALL_PLACEMENTS } from "./placements";

// Building/master dimensions are preserved. Only movable installation poses
// come from the absolute placement registry, never a whole-venue transform.
export const GRAND = {...dimensions,placements:{
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
