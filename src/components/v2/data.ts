import type { MotifKey } from "./motifs";

/**
 * V2 service architecture (brief §5) — grouped into professional categories.
 * Replaces the rejected flat "nine services" list. Featured services carry a
 * distinct motif for the editorial homepage story; the rest sit in-category.
 */
export interface V2Service {
  name: string;
  desc: string;
  motif?: MotifKey;
  tags?: string[];
  href: string;
}
export interface V2Category {
  key: string;
  title: string;
  blurb: string;
  services: V2Service[];
}

export const V2_CATEGORIES: V2Category[] = [
  {
    key: "av-visual",
    title: "AV & Visual",
    blurb: "Engineering the signal path and everything that plays across it.",
    services: [
      { name: "AV Engineering", desc: "The signal path — sources, processing, switching and screens — designed so the whole visual system stays up all show.", motif: "signal", tags: ["Signal design", "Processing", "Redundancy"], href: "/services/av-engineering" },
      { name: "LED Systems", desc: "Indoor, outdoor and floor walls — planned to pixel pitch, built to the room, installed and operated.", motif: "led", tags: ["Fine pitch", "Install", "Operate"], href: "/services/led-display-rental" },
      { name: "3D / Anamorphic", desc: "Naked-eye illusions built from the real viewing geometry, so content appears to leave the wall.", motif: "anamorphic", tags: ["Corner LED", "Perspective"], href: "/services/3d-anamorphic" },
      { name: "Projection Mapping", desc: "Projectors as light — warped and blended onto architecture and set.", motif: "projection", tags: ["Warp & blend", "Architecture"], href: "/services/projection-mapping" },
      { name: "Show Control / Media Server", desc: "Frame-accurate playback and cue stacks — one clean output, operated live.", motif: "cue", tags: ["Cue stack", "Media server"], href: "/services/show-control-media-server" },
      { name: "Content Design", desc: "Screen content built pixel-perfect for your exact canvas — never stretched to fit.", motif: "content", tags: ["Motion", "Presentation"], href: "/services/content-design" },
      { name: "Immersive Experiences", desc: "Full-surround environments where every surface is part of the story.", motif: "immersive", tags: ["Surround", "Spatial"], href: "/services/immersive-experiences" },
    ],
  },
  {
    key: "live",
    title: "Live Production",
    blurb: "Bringing every visual part of the event together, operated as one.",
    services: [
      { name: "Live Production", desc: "Cameras, screens, playback and cues — switched live, one point of technical responsibility.", motif: "switch", tags: ["Preview / Program", "Take"], href: "/services/live-production" },
      { name: "Broadcast / Streaming", desc: "Multi-camera mix, encoded and delivered to anywhere your audience is.", href: "/services/broadcast-streaming" },
      { name: "Hybrid Events", desc: "Physical and virtual audiences in one seamless, well-timed show.", href: "/services/hybrid-events" },
      { name: "Virtual Events", desc: "Fully-online productions with the same show discipline as the room.", href: "/services/virtual-events" },
    ],
  },
  {
    key: "collab",
    title: "Collaborative Systems",
    blurb: "The rest of the technical stage, coordinated with the picture.",
    services: [
      { name: "Sound", desc: "System design and operation that stays clean from soundcheck to strike.", href: "/services/professional-sound" },
      { name: "Lighting", desc: "Rig design and operation, motivated and cued with the screens.", href: "/services/professional-lighting" },
    ],
  },
  {
    key: "digital",
    title: "Digital",
    blurb: "The same craft, on the web.",
    services: [
      { name: "Web Development", desc: "Interactive, real-time web experiences — WebGL, motion and design systems — engineered like a show. This site is the proof.", motif: "web", tags: ["WebGL", "Real-time", "Design systems"], href: "/services/web-development" },
    ],
  },
];

/** Homepage nav links (2D DOM sections + real routes). */
export const V2_NAV = [
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "AV Lab", href: "/av-lab" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "#contact" },
];

/** Truthful capability studies for the homepage Work band (no fake clients). */
export const V2_WORK = [
  { name: "Stadium Festival Wall", meta: "Capability study · Live", sub: "220 m² main + side walls · media server · movers", motif: "led", span: "big" },
  { name: "Anamorphic Vehicle Reveal", meta: "Capability study · Product reveal", sub: "Naked-eye 3D corner wall", motif: "anamorphic", span: "small" },
  { name: "Panoramic Keynote Ribbon", meta: "Capability study · Conference", sub: "60 m panoramic ribbon · multi-server show control", motif: "content", span: "third" },
  { name: "Heritage Projection Mapping", meta: "Capability study · Cultural", sub: "Projection + LED hybrid · warp & blend", motif: "projection", span: "third" },
  { name: "Broadcast + Replay", meta: "Capability study · Sports", sub: "Scoreboard + ribbon · live replay", motif: "switch", span: "third" },
] as const;
