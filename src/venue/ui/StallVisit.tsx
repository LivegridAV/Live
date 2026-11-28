"use client";
import { useEffect } from "react";
import { useVenue } from "../systems/store";
import { journey } from "../systems/journey";
import { scrollToProgress } from "../systems/ScrollRig";
import { prioritizeZ } from "../loading/stream";
import { GRAND, type GrandStall } from "../data/grand";
import { STALL_PLACEMENTS } from "../data/placements";
import { zoneAt } from "../data/zones";
import { STALL_VISITS, stallAtProgress, isStallDiagnostic, stallSectionX, type StallView } from "../data/stallVisits";
import { reviewToolsAllowed } from "../systems/reviewAccess";

const VIEWS:StallView[]=["front","left","right","entrance","interior","exit","detail","plan","section"];
const labels:Record<StallView,string>={front:"Front",left:"Left",right:"Right",entrance:"Entrance",interior:"Interior",exit:"Look outside",detail:"Detail",plan:"Plan · cutaway",section:"Section · cutaway",return:"Returning to venue"};

/** A small navigation strip, operating the existing camera in the same scene. */
export function StallVisitControls() {
  const state=useVenue(), visit=state.stallVisit;
  const current=visit?.stall??stallAtProgress(state.progress);
  const bounds=current?STALL_PLACEMENTS[current].nativeCompleteBounds:null;
  useEffect(()=>{
    // Review links open a visit only where the review modes run (reviewAccess.ts).
    if(!state.entered||!reviewToolsAllowed())return;
    const query=new URLSearchParams(location.search), shot=query.get("shot"), view=query.get("view");
    const stall=(shot==="counter"?"reception":shot==="rentals"?"led-rental":shot==="spatial"||shot==="projection-mapping"?"projection":shot) as GrandStall;
    // Own keys only: `in` would also accept inherited names such as "constructor".
    if(Object.prototype.hasOwnProperty.call(STALL_VISITS,stall) && VIEWS.includes(view as StallView)) {
      const progress=STALL_VISITS[stall].progress;
      scrollToProgress(progress,"instant");
      // The visit camera stands at the stall itself (after the scroll's own
      // request, so this one wins): stream that group first.
      prioritizeZ(GRAND.placements[stall].root[2],stall);
      journey.progress=journey.target=progress;journey.velocity=0;
      state.setProgress(progress,0);state.setZone(zoneAt(progress).id);
      state.setStallVisit({stall,view:view as StallView});
    }
  // Read only once after entering; button changes do not replay URL navigation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[state.entered]);
  useEffect(()=>{
    if(!visit)return;
    journey.locked=true;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const key=(event:KeyboardEvent)=>{if(event.key==="Escape")useVenue.getState().setStallVisit({...visit,view:"return"});};
    window.addEventListener("keydown",key);
    return()=>{journey.locked=false;document.body.style.overflow=previous;window.removeEventListener("keydown",key);};
  },[visit?.stall]);
  // The walkthrough itself shows every stall from its left, front and right,
  // so there are no per-stall angle buttons. Review links (?shot=…&view=…)
  // still open a visit; Escape or the button below returns to the venue.
  if(!state.entered||state.pastVenue||state.activePavilion||!visit)return null;
  return <>
    <nav className="v-stall-visit" aria-label={`${STALL_VISITS[visit.stall].label} review view`}>
      <span className="v-stall-visit-name">{STALL_VISITS[visit.stall].label} · {labels[visit.view]}</span>
      <div className="v-stall-visit-actions">
        <button className="v-stall-back" onClick={()=>state.setStallVisit({...visit,view:"return"})}>Back to Venue</button>
      </div>
    </nav>
    {isStallDiagnostic(visit)&&<aside className="v-stall-dimensions" data-diagnostic-view={visit?.view}>
      <strong>{visit?.view==="plan"?"Orthographic plan · roof removed":"Longitudinal section · near side removed"}</strong>
      {visit?.view==="section"&&visit.stall==="anamorphic"&&<span>Occupied studio entry axis · local X {stallSectionX(visit.stall).toFixed(3)} m</span>}
      {bounds&&<span>Complete native bounds, including rig {(bounds.max[0]-bounds.min[0]).toFixed(3)} × {(bounds.max[2]-bounds.min[2]).toFixed(3)} m · top Y {bounds.max[1].toFixed(3)} m</span>}
      <span>Finished floor +{GRAND.master.floor.toFixed(2)} m · dimensions in metres · diagnostic cutaway</span>
    </aside>}
  </>;
}
