"use client";
import { FormEvent, useState } from "react";
import { audio } from "../audio";
import { CONTACT, contactLinks } from "../contact";
import { PROJECTS } from "../scenes/ProjectsCity";
import { useExperience } from "../store";

/**
 * The scrollable DOM behind the canvas: 1000vh of journey.
 * Copy blocks are pinned at each chapter's scroll band; the real HTML
 * keeps the experience readable, accessible and indexable while the
 * canvas does the spectacle.
 */

/** Place a block so it's on screen when journey progress ≈ `at`. */
function bandStyle(at: number): React.CSSProperties {
  return { top: `calc(${at} * (1000vh - 100vh) + 24vh)` };
}

function Block({
  at, eyebrow, title, children, align = "left",
}: {
  at: number;
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <section className={`lg-block lg-block-${align}`} style={bandStyle(at)}>
      <p className="lg-eyebrow">{eyebrow}</p>
      <h2 className="lg-block-title">{title}</h2>
      {children}
    </section>
  );
}

/** Holographic contact console — typing lights up the frame. */
function ContactConsole() {
  const [sent, setSent] = useState(false);
  const [typing, setTyping] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = [
      `Name: ${data.get("name")}`,
      `Event: ${data.get("event")}`,
      "",
      `${data.get("brief")}`,
    ].join("\n");
    window.location.href = `${contactLinks.email("Quote request — livegridav.com")}&body=${encodeURIComponent(body)}`;
    setSent(true);
    audio.click(undefined, 1.5);
  };

  return (
    <form
      id="contact-console"
      className={`lg-contact ${typing ? "is-typing" : ""}`}
      onSubmit={submit}
      onFocus={() => setTyping(true)}
      onBlur={() => setTyping(false)}
    >
      <p className="lg-contact-head">
        <span className="lg-contact-led" aria-hidden />
        TRANSMISSION CONSOLE
      </p>
      <label>
        <span>YOUR NAME</span>
        <input name="name" required autoComplete="name" placeholder="_" />
      </label>
      <label>
        <span>EVENT / DATE</span>
        <input name="event" placeholder="Product launch · March" />
      </label>
      <label>
        <span>THE BRIEF</span>
        <textarea name="brief" rows={4} required placeholder="Tell us about the show…" />
      </label>
      <button type="submit" className="lg-btn lg-btn-primary">
        {sent ? "TRANSMISSION OPENED ▮" : "TRANSMIT BRIEF"}
      </button>
      <p className="lg-contact-foot">
        Opens your mail client → {CONTACT.email}
      </p>
    </form>
  );
}

export default function Journey() {
  const activeProject = useExperience((s) => s.activeProject);
  const setActiveProject = useExperience((s) => s.setActiveProject);
  const project = activeProject !== null ? PROJECTS[activeProject] : null;

  return (
    <div className="lg-journey" style={{ height: "1000vh" }}>
      <Block at={0.02} eyebrow="LIVEGRIDAV · LIVE PRODUCTION" title={<>You&apos;re standing<br />in our venue.</>}>
        <p className="lg-block-copy">
          LED walls, lighting, lasers, sound — everything on this stage is
          real gear we deploy. Move your mouse: the rig is watching.
        </p>
      </Block>

      <Block at={0.15} align="right" eyebrow="THE CANVAS" title={<>19.2 metres of<br />living pixels.</>}>
        <p className="lg-block-copy">
          Keep scrolling. We&apos;re taking you all the way to pixel level —
          brush the wall to send ripples through it.
        </p>
      </Block>

      <Block at={0.26} align="center" eyebrow="RESTRICTED · SHOW CONTROL" title={<>Unlock the wall.</>}>
        <p className="lg-block-copy">Click the center of the vault. Mind the hydraulics.</p>
      </Block>

      <Block at={0.36} eyebrow="NAKED-EYE 3D" title={<>The impossible room.</>}>
        <p className="lg-block-copy">
          Our logo, rebuilt from thousands of particles — it avoids your
          cursor. Click a glass cube to run a 10-second illusion.
        </p>
      </Block>

      <Block at={0.48} align="right" eyebrow="WHAT WE DO" title={<>Nine services.<br />Grab and spin.</>}>
        <p className="lg-block-copy">
          Drag the glass cylinder — it has real momentum. Click a panel to
          watch that service demonstrate itself.
        </p>
      </Block>

      <Block at={0.59} eyebrow="TRACK RECORD" title={<>Numbers that<br />hold a stage.</>} />

      <Block at={0.69} align="right" eyebrow="EQUIPMENT LAB" title={<>The signal chain,<br />in anti-gravity.</>}>
        <p className="lg-block-copy">
          Grab any device and spin it. Follow the pulse — that&apos;s your
          signal travelling from server to screen.
        </p>
      </Block>

      <Block at={0.79} eyebrow="PROJECTS" title={<>A city of shows.</>}>
        <p className="lg-block-copy">
          Every cube is a delivered event. Hover to open one; click to step
          inside.
        </p>
      </Block>

      {/* finale */}
      <section className="lg-finale" style={bandStyle(0.965)}>
        <p className="lg-eyebrow">LIVEGRIDAV</p>
        <h2 className="lg-finale-title">
          POWERING EVENTS WITH<br />
          <span>BRILLIANT VISUAL EXPERIENCES</span>
        </h2>
        <div className="lg-finale-ctas">
          <a className="lg-btn lg-btn-primary" href={contactLinks.email()}>Get a Quote</a>
          <a className="lg-btn" href={contactLinks.whatsapp()} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a className="lg-btn" href={contactLinks.call()}>Call Now</a>
          <a className="lg-btn" href={`mailto:${CONTACT.email}`}>Email</a>
        </div>
        <ContactConsole />
        <p className="lg-finale-foot">
          {CONTACT.phoneDisplay} · {CONTACT.email}
          <br />
          {CONTACT.address}
          <br />
          livegridav.com · double-click anywhere for fireworks
        </p>
      </section>

      {/* project detail — "walk inside" */}
      {project && (
        <div className="lg-modal" role="dialog" aria-label={project.name} onClick={() => setActiveProject(null)}>
          <div className="lg-modal-card lg-modal-project" onClick={(e) => e.stopPropagation()}>
            <p className="lg-modal-eyebrow" style={{ color: project.vibe }}>
              {project.year} · {project.location}
            </p>
            <h3>{project.name}</h3>
            <dl className="lg-project-specs">
              <div><dt>CLIENT</dt><dd>{project.client}</dd></div>
              <div><dt>LED</dt><dd>{project.led}</dd></div>
              <div><dt>SYSTEM</dt><dd>{project.gear}</dd></div>
            </dl>
            <div
              className="lg-project-visual"
              style={{ background: `radial-gradient(ellipse at 50% 80%, ${project.vibe}44, transparent 70%)` }}
              aria-hidden
            >
              <span style={{ background: project.vibe, boxShadow: `0 0 26px ${project.vibe}` }} />
            </div>
            <div className="lg-modal-actions">
              <a className="lg-btn lg-btn-primary" href={contactLinks.email(`Enquiry: something like ${project.name}`)}>
                Build something like this
              </a>
              <button className="lg-btn" onClick={() => setActiveProject(null)}>Back to the city</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
