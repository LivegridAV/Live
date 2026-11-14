import { PLACEMENTS, transformOldWorldToNew } from "./placements";
/** The physical fold and its authored viewing position, all in venue metres. */
export const ANAMORPHIC_ROOT=PLACEMENTS.S1.root;
export const ANAMORPHIC_ROTATION:[number,number,number]=[0,PLACEMENTS.S1.yaw,0];
export const ANAMORPHIC_VIEW={
  position:transformOldWorldToNew("S1",[1,2.15,-136]),
  look:transformOldWorldToNew("S1",[-19.2,6.45,-112.7]),
  fov:34,
  aspect:1672/941,
};
