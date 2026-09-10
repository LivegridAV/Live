/**
 * Insights — useful, plain-language articles answering real questions clients
 * search, each internally linking to the relevant service (brief §48). Real,
 * factual content; no fabricated claims. Body is simple block data so pages stay
 * server-rendered and crawlable.
 */

export interface ArticleSection {
  heading?: string;
  paras: string[];
}

export interface ArticleLink {
  label: string;
  href: string;
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  datePublished: string; // ISO
  readMins: number;
  sections: ArticleSection[];
  links: ArticleLink[];
  related: string[];
  metaTitle: string;
  metaDescription: string;
}

export const ARTICLES: Article[] = [
  {
    slug: "what-pixel-pitch-for-event-led",
    title: "What Pixel Pitch Should I Use for an Event LED Screen?",
    excerpt:
      "Pixel pitch decides how sharp your screen looks — here's the simple rule of thumb, and what changes it.",
    category: "LED",
    datePublished: "2026-05-12",
    readMins: 4,
    sections: [
      {
        paras: [
          "Pixel pitch is the distance between LED pixels, measured in millimetres. A smaller pitch packs pixels closer together, so the image looks sharper — especially up close.",
          "The simple rule of thumb: your comfortable minimum viewing distance in metres is roughly the pixel pitch in millimetres. If the nearest audience sits about 4 metres away, a pitch around 4mm usually looks clean.",
        ],
      },
      {
        heading: "What changes the answer",
        paras: [
          "Cameras change it. If the screen is filmed or streamed, the camera resolves individual pixels, so you generally want a finer pitch than the audience alone would need.",
          "Environment changes it. Outdoor screens are viewed from further away and need more brightness, so they rarely use very fine pitches. Indoor screens for close audiences can go much finer.",
          "Size and budget matter too. A bigger screen at a finer pitch means more pixels — and more cost — so the right choice balances sharpness, size and budget.",
        ],
      },
      {
        heading: "The honest caveat",
        paras: [
          "Any online rule of thumb is a starting point, not a specification. The final pitch depends on your exact venue, content and audience, and is confirmed after a technical review.",
        ],
      },
    ],
    links: [
      { label: "Try the pixel-pitch planner", href: "/led" },
      { label: "LED Display Solutions", href: "/services/led-display-rental" },
    ],
    related: ["indoor-vs-outdoor-led", "what-is-floor-led"],
    metaTitle: "What Pixel Pitch for an Event LED Screen? | LiveGridAV",
    metaDescription:
      "A plain-language guide to LED pixel pitch for events — the simple viewing-distance rule of thumb, how cameras and environment change it, and when to confirm the spec.",
  },
  {
    slug: "indoor-vs-outdoor-led",
    title: "Indoor vs Outdoor LED, Explained",
    excerpt: "They look similar but they're built for different jobs. Here's how to tell which you need.",
    category: "LED",
    datePublished: "2026-04-28",
    readMins: 3,
    sections: [
      {
        paras: [
          "Indoor and outdoor LED both make a big picture from small panels, but they're engineered for different conditions.",
        ],
      },
      {
        heading: "Indoor LED",
        paras: [
          "Indoor LED prioritises image quality in controlled lighting. It's used for keynotes, launches and stages where the audience is often closer, so a finer pitch and even colour calibration matter most.",
        ],
      },
      {
        heading: "Outdoor LED",
        paras: [
          "Outdoor LED is brighter and weather-rated, so the image holds up in daylight and the panels survive the elements. It's viewed from further away, which usually means a larger pitch and robust rigging and power.",
        ],
      },
      {
        heading: "How to choose",
        paras: [
          "Start with the environment and the audience distance. If it's outside or in bright daylight, you need outdoor brightness. If it's a controlled room with a close audience, indoor image quality wins.",
        ],
      },
    ],
    links: [
      { label: "Indoor Event LED", href: "/led/indoor-led" },
      { label: "Outdoor LED", href: "/led/outdoor-led" },
    ],
    related: ["what-pixel-pitch-for-event-led", "what-is-floor-led"],
    metaTitle: "Indoor vs Outdoor LED, Explained | LiveGridAV",
    metaDescription:
      "Indoor vs outdoor event LED — the difference in brightness, weather rating, pitch and viewing distance, and a simple way to choose the right one for your event.",
  },
  {
    slug: "what-is-floor-led",
    title: "What Is Floor LED?",
    excerpt: "The stage floor becomes a screen performers can walk across. Here's how it works and where it shines.",
    category: "LED",
    datePublished: "2026-04-10",
    readMins: 3,
    sections: [
      {
        paras: [
          "Floor LED turns part of the physical stage into an active digital surface. Instead of a screen you only look at, it's one performers can walk across while content plays and reacts underfoot.",
        ],
      },
      {
        heading: "How it's built",
        paras: [
          "Floor panels are load-rated and use a tougher surface so they can be walked on safely. They're driven like any other LED, but planned for the weight and movement of performers and crew.",
        ],
      },
      {
        heading: "Where it shines",
        paras: [
          "Floor LED is powerful for product reveals, performances and immersive moments — especially when paired with wall and ceiling LED so the content wraps the whole space.",
        ],
      },
    ],
    links: [
      { label: "Floor LED", href: "/led/floor-led" },
      { label: "Immersive Experiences", href: "/services/immersive-experiences" },
    ],
    related: ["indoor-vs-outdoor-led", "what-is-3d-anamorphic-content"],
    metaTitle: "What Is Floor LED? | LiveGridAV",
    metaDescription:
      "Floor LED explained — walkable, load-rated digital stage surfaces where content plays and reacts underfoot, and where they work best for reveals and immersive shows.",
  },
  {
    slug: "what-is-3d-anamorphic-content",
    title: "What Is 3D Anamorphic Content?",
    excerpt: "The trick behind screens that appear to have real depth — and why it works from one spot.",
    category: "Content",
    datePublished: "2026-03-22",
    readMins: 4,
    sections: [
      {
        paras: [
          "Anamorphic, or naked-eye 3D, content uses perspective so a flat LED wall appears to have real depth — no glasses needed. Done well, an object looks like it breaks past the edge of the screen.",
        ],
      },
      {
        heading: "Why it works",
        paras: [
          "The content is designed with forced perspective for a specific viewing position. From that spot, the depth cues line up and the illusion is convincing. From far to the side, you can see it's a flat screen.",
          "That's why the best anamorphic work is planned around a chosen viewpoint — usually a corner or L-shaped wall, and the camera position if it's being filmed.",
        ],
      },
      {
        heading: "Where it's used",
        paras: [
          "Product and vehicle reveals, brand activations and lobby spectaculars are common — anywhere a striking wow moment adds value.",
        ],
      },
    ],
    links: [
      { label: "3D & Anamorphic Content", href: "/services/3d-anamorphic" },
      { label: "Content & Visual Production", href: "/services/content-design" },
    ],
    related: ["what-is-floor-led", "how-projection-mapping-works"],
    metaTitle: "What Is 3D Anamorphic Content? | LiveGridAV",
    metaDescription:
      "3D anamorphic (naked-eye 3D) content explained — how forced perspective makes a flat LED wall appear to have depth, why it works from one viewpoint, and where it's used.",
  },
  {
    slug: "what-does-a-media-server-operator-do",
    title: "What Does a Media Server Operator Do?",
    excerpt: "Equipment doesn't run a show. Here's the person who makes the right content appear on cue.",
    category: "Show Control",
    datePublished: "2026-03-05",
    readMins: 3,
    sections: [
      {
        paras: [
          "A media server operator runs the playback system live during an event. They load the content, build the cues and fire them so the right visuals appear on the right screen at the right moment.",
        ],
      },
      {
        heading: "Before the show",
        paras: [
          "They prepare and map content to the screens, program timelines and cue lists against the run of show, and test everything — including a backup playback path for critical shows.",
        ],
      },
      {
        heading: "During the show",
        paras: [
          "They watch program and preview monitors, switch content, fire cues in time with the show, and keep the outputs clean. If something goes wrong, they're the person who keeps the visuals running.",
        ],
      },
    ],
    links: [
      { label: "Show Control & Media Server Operations", href: "/services/show-control-media-server" },
      { label: "Live Production", href: "/services/live-production" },
    ],
    related: ["what-is-a-hybrid-event", "what-is-3d-anamorphic-content"],
    metaTitle: "What Does a Media Server Operator Do? | LiveGridAV",
    metaDescription:
      "A media server operator runs live playback — loading content, programming cues and firing them so the right visuals hit the right screen on time, with a backup ready.",
  },
  {
    slug: "how-projection-mapping-works",
    title: "How Projection Mapping Works",
    excerpt: "How a building or stage becomes part of the animation, step by step.",
    category: "Projection",
    datePublished: "2026-02-18",
    readMins: 4,
    sections: [
      {
        paras: [
          "Projection mapping shapes video content around a real surface — a building, a stage or an object — so it becomes part of the animation instead of a flat picture projected onto it.",
        ],
      },
      {
        heading: "The steps",
        paras: [
          "First we survey and measure the real surface precisely. Then we rebuild it in 3D so content can be designed to its exact shape. On site, multiple projectors are warped and edge-blended so the image sits perfectly on the surface, with no visible seams.",
        ],
      },
      {
        heading: "What affects the result",
        paras: [
          "Ambient light matters — mapping looks strongest at night or in controlled light. Brighter conditions need higher-output projectors. The surface geometry and projector positions are planned carefully so every part of the surface is covered cleanly.",
        ],
      },
    ],
    links: [
      { label: "Projection Mapping", href: "/services/projection-mapping" },
      { label: "Immersive Experiences", href: "/services/immersive-experiences" },
    ],
    related: ["what-is-3d-anamorphic-content", "what-is-a-hybrid-event"],
    metaTitle: "How Projection Mapping Works | LiveGridAV",
    metaDescription:
      "How projection mapping works — surveying the surface, rebuilding it in 3D, then warping and edge-blending projectors so a building, stage or object becomes the animation.",
  },
  {
    slug: "what-is-a-hybrid-event",
    title: "What Is a Hybrid Event?",
    excerpt: "One production for the people in the room and the people watching online.",
    category: "Live Production",
    datePublished: "2026-01-30",
    readMins: 3,
    sections: [
      {
        paras: [
          "A hybrid event connects the people inside the venue and the people joining remotely as one production. Both audiences experience the same show at the same time.",
        ],
      },
      {
        heading: "How it comes together",
        paras: [
          "Venue cameras capture the room, remote speakers join by video, and presentations and LED content are all brought into one live switch. That single program feeds both the screens in the room and the online stream.",
          "Return feeds bring remote guests onto the venue screens, so the people in the room can see and interact with those joining online.",
        ],
      },
      {
        heading: "Why it's worth it",
        paras: [
          "A hybrid event reaches people who can't attend in person without turning the show into a plain video call — it stays produced, branded and reliable, and it's recorded for afterwards.",
        ],
      },
    ],
    links: [
      { label: "Hybrid Events", href: "/services/hybrid-events" },
      { label: "Virtual Events", href: "/services/virtual-events" },
    ],
    related: ["what-does-a-media-server-operator-do", "how-projection-mapping-works"],
    metaTitle: "What Is a Hybrid Event? | LiveGridAV",
    metaDescription:
      "A hybrid event connects the venue audience and the online audience as one production — venue cameras, remote speakers, return feeds, live switching, streaming and recording.",
  },
];

export const ARTICLE_BY_SLUG: Record<string, Article> = Object.fromEntries(
  ARTICLES.map((a) => [a.slug, a]),
);

export function getArticle(slug: string): Article | undefined {
  return ARTICLE_BY_SLUG[slug];
}
