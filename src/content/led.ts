/**
 * LED type pages (brief §16–18, §57). Each is a focused, unique page — never a
 * thin duplicate. No invented pixel pitches or inventory; specifications are
 * always "confirmed after technical review".
 */

export interface LedType {
  slug: string;
  title: string;
  tagline: string;
  plain: string;
  points: string[];
  bestFor: string[];
  metaTitle: string;
  metaDescription: string;
}

export const LED_TYPES: LedType[] = [
  {
    slug: "indoor-led",
    title: "Indoor Event LED",
    tagline: "Image quality first, for controlled rooms and close audiences.",
    plain:
      "Indoor LED prioritises a clean, sharp image for controlled lighting and closer viewing — the walls behind keynotes, launches and stage shows. The closer the audience, the finer the panel we plan.",
    points: [
      "Best where lighting is controlled and the audience is closer.",
      "Finer panels give a sharper image up close.",
      "Calibrated for even colour across the whole wall.",
      "Camera-friendly setups for shows that are filmed or streamed.",
    ],
    bestFor: ["Conferences & keynotes", "Product launches", "Indoor stages", "Exhibitions"],
    metaTitle: "Indoor Event LED — Sharp Screens for Controlled Rooms | LiveGridAV",
    metaDescription:
      "Indoor event LED from LiveGridAV — sharp, colour-calibrated walls for keynotes, launches and stages, planned to the audience distance and confirmed after technical review.",
  },
  {
    slug: "outdoor-led",
    title: "Outdoor LED",
    tagline: "Bright and weather-rated, for daylight and the elements.",
    plain:
      "Outdoor LED is built to be bright enough for daylight and rated for the weather. It covers concerts, festivals and public events where the screen has to hold up outside and be seen from a distance.",
    points: [
      "High brightness so the image reads in daylight.",
      "Weather-rated panels and rigging for outdoor use.",
      "Planned for longer viewing distances and larger crowds.",
      "Robust power and signal for open-air sites.",
    ],
    bestFor: ["Concerts & festivals", "Public events", "Outdoor stages", "Large screens"],
    metaTitle: "Outdoor LED — Bright, Weather-Rated Event Screens | LiveGridAV",
    metaDescription:
      "Outdoor LED from LiveGridAV — high-brightness, weather-rated screens for concerts, festivals and public events, sized for distance and confirmed after technical review.",
  },
  {
    slug: "floor-led",
    title: "Floor LED",
    tagline: "Turns part of the stage into an active digital surface.",
    plain:
      "Floor LED turns part of the physical stage into an active digital surface. Performers can walk across it while content plays and reacts underfoot — a powerful tool for reveals and immersive moments.",
    points: [
      "Walkable, load-rated panels built for performers.",
      "Content extends the stage into the floor.",
      "Reacts underfoot for reveals and immersive beats.",
      "Pairs with wall and ceiling LED for a full environment.",
    ],
    bestFor: ["Performances & shows", "Product reveals", "Immersive stages", "Fashion & dance"],
    metaTitle: "Floor LED — Walkable Digital Stage Surfaces | LiveGridAV",
    metaDescription:
      "Floor LED from LiveGridAV — walkable, load-rated digital stage surfaces where content plays and reacts underfoot, for reveals, performances and immersive stages.",
  },
  {
    slug: "stage-led",
    title: "Stage LED",
    tagline: "Main-stage backdrops, ribbons and wings that anchor the show.",
    plain:
      "Stage LED is the big picture behind the show — the main backdrop, side wings and ribbons that carry content, branding and live camera. It sets the scale and the look of the whole stage.",
    points: [
      "Main backdrop plus side wings and ribbons.",
      "Carries content, branding and live camera feeds.",
      "Sized and shaped to the stage and sightlines.",
      "Driven and mapped as one seamless canvas.",
    ],
    bestFor: ["Keynotes & summits", "Concerts", "Award shows", "Corporate stages"],
    metaTitle: "Stage LED — Backdrops, Wings & Ribbons | LiveGridAV",
    metaDescription:
      "Stage LED from LiveGridAV — main backdrops, wings and ribbons that carry content and live camera, mapped as one seamless canvas and sized to the stage.",
  },
  {
    slug: "creative-led",
    title: "Creative LED",
    tagline: "Columns, cubes, curves and custom canvases beyond the flat wall.",
    plain:
      "Creative LED breaks out of the flat rectangle — columns, cubes, curves and custom canvases that become part of the set design. It's where LED turns into an object and a feature, not just a screen.",
    points: [
      "Curved, columnar and cube configurations.",
      "Custom canvas shapes built to the set.",
      "Content designed to the exact geometry.",
      "A feature piece as much as a display.",
    ],
    bestFor: ["Brand activations", "Retail & showrooms", "Set design", "Exhibitions"],
    metaTitle: "Creative LED — Curved, Columnar & Custom Shapes | LiveGridAV",
    metaDescription:
      "Creative LED from LiveGridAV — curved, columnar, cube and custom-canvas configurations designed to the set geometry, turning LED into a feature, not just a screen.",
  },
];

export const LED_BY_SLUG: Record<string, LedType> = Object.fromEntries(
  LED_TYPES.map((t) => [t.slug, t]),
);

export function getLedType(slug: string): LedType | undefined {
  return LED_BY_SLUG[slug];
}
