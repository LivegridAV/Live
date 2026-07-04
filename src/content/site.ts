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

export const STATS: Stat[] = [
  { value: 10, suffix: "+", label: "Years Experience", story: "A decade of shows — from ballroom launches to stadium stages." },
  { value: 500, suffix: "+", label: "Events Delivered", story: "Concerts, summits, weddings, product reveals. All on time, all on cue." },
  { value: 100, suffix: "%", label: "Nationwide Operations", story: "Crew, trucking and gear that reach every corner of the country." },
  { value: 24, suffix: "/7", label: "Technical Team", story: "Engineers on comms before doors, during show, and after strike." },
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

export const PROJECTS: Project[] = [
  { name: "Skyline Music Fest", client: "Pulse Live", location: "National Stadium", year: "2025", led: "220 m² main + wings", gear: "Watchout · NovaStar · 24 movers", vibe: "#3fd6c8" },
  { name: "Nova Auto Launch", client: "Nova Motors", location: "Convention Centre", year: "2025", led: "Naked-eye 3D corner wall", gear: "Anamorphic content · media server", vibe: "#e8b84a" },
  { name: "Summit ONE Keynote", client: "GovTech Forum", location: "Grand Ballroom", year: "2024", led: "60 m panoramic ribbon", gear: "3-server Watchout · live relay", vibe: "#7fb8ff" },
  { name: "Neon City EDM Night", client: "Bassline Events", location: "Waterfront Arena", year: "2024", led: "LED floor + 360° ring", gear: "VJ rig · lasers · 40k lumens", vibe: "#e84ad4" },
  { name: "Heritage Gala", client: "National Museum", location: "Open-air Courtyard", year: "2024", led: "Projection + LED hybrid", gear: "Mapping · fine-pitch wall", vibe: "#ffb35c" },
  { name: "Hybrid Product Expo", client: "TechBridge", location: "Expo Hall 3", year: "2023", led: "12 booth walls, one control", gear: "NDI backbone · streaming", vibe: "#69e0a0" },
  { name: "Championship Finals", client: "ProLeague", location: "Indoor Arena", year: "2023", led: "Scoreboard + ribbon boards", gear: "Live replay · slow-mo", vibe: "#ff7a6a" },
  { name: "Royal Wedding Show", client: "Private Client", location: "Palace Gardens", year: "2023", led: "Invisible-seam backdrop", gear: "Fine pitch · silent ops", vibe: "#cfa9ff" },
  { name: "Brand World Tour", client: "Meridian Group", location: "6 Cities", year: "2022", led: "Touring 80 m² system", gear: "Flight-cased full chain", vibe: "#3fd6c8" },
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
  { n: "04", title: "Wrap", body: "Aftermovie, content archive, strike, and 24/7 support for the next one." },
] as const;
