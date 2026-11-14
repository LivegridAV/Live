import { GRAND, grandWorld, type GrandStall, type Vec3 } from "./grand";
import { ANAMORPHIC_VIEW } from "./anamorphic";
import { TECHNICAL_VIEW } from "./technical";
import { RENTAL2026_FASCIA_TOP, RENTAL2026_VIEWS } from "./ledRental2026";
import { PROJECTION_VIEWS } from "./projection";
import { EXHIBITION_PROGRESS } from "./placements";

export type StallView = "front" | "left" | "right" | "entrance" | "interior" | "exit" | "detail" | "plan" | "section" | "return";
export type StallVisit = {stall: GrandStall; view: StallView};
export const isStallDiagnostic = (visit: StallVisit | null) => visit?.view === "plan" || visit?.view === "section";
type VisitDefinition = {label: string; progress: number; entry: Vec3; inside: Vec3; via: Vec3[]; focus: Vec3; detail: Vec3; detailLook: Vec3};
const eye = GRAND.master.floor + 1.65;
export const STALL_VISITS: Record<GrandStall, VisitDefinition> = {
  reception: {label:"Reception",progress:EXHIBITION_PROGRESS.reception.overview,entry:[0,eye,9.4],inside:[-2.4,eye,1.8],via:[[-2.4,eye,5.4]],focus:[0,4,-4],detail:[4.3,1.9,6.4],detailLook:[4.3,1.15,3.8]},
  anamorphic: {label:"Content Studio",progress:EXHIBITION_PROGRESS.anamorphic.overview,entry:[-2.8,eye,8.8],inside:[-8.5,eye,-.3],via:[[-2.8,eye,6.5],[-2.8,eye,3],[-8.5,eye,3]],focus:[-7.6,2.4,-6.2],detail:[1.5,2.6,9.4],detailLook:[2.8,1.25,2.8]},
  technical: {label:"AV Engineering / Show Control",progress:EXHIBITION_PROGRESS.technical.overview,entry:[-4.65,eye,8.8],inside:[-3,eye,0],via:[[-4.65,eye,6.6],[-4.65,eye,3]],focus:[0,2.65,-5.8],detail:[0,1.9,11.2],detailLook:[0,.85,5.6]},
  "led-rental": {label:"LED Rental Solutions",progress:EXHIBITION_PROGRESS["led-rental"].overview,entry:[0,eye,8.5],inside:[0,eye,.7],via:[[0,eye,6.4],[0,eye,3]],focus:[2.1,4.5,-6.95],detail:[7.8,1.95,10.2],detailLook:[7.8,.85,5.8]},
  projection: {label:"Projection Mapping",progress:EXHIBITION_PROGRESS.projection.overview,entry:[0,eye,9.4],inside:[6.4,eye,3.6],via:[[0,eye,7.7],[0,eye,4.6],[6.4,eye,4.6]],focus:[0,4,-2],detail:[-8.2,2.0,9.4],detailLook:[-7.0,1.0,6.0]},
};

/** The studio occupies the left bay; its useful depth section follows entry. */
export const stallSectionX=(stall:GrandStall)=>stall==="anamorphic"?STALL_VISITS.anamorphic.inside[0]:0;

export function stallAtProgress(progress:number):GrandStall|null {
  for(const stall of ["reception","anamorphic","led-rental","technical","projection"] as const){
    const range=EXHIBITION_PROGRESS[stall];
    if(progress>=range.start&&progress<range.end)return stall;
  }
  return null;
}

/** Cameras are expressed in the same local metre axes as the actual shell. */
export function stallViewTarget(visit:StallVisit) {
  const d=STALL_VISITS[visit.stall], view=visit.view;
  // The physical folded artwork has one authored calibration point; preserve
  // its exact intended front instead of looking at the reverse display leaf.
  if(visit.stall==="anamorphic"&&view==="front")return {position:ANAMORPHIC_VIEW.position,look:ANAMORPHIC_VIEW.look,fov:ANAMORPHIC_VIEW.fov};
  if(visit.stall==="technical"&&view==="front")return {position:TECHNICAL_VIEW.position,look:TECHNICAL_VIEW.look,fov:TECHNICAL_VIEW.fov};
  if(visit.stall==="led-rental"&&(view==="front"||view==="left"||view==="right")){
    const authored=RENTAL2026_VIEWS[view];
    return {position:authored.position,look:authored.look,fov:authored.fov};
  }
  if(visit.stall==="projection"&&(view==="front"||view==="left"||view==="right")){
    const authored=PROJECTION_VIEWS[view];
    return {position:authored.position,look:authored.look,fov:authored.fov};
  }
  let position:Vec3=[-3,2.15,34], look:Vec3=[0,6.1,0], fov=34;
  if(view==="left"){position=[-23,2.15,32];fov=38;}
  if(view==="right"){position=[23,2.15,32];fov=38;}
  // Review from beyond the retained pillar gallery instead of looking
  // through its physical rear branding wall and Alpine tower.
  if(visit.stall==="reception"&&["front","left","right"].includes(view)){
    position=view==="front"?[-.8,2.15,21]:[view==="left"?-19:19,2.15,18];
    look=[0,5.3,-1];fov=view==="front"?52:55;
  }
  if(visit.stall==="technical"&&(view==="left"||view==="right")){
    position=[view==="left"?-11:11,2.2,26];look=[0,3.4,-.5];fov=42;
  }
  if(visit.stall==="anamorphic"&&(view==="left"||view==="right")){
    position=[view==="left"?-20:20,2.15,27];look=[0,6.6,0];fov=42;
  }
  if(view==="entrance"){position=d.entry;look=d.focus;fov=58;}
  if(view==="interior"){position=d.inside;look=d.focus;fov=visit.stall==="projection"?68:58;}
  if(view==="exit"){position=d.inside;look=[d.entry[0],eye,11];fov=58;}
  if(view==="detail"){position=d.detail;look=d.detailLook;fov=48;}
  if(view==="plan"){position=[0,34,0];look=[0,GRAND.master.floor,0];}
  if(view==="section"){
    const axis=stallSectionX(visit.stall);
    const centreY=visit.stall==="led-rental"?(RENTAL2026_FASCIA_TOP+GRAND.master.floor)/2:6.6;
    position=[axis+32,centreY,0];look=[axis,centreY,0];
  }
  return {position:grandWorld(visit.stall,position),look:grandWorld(visit.stall,look),fov};
}

/** Piecewise entry/exit path; no disconnected scene or replacement room. */
export function stallWalkRoute(stall:GrandStall,reverse=false):Vec3[] {
  const d=STALL_VISITS[stall],door=grandWorld(stall,d.entry);
  // Reach the actual door from the open forum before crossing its facade.
  // This prevents a diagonal shortcut through a neighbouring counter/planter
  // when entry is selected from an oblique exterior review camera.
  const forum:Vec3=[0,eye,door[2]];
  const route=[forum,...[d.entry,...d.via,d.inside].map(p=>grandWorld(stall,p))];
  return reverse?route.reverse():route;
}
