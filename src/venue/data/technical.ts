import { EXHIBITION_PROGRESS, PLACEMENTS, inExhibitionRange, placementWorldPoint } from "./placements";
/** The connected engineering, show-control and production booth, in venue metres. */
export const TECHNICAL_ROOT=PLACEMENTS.S3.root;
export const TECHNICAL_ROTATION:[number,number,number]=[0,PLACEMENTS.S3.yaw,0];
/** User selected the new reference proportions inside the original footprint. */
export const TECHNICAL_ARCHITECTURE_HEIGHT=7.38;
export const TECHNICAL_VIEW={
  position:placementWorldPoint("S3",[0,2.2,26]),
  look:placementWorldPoint("S3",[0,3.4,-.5]),
  fov:42,
  aspect:1672/941,
};
export const TECHNICAL_RANGE:[number,number]=[EXHIBITION_PROGRESS.technical.start,EXHIBITION_PROGRESS.technical.end];

export function inTechnicalShowcase(progress:number){
  return inExhibitionRange("technical",progress);
}
