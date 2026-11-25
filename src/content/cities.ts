/**
 * City pages — /locations/<slug>.
 *
 * livegridAV is based in Delhi and travels to any city for events. These pages
 * exist so someone searching "LED screen rental in Mumbai" finds us, and each
 * one is written for its own city rather than copied with the name swapped —
 * Google ignores pages that differ only by a place name.
 *
 * Rules, same as the rest of the site's content:
 * - venues are named as places events happen in the city, never as past
 *   clients or past shows;
 * - no invented projects, years, crew counts or local offices — the Delhi
 *   office is the only address;
 * - the pages are deliberately not in the menu or footer (owner's call); the
 *   sitemap and one FAQ answer on the LED service are how they are found.
 */

export interface CityHighlight {
  /** service slug in src/content/services.ts */
  service: string;
  /** why it matters in this city — one or two sentences */
  note: string;
}

export interface CityFaq {
  q: string;
  a: string;
}

/** An LED panel type the owner has confirmed is available to rent in a city. */
export interface RentalScreen {
  /** plain name, e.g. "Indoor fine-pitch LED" */
  name: string;
  /** the pixel pitch as the owner confirmed it */
  pitch: string;
  /** where it fits, one sentence */
  bestFor: string;
  /** LED type page in src/content/led.ts */
  led: string;
}

/**
 * The "LED screen rental in <city>" block. Only stock, inclusions and terms the
 * owner has confirmed — no sizes, inventory counts or prices (quotes follow a
 * technical review).
 */
export interface CityRental {
  heading: string;
  intro: string;
  screens: RentalScreen[];
  included: string[];
  /** how the price is worked out — never a number */
  pricing: string;
  /** areas covered, in the order people search them */
  areas: string[];
}

export interface City {
  slug: string;
  /** the name people search with */
  name: string;
  /** other spellings people search with, used in copy */
  alsoKnownAs?: string;
  /** the area the page covers, shown in the eyebrow */
  region: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  tagline: string;
  intro: string[];
  /** the kinds of events the city runs, in prose */
  scene: string;
  /** well-known event venues in the city — places, not clients */
  venues: string[];
  highlights: CityHighlight[];
  /** how a show in this city is planned and delivered from Delhi */
  logistics: { title: string; body: string }[];
  faq: CityFaq[];
  /** LED rental details — only where the owner has confirmed them */
  rental?: CityRental;
}

