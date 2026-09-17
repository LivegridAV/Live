"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useVenue } from "../systems/store";
import { NAV_STOPS } from "../data/zones";
import { scrollToProgress } from "../systems/ScrollRig";

/**
 * Navigation.
 *
 * Deliberately thin: a wordmark, five labels and one action. Four of the links
 * move the camera inside the experience; the rest are real routes, because the
 * service pages have to stay crawlable and reachable whether or not WebGL ran.
 */

const HEIGHTS = [2, 4, 3, 5, 4];

function NavMark() {
  return (
    <span className="v-nav-grid" aria-hidden="true">
      {Array.from({ length: 25 }, (_, i) => {
        const row = Math.floor(i / 5);
        const col = i % 5;
        return <i key={i} data-on={5 - row <= HEIGHTS[col] ? "true" : "false"} />;
      })}
    </span>
  );
}

/**
 * The brief's navigation, exactly: EXPERIENCE, SERVICES, WORK, AV LAB, CONTACT.
 * "Experience" restarts the walkthrough; the rest are real routes. Jumping
 * *inside* the venue is the progress rail's job, which keeps this bar to five
 * words and stops it competing with the room.
 */
const ROUTES = [
  { label: "Services", href: "/services" },
  { label: "Work", href: "/work" },
  { label: "AV Lab", href: "/av-lab" },
  { label: "Contact", href: "/contact" },
];

export function Nav() {
  const zone = useVenue((s) => s.zone);
  const navOpen = useVenue((s) => s.navOpen);
  const setNavOpen = useVenue((s) => s.setNavOpen);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen, setNavOpen]);

  const go = (p: number) => {
    setNavOpen(false);
    scrollToProgress(p);
  };

  return (
    <>
      <header className="v-nav">
        <button type="button" className="v-nav-brand" onClick={() => go(0)} aria-label="livegridAV — back to the entrance">
          <NavMark />
          livegrid<span>AV</span>
        </button>

        <nav className="v-nav-links" aria-label="Main">
          <button
            type="button"
            className="v-nav-link"
            aria-current={zone === "arrival" ? "true" : undefined}
            onClick={() => go(0)}
          >
            Experience
          </button>
          {ROUTES.map((r) => (
            <Link key={r.href} href={r.href} className="v-nav-link">
              {r.label}
            </Link>
          ))}
          <Link href="/contact" className="v-btn v-nav-cta">
            Start a project
          </Link>
        </nav>

        <button
          type="button"
          className="v-nav-toggle"
          aria-expanded={navOpen}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          onClick={() => setNavOpen(!navOpen)}
        >
          <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
            <rect width="18" height="1.6" y="0" fill="currentColor" />
            <rect width="18" height="1.6" y="5.2" fill="currentColor" />
            <rect width="12" height="1.6" y="10.4" fill="currentColor" />
          </svg>
        </button>
      </header>

      {navOpen && (
        <div className="v-nav-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="v-btn v-nav-sheet-close" onClick={() => setNavOpen(false)}>
            Close
          </button>
          <p className="v-mono v-nav-sheet-label">In the venue</p>
          {NAV_STOPS.map((s) => (
            <button key={s.id} type="button" className="v-nav-link" onClick={() => go(s.p)}>
              {s.label}
            </button>
          ))}
          <p className="v-mono v-nav-sheet-label">Pages</p>
          {ROUTES.map((r) => (
            <Link key={r.href} href={r.href} className="v-nav-link" onClick={() => setNavOpen(false)}>
              {r.label}
            </Link>
          ))}
          <Link href="/contact" className="v-nav-link" onClick={() => setNavOpen(false)}>
            Start a project
          </Link>
        </div>
      )}
    </>
  );
}
