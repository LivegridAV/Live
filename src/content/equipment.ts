/**
 * Equipment directory — an educational technical reference, not a catalogue or
 * shop (brief §30). Each category explains what it does in plain language first,
 * then names relevant technology only where it helps. No invented inventory or
 * counts; sound/lighting name no manufacturer brands (coordinated with partners).
 * Unreal Engine is NOT listed here — it lives under content creation.
 */

export interface EquipmentCategory {
  name: string;
  what: string;
  /** relevant technology names, shown where useful (never for sound/lighting brands) */
  tech: string[];
  /** related service slug for "learn more" */
  service?: string;
}

export const EQUIPMENT_DIRECTORY: EquipmentCategory[] = [
  {
    name: "LED",
    what: "The screen itself — panels that tile together into one big display, for indoor or outdoor use.",
    tech: [],
    service: "led-display-rental",
  },
  {
    name: "Video Processing",
    what: "Prepares, scales and routes video correctly across one or many LED screens.",
    tech: ["PixelHue", "NovaStar", "Magnimaze"],
    service: "av-engineering",
  },
  {
    name: "Media Servers",
    what: "Store and play the content, with effects and multiple synchronised outputs.",
    tech: [],
    service: "show-control-media-server",
  },
  {
    name: "Playback & Show Control",
    what: "Runs the timeline and fires cues so the right content plays on time, every time.",
    tech: ["Watchout", "Resolume Arena"],
    service: "show-control-media-server",
  },
  {
    name: "Switching",
    what: "Mixes live sources — cameras, laptops, playback — into one clean program output.",
    tech: ["Blackmagic"],
    service: "live-production",
  },
  {
    name: "Projection",
    what: "Projectors and processing for mapped, blended and large-format images.",
    tech: [],
    service: "projection-mapping",
  },
  {
    name: "Camera",
    what: "Captures the event for the screens, the stream and the recording.",
    tech: ["Blackmagic"],
    service: "broadcast-streaming",
  },
  {
    name: "Streaming",
    what: "Encodes and delivers the program reliably to online platforms.",
    tech: [],
    service: "broadcast-streaming",
  },
  {
    name: "Sound",
    what: "Speakers, consoles and microphones — planned and delivered with trusted specialist partners.",
    tech: [],
    service: "professional-sound",
  },
  {
    name: "Lighting",
    what: "Fixtures and control that shape the mood of the room — coordinated with trusted partners.",
    tech: [],
    service: "professional-lighting",
  },
  {
    name: "Networking",
    what: "The backbone that moves video and control data around the show reliably.",
    tech: [],
    service: "av-engineering",
  },
  {
    name: "Signal Distribution",
    what: "Splits, converts and extends signals so every screen gets the right feed.",
    tech: ["Blackmagic"],
    service: "av-engineering",
  },
  {
    name: "Accessories",
    what: "Cabling, rigging, power and the small parts that keep a show dependable.",
    tech: [],
  },
];