export const CITIES: City[] = [
  {
    slug: "delhi",
    name: "Delhi",
    region: "Delhi NCR · Gurugram · Noida",
    metaTitle: "LED Screen Rental in Delhi NCR — LED Walls on Rent | livegridAV",
    metaDescription:
      "LED screen rental in Delhi, Gurugram and Noida: indoor P2.6 and P3.9 and outdoor P4.8 LED walls, set up and operated by our own crew for conferences, launches, concerts and weddings.",
    h1: "LED screen rental and event AV in Delhi NCR",
    tagline: "Our home city. Our office is in Nangloi, west Delhi, so site visits and technical recces across NCR are easy to arrange.",
    intro: [
      "livegridAV designs, builds and operates the visual side of events in Delhi, Gurugram and Noida: LED walls and floors, content made for the exact screen, projection mapping, show control and live production. One team plans the system, makes the content and runs it on the day.",
      "Because we are based here, a Delhi NCR project gets the shortest planning loop we can offer — we can walk the venue with you, check power and rigging points in person and test content on a real panel before the show.",
    ],
    scene:
      "Delhi NCR runs everything from government summits and trade fairs to corporate town halls in Gurugram, product launches, award nights, concerts and large wedding celebrations at farmhouses and banquet venues. Each brings its own constraints: long exhibition days, broadcast-grade keynotes, outdoor daylight screens or tight load-in windows at hotels.",
    venues: [
      "Bharat Mandapam, Pragati Maidan",
      "Yashobhoomi (India International Convention & Expo Centre), Dwarka",
      "India Expo Centre & Mart, Greater Noida",
      "Hotel ballrooms in Aerocity, Gurugram and central Delhi",
      "Farmhouse and banquet venues in Chhatarpur and on the city's edges",
    ],
    highlights: [
      { service: "led-display-rental", note: "Indoor walls for conference halls, outdoor high-brightness screens for daytime events and LED floors for stages and weddings." },
      { service: "live-production", note: "Keynotes and award nights run as one show — screens, cameras, playback and cues on a single plan." },
      { service: "broadcast-streaming", note: "Multi-camera streams for summits and town halls with remote audiences across India." },
      { service: "3d-anamorphic", note: "Naked-eye 3D content for launches and brand activations, made to the exact screen geometry." },
    ],
    logistics: [
      { title: "Recce in person", body: "We visit the venue, check power, rigging, access and sight lines, and confirm the screen size against where the audience will sit." },
      { title: "Plan and test", body: "Pixel pitch, signal path and redundancy are specified to the venue, and content is checked on real panels before show day." },
      { title: "Build, run, strike", body: "Our crew builds and calibrates the system, operates it through the show and clears the venue on schedule." },
    ],
    faq: [
      { q: "How much does LED screen rental cost in Delhi?", a: "It depends on the screen size, the pixel pitch, indoor or outdoor, how many days, and whether content and show control are needed. Every rental includes our crew. Share your date, venue and audience size and we will send a quote after a quick technical review." },
      { q: "Which LED screen should I rent for my event?", a: "Indoor P2.6 suits close audiences and filmed shows, indoor P3.9 suits most stage backdrops in halls and banquets, and outdoor P4.8 is for daylight and open-air venues. The rule of thumb: the nearest viewer should sit at least as many metres away as the pitch in millimetres." },
      { q: "Do you rent LED screens without an operator?", a: "No. Every LED screen we rent in Delhi NCR is set up, operated and dismantled by our own crew, so the screen is looked after for the whole event." },
      { q: "Which parts of Delhi NCR do you cover?", a: "All of it — Delhi, Gurugram, Noida, Greater Noida, Faridabad and Ghaziabad. Our office is in Nangloi, west Delhi." },
      { q: "Can you visit our venue before the event?", a: "Yes. In Delhi NCR a site visit is the normal first step for anything beyond a simple screen." },
      { q: "Do you handle weddings as well as corporate events?", a: "Yes. LED backdrops, floors, content and live operation work the same way for a wedding stage as for a conference — the content and the pace change." },
      { q: "How early should we book?", a: "As early as you can, especially in the wedding and exhibition seasons. Tell us the date and venue and we will confirm what is possible." },
    ],
    rental: {
      heading: "LED screen rental in Delhi",
      intro:
        "We rent indoor and outdoor LED walls across Delhi NCR, and every screen is set up, run and dismantled by our own crew. The size is worked out for your venue and how far the audience sits, and confirmed after a recce, so you are not paying for a screen that is too big, too small or too coarse for the room.",
      screens: [
        { name: "Indoor fine-pitch LED", pitch: "P2.6", bestFor: "Conferences, launches and filmed or streamed shows, where people sit close or cameras are on the screen.", led: "indoor-led" },
        { name: "Indoor LED", pitch: "P3.9", bestFor: "Stage backdrops in halls, hotel ballrooms and banquet venues, including wedding stages.", led: "indoor-led" },
        { name: "Outdoor LED", pitch: "P4.8", bestFor: "Open-air events, farmhouse lawns and daytime screens, with the brightness and weather rating outdoor use needs.", led: "outdoor-led" },
      ],
      included: [
        "A recce or remote check of the venue, power and where the audience sits",
        "Screen size and layout planned to the viewing distance",
        "Delivery, ground-support or rigging, and a calibrated wall",
        "Processor setup (NovaStar, PixelHue or Magnimaze) and content checked on the real screen",
        "The screen operated by our own crew for the whole event",
        "Dismantling and clearing the venue on schedule",
      ],
      pricing:
        "There is no fixed rate card: the price depends on the screen size, the pixel pitch, indoor or outdoor, the number of days and whether you also need content or show control. Send the date, venue and audience size and we will reply with a quote.",
      areas: ["Delhi", "Gurugram", "Noida", "Greater Noida", "Faridabad", "Ghaziabad"],
    },
  },
  {
    slug: "mumbai",
    name: "Mumbai",
    region: "Mumbai · Navi Mumbai · Thane",
    metaTitle: "LED Screen Rental & Event AV in Mumbai | livegridAV",
    metaDescription:
      "LED walls, content, show control and live event production for Mumbai — launches, conferences, concerts and brand experiences, planned and operated by livegridAV.",
    h1: "LED screens and event AV in Mumbai",
    tagline: "Delhi-based, working across India. For Mumbai shows our crew travels with the system and runs it through to the strike.",
    intro: [
      "livegridAV builds the visual side of Mumbai events: LED walls and floors, naked-eye 3D and content made to the exact screen, projection mapping, media-server show control and live production. One team designs the system, creates the content and operates it on the night.",
      "Mumbai rewards precision — premium venues, media and entertainment audiences and launches that are filmed as much as they are watched. We plan for cameras as well as the room: pixel pitch, refresh rate and colour are chosen so the screen looks right on stage and on video.",
    ],
    scene:
      "Mumbai is the country's media and finance capital, so its event calendar leans towards product and brand launches, entertainment and award shows, financial-sector conferences, fashion, concerts and premium weddings. Venues range from large convention centres in BKC and Goregaon to hotel ballrooms where the load-in window is short and the ceiling height decides the screen.",
    venues: [
      "Jio World Convention Centre, Bandra Kurla Complex",
      "Bombay Exhibition Centre (NESCO), Goregaon",
      "NSCI Dome, Worli",
      "Hotel ballrooms in BKC, Juhu, Powai and South Mumbai",
      "CIDCO Exhibition Centre, Vashi, Navi Mumbai",
    ],
    highlights: [
      { service: "3d-anamorphic", note: "Anamorphic reveals for launches and activations, rendered to the screen's real corner geometry and the main viewing point." },
      { service: "led-display-rental", note: "Fine-pitch walls for camera-heavy shows, curved and creative shapes for brand sets." },
      { service: "show-control-media-server", note: "Frame-accurate playback across several screens, cued live with the show caller." },
      { service: "content-design", note: "Openers, stings and stage content built to the exact pixel map of the Mumbai venue's screen." },
    ],
    logistics: [
      { title: "Remote recce, then site check", body: "We start from venue drawings, photos and the venue's technical rider, then confirm details on site ahead of the build." },
      { title: "Kit and crew travel", body: "The system travels flight-cased from Delhi and our crew flies in, so the people who planned the show are the people who run it." },
      { title: "Venue coordination", body: "We work to the venue's load-in times, power supply and rigging rules, which are strict at Mumbai's premium venues." },
    ],
    faq: [
      { q: "Do you have an office in Mumbai?", a: "No — our office is in Delhi. For Mumbai events the system travels from Delhi and our own crew builds and operates it on site." },
      { q: "Can you work with our production company or event agency in Mumbai?", a: "Yes. We often deliver the LED, content and show control as part of a larger production, working to the agency's run of show." },
      { q: "Will the LED look good on camera?", a: "We plan for it: pixel pitch, refresh rate and colour are chosen for the cameras in use, and we check the screen on camera during rehearsal." },
      { q: "How much notice do you need for a Mumbai show?", a: "Allow time for freight from Delhi on top of planning. Share the date and venue early and we will confirm a schedule." },
    ],
  },
  {
    slug: "hyderabad",
    name: "Hyderabad",
    region: "Hyderabad · Secunderabad · HITEC City",
    metaTitle: "LED Screen Rental & Event AV in Hyderabad | livegridAV",
    metaDescription:
      "LED walls, show control, streaming and live event production for Hyderabad — tech conferences, exhibitions, launches and celebrations, planned and run by livegridAV.",
    h1: "LED screens and event AV in Hyderabad",
    tagline: "Delhi-based, working across India. For Hyderabad events we plan remotely, travel with the system and operate it ourselves.",
    intro: [
      "livegridAV delivers the visual side of Hyderabad events: LED walls and floors, content made for the exact screen, projection mapping, show control, live production and streaming. The same team plans the system, prepares the content and runs it on the day.",
      "Hyderabad's event calendar is shaped by its technology and pharma sectors, so many shows are hybrid by default — a stage for the room and a stream for teams in other cities. We design the screens, playback and stream as one system so nothing is bolted on at the end.",
    ],
    scene:
      "Hyderabad hosts large technology and life-sciences conferences, developer summits, company town halls and exhibitions around HITEC City and Gachibowli, alongside film and entertainment events, product launches and big family celebrations. Many of these run on tight agendas with several sessions and several screens.",
    venues: [
      "HITEX Exhibition Centre, HITEC City",
      "Hyderabad International Convention Centre (HICC)",
      "Hotel ballrooms in HITEC City, Gachibowli and Banjara Hills",
      "Gachibowli Indoor Stadium",
      "Ramoji Film City",
    ],
    highlights: [
      { service: "hybrid-events", note: "One programme for the room and for remote audiences — stage screens, cameras and stream planned together." },
      { service: "broadcast-streaming", note: "Multi-camera streaming for town halls and summits, with confidence monitors and backup paths." },
      { service: "show-control-media-server", note: "Multi-session agendas with presentations, videos and stings cued cleanly across every screen." },
      { service: "led-display-rental", note: "Main-stage walls, breakout screens and exhibition-stand LED, sized to each room." },
    ],
    logistics: [
      { title: "Plan from drawings", body: "We work from the venue's floor plans and technical details, then confirm power, rigging and sight lines on site before the build." },
      { title: "Travel with the system", body: "Equipment travels flight-cased from Delhi and our own crew flies in to build, calibrate and operate it." },
      { title: "Rehearse the hybrid", body: "Stream, playback and stage screens are rehearsed together, so the remote audience sees the same show as the room." },
    ],
    faq: [
      { q: "Do you have a team based in Hyderabad?", a: "No — we are based in Delhi and our crew travels for Hyderabad events with the equipment." },
      { q: "Can you stream our conference to other offices?", a: "Yes. We plan multi-camera streaming alongside the stage screens and can deliver to the platform you use." },
      { q: "Can you handle several halls at once?", a: "Yes, with screens and playback planned per room. Tell us the agenda and we will size the crew and system to it." },
      { q: "How early should we contact you?", a: "As early as the date and venue are known, so there is time for planning and freight from Delhi." },
    ],
  },
  {
    slug: "bangalore",
    name: "Bangalore",
    alsoKnownAs: "Bengaluru",
    region: "Bengaluru · Whitefield · Electronic City",
    metaTitle: "LED Screen Rental & Event AV in Bangalore (Bengaluru) | livegridAV",
    metaDescription:
      "LED walls, content, show control and live production for events in Bangalore (Bengaluru) — tech summits, product launches, exhibitions and concerts, run by livegridAV.",
    h1: "LED screens and event AV in Bangalore (Bengaluru)",
    tagline: "Delhi-based, working across India. For Bengaluru shows our crew travels with the system and runs it end to end.",
    intro: [
      "livegridAV delivers the visual side of events in Bangalore (Bengaluru): LED walls and floors, content made for the exact screen, naked-eye 3D, projection mapping, show control and live production. One team plans, creates and operates.",
      "Bengaluru audiences are technical and expect the screen to work as well as it looks — product demos have to be legible, live code has to be readable, and a keynote has to look right in the room and on the stream. We specify pitch, scaling and signal paths around that.",
    ],
    scene:
      "Bengaluru runs technology conferences and developer events, start-up and investor showcases, product launches, company offsites and exhibitions, along with concerts and festival nights. Many sit in Whitefield, on the Outer Ring Road or at the large exhibition grounds on the city's north-west edge.",
    venues: [
      "Bangalore International Exhibition Centre (BIEC), Tumkur Road",
      "KTPO Convention Centre, Whitefield",
      "Palace Grounds",
      "Hotel ballrooms in Whitefield, on the Outer Ring Road and in central Bengaluru",
      "Tech-park auditoriums and campus event spaces",
    ],
    highlights: [
      { service: "led-display-rental", note: "Fine-pitch walls that keep demo screens, code and small text sharp for the front rows." },
      { service: "presentation-content", note: "Slides and demo content re-built for wide LED canvases, so nothing is letterboxed or stretched." },
      { service: "live-production", note: "Keynotes and launches run as one show, with playback, cameras and lighting cued together." },
      { service: "immersive-experiences", note: "Immersive rooms and brand zones for product experiences and festival activations." },
    ],
    logistics: [
      { title: "Remote planning", body: "We plan from venue plans, the agenda and your content, then confirm the details on site ahead of the build." },
      { title: "Freight and crew from Delhi", body: "The system travels flight-cased and our own crew flies in, so the show is built and run by the team that planned it." },
      { title: "Tech rehearsal", body: "Demos, laptops and switching are rehearsed on the real screens before doors open." },
    ],
    faq: [
      { q: "Do you work in Bengaluru even though you are based in Delhi?", a: "Yes. We travel to any city for events — the equipment comes with us and our crew operates it." },
      { q: "Can you make our slides work on a very wide LED wall?", a: "Yes. We rebuild presentation and demo content for the screen's real resolution and shape, so it fills the wall cleanly." },
      { q: "Can presenters switch between laptops and live demos?", a: "Yes — we plan the switching and backup sources so speakers can change without the screen going black." },
      { q: "How far ahead should we book?", a: "Share the date and venue as soon as you have them, so there is time to plan and to ship the system from Delhi." },
    ],
  },
  {
    slug: "kolkata",
    name: "Kolkata",
    region: "Kolkata · Salt Lake · New Town",
    metaTitle: "LED Screen Rental & Event AV in Kolkata | livegridAV",
    metaDescription:
      "LED walls, projection mapping, content and live event production for Kolkata — cultural festivals, conferences, launches and celebrations, planned and run by livegridAV.",
    h1: "LED screens and event AV in Kolkata",
    tagline: "Delhi-based, working across India. For Kolkata events our crew travels with the system and operates it through the show.",
    intro: [
      "livegridAV delivers the visual side of Kolkata events: LED walls and floors, projection mapping, content made for the exact screen, show control and live production. One team plans the system, prepares the content and runs it live.",
      "Kolkata's calendar is rich in culture — festivals, heritage settings and long evening programmes — as well as conferences and corporate events in Salt Lake and New Town. Projection and LED let a stage or a building tell a story without permanent change to the space.",
    ],
    scene:
      "Kolkata hosts cultural festivals and performances, literary and arts events, industry conferences and trade fairs, corporate events in Salt Lake Sector V and New Town, product launches and grand wedding celebrations. Outdoor and heritage settings are common, so brightness, weather and access are planned from the start.",
    venues: [
      "Biswa Bangla Convention Centre, New Town",
      "Milan Mela Prangan, EM Bypass",
      "Netaji Indoor Stadium",
      "Science City auditoriums",
      "Hotel ballrooms in Salt Lake, New Town and central Kolkata",
    ],
    highlights: [
      { service: "projection-mapping", note: "Building and stage mapping for festivals and heritage settings, with content warped and blended to the surface." },
      { service: "led-display-rental", note: "Outdoor high-brightness screens for evening programmes and indoor walls for conference halls." },
      { service: "content-design", note: "Stage and festival content created for the real screen layout, in the event's own visual language." },
      { service: "professional-lighting", note: "Lighting designed together with the screens, so the stage reads well in the room and on camera." },
    ],
    logistics: [
      { title: "Plan from the site", body: "We work from plans, photos and the venue's technical details, then confirm surfaces, power and access on site — especially for outdoor and heritage settings." },
      { title: "Travel with the system", body: "Equipment travels flight-cased from Delhi and our crew flies in to build, align and operate it." },
      { title: "Line-up and run", body: "Projection is aligned and LED calibrated on site, then operated live through the programme." },
    ],
    faq: [
      { q: "Do you have an office in Kolkata?", a: "No — our office is in Delhi. For Kolkata events the system travels with our own crew." },
      { q: "Can you project onto a heritage building?", a: "Usually yes, subject to permissions. We survey the surface and plan projectors, positions and content so nothing is fixed to the building." },
      { q: "Can LED screens work outdoors in the evening?", a: "Yes — outdoor-rated, high-brightness LED is built for it. We plan for weather, power and the viewing distance." },
      { q: "How early should we get in touch?", a: "As soon as the date and venue are known, so there is time to plan, get permissions where needed and ship from Delhi." },
    ],
  },
];

export const getCity = (slug: string) => CITIES.find((c) => c.slug === slug);
