import type { Metadata } from "next";
import Link from "next/link";
import "./visual-final.css";
import Experience from "@/components/visualfinal/Experience";

export const metadata: Metadata = {
  title: "Immersive Experience — livegridAV",
  description:
    "A live, interactive digital event venue: anamorphic LED stage, corporate shows, festival visuals, social-event environments and 360° installations.",
  // staging/preview route — production stays on the live homepage until accepted
  robots: { index: false, follow: false },
};

/**
 * /visual-final — the five-world immersive rebuild (staging). The WebGL
 * experience is the hero; real semantic content sits beneath it so the page
 * stays crawlable and works without WebGL (brief §27/§28/§32).
 */
export default function VisualFinalPage() {
  return (
    <>
      <Experience />
      <section className="vf-seo">
        <h1>livegridAV — we turn ideas into unforgettable experiences</h1>
        <p>
          livegridAV designs and operates immersive LED and AV experiences: anamorphic
          naked-eye 3D content, large-format LED stages, live production, and permanent
          interactive installations.
        </p>
        <h2>Five immersive worlds</h2>
        <ul>
          <li><strong>Anamorphic Stage</strong> — naked-eye 3D content breaking out of a curved LED corner.</li>
          <li><strong>Corporate Experience</strong> — launches, conferences, hybrid and virtual events.</li>
          <li><strong>Music Festival</strong> — festival, club and pub visuals, live VJ and interactive stages.</li>
          <li><strong>Social Event</strong> — LED stages, 3D environments, anamorphic and floor LED content.</li>
          <li><strong>360° Installation</strong> — permanent immersive rooms, LED cubes and mapped environments.</li>
        </ul>
        <h2>Capabilities</h2>
        <ul>
          <li>AV engineering, show control and media-server operation</li>
          <li>3D / anamorphic content and projection mapping</li>
          <li>LED display supply and floor LED</li>
          <li>Live production, broadcast and streaming</li>
          <li>Virtual and hybrid events</li>
          <li>Fixed AV installations for clubs, pubs and venues</li>
        </ul>
        <p><Link href="/contact">Start a project</Link> · <Link href="/services">Services</Link> · <Link href="/work">Work</Link></p>
      </section>
    </>
  );
}
