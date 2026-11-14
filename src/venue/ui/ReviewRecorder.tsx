"use client";
import { useEffect, useRef, useState } from "react";
import { useVenue } from "../systems/store";

type Sample = ReturnType<typeof readSample>;
type Running = {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  samples: Sample[];
  start: number;
  startedAt: string;
  canvas: HTMLCanvasElement;
  name: string;
};

/** DOM diagnostics only: camera and render metrics are supplied by RenderMetrics. */
function readSample() {
  const output = document.querySelector<HTMLOutputElement>("[data-render-metrics]");
  const parsed = (value: string | undefined) => {
    try { return value ? JSON.parse(value) as unknown : null; } catch { return null; }
  };
  return {
    at: new Date().toISOString(),
    performanceNow: performance.now(),
    url: location.href,
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    camera: parsed(output?.dataset.cameraPose),
    cameraMode: output?.dataset.cameraMode ?? null,
    cameraMoving: output?.dataset.cameraMoving ?? null,
    renderConditions: parsed(output?.dataset.renderConditions),
    timing: parsed(output?.dataset.timing),
    metrics: output?.value ?? null,
    journeyProgress: output?.dataset.cameraProgress ?? null,
    entranceMotion: parsed(document.querySelector<HTMLOutputElement>("[data-entrance-motion]")?.dataset.motion),
  };
}

