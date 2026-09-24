"use client";
import { useState } from "react";
import { PAVILIONS, PARTNER_BAY } from "../data/pavilions";
import { scrollToProgress } from "../systems/ScrollRig";
import { useVenue } from "../systems/store";
import { journey } from "../systems/journey";

/** Development / explicit ?perf=1 diagnostics for repeatable regression review. */
export function ReviewControls() {
  const panelOpen = useVenue(s => Boolean(s.activePavilion));
  const [enabled] = useState(() => process.env.NODE_ENV === "development" || (typeof location !== "undefined" && new URLSearchParams(location.search).has("perf")));
  const [reset, setReset] = useState(0);
  if (!enabled || panelOpen) return null;
  return <><output data-render-metrics data-reset={reset} aria-label="Render metrics" style={{position:"fixed",right:28,top:126,zIndex:100,fontSize:10,color:"#ccc",background:"#15191ecc",padding:"4px 7px",borderRadius:4,pointerEvents:"none"}} />
  <button style={{position:"fixed",right:28,top:154,zIndex:100,fontSize:10}} onClick={()=>setReset(n=>n+1)}>Reset performance sample</button>
  <select aria-label="Review camera shot" defaultValue="0" style={{ position: "fixed", top: 88, right: 28, zIndex: 100, background: "#15191e", color: "#eee", padding: 8, fontSize: 11, border: "1px solid #666", borderRadius: 5 }}
    onChange={(e) => {
      const progress = Number(e.target.value);
      scrollToProgress(progress, "instant");
      journey.progress = journey.target = progress;
      journey.velocity = 0;
    }}>
    <option value="0">Review · Entrance</option><option value="0.21">Tunnel</option>
    <option value="0.34">Pillars</option><option value="0.46">Creative Gallery</option>
    <option value="0.41">Vertical Blades</option><option value="0.496">Suspended Ring</option>
    <option value="0.528">LED Bar</option><option value="0.544">Curved LED</option>
    <option value="0.556">Creative Shapes</option><option value="0.566">Anamorphic Corner</option>
    {[...PAVILIONS, PARTNER_BAY].map(p => <option key={p.id} value={p.p}>{p.headline}</option>)}
    <option value="0.932">Main Stage</option><option value="0.982">Finale</option>
  </select></>;
}
