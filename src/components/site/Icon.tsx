import type { ReactNode } from "react";

/**
 * Inline line-icon set matching the approved reference — thin cyan strokes that
 * glow on dark. Icons inherit `currentColor` (set the parent to the accent) and
 * pick up a soft glow from the `.lg-icon` class. No external icon library.
 */

const S = 24;

const ICONS: Record<string, ReactNode> = {
  // AV engineering — connected signal nodes
  signal: (
    <>
      <circle cx="5" cy="6" r="2" /><circle cx="5" cy="18" r="2" /><circle cx="19" cy="12" r="2" />
      <path d="M7 6.6 17 11M7 17.4 17 13" />
    </>
  ),
  // Content & visuals — stacked layers
  layers: (
    <>
      <path d="M12 3 21 8l-9 5-9-5 9-5Z" /><path d="M3 12l9 5 9-5" /><path d="M3 16l9 5 9-5" />
    </>
  ),
  // Presentation
  presentation: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M12 16v4M8 20h8" /><path d="M7 12l3-3 2 2 4-4" />
    </>
  ),
  // LED grid
  grid: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="1.5" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </>
  ),
  // 3D / anamorphic cube
  cube: (
    <>
      <path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" /><path d="M3 7l9 5 9-5M12 12v10" />
    </>
  ),
  // Show control — mixer sliders
  sliders: (
    <>
      <path d="M6 3v18M12 3v18M18 3v18" />
      <rect x="4" y="7" width="4" height="3" rx="1" /><rect x="10" y="12" width="4" height="3" rx="1" /><rect x="16" y="6" width="4" height="3" rx="1" />
    </>
  ),
  // Projection — projector + beam
  projector: (
    <>
      <rect x="3" y="8" width="12" height="8" rx="1.5" /><circle cx="9" cy="12" r="2" /><path d="M15 10l6-2v8l-6-2" />
    </>
  ),
  // Immersive — surround
  immersive: (
    <>
      <circle cx="12" cy="12" r="3" /><path d="M12 3a9 9 0 0 1 0 18M12 3a9 9 0 0 0 0 18" opacity="0.9" /><path d="M3 12h3M18 12h3" />
    </>
  ),
  // Camera / live production
  camera: (
    <>
      <rect x="2" y="7" width="13" height="10" rx="1.5" /><path d="M15 10l6-3v10l-6-3" /><circle cx="8" cy="12" r="2.4" />
    </>
  ),
  // Virtual — globe
  globe: (
    <>
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  // Hybrid — linked venues
  hybrid: (
    <>
      <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="12" r="2.5" /><path d="M8.5 12h7" /><path d="M6 6v3M18 15v3" />
    </>
  ),
  // Broadcast / streaming — signal waves
  broadcast: (
    <>
      <circle cx="12" cy="12" r="2" /><path d="M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
    </>
  ),
  // Sound — speaker
  speaker: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10" />
    </>
  ),
  // Lighting — beam
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3Z" />
    </>
  ),
  // Web development — code
  code: (
    <>
      <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13 5l-2 14" />
    </>
  ),
  // Video processing — chip
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" /><rect x="10" y="10" width="4" height="4" rx="0.5" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  // Media server — rack
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="1.5" /><rect x="3" y="13" width="18" height="7" rx="1.5" /><path d="M7 7.5h.01M7 16.5h.01M11 7.5h6M11 16.5h6" />
    </>
  ),
  // Playback — play
  play: (
    <>
      <circle cx="12" cy="12" r="9" /><path d="M10 8.5 16 12l-6 3.5v-7Z" />
    </>
  ),
  // Switching — switch
  toggle: (
    <>
      <rect x="2" y="8" width="20" height="8" rx="4" /><circle cx="8" cy="12" r="2.5" />
    </>
  ),
  // Networking
  network: (
    <>
      <circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
      <path d="M12 7v4M12 11 5.5 17M12 11l6.5 6" />
    </>
  ),
  // Signal distribution — split
  split: (
    <>
      <circle cx="5" cy="12" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="19" cy="18" r="2" />
      <path d="M7 12h4l6-5M11 12l6 5" />
    </>
  ),
  // Accessories — plug
  plug: (
    <>
      <path d="M9 2v5M15 2v5" /><rect x="7" y="7" width="10" height="6" rx="2" /><path d="M12 13v4a3 3 0 0 1-3 3H7" />
    </>
  ),
  // Viewing distance — eye
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="2.5" />
    </>
  ),
  // Screen size — expand
  expand: (
    <>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </>
  ),
  // Brightness / outdoor — sun
  sun: (
    <>
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  // Indoor — building
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3" />
    </>
  ),
  // Budget — tag
  tag: (
    <>
      <path d="M3 12V4h8l9 9-8 8-9-9Z" /><circle cx="7.5" cy="7.5" r="1.3" />
    </>
  ),
  // generic fallback — spark
  spark: (
    <>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4" />
    </>
  ),
};

export type IconName = keyof typeof ICONS;

/** Which icon represents each service (by slug). */
export const SERVICE_ICON: Record<string, IconName> = {
  "av-engineering": "signal",
  "content-design": "layers",
  "presentation-content": "presentation",
  "led-display-rental": "grid",
  "3d-anamorphic": "cube",
  "show-control-media-server": "sliders",
  "projection-mapping": "projector",
  "immersive-experiences": "immersive",
  "live-production": "camera",
  "virtual-events": "globe",
  "hybrid-events": "hybrid",
  "broadcast-streaming": "broadcast",
  "professional-sound": "speaker",
  "professional-lighting": "bulb",
  "web-development": "code",
};

/** Which icon represents each equipment category (by name). */
export const EQUIPMENT_ICON: Record<string, IconName> = {
  LED: "grid",
  "Video Processing": "chip",
  "Media Servers": "server",
  "Playback & Show Control": "play",
  Switching: "toggle",
  Projection: "projector",
  Camera: "camera",
  Streaming: "broadcast",
  Sound: "speaker",
  Lighting: "bulb",
  Networking: "network",
  "Signal Distribution": "split",
  Accessories: "plug",
};

export default function Icon({
  name,
  size = S,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lg-icon ${className}`}
      aria-hidden
    >
      {ICONS[name] ?? ICONS.spark}
    </svg>
  );
}
