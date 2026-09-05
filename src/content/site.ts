/**
 * Single source of truth for LiveGridAV's real content.
 *
 * BOTH the immersive 3D experience (src/experience/scenes/*) and the classic
 * 2D fallback (src/components/*) import from here, so the two never drift.
 * Keep this file free of `three` / R3F imports — it's plain data consumed by
 * the light-weight server-rendered classic site too.
 */

/* ── Company ─────────────────────────────────────────── */
export const COMPANY = {
  name: "livegridAV",
  tagline: "Video walls that come to life.",
  intro:
    "LiveGridAV designs, builds and operates LED displays, show control and full event technology — turning any stage, wall or storefront into a living signal.",
  headline: "POWERING EVENTS WITH BRILLIANT VISUAL EXPERIENCES",
} as const;

/* ── Services (mirrors the 3D services cylinder) ─────── */
export interface Service {
  name: string;
  desc: string;
  /** demo tag used by the 3D center-stage demonstration */
  demo: "wall" | "timeline" | "converge" | "mix" | "morph" | "popout" | "orbit";
}

export const SERVICES: Service[] = [
  { name: "LED Display Rental", desc: "Indoor & outdoor walls, any size, installed and operated.", demo: "wall" },
  { name: "Watchout Programming", desc: "Frame-accurate multi-display shows, programmed and operated.", demo: "timeline" },
  { name: "Live Streaming", desc: "Multi-camera broadcast, mixed and delivered anywhere.", demo: "converge" },
  { name: "VJ Service", desc: "Live visuals performed in sync with your show.", demo: "mix" },
  { name: "Motion Graphics", desc: "Content built pixel-perfect for your exact screen.", demo: "morph" },
  { name: "Naked Eye 3D", desc: "Anamorphic illusions that leap off the wall.", demo: "popout" },
  { name: "Video Editing", desc: "Aftermovies, openers and screen content, cut to the beat.", demo: "timeline" },
  { name: "Hybrid Events", desc: "Physical and virtual audiences, one seamless show.", demo: "converge" },
  { name: "Equipment Rental", desc: "Processors, servers, switchers — tested and show-ready.", demo: "orbit" },
];

/* ── Track record (mirrors the 3D stat pillars) ──────── */
export interface Stat {
  value: number;
  suffix: string;
  label: string;
  story: string;
}

// Technical capability parameters (NOT track-record counts) — each is a truthful
// range/mode of what we build, confirmed per project. No unverified company
// metrics (no fabricated years/events/uptime claims).
export const STATS: Stat[] = [
  { value: 4, suffix: " mm", label: "Fine-pitch LED", story: "Down to fine indoor pixel pitch — planned to the audience and confirmed per venue." },
  { value: 360, suffix: "°", label: "Immersive & anamorphic", story: "Naked-eye 3D, projection mapping and full-surround environments." },
  { value: 1, suffix: " team", label: "For the whole show", story: "AV, content, LED and show control — designed and operated as one." },
];

/* ── Projects (mirrors the 3D projects city) ─────────── */
export interface Project {
  name: string;
  client: string;
  location: string;
  year: string;
  led: string;
  gear: string;
  /** inner-light accent used by the 3D cube + classic card tint */
  vibe: string;
}

// Capability demonstrations — the KINDS of shows LiveGridAV builds, not client
// case studies. No fabricated clients, named venues or delivery dates. `client`
// is the sector/context, `location` the venue scale, `year` the concept label.
// Natural accent tones (not cyan) reinforce the material palette.
export const PROJECTS: Project[] = [
  { name: "Stadium Festival Wall", client: "Concert & festival", location: "Stadium-scale", year: "Concept", led: "220 m² main + side walls", gear: "Media server · LED processing · movers", vibe: "#d98a3a" },
  { name: "Anamorphic Vehicle Reveal", client: "Product reveal", location: "Corner LED", year: "Concept", led: "Naked-eye 3D corner wall", gear: "Anamorphic content · media server", vibe: "#e0a94a" },
  { name: "Panoramic Keynote Ribbon", client: "Conference & keynote", location: "Ballroom-scale", year: "Concept", led: "60 m panoramic ribbon", gear: "Multi-server show control · live relay", vibe: "#9aa0ae" },
  { name: "Arena EDM Floor + Ring", client: "Club & touring", location: "Arena-scale", year: "Concept", led: "LED floor + 360° ring", gear: "VJ rig · lasers · high-output", vibe: "#b0684a" },
  { name: "Heritage Projection Mapping", client: "Cultural & gala", location: "Open-air courtyard", year: "Concept", led: "Projection + LED hybrid", gear: "Warp & blend · fine-pitch wall", vibe: "#c98a4a" },
  { name: "Hybrid Expo Backbone", client: "Exhibition & hybrid", location: "Expo-scale", year: "Concept", led: "Multiple booth walls, one control", gear: "Video-over-IP · streaming", vibe: "#6f8f7a" },
  { name: "Sports Ribbon + Replay", client: "Sports & live", location: "Indoor arena", year: "Concept", led: "Scoreboard + ribbon boards", gear: "Live replay · slow-motion", vibe: "#a8683a" },
  { name: "Seamless Event Backdrop", client: "Ceremony & private", location: "Private venue", year: "Concept", led: "Invisible-seam backdrop", gear: "Fine pitch · quiet operation", vibe: "#9a7a5a" },
  { name: "Touring LED System", client: "Multi-city tour", location: "Multi-venue", year: "Concept", led: "Flight-cased 80 m² system", gear: "Full chain, repeatable build", vibe: "#7f8a6a" },
];

/* ── Equipment / signal chain (mirrors the 3D lab) ────── */
export interface Gear {
  name: string;
  role: string;
}

export const EQUIPMENT: Gear[] = [
  { name: "Media Server", role: "Playback & effects engine" },
  { name: "Watchout Server", role: "Show control & timeline" },
  { name: "LED Processor", role: "Pixel-perfect scaling" },
  { name: "Video Switcher", role: "Live program mixing" },
  { name: "NovaStar Processor", role: "LED image processing" },
  { name: "LED Controller", role: "Wall mapping & drive" },
  { name: "Signal Converter", role: "Any format, anywhere" },
  { name: "Line Array PA", role: "Flown sound system" },
];

/* ── How we work ─────────────────────────────────────── */
export const PROCESS = [
  { n: "01", title: "Discover", body: "We map your venue, audience, run of show, and the content you want on screen." },
  { n: "02", title: "Engineer", body: "Pixel pitch, rigging, power, signal chain and redundancy — spec'd to the venue." },
  { n: "03", title: "Show", body: "Clean build, color-calibrated, programmed in Watchout and operated live on the day." },
  { n: "04", title: "Wrap", body: "Aftermovie, content archive, clean strike, and support for the next one." },
] as const;
