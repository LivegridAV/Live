/**
 * Service catalogue — the single source of truth for every /services/[slug] page.
 *
 * One data model → one dynamic route + one template → many real pages. Adding a
 * service later means adding an entry here, nothing else. Keep this file free of
 * `three` / React imports: it is plain data consumed by server-rendered pages
 * for SEO, and by the classic components.
 *
 * Copy rules (from the brand + AGENTS brief):
 *  - Plain language first; explain any jargon in one sentence.
 *  - No fabricated stats, clients or inventory. Where a real figure would be
 *    needed but isn't verified, omit it rather than invent one.
 *  - Show Control combines VJ / Watchout / media-server / AV-console operation.
 *  - Unreal Engine only ever appears as a content-creation tool, never as gear.
 *  - LED specifications are always "confirmed after technical review".
 */

export type ServiceGroup =
  | "AV & Visual"
  | "Live Production"
  | "Collaborative"
  | "Digital";

export interface ServiceFaq {
  q: string;
  a: string;
}

export interface ServiceWorkflowStep {
  step: string;
  body: string;
}

export interface ServiceDetail {
  slug: string;
  /** two-digit rail number, e.g. "01" */
  order: string;
  group: ServiceGroup;
  /** mono eyebrow label, uppercase */
  eyebrow: string;
  title: string;
  /** one-line hero supporting sentence */
  tagline: string;
  /** plain-language "what is this" paragraph */
  plain: string;
  whatWeDo: string[];
  whereUsed: string[];
  workflow: ServiceWorkflowStep[];
  capability: string[];
  /** related systems / technology — names only, shown as an educational list */
  systems: string[];
  /** node labels for the animated signal-flow "live visual" */
  flow: string[];
  faq: ServiceFaq[];
  /** slugs of related services (must exist in this file) */
  related: string[];
  metaTitle: string;
  metaDescription: string;
}

export const SERVICE_GROUPS: { id: ServiceGroup; label: string; blurb: string }[] = [
  {
    id: "AV & Visual",
    label: "AV & Visual",
    blurb: "The core: engineering the signal path and creating what plays across it.",
  },
  {
    id: "Live Production",
    label: "Live Production",
    blurb: "Bringing every part together and operating it live.",
  },
  {
    id: "Collaborative",
    label: "Collaborative Services",
    blurb: "Sound and lighting, coordinated with trusted specialist partners.",
  },
  {
    id: "Digital",
    label: "Digital",
    blurb: "The same creative-technical thinking, brought into the browser.",
  },
];

