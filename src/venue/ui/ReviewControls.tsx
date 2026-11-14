"use client";
import { useEffect, useState } from "react";
import { VENUE_PAVILIONS } from "../data/pavilions";
import { scrollToProgress } from "../systems/ScrollRig";
import { useVenue } from "../systems/store";
import { journey } from "../systems/journey";
import { EXHIBITION_PROGRESS as EP } from "../data/placements";

/** Development / explicit ?perf=1 diagnostics for repeatable regression review. */
export function ReviewControls() {
  const panelOpen = useVenue(s => Boolean(s.activePavilion));
  const entered = useVenue(s => s.entered);
  const [enabled] = useState(() => {
    const query = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
    return query.has("perf") || (process.env.NODE_ENV === "development" && !query.has("shot"));
  });
  const [reset, setReset] = useState(0);
  const [initialShot] = useState(() => {
    const shot = typeof location === "undefined" ? null : new URLSearchParams(location.search).get("shot");
    return shot === "entrance" ? 0 : shot === "tunnel" ? .21 : shot === "arena" ? .932 : shot === "pillars" ? EP.pillars.overview : shot === "reception" ? EP.reception.overview : shot === "counter" ? .48 : shot === "anamorphic" ? EP.anamorphic.overview
      : shot === "technical" ? EP.technical.overview : shot === "engineering" ? .675 : shot === "show-control" ? .681 : shot === "production" ? .687
      : ["led-rental","rentals"].includes(shot ?? "") ? EP.rental.overview
      : ["projection","projection-mapping","spatial"].includes(shot ?? "") ? EP.projection.overview : null;
  });
  useEffect(() => {
    if (!entered || initialShot === null) return;
    const progress = initialShot;
    scrollToProgress(progress, "instant");
    journey.progress = journey.target = progress;
    journey.velocity = 0;
  }, [entered, initialShot]);
  if (!enabled || panelOpen) return null;
  return <><output data-render-metrics data-reset={reset} aria-label="Render metrics" style={{position:"fixed",right:28,top:126,zIndex:100,fontSize:10,color:"#ccc",background:"#15191ecc",padding:"4px 7px",borderRadius:4,pointerEvents:"none"}} />
  <button style={{position:"fixed",right:28,top:154,zIndex:100,fontSize:10}} onClick={()=>setReset(n=>n+1)}>Reset performance sample</button>
  <select aria-label="Review camera shot" defaultValue={String(initialShot ?? 0)} style={{ position: "fixed", top: 88, right: 28, zIndex: 100, background: "#15191e", color: "#eee", padding: 8, fontSize: 11, border: "1px solid #666", borderRadius: 5 }}
    onChange={(e) => {
      const progress = Number(e.target.value);
      scrollToProgress(progress, "instant");
      journey.progress = journey.target = progress;
      journey.velocity = 0;
    }}>
    <option value="0">Review · Entrance</option><option value="0.21">Tunnel</option>
    <option value={EP.pillars.overview}>Redesigned four-sided pillars</option>
    <option value="0.376">Pillars · close pass</option>
    <option value={EP.reception.overview}>Reception · 3D overview</option>
    <option value="0.48">Reception · departure</option>
    <option value="0.536">Content Studio · approach</option>
    <option value={EP.anamorphic.overview}>Anamorphic · Content Studio</option>
    <option value="0.58">Content Studio · departure</option>
    <option value={EP.rental.overview}>LED Rental · reference view</option>
    <option value={EP.technical.overview}>Technical showcase · reference view</option>
    <option value={EP.projection.overview}>Projection Mapping · reference view</option>
    {VENUE_PAVILIONS.map(p => <option key={p.id} value={p.p}>{p.headline}</option>)}
    <option value="0.812">Arena approach</option>
    <option value="0.932">Main Stage</option><option value="0.982">Finale</option>
  </select></>;
}
