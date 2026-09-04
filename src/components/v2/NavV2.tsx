"use client";
import { useEffect, useState } from "react";
import { V2_NAV } from "./data";

/** 5x5 signal-grid brand mark (brand column heights 2,4,3,5,4, bottom-up). */
function Mark() {
  const H = [2, 4, 3, 5, 4];
  const cells = [];
  for (let r = 4; r >= 0; r--) for (let c = 0; c < 5; c++) {
    cells.push(<i key={`${r}${c}`} className={4 - r < H[c] ? "on" : ""} />);
  }
  return <span className="v2-mark" aria-hidden>{cells}</span>;
}

export default function NavV2() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`v2-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="v2-nav-inner">
        <a className="v2-brand" href="#top" aria-label="livegridAV home">
          <Mark />
          <b>livegrid<span>AV</span></b>
        </a>
        <nav className="v2-nav-links" aria-label="Primary">
          {V2_NAV.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
          <a className="v2-btn v2-btn--primary" href="#contact" style={{ padding: "10px 18px" }}>
            Start a project
          </a>
        </nav>
        <button
          className="v2-nav-toggle"
          aria-label="Toggle menu" aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden>
            <path d={open ? "M2 2 L18 12 M18 2 L2 12" : "M0 2 H20 M0 7 H20 M0 12 H20"}
              stroke="currentColor" strokeWidth="1.6" fill="none" />
          </svg>
        </button>
      </div>
      {open && (
        <nav className="v2-nav-mobile" aria-label="Primary mobile">
          {V2_NAV.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <a href="#contact" onClick={() => setOpen(false)} style={{ color: "var(--v2-cyan)" }}>Start a project →</a>
        </nav>
      )}
    </header>
  );
}