export const SERVICES: ServiceDetail[] = [
  /* ── 01 · AV Engineering ─────────────────────────────── */
  {
    slug: "av-engineering",
    order: "01",
    group: "AV & Visual",
    eyebrow: "AV Engineering",
    title: "AV Engineering",
    tagline: "The signal path, designed so the whole visual system stays up all show.",
    plain:
      "We plan how every screen, processor, computer, camera and signal connects, so the entire visual system works reliably from doors to strike. When something has to be right the first time and every time, the engineering is what makes that possible.",
    whatWeDo: [
      "Map the full signal path — source, switching, playback, processing, output.",
      "Choose resolutions and screen mapping that match the real LED or projection canvas.",
      "Configure processors and switchers, and plan clean signal distribution.",
      "Build in redundancy and backup paths for anything that can't drop.",
      "Test the whole chain before the audience arrives, and operate it live.",
    ],
    whereUsed: [
      "Corporate conferences and keynotes with multiple screens",
      "Concerts and festivals with large LED and camera feeds",
      "Product launches where timing and reliability are everything",
      "Multi-room and multi-venue shows sharing one control position",
    ],
    workflow: [
      { step: "Source", body: "Laptops, media servers, cameras and remote feeds — every input accounted for." },
      { step: "Switching", body: "Live program mixing so the right source is on screen at the right moment." },
      { step: "Playback", body: "Frame-accurate content from the media server, cued to the run of show." },
      { step: "Processing", body: "Scaling and mapping the image to the exact pixel layout of the wall." },
      { step: "Output", body: "Clean program to the LED, projectors and any streaming encoder." },
    ],
    capability: [
      "System design and single-line signal diagrams",
      "Resolution planning and screen mapping",
      "Processor and switcher configuration",
      "Signal distribution over SDI, HDMI, fibre and IP",
      "Redundancy, failover and backup playback",
      "Pre-show testing, troubleshooting and live technical operation",
    ],
    systems: ["PixelHue", "NovaStar", "Magnimaze", "Blackmagic"],
    flow: ["Source", "Switch", "Media Server", "Processor", "LED / Projection", "Program"],
    faq: [
      {
        q: "What does an AV engineer actually do at an event?",
        a: "We design and run the signal system — everything that gets a picture from a laptop, camera or media server onto the screens correctly and reliably, and we keep it working live.",
      },
      {
        q: "Do you plan redundancy?",
        a: "Yes. For anything that can't fail we plan backup playback and failover paths so a single fault never takes the show down.",
      },
      {
        q: "Can you work with our existing screens or crew?",
        a: "Yes — we can engineer the signal system around gear and teams already on site, or supply the full chain ourselves.",
      },
    ],
    related: ["show-control-media-server", "led-display-rental", "live-production"],
    metaTitle: "AV Engineering — Signal Design & Live Technical Operation | LiveGridAV",
    metaDescription:
      "LiveGridAV plans and operates the complete AV signal path — sources, switching, media servers, processing and redundant output — so your visual system stays reliable all show.",
  },

  /* ── 02 · Content & Visual Production ────────────────── */
  {
    slug: "content-design",
    order: "02",
    group: "AV & Visual",
    eyebrow: "Content & Visuals",
    title: "Content & Visual Production",
    tagline: "Content built pixel-perfect for your exact screen — not stretched to fit it.",
    plain:
      "We design and build the visuals that play on the wall: stage graphics, motion graphics, 3D animation, anamorphic content and presentation visuals made for the real resolution of your screen. Great content is what turns a big display into a moment people remember.",
    whatWeDo: [
      "Stage visuals, event graphics and branded loops built to your screen's exact pixels.",
      "Motion graphics and 3D animation, including real-time content made in Unreal Engine.",
      "Anamorphic and naked-eye 3D content designed for the intended viewing position.",
      "Speaker screens, countdowns, award sequences, sponsor loops and title reveals.",
      "Custom-resolution content for ribbons, columns, floors and multi-screen layouts.",
    ],
    whereUsed: [
      "Keynotes and conferences that need a designed stage look",
      "Product reveals and brand launches",
      "Award shows, galas and ceremonies",
      "Concerts, festivals and live shows",
    ],
    workflow: [
      { step: "Idea", body: "We start from the story, the venue and the screen you're playing on." },
      { step: "Design", body: "Style frames and layouts set the look before a single second is animated." },
      { step: "3D / Motion", body: "Animation and real-time scenes built to the exact canvas." },
      { step: "Format", body: "Exported to the precise resolution and codec your playback needs." },
      { step: "Test", body: "Checked on the real screen or a matched preview before show day." },
    ],
    capability: [
      "Motion graphics and 3D animation",
      "Real-time content (Unreal Engine) as a creation tool",
      "Anamorphic / naked-eye 3D content",
      "Custom and ultra-wide resolutions",
      "Presentation redesign for large LED — see Presentation Content",
      "Show-ready exports in the right codec and colour space",
    ],
    systems: ["Unreal Engine", "Media Server Playback"],
    flow: ["Idea", "Design", "3D / Motion", "Format", "Test", "Playback"],
    faq: [
      {
        q: "Do you build content for our specific screen size?",
        a: "Yes. We build to the real pixel dimensions of your wall or ribbon so nothing is stretched, cropped or soft.",
      },
      {
        q: "Is Unreal Engine a rental service?",
        a: "No — Unreal Engine is one of the tools we use to create real-time visual content. It's part of content production, not equipment we rent.",
      },
      {
        q: "Can you redesign our PowerPoint for a big stage screen?",
        a: "Yes. That's a dedicated capability — we rebuild presentations so they're designed for the stage instead of stretched across it.",
      },
    ],
    related: ["presentation-content", "3d-anamorphic", "led-display-rental"],
    metaTitle: "Content & Visual Production — Stage Graphics, Motion & 3D | LiveGridAV",
    metaDescription:
      "LiveGridAV designs and builds visuals for the exact resolution of your screen — motion graphics, 3D and real-time content, anamorphic sequences and stage presentation visuals.",
  },

  /* ── 03 · Presentation Content (SEO landing) ─────────── */
  {
    slug: "presentation-content",
    order: "03",
    group: "AV & Visual",
    eyebrow: "Presentation Content",
    title: "Presentation & PPT Content for LED",
    tagline: "Presentations redesigned for the stage — not stretched across a giant display.",
    plain:
      "We redesign normal presentations for large LED screens so the content feels designed for the stage instead of simply blown up to fit it. Slides made for a laptop rarely hold up on a 20-metre wall; we rebuild them so they read clearly and look intentional.",
    whatWeDo: [
      "PowerPoint and Keynote redesign for large-format and ultra-wide screens.",
      "Multi-screen and stage-specific aspect-ratio layouts.",
      "Speaker layouts, award sequences and sponsor screens.",
      "Title graphics and video integrated cleanly into the slide flow.",
      "Cue-friendly structures that are easy to operate live.",
    ],
    whereUsed: [
      "Conference and summit keynotes",
      "Corporate town halls and AGMs",
      "Award ceremonies and sponsor moments",
      "Panel sessions and speaker-led events",
    ],
    workflow: [
      { step: "Audit", body: "We review the existing deck against the real screen shape and size." },
      { step: "Redesign", body: "Layouts, type and hierarchy rebuilt for the stage." },
      { step: "Integrate", body: "Video, titles and builds folded into a single clean flow." },
      { step: "Cue", body: "Structured so operators can run it accurately during the show." },
    ],
    capability: [
      "Ultra-wide and multi-screen slide layouts",
      "Stage aspect-ratio design",
      "Video + presentation integration",
      "Speaker, award and sponsor templates",
      "Operator-friendly cue structures",
    ],
    systems: ["Media Server Playback"],
    flow: ["Deck", "Audit", "Redesign", "Stage Layout", "Cue", "Screen"],
    faq: [
      {
        q: "Why can't we just use our normal slides on the big screen?",
        a: "Slides built for a laptop are the wrong shape and scale for a wide stage wall. Stretched, they look soft and unbalanced. We rebuild them for the real screen so they look designed for it.",
      },
      {
        q: "Do you keep our branding?",
        a: "Yes — we work within your brand and templates, and improve how they translate to a large stage format.",
      },
    ],
    related: ["content-design", "show-control-media-server", "live-production"],
    metaTitle: "Presentation & PPT Content for Large LED Screens | LiveGridAV",
    metaDescription:
      "LiveGridAV redesigns presentations for large stage LED — ultra-wide and multi-screen layouts, speaker and award sequences, and cue-friendly structures built for live shows.",
  },

  /* ── 04 · LED Display Solutions ──────────────────────── */
  {
    slug: "led-display-rental",
    order: "04",
    group: "AV & Visual",
    eyebrow: "LED Displays",
    title: "LED Display Solutions",
    tagline: "Indoor, outdoor, floor and creative LED — engineered to the venue, operated live.",
    plain:
      "LED is a wall of light made from small panels that join into one big screen. The right configuration depends on how far the audience sits, how big the screen is, whether it's indoor or outdoor and whether cameras are involved. We plan, build and operate it around your event — not from a fixed catalogue.",
    whatWeDo: [
      "Indoor and outdoor event LED at the scale the venue needs.",
      "Floor LED, stage LED and creative shapes — columns, cubes and custom canvases.",
      "Curved and multi-surface configurations where the project calls for it.",
      "Camera-friendly setups that look right on screen as well as in the room.",
      "Processor configuration, content testing and live operation.",
    ],
    whereUsed: [
      "Conferences, keynotes and corporate stages",
      "Concerts, festivals and arena shows",
      "Exhibitions, retail and brand activations",
      "Outdoor events and large public screens",
    ],
    workflow: [
      { step: "Brief", body: "Audience, venue, indoor/outdoor and whether cameras are in play." },
      { step: "Spec", body: "Screen size, layout and the right panel type for the viewing distance." },
      { step: "Build", body: "Rigging or ground support, clean cabling and a calibrated wall." },
      { step: "Drive", body: "Processor mapping so content lands pixel-accurate across every panel." },
      { step: "Operate", body: "Content tested and the wall run live through the show." },
    ],
    capability: [
      "Indoor and outdoor event LED",
      "Floor, stage and creative LED",
      "Curved and custom canvas layouts",
      "Camera-friendly brightness and calibration",
      "Processor configuration and pixel mapping",
      "Content testing and live operation",
    ],
    systems: ["NovaStar", "PixelHue", "Magnimaze"],
    flow: ["Content", "Media Server", "Processor", "Pixel Mapping", "LED Panels", "Wall"],
    faq: [
      {
        q: "What pixel pitch do I need?",
        a: "It depends on how close the audience sits, the screen size and whether cameras are used. Smaller pitch is sharper up close. We recommend a category after a technical review of your event — final specification is confirmed then.",
      },
      {
        q: "What is floor LED?",
        a: "Floor LED turns part of the physical stage into an active digital surface that performers can walk across while content plays and reacts underfoot.",
      },
      {
        q: "Indoor vs outdoor LED — what's the difference?",
        a: "Outdoor LED is brighter and weather-rated for daylight and the elements; indoor LED prioritises image quality for controlled rooms. We match the type to the environment.",
      },
    ],
    related: ["3d-anamorphic", "av-engineering", "projection-mapping"],
    metaTitle: "LED Display Solutions — Indoor, Outdoor, Floor & Creative LED | LiveGridAV",
    metaDescription:
      "LiveGridAV plans, builds and operates event LED — indoor, outdoor, floor, stage and creative walls — engineered to the venue and viewing distance, with specs confirmed after technical review.",
  },

  /* ── 05 · 3D / Anamorphic Content ────────────────────── */
  {
    slug: "3d-anamorphic",
    order: "05",
    group: "AV & Visual",
    eyebrow: "3D / Anamorphic",
    title: "3D & Anamorphic Content",
    tagline: "Flat screens that appear to have real depth — objects that leap off the wall.",
    plain:
      "Anamorphic content uses perspective so a flat display looks like it has real depth from the intended viewing position. Done well, an object seems to break past the edge of the screen. It works best from the spot the illusion is designed for — which is exactly what we plan around.",
    whatWeDo: [
      "Design naked-eye 3D sequences for corner and L-shaped LED walls.",
      "Build the illusion around a specific camera or audience viewpoint.",
      "Animate objects, products, vehicles and creatures that break the screen plane.",
      "Combine depth, particles and lighting so the effect reads as premium, not gimmicky.",
      "Deliver at the exact resolution and geometry of your wall.",
    ],
    whereUsed: [
      "Product and vehicle reveals",
      "Brand activations and retail spectaculars",
      "Corner LED walls in lobbies and exhibitions",
      "Stage moments that need a wow beat",
    ],
    workflow: [
      { step: "Viewpoint", body: "We fix the position the illusion is designed to be seen from." },
      { step: "Model", body: "3D scene built with the right perspective for that viewpoint." },
      { step: "Break", body: "The object is choreographed to appear beyond the screen edge." },
      { step: "Finish", body: "Depth, particles and light grade the effect to feel real." },
      { step: "Map", body: "Rendered to the exact geometry of the corner or wall." },
    ],
    capability: [
      "Naked-eye 3D for corner and L-shaped walls",
      "Viewpoint-accurate perspective design",
      "Product, vehicle and object choreography",
      "Depth, particle and lighting integration",
      "Exact-geometry delivery",
    ],
    systems: ["Unreal Engine", "Media Server Playback"],
    flow: ["Viewpoint", "3D Scene", "Perspective", "Render", "Corner LED", "Illusion"],
    faq: [
      {
        q: "What is anamorphic / naked-eye 3D content?",
        a: "It's content designed with forced perspective so a flat LED wall looks like it has real depth from a chosen viewing position — no glasses needed.",
      },
      {
        q: "Why does it look best from one spot?",
        a: "The perspective is built for a specific viewpoint. From that position the depth is convincing; from far to the side the trick is visible. We plan the design and camera around the best vantage point.",
      },
    ],
    related: ["content-design", "led-display-rental", "immersive-experiences"],
    metaTitle: "3D & Anamorphic Content — Naked-Eye 3D for LED Walls | LiveGridAV",
    metaDescription:
      "LiveGridAV designs naked-eye 3D and anamorphic content that appears to break past the LED — viewpoint-accurate perspective, choreographed objects and exact-geometry delivery.",
  },

  /* ── 06 · Show Control & Media Server Operations ─────── */
  {
    slug: "show-control-media-server",
    order: "06",
    group: "AV & Visual",
    eyebrow: "Show Control",
    title: "Show Control & Media Server Operations",
    tagline: "The right content, in the right place, at the right moment — operated live.",
    plain:
      "Equipment alone doesn't run a show. We operate the playback, screens and visual cues live — so the right content appears in the right place at exactly the right moment. This one discipline covers VJ, Resolume, Watchout, media-server and AV-console operation.",
    whatWeDo: [
      "Live media-server operation and multi-output playback.",
      "VJ and Resolume Arena performance, mixing visuals in sync with the show.",
      "Watchout timeline programming across multiple displays and projectors.",
      "AV-console operation, screen routing and live content switching.",
      "Edge-blended output, LED canvas mapping and backup playback.",
    ],
    whereUsed: [
      "Concerts, festivals and club shows (VJ / Resolume)",
      "Corporate keynotes and multi-screen conferences (Watchout)",
      "Product launches with tightly cued content",
      "Any show with more than one output to keep in sync",
    ],
    workflow: [
      { step: "Prepare", body: "Content loaded, mapped and cued against the run of show." },
      { step: "Program", body: "Timelines and cue lists built for every screen and moment." },
      { step: "Preview", body: "Program and preview monitors confirm what's next before it's live." },
      { step: "Operate", body: "Cues fired live, content switched, outputs monitored." },
      { step: "Backup", body: "A redundant playback path ready if the primary ever drops." },
    ],
    capability: [
      "Media-server operation and multi-output playback",
      "VJ / Resolume Arena live visuals",
      "Watchout timeline and multi-display programming",
      "AV-console operation and screen routing",
      "Edge blending, LED canvas mapping and unusual resolutions",
      "Cue execution, output monitoring and backup playback",
    ],
    systems: ["Watchout", "Resolume Arena", "PixelHue", "Blackmagic"],
    flow: ["Content", "Cue List", "Media Server", "Routing", "Outputs", "Screens"],
    faq: [
      {
        q: "What does a media-server operator do?",
        a: "They run the playback system live — loading content, firing cues and switching what's on each screen so the visuals hit exactly on time with the show.",
      },
      {
        q: "Watchout or Resolume — which do you use?",
        a: "Both, for different jobs. Watchout suits timeline-based, multi-display shows like keynotes; Resolume suits live, performed visuals like concerts and club nights. We pick the tool that fits the show.",
      },
      {
        q: "Do you provide backup during the show?",
        a: "Yes. For critical shows we run a redundant playback path so the program keeps going even if the primary machine fails.",
      },
    ],
    related: ["av-engineering", "content-design", "live-production"],
    metaTitle: "Show Control & Media Server Operations — VJ, Watchout, Resolume | LiveGridAV",
    metaDescription:
      "LiveGridAV operates the show live — media servers, VJ / Resolume, Watchout timelines and AV-console routing — so the right content plays on the right screen at the right moment.",
  },

  /* ── 07 · Projection Mapping ─────────────────────────── */
  {
    slug: "projection-mapping",
    order: "07",
    group: "AV & Visual",
    eyebrow: "Projection Mapping",
    title: "Projection Mapping",
    tagline: "Content shaped to the real surface, so the building or stage becomes the animation.",
    plain:
      "We shape the visual content around a real surface — a building, a stage, an object — so it becomes part of the animation instead of a flat picture projected onto it. The surface is measured, the content is warped to fit, and multiple projectors are blended into one seamless image.",
    whatWeDo: [
      "Building and architectural façade mapping.",
      "Stage, set and scenic mapping.",
      "Object and product mapping for reveals.",
      "Edge blending across multiple projectors into one image.",
      "Warping content to curved and irregular surfaces.",
    ],
    whereUsed: [
      "Building façade and heritage shows",
      "Product launches and stage sets",
      "Museums and exhibitions",
      "Brand activations and public events",
    ],
    workflow: [
      { step: "Survey", body: "We measure the real surface and its geometry precisely." },
      { step: "Model", body: "The surface is rebuilt in 3D so content can be designed to fit it." },
      { step: "Design", body: "Content is created to the exact shape, not a flat rectangle." },
      { step: "Align", body: "On site, projectors are warped and blended onto the surface." },
      { step: "Show", body: "The mapped content is played and operated live." },
    ],
    capability: [
      "Multi-projector edge blending",
      "Warping to complex and curved geometry",
      "Brightness and lumen planning for the surface",
      "Content built to the surface geometry",
      "On-site alignment and calibration",
      "Live playback and show operation",
    ],
    systems: ["Watchout", "Resolume Arena", "Media Server Playback"],
    flow: ["Surface", "3D Model", "Content", "Warp / Blend", "Projectors", "Mapped Show"],
    faq: [
      {
        q: "How does projection mapping work?",
        a: "We measure the real surface, rebuild it in 3D, design content to that exact shape, then warp and blend the projectors on site so the image sits perfectly on the surface.",
      },
      {
        q: "Does it work in daylight?",
        a: "It works best at night or in controlled light. In brighter conditions we plan higher-brightness projectors, but low ambient light always gives the strongest result.",
      },
      {
        q: "What surfaces can you map?",
        a: "Flat walls, curved and irregular architecture, stage sets, and objects. If we can survey and model it, we can usually map it.",
      },
    ],
    related: ["immersive-experiences", "content-design", "led-display-rental"],
    metaTitle: "Projection Mapping — Building, Stage & Object Mapping | LiveGridAV",
    metaDescription:
      "LiveGridAV shapes content to the real surface — building, stage and object mapping with multi-projector edge blending and on-site warping for a seamless mapped show.",
  },

  /* ── 08 · Immersive Experiences ──────────────────────── */
  {
    slug: "immersive-experiences",
    order: "08",
    group: "AV & Visual",
    eyebrow: "Immersive",
    title: "Immersive Experiences",
    tagline: "Environments where the audience is inside the content, not just watching a screen.",
    plain:
      "An immersive experience surrounds the audience — LED, projection, content, light and sound working together so people feel inside the story instead of watching it from outside. Every surface becomes part of one environment.",
    whatWeDo: [
      "Multi-surface LED and projection rooms where every wall is part of the story.",
      "Wall-to-wall and floor-to-ceiling content.",
      "Interactive and sensor-triggered visuals.",
      "Lighting and audio synchronised to the content.",
      "Product-launch worlds where everything reacts together.",
    ],
    whereUsed: [
      "Brand experience centres and flagships",
      "Product launches and reveals",
      "Exhibitions and immersive rooms",
      "Attractions and installations",
    ],
    workflow: [
      { step: "Concept", body: "We shape the idea and how the audience moves through it." },
      { step: "Space", body: "The room and its surfaces are designed as one canvas." },
      { step: "Content", body: "Visuals built to wrap every surface together." },
      { step: "Integrate", body: "LED, projection, lighting, audio and interaction combined." },
      { step: "Show", body: "The environment is run and operated live." },
    ],
    capability: [
      "Multi-surface content design",
      "LED and projection blended into one space",
      "Interactive and sensor triggers",
      "Synchronised lighting and audio",
      "Real-time graphics",
      "Live operation of the environment",
    ],
    systems: ["Unreal Engine", "Watchout", "Media Server Playback"],
    flow: ["Concept", "Space", "Content", "LED + Projection", "Light + Sound", "Immersion"],
    faq: [
      {
        q: "What makes an experience 'immersive'?",
        a: "The audience is surrounded by the content — on the walls, floor and around them — with light and sound reacting together, so they feel inside it rather than watching a single screen.",
      },
      {
        q: "Can it be interactive?",
        a: "Yes. We can trigger visuals from movement, touch or sensors so the environment responds to the people in it.",
      },
    ],
    related: ["projection-mapping", "3d-anamorphic", "content-design"],
    metaTitle: "Immersive Experiences — LED, Projection, Light & Interaction | LiveGridAV",
    metaDescription:
      "LiveGridAV builds immersive environments where LED, projection, content, light and sound surround the audience — including interactive and sensor-driven experiences.",
  },

  /* ── 09 · Live Production ────────────────────────────── */
  {
    slug: "live-production",
    order: "09",
    group: "Live Production",
    eyebrow: "Live Production",
    title: "Live Production",
    tagline: "Every visual part of the event, brought together and operated as one production.",
    plain:
      "We bring the visual parts of an event together — screens, content, cameras, playback and cues — and operate them as one production, from pre-production planning through to the live show. One team, one point of technical responsibility.",
    whatWeDo: [
      "Pre-production planning and full system design.",
      "Content and presentation preparation.",
      "Installation, cabling and programming on site.",
      "Cameras, switching and media-server playback.",
      "Rehearsal, show cues and live operation.",
    ],
    whereUsed: [
      "Conferences, summits and keynotes",
      "Concerts, festivals and live shows",
      "Award ceremonies and galas",
      "Product launches and brand events",
    ],
    workflow: [
      { step: "Pre-production", body: "Run of show, system design and content plan agreed up front." },
      { step: "System design", body: "Screens, signal path, cameras and playback spec'd to the venue." },
      { step: "Content", body: "Visuals and presentations prepared and tested." },
      { step: "Install", body: "Clean build, cabling and calibration on site." },
      { step: "Rehearse", body: "Cues programmed and run through before doors." },
      { step: "Go live", body: "The whole visual show operated live on the day." },
    ],
    capability: [
      "AV system design and coordination",
      "LED and projection integration",
      "Cameras and live switching",
      "Media-server playback and show cues",
      "Operator teams for every position",
      "Streaming and recording where needed",
    ],
    systems: ["PixelHue", "Blackmagic", "Watchout"],
    flow: ["Plan", "Build", "Program", "Rehearse", "Go Live", "Show"],
    faq: [
      {
        q: "What does live production include?",
        a: "The visual side of your event run as one production — screens, content, cameras, playback, cues and the operators to run them — from planning to the live show.",
      },
      {
        q: "Do you provide the operators?",
        a: "Yes. We provide the technical team for each position — media server, switching, screens and coordination — not just the equipment.",
      },
      {
        q: "Can you work alongside our other suppliers?",
        a: "Yes. We manage the visual system and coordinate cleanly with venue, sound, lighting and other production partners.",
      },
    ],
    related: ["av-engineering", "show-control-media-server", "hybrid-events"],
    metaTitle: "Live Production — Event AV, Screens, Cameras & Show Operation | LiveGridAV",
    metaDescription:
      "LiveGridAV plans, builds and operates the visual side of live events as one production — system design, content, cameras, switching, playback and live show operation.",
  },

  /* ── 10 · Virtual Events ─────────────────────────────── */
  {
    slug: "virtual-events",
    order: "10",
    group: "Live Production",
    eyebrow: "Virtual Events",
    title: "Virtual Events",
    tagline: "Branded online stages and remote speakers, produced like a real show.",
    plain:
      "A virtual event is a show produced for an online audience — a branded stage, remote speakers, presentations and live switching, streamed reliably to wherever people are watching. It should feel produced, not like a plain video call.",
    whatWeDo: [
      "Branded online stage design.",
      "Remote speaker setup and management.",
      "Presentation and content integration.",
      "Live switching between speakers, slides and video.",
      "Streaming, recording and multi-location feeds.",
    ],
    whereUsed: [
      "Online conferences and webinars",
      "Internal town halls and AGMs",
      "Product launches",
      "Training and briefings",
    ],
    workflow: [
      { step: "Plan", body: "Format, speakers and run of show agreed." },
      { step: "Stage", body: "A branded virtual stage built for the event." },
      { step: "Speakers", body: "Remote contributors set up and tested." },
      { step: "Switch", body: "Live switching between speakers, slides and playback." },
      { step: "Stream", body: "Delivered and recorded reliably." },
    ],
    capability: [
      "Branded virtual stages",
      "Remote speaker contribution",
      "Presentation and video playback",
      "Live switching",
      "Streaming over RTMP / SRT",
      "Recording and multi-location feeds",
    ],
    systems: ["Blackmagic", "Media Server Playback"],
    flow: ["Speakers", "Stage", "Switch", "Encode", "Stream", "Audience"],
    faq: [
      {
        q: "How is this different from a video call?",
        a: "It's produced — a branded stage, live switching, proper graphics and reliable streaming — so it looks and runs like a broadcast rather than a plain call.",
      },
      {
        q: "Can speakers join remotely?",
        a: "Yes. Remote speakers are set up, tested and brought into the live switch alongside presentations and video.",
      },
      {
        q: "Do you record it?",
        a: "Yes — the program is recorded, and we can deliver edited versions afterwards.",
      },
    ],
    related: ["hybrid-events", "broadcast-streaming", "live-production"],
    metaTitle: "Virtual Events — Branded Online Stages & Streaming | LiveGridAV",
    metaDescription:
      "LiveGridAV produces virtual events like a broadcast — branded online stages, remote speakers, live switching, streaming and recording for online audiences.",
  },

  /* ── 11 · Hybrid Events ──────────────────────────────── */
  {
    slug: "hybrid-events",
    order: "11",
    group: "Live Production",
    eyebrow: "Hybrid Events",
    title: "Hybrid Events",
    tagline: "The room and the remote audience, connected as one production.",
    plain:
      "A hybrid event connects the people inside the venue and the people joining remotely as one production — venue cameras, remote speakers, presentations and streaming, all switched together, with return feeds so remote guests appear in the room.",
    whatWeDo: [
      "Venue camera systems and live switching.",
      "Remote speaker and guest contribution.",
      "Return feeds so remote guests appear on the venue screens.",
      "Presentation and LED integration.",
      "Streaming, recording and platform delivery.",
    ],
    whereUsed: [
      "Conferences and summits",
      "Product launches",
      "Town halls and panels",
      "Award shows with remote winners",
    ],
    workflow: [
      { step: "Plan", body: "How the room and the online audience connect is designed up front." },
      { step: "Venue", body: "Cameras, screens and switching built in the room." },
      { step: "Remote", body: "Remote speakers and return feeds linked in." },
      { step: "Switch", body: "One live switch drives both the room and the stream." },
      { step: "Stream", body: "Delivered to the online audience and recorded." },
    ],
    capability: [
      "Venue camera systems",
      "Remote speaker feeds and return feeds",
      "Presentation and LED integration",
      "Single live switch for room and stream",
      "Streaming and recording",
      "Platform delivery",
    ],
    systems: ["Blackmagic", "PixelHue", "Media Server Playback"],
    flow: ["Venue", "Remote Speakers", "Live Switch", "LED + Stream", "Online Audience"],
    faq: [
      {
        q: "What is a hybrid event?",
        a: "One production that serves both the audience in the venue and the audience online at the same time — connected by cameras, remote feeds and streaming.",
      },
      {
        q: "Can remote guests be seen on the venue screens?",
        a: "Yes. Return feeds bring remote speakers and guests onto the LED and screens in the room, so both audiences are part of the same show.",
      },
      {
        q: "Is it recorded?",
        a: "Yes — the program output is recorded and can be delivered afterwards.",
      },
    ],
    related: ["virtual-events", "broadcast-streaming", "live-production"],
    metaTitle: "Hybrid Events — Venue + Online Audience, One Production | LiveGridAV",
    metaDescription:
      "LiveGridAV connects the venue and the remote audience as one production — venue cameras, remote speakers, return feeds, LED integration, streaming and recording.",
  },

  /* ── 12 · Broadcast & Streaming ──────────────────────── */
  {
    slug: "broadcast-streaming",
    order: "12",
    group: "Live Production",
    eyebrow: "Broadcast & Streaming",
    title: "Broadcast & Streaming",
    tagline: "Multi-camera production, switched and streamed to any platform — with backups.",
    plain:
      "We produce your event like a broadcast — multiple cameras, live switching, graphics and a clean program output — then stream and record it reliably, with backup paths so it stays on air even if something drops.",
    whatWeDo: [
      "Multi-camera production and live switching.",
      "On-screen graphics and lower-thirds.",
      "Streaming over RTMP and SRT to any platform.",
      "Recording and remote contribution.",
      "Backup workflows and confidence monitoring.",
    ],
    whereUsed: [
      "Conferences and keynotes",
      "Concerts and performances",
      "Sports and competitions",
      "Online-first and launch events",
    ],
    workflow: [
      { step: "Capture", body: "Multiple cameras cover the event." },
      { step: "Switch", body: "A live switch cuts the program in real time." },
      { step: "Graphics", body: "Titles and branding added to the output." },
      { step: "Encode", body: "Clean program encoded for delivery." },
      { step: "Deliver", body: "Streamed to the platform and recorded, with a backup path." },
    ],
    capability: [
      "Multi-camera switching",
      "Program output and graphics",
      "RTMP / SRT streaming",
      "Recording and remote feeds",
      "Confidence monitoring",
      "Redundant / backup streaming and platform delivery",
    ],
    systems: ["Blackmagic", "PixelHue"],
    flow: ["Cameras", "Switcher", "Graphics", "Encoder", "Platform"],
    faq: [
      {
        q: "Which platforms can you stream to?",
        a: "Any platform that accepts a standard stream — your own site, YouTube, LinkedIn, a webinar platform, or several at once.",
      },
      {
        q: "What happens if the internet drops?",
        a: "For critical streams we plan a backup path and always record locally, so the program is protected even if a connection fails.",
      },
      {
        q: "Can you do multi-camera?",
        a: "Yes. We run multiple cameras through a live switch with graphics for a proper broadcast-style program.",
      },
    ],
    related: ["hybrid-events", "virtual-events", "live-production"],
    metaTitle: "Broadcast & Streaming — Multi-Camera Live Production | LiveGridAV",
    metaDescription:
      "LiveGridAV produces events like a broadcast — multi-camera switching, graphics, RTMP/SRT streaming, recording and backup workflows for reliable delivery to any platform.",
  },

  /* ── 13 · Professional Sound ─────────────────────────── */
  {
    slug: "professional-sound",
    order: "13",
    group: "Collaborative",
    eyebrow: "Professional Sound",
    title: "Professional Sound",
    tagline: "Sound planned for your event and delivered with trusted specialist partners.",
    plain:
      "Professional sound requirements are planned with the event and fulfilled with trusted specialist audio professionals and production partners when required. We keep one point of technical responsibility for the visual system and coordinate the right audio specialists for the room.",
    whatWeDo: [
      "Plan the audio requirement around the venue, audience and show.",
      "Coordinate line-array or point-source systems sized to the room.",
      "Arrange stage monitors, front fills and delay fills for even coverage.",
      "Bring in digital consoles, stage boxes and wireless / wired microphones.",
      "Cover DI boxes, DSP, amplifiers, playback, RF and intercom as needed.",
    ],
    whereUsed: [
      "Conferences and keynotes",
      "Concerts and live performances",
      "Award shows and galas",
      "Outdoor and large-audience events",
    ],
    workflow: [
      { step: "Plan", body: "The audio requirement is scoped with the event and venue." },
      { step: "Partner", body: "The right specialist audio team is coordinated for the job." },
      { step: "Design", body: "System, coverage and microphone plan agreed." },
      { step: "Rig", body: "PA flown or stacked, stage patched and lines run." },
      { step: "Show", body: "Mixed and operated live, in sync with the visual production." },
    ],
    capability: [
      "Line-array systems — even coverage for large audiences",
      "Point-source systems — focused sound for smaller rooms",
      "Subwoofers — the low end for music and impact",
      "Stage monitors — so performers hear what they need",
      "Digital consoles and stage boxes — flexible live mixing",
      "Wireless and wired microphones, DI, DSP, amps and RF",
    ],
    systems: ["Line Array", "Point Source", "Subwoofers", "Stage Monitors", "Digital Console", "Wireless Mics"],
    flow: ["Source", "Console", "Processing", "Amps", "PA", "Audience"],
    faq: [
      {
        q: "Do you own all the sound equipment?",
        a: "We plan the audio requirement and deliver it with trusted specialist audio professionals and production partners. That means the right system for each event, with one team coordinating the whole production.",
      },
      {
        q: "Can you handle both the visuals and the sound?",
        a: "Yes. We take responsibility for the visual system and coordinate specialist sound partners, so it's one point of contact and a clean, integrated show.",
      },
    ],
    related: ["professional-lighting", "live-production", "av-engineering"],
    metaTitle: "Professional Sound — Event Audio, Planned & Coordinated | LiveGridAV",
    metaDescription:
      "LiveGridAV plans event sound and delivers it with trusted specialist audio partners — line arrays, monitors, consoles, microphones and RF sized to your venue and show.",
  },

  /* ── 14 · Professional Lighting ──────────────────────── */
  {
    slug: "professional-lighting",
    order: "14",
    group: "Collaborative",
    eyebrow: "Professional Lighting",
    title: "Professional Lighting",
    tagline: "Lighting systems and specialist teams, coordinated with trusted production partners.",
    plain:
      "Lighting systems and specialist lighting teams are coordinated with trusted production professionals based on the venue and show requirement. Lighting shapes the mood of the room and works hand in hand with the content on screen.",
    whatWeDo: [
      "Plan the lighting look with the stage, content and show in mind.",
      "Coordinate moving-head profile, wash, beam and hybrid fixtures.",
      "Arrange LED wash, LED PAR, strobes, blinders, pixel bars and battens.",
      "Bring in follow spots, Fresnels and profile fixtures where needed.",
      "Cover haze, fog, lighting control and dimming / distribution.",
    ],
    whereUsed: [
      "Concerts, festivals and live shows",
      "Corporate stages and keynotes",
      "Award ceremonies and galas",
      "Immersive and branded environments",
    ],
    workflow: [
      { step: "Design", body: "The lighting look is planned with the stage and content." },
      { step: "Partner", body: "The right specialist lighting team is coordinated." },
      { step: "Rig", body: "Fixtures hung, addressed and patched to the console." },
      { step: "Program", body: "Looks and cues built to the run of show." },
      { step: "Operate", body: "Run live, in time with the visuals." },
    ],
    capability: [
      "Moving-head profile and wash — shaped or broad stage light",
      "Beam and hybrid fixtures — sharp aerial looks",
      "LED wash, PAR, pixel bars and battens — colour and texture",
      "Strobes, blinders and follow spots — impact and focus",
      "Haze and fog — so beams read in the air",
      "Lighting control, dimming and distribution",
    ],
    systems: ["Moving Head", "LED Wash", "Beam", "Follow Spot", "Haze", "Lighting Control"],
    flow: ["Design", "Rig", "Patch", "Program", "Operate", "Show"],
    faq: [
      {
        q: "What's the difference between a beam, a wash and a profile?",
        a: "A beam is a narrow, sharp shaft of light for aerial looks; a wash covers a broad area in colour; a profile shapes a controlled, focused beam. We pick the mix that suits your stage.",
      },
      {
        q: "Do you own the lighting rig?",
        a: "Lighting systems and specialist teams are coordinated with trusted production partners for each event, so the rig always fits the venue and the show — with one team keeping it all in sync.",
      },
    ],
    related: ["professional-sound", "live-production", "immersive-experiences"],
    metaTitle: "Professional Lighting — Event Lighting, Coordinated | LiveGridAV",
    metaDescription:
      "LiveGridAV plans event lighting and coordinates specialist lighting teams and rigs with trusted partners — moving heads, wash, beam, follow spots, haze and control.",
  },

  /* ── 15 · Web Development ─────────────────────────────── */
  {
    slug: "web-development",
    order: "15",
    group: "Digital",
    eyebrow: "Web Experiences",
    title: "Web Development",
    tagline: "The same creative and technical thinking, brought into the browser.",
    plain:
      "The thinking we use for physical experiences also works on the web. We build business and event websites, interactive landing pages and full 3D / WebGL experiences — including sites like this one, where the browser itself becomes the show.",
    whatWeDo: [
      "Business, portfolio and event websites.",
      "Event microsites and interactive landing pages.",
      "3D websites and WebGL experiences.",
      "360° web experiences and product-launch pages.",
      "Registration interfaces, dashboards and control interfaces.",
    ],
    whereUsed: [
      "Event and campaign microsites",
      "Product launches and brand experiences",
      "Portfolios and interactive showcases",
      "Registration and live-event dashboards",
    ],
    workflow: [
      { step: "Idea", body: "We shape the goal, audience and the experience you want." },
      { step: "Design", body: "Interface and motion designed to the brand." },
      { step: "Build", body: "Fast, accessible front-end engineered to last." },
      { step: "3D / WebGL", body: "Real-time 3D added where it lifts the experience." },
      { step: "Launch", body: "Optimised for speed, SEO and every device." },
    ],
    capability: [
      "Modern front-end (React / Next.js)",
      "Real-time 3D in the browser (Three.js / WebGL)",
      "Motion and interaction design",
      "Core Web Vitals performance",
      "Technical SEO and accessibility",
      "Registration, dashboards and control interfaces",
    ],
    systems: ["Next.js", "React", "Three.js / WebGL", "GSAP"],
    flow: ["Idea", "Design", "Build", "3D / WebGL", "Optimise", "Launch"],
    faq: [
      {
        q: "Can you build a 3D website?",
        a: "Yes — the site you're on is one. We build real-time 3D and WebGL experiences that stay fast and work on phones as well as desktops.",
      },
      {
        q: "Can you build an event microsite with registration?",
        a: "Yes. We build event sites and microsites with registration, schedules and live dashboards, designed to match the event's branding.",
      },
    ],
    related: ["3d-anamorphic", "content-design", "immersive-experiences"],
    metaTitle: "Web Development — Interactive & 3D Web Experiences | LiveGridAV",
    metaDescription:
      "LiveGridAV builds business and event websites, interactive landing pages and 3D / WebGL experiences — fast, accessible and designed like a live show in the browser.",
  },
];

/** Fast lookup by slug. */
export const SERVICE_BY_SLUG: Record<string, ServiceDetail> = Object.fromEntries(
  SERVICES.map((s) => [s.slug, s]),
);

export function getService(slug: string): ServiceDetail | undefined {
  return SERVICE_BY_SLUG[slug];
}
