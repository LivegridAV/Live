"use client";
import { useEffect, useState } from "react";
import { scrollToProgress } from "../systems/ScrollRig";
import { journey } from "../systems/journey";
import { useVenue } from "../systems/store";

/** Review transport changes only scroll input; CameraRig remains the sole camera owner. */
export function EntranceWalkthrough() {
  const [enabled]=useState(()=>new URLSearchParams(location.search).has("perf"));
  const entered=useVenue(s=>s.entered);
  const [running,setRunning]=useState(false);
  useEffect(()=>{
    if(!running)return;
    let frame=0,last=0,time=0;
    const tick=(now:number)=>{
      if(last&&!document.hidden)time+=Math.min(.1,(now-last)/1000);
      last=now;
      const t=Math.min(1,time/32),progress=.42*(t*t*(3-2*t));
      scrollToProgress(progress,"instant");
      if(t<1)frame=requestAnimationFrame(tick);else setRunning(false);
    };
    const cancel=()=>setRunning(false);
    frame=requestAnimationFrame(tick);
    window.addEventListener("wheel",cancel,{passive:true});window.addEventListener("touchstart",cancel,{passive:true});
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("wheel",cancel);window.removeEventListener("touchstart",cancel);};
  },[running]);
  if(!enabled||!entered)return null;
  return <button style={{position:"fixed",right:28,top:182,zIndex:100,fontSize:11,padding:"8px 12px",borderRadius:6,background:"#182628",color:"#e7eeea",border:"1px solid #56706b"}}
    onClick={()=>{
      if(!running){scrollToProgress(0,"instant");journey.progress=journey.target=0;journey.velocity=0;}
      setRunning(!running);
    }}>{running?"Stop entrance walkthrough":"Walk entrance to reception · 32 s"}</button>;
}
