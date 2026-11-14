"use client";
import { useEffect } from "react";
import { useEntranceFinishes, type EntranceMode } from "../systems/entranceFinishes";
import { useVenue } from "../systems/store";

export function EntranceFinishes({ review = false }: { review?: boolean }) {
  const { mode, paused, reducedMotion, allowMotion, fallback } = useEntranceFinishes();
  const progress = useVenue(s => s.progress);
  const entered = useVenue(s => s.entered);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => useEntranceFinishes.setState({ reducedMotion: preference.matches, allowMotion:false });
    update(); preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  if (!review && (!entered || progress >= .285)) return null;
  return <div aria-label="Entrance atmosphere" style={{position:review?"absolute":"fixed",bottom:review?24:80,left:"50%",transform:"translateX(-50%)",zIndex:90,
    display:"flex",flexWrap:"wrap",justifyContent:"center",gap:8,padding:10,border:"1px solid #7f998d44",borderRadius:12,
    background:"#111b1de8",color:"#edf0ec",fontFamily:"sans-serif",fontSize:12,width:"max-content",maxWidth:"calc(100% - 32px)"}}>
    <select aria-label="Entrance atmosphere mode" value={mode}
      onChange={e => useEntranceFinishes.setState({ mode:e.target.value as EntranceMode })}
      style={{background:"#203033",color:"inherit",border:"1px solid #738a8055",borderRadius:6,padding:"8px 10px"}}>
      <option value="arrival">Emerald Current</option><option value="calm">Calm presentation</option>
      <option value="static">Still artwork</option><option value="neutral">Neutral material review</option>
    </select>
    <button aria-pressed={paused} disabled={mode === "static" || mode === "neutral"}
      onClick={() => reducedMotion&&!allowMotion ? useEntranceFinishes.setState({allowMotion:true,paused:false}) : useEntranceFinishes.setState({paused:!paused})}
      style={{padding:"8px 12px",borderRadius:6,border:"1px solid #738a8055",background:"#203033",color:"inherit",cursor:"pointer",opacity:mode==="static"||mode==="neutral"?.5:1}}>
      {reducedMotion&&!allowMotion ? "Play motion" : paused ? "Resume motion" : "Pause motion"}
    </button>
    {reducedMotion&&!allowMotion && <span style={{alignSelf:"center"}}>Reduced motion · still artwork</span>}
    {(review || typeof location!=="undefined"&&new URLSearchParams(location.search).has("perf")) && <>
      <label style={{alignSelf:"center",fontSize:11}}><input type="checkbox" checked={fallback} onChange={e=>useEntranceFinishes.setState({fallback:e.target.checked})}/> Loading preview</label>
      <output data-entrance-motion style={{alignSelf:"center",fontSize:10,minWidth:170}}/>
    </>}
  </div>;
}