/** Opt-in review tool. Explicit saves go only to the loopback report helper. */
export function ReviewRecorder() {
  const [enabled] = useState(() => new URLSearchParams(location.search).get("record") === "1");
  const entered = useVenue(s => s.entered);
  const running = useRef<Running | null>(null);
  const mounted = useRef(true);
  const urls = useRef<string[]>([]);
  const [status, setStatus] = useState("Ready to capture the WebGL canvas.");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ video: string; metadata: string; name: string; bytes: number; videoBlob:Blob; metadataBlob:Blob } | null>(null);
  const [saving,setSaving]=useState(false);
  const [clean,setClean]=useState(false);

  useEffect(()=>{
    if(!enabled)return;
    const key=(event:KeyboardEvent)=>{
      const target=event.target;
      if(!useVenue.getState().entered||event.repeat||event.key.toLowerCase()!=="h"||event.altKey||event.ctrlKey||event.metaKey)return;
      if(target instanceof HTMLElement&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))return;
      event.preventDefault();setClean(value=>!value);
    };
    window.addEventListener("keydown",key);
    return()=>{window.removeEventListener("keydown",key);document.documentElement.removeAttribute("data-grand-clean");};
  },[enabled]);

  useEffect(()=>{
    if(!enabled)return;
    if(clean)document.documentElement.setAttribute("data-grand-clean","true");
    else document.documentElement.removeAttribute("data-grand-clean");
  },[enabled,clean]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return;
    const timer = setInterval(() => {
      const current = running.current;
      if (!current) return;
      current.samples.push(readSample());
      setElapsed((performance.now() - current.start) / 1000);
    }, 250);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      const current = running.current;
      running.current = null;
      if (current?.recorder.state !== "inactive") current?.recorder.stop();
      current?.stream.getTracks().forEach(track => track.stop());
      urls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, [enabled]);

  function start() {
    if (running.current) return;
    const canvas = document.querySelector<HTMLCanvasElement>(".venue-canvas canvas");
    if (!canvas?.captureStream || typeof MediaRecorder === "undefined") {
      setStatus("Canvas MediaRecorder is unavailable in this browser.");
      return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = canvas.captureStream(30);
      const mime = ["video/webm;codecs=vp8", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("This browser cannot encode WebM.");
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 7_000_000 });
      const query = new URLSearchParams(location.search);
      const label = `${query.get("shot") ?? "journey"}-${query.get("view") ?? "native"}`.replace(/[^a-z0-9_-]/gi, "-");
      const startedAt = new Date().toISOString();
      const current: Running = { recorder, stream, chunks: [], samples: [readSample()], start: performance.now(), startedAt, canvas, name: `scene-${label}-${startedAt.replace(/[:.]/g, "-")}` };
      recorder.addEventListener("dataavailable", event => { if (event.data.size) current.chunks.push(event.data); });
      recorder.addEventListener("error", () => {
        if (mounted.current) setStatus("The browser reported a recording error. Stop and retry after checking the scene.");
      });
      recorder.addEventListener("stop", () => {
        const ended = performance.now();
        const streamSettings = current.stream.getVideoTracks().map(track => track.getSettings());
        current.stream.getTracks().forEach(track => track.stop());
        if (running.current === current) running.current = null;
        if (!mounted.current) return;
        const video = new Blob(current.chunks, { type: recorder.mimeType });
        const metadata = {
          scope: "Actual WebGL canvas recording. DOM overlays, cursor and audio omitted.",
          startedAt: current.startedAt,
          endedAt: new Date().toISOString(),
          durationSeconds: (ended - current.start) / 1000,
          requestedFps: 30,
          requestedVideoBitsPerSecond: 7_000_000,
          actualMimeType: recorder.mimeType,
          reportedVideoBitsPerSecond: recorder.videoBitsPerSecond,
          canvas: { width: current.canvas.width, height: current.canvas.height, clientWidth: current.canvas.clientWidth, clientHeight: current.canvas.clientHeight },
          streamSettings,
          bytes: video.size,
          sampleIntervalMs: 250,
          samples: [...current.samples, readSample()],
          note: "Requested stream FPS is not measured encoded cadence. Recording may add encoder overhead; compare performance with an unrecorded sample. Media loops remain live.",
        };
        urls.current.forEach(url => URL.revokeObjectURL(url));
        const videoUrl = URL.createObjectURL(video);
        const metadataBlob=new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
        const metadataUrl = URL.createObjectURL(metadataBlob);
        urls.current = [videoUrl, metadataUrl];
        setResult({ video: videoUrl, metadata: metadataUrl, name: current.name, bytes: video.size, videoBlob:video, metadataBlob });
        setRecording(false);
        setStatus(video.size ? "Recording complete. Save locally or download both files." : "No video frames were encoded. Retry after the scene is rendering.");
      });
      recorder.start(1000);
      running.current = current;
      setElapsed(0);
      setRecording(true);
      setResult(null);
      setStatus("Recording the canvas. Navigate using the visible scene controls.");
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      setStatus(error instanceof Error ? error.message : "Recording could not start.");
    }
  }

  function stop() {
    const current = running.current;
    if (current && current.recorder.state !== "inactive") {
      setStatus("Finishing encoded video…");
      current.recorder.stop();
    }
  }

  async function saveLocally() {
    if(!result||saving)return;
    setSaving(true);setStatus("Saving video and metadata to the local report helper…");
    const files=[{name:`${result.name}.webm`,blob:result.videoBlob},{name:`${result.name}-metadata.json`,blob:result.metadataBlob}];
    const saved=await Promise.allSettled(files.map(async file=>{
      const response=await fetch(`http://127.0.0.1:4321/recording?name=${encodeURIComponent(file.name)}`,{
        method:"POST",headers:{"content-type":file.blob.type},body:file.blob,signal:AbortSignal.timeout(15_000),
      });
      if(!response.ok)throw new Error(`${file.name}: helper returned ${response.status}`);
      return file.name;
    }));
    if(!mounted.current)return;
    setSaving(false);
    const success=saved.filter((item):item is PromiseFulfilledResult<string>=>item.status==="fulfilled").map(item=>item.value);
    const errors=saved.filter((item):item is PromiseRejectedResult=>item.status==="rejected").map(item=>item.reason instanceof Error?item.reason.message:String(item.reason));
    setStatus(errors.length?`Saved ${success.length}/2 files. ${errors.join("; ")}`:`Saved locally: ${success.join(" and ")}`);
  }

  if (!enabled || !entered) return null;
  return <section className="v-review-recorder" aria-label="Local canvas recording controls" data-recording={recording}>
    <strong>LOCAL REVIEW · CANVAS VIDEO</strong>
    <p>Scene only; DOM and audio omitted. Media remains live.</p>
    <div>
      <button type="button" onClick={start} disabled={recording||saving}>Start recording</button>
      <button type="button" onClick={stop} disabled={!recording}>Stop recording</button>
      <button type="button" onClick={()=>setClean(true)}>Hide review UI (H)</button>
    </div>
    <output role="status">{recording ? `${elapsed.toFixed(1)}s · ` : ""}{status}</output>
    {result && <div className="v-review-recorder-downloads">
      <button type="button" onClick={saveLocally} disabled={saving||recording}>{saving?"Saving locally…":"Save locally"}</button>
      <a href={result.video} download={`${result.name}.webm`}>Download WebM ({(result.bytes / 1_000_000).toFixed(1)} MB)</a>
      <a href={result.metadata} download={`${result.name}-metadata.json`}>Download recording metadata</a>
    </div>}
  </section>;
}
