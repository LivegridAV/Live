"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useVenue } from "../systems/store";
import {
  PAVILIONS,
  PARTNER_BAY,
  PAVILION_RANGE,
  pavilionById,
  pavilionServices,
} from "../data/pavilions";
import { journey } from "../systems/journey";
import { contactLinks } from "@/experience/contact";

/**
 * Service interaction (brief §22).
 *
 * As the camera comes level with a stall its prompt fades in on the matching
 * side of the frame. Opening it slides the stall's own display out toward the
 * visitor — the page never navigates away, the scroll position is untouched,
 * and closing puts them back exactly where they were standing. Every service
 * still links to its own crawlable route for anyone who wants the full page.
 */

const ALL = [...PAVILIONS, PARTNER_BAY];

export function PavilionPrompt() {
  const progress = useVenue((s) => s.progress);
  const entered = useVenue((s) => s.entered);
  const activePavilion = useVenue((s) => s.activePavilion);
  const open = useVenue((s) => s.openPavilion);
  const pastVenue = useVenue((s) => s.pastVenue);

  const near = useMemo(() => {
    let best: (typeof ALL)[number] | null = null;
    let bestD = Infinity;
    for (const p of ALL) {
      const d = Math.abs(progress - p.p);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return bestD < PAVILION_RANGE * 1.5 ? best : null;
  }, [progress]);

  const visible = entered && near && !activePavilion && !pastVenue;

  if (!near) return null;

  return (
    <aside
      className="v-prompt"
      /* A control strip, not a content card. The stand explains itself on its
         own kiosk in the room (see data/media.ts, painter `kioskInfo`); what
         is left for the DOM is the thing HTML is actually better at — a real
         button, reachable by keyboard, that opens the full accessible panel. */
      data-side={near.side}
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: `translateY(${visible ? 0 : 14}px)`,
      }}
    >
      <span className="v-prompt-no">
        {"no" in near ? "We Do" : "With Partners"}
      </span>
      <h2>{near.headline}</h2>
      <div className="v-prompt-act">
        <button type="button" className="v-btn v-btn--primary" onClick={() => open(near.id)}>
          Explore this pavilion
        </button>
      </div>
    </aside>
  );
}

export function PavilionPanel() {
  const activePavilion = useVenue((s) => s.activePavilion);
  const close = useVenue((s) => s.closePavilion);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const pav = activePavilion ? pavilionById(activePavilion) : undefined;
  const services = pav ? pavilionServices(pav) : [];

  // Freeze the walkthrough while the panel owns the screen, and give it back
  // untouched — the visitor returns to exactly the same spot in the venue.
  useEffect(() => {
    if (!activePavilion) return;
    journey.locked = true;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    const barWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (barWidth > 0) document.body.style.paddingRight = `${barWidth}px`;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      journey.locked = false;
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      window.removeEventListener("keydown", onKey);
    };
  }, [activePavilion, close]);

  if (!pav) return null;
  const isPartner = pav.id === PARTNER_BAY.id;

  return (
    <div className="v-panel" role="dialog" aria-modal="true" aria-label={pav.headline}>
      <button type="button" className="v-panel-scrim" aria-label="Close" onClick={close} />
      <div className="v-panel-body" ref={bodyRef}>
        <div className="v-panel-head">
          <span className="v-mono">
            {"no" in pav ? `We Do ${pav.doing}` : `With Partners — ${pav.doing}`}
          </span>
          <button type="button" className="v-btn" onClick={close} ref={closeRef}>
            Close
          </button>
        </div>

        <div className="v-panel-inner">
          <div>
            <h2>{pav.headline}</h2>
            <p style={{ marginTop: 12 }}>{pav.support}</p>
          </div>

          {isPartner && <p className="v-panel-note">{PARTNER_BAY.note}</p>}

          {services.map((s) => (
            <section key={s.slug} className="v-panel-service">
              <div>
                <span className="v-mono">{s.order} · {s.group}</span>
                <h3 style={{ marginTop: 8 }}>{s.title}</h3>
                <p>{s.tagline}</p>
              </div>
              <p>{s.plain}</p>

              <div>
                <span className="v-mono">What we do</span>
                <ul style={{ marginTop: 10 }}>
                  {s.whatWeDo.slice(0, 5).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>

              {s.systems.length > 0 && (
                <div>
                  <span className="v-mono">Related systems</span>
                  <div className="v-prompt-tags" style={{ marginTop: 10 }}>
                    {s.systems.slice(0, 6).map((x) => (
                      <span key={x} className="v-tag">
                        {x}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="v-panel-actions">
                <Link href={`/services/${s.slug}`} className="v-btn">
                  Full service page
                </Link>
                <Link href="/work" className="v-btn">
                  View work
                </Link>
              </div>
            </section>
          ))}

          <div className="v-panel-actions">
            <a className="v-btn v-btn--primary" href={contactLinks.whatsapp(`Hi LiveGridAV — I'd like to talk about ${pav.headline}.`)} target="_blank" rel="noopener noreferrer">
              Start a project
            </a>
            <Link href="/contact" className="v-btn">
              Send a brief
            </Link>
            <button type="button" className="v-btn" onClick={close}>
              Back to the venue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
