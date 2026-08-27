"use client";
import { useState } from "react";

/**
 * Educational LED planning selector (brief §17). It gives *planning guidance*
 * from well-known rules of thumb — never a product or an inventory claim. The
 * disclaimer is always shown; the real specification is confirmed after review.
 */

type Env = "indoor" | "outdoor";

function plan(env: Env, distance: number, width: number, height: number, camera: boolean) {
  // Rule of thumb: comfortable pixel pitch (mm) ≈ closest viewing distance (m).
  let pitch = distance;
  if (camera) pitch -= 1; // cameras resolve pixels — go finer
  if (env === "outdoor") pitch = Math.max(pitch, 4); // outdoor rarely goes very fine
  pitch = Math.min(Math.max(pitch, env === "indoor" ? 1.5 : 3), 16);
  pitch = Math.round(pitch * 10) / 10;

  const wPx = Math.round((width * 1000) / pitch);
  const hPx = Math.round((height * 1000) / pitch);

  let category: string;
  if (pitch < 2.5) category = "Fine-pitch indoor LED";
  else if (pitch < 4) category = "Standard indoor LED";
  else if (pitch < 6.5) category = env === "outdoor" ? "Outdoor LED" : "Large-format indoor LED";
  else category = "Long-throw / outdoor LED";

  const viewing =
    pitch < 2.5
      ? "Sharp at close range — good for cameras and audiences near the screen."
      : pitch < 4
        ? "Crisp for typical indoor audiences a few metres back."
        : pitch < 6.5
          ? "Best read from a comfortable distance; ideal for larger rooms and outdoor crowds."
          : "Designed for distance — reads cleanly from far back and outdoors.";

  return {
    pitch,
    category,
    resolution: `~${wPx.toLocaleString()} × ${hPx.toLocaleString()} px`,
    viewing,
  };
}

export default function PixelPitchTool() {
  const [env, setEnv] = useState<Env>("indoor");
  const [distance, setDistance] = useState(4);
  const [width, setWidth] = useState(6);
  const [height, setHeight] = useState(3.5);
  const [camera, setCamera] = useState(false);

  const result = plan(env, distance, width, height, camera);

  return (
    <div className="grid gap-8 rounded-[24px] border border-line bg-white p-7 md:grid-cols-2 md:p-9">
      {/* inputs */}
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">LED planner</p>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.01em] text-text">
          Rough out your screen
        </h3>

        <div className="mt-6 space-y-6">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              Environment
            </span>
            <div className="mt-2 flex gap-2">
              {(["indoor", "outdoor"] as Env[]).map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={env === e}
                  onClick={() => setEnv(e)}
                  className={`rounded-lg px-4 py-2 text-sm capitalize transition-colors ${
                    env === e ? "bg-aqua text-white" : "border border-line text-muted hover:border-aqua"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <Slider label="Closest viewing distance" value={distance} min={1} max={30} step={0.5} unit="m" onChange={setDistance} />
          <Slider label="Screen width" value={width} min={1} max={30} step={0.5} unit="m" onChange={setWidth} />
          <Slider label="Screen height" value={height} min={1} max={15} step={0.5} unit="m" onChange={setHeight} />

          <label className="flex items-center gap-3 text-sm text-text">
            <input
              type="checkbox"
              checked={camera}
              onChange={(e) => setCamera(e.target.checked)}
              className="h-4 w-4 accent-[var(--aqua)]"
            />
            Cameras will film the screen
          </label>
        </div>
      </div>

      {/* result */}
      <div className="flex flex-col rounded-[18px] bg-ink p-7 text-text-inv">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-glow">Likely category</p>
        <p className="mt-2 text-2xl font-semibold tracking-[-0.01em]">{result.category}</p>

        <dl className="mt-6 space-y-4 text-sm">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Guide pixel pitch</dt>
            <dd className="mt-1 text-text-inv/85">~{result.pitch} mm</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Approx. resolution</dt>
            <dd className="mt-1 text-text-inv/85">{result.resolution}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Expected viewing</dt>
            <dd className="mt-1 leading-relaxed text-text-inv/70">{result.viewing}</dd>
          </div>
        </dl>

        <p className="mt-6 border-t border-ink-soft pt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-faint">
          Planning guidance only. Final LED specification is confirmed after technical review.
        </p>
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, unit, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">{label}</span>
        <span className="font-mono text-sm text-aqua">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-2 w-full accent-[var(--aqua)]"
      />
    </div>
  );
}
