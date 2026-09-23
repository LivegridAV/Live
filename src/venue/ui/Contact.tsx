"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useVenue } from "../systems/store";
import { CONTACT, contactLinks, LEAD_WEBHOOK_URL, LEAD_WEBHOOK_ENABLED } from "@/experience/contact";

/**
 * The contact experience.
 *
 * It arrives with the finale rather than living in a footer: the house lights
 * are down, the wall has resolved to the wordmark, and this is what is left.
 * Every control is live — call, mail and WhatsApp are real links, and the form
 * posts to the same lead pipeline the rest of the site uses, falling back to
 * the visitor's mail client if that pipeline is unreachable so an enquiry is
 * never silently lost.
 */

const PROJECT_TYPES = [
  "Corporate event",
  "Conference / keynote",
  "Product launch",
  "Concert / festival",
  "Exhibition / expo",
  "LED requirement",
  "Projection mapping",
  "3D / anamorphic content",
  "Show control / media server",
  "Virtual or hybrid event",
  "Broadcast / streaming",
  "Web development",
  "Other",
];

export function ContactPanel() {
  const progress = useVenue((s) => s.progress);
  const entered = useVenue((s) => s.entered);
  const panelOpen = useVenue((s) => s.activePavilion);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "ready">("idle");
  const [draft, setDraft] = useState("");

  const pastVenue = useVenue((s) => s.pastVenue);
  // Late on purpose. The finale runs its own cues on the wall between 0.952
  // and 0.996 — brand, strapline, invitation — and putting a form over the top
  // of them turns a show ending into a page with a modal on it. The panel
  // arrives only once the invitation is up.
  const visible = entered && progress > 0.9905 && !panelOpen && !pastVenue;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const message = [
      `Project type: ${data.get("projectType") || "—"}`,
      data.get("company") ? `Company: ${data.get("company")}` : null,
      "",
      `${data.get("description") ?? ""}`,
    ]
      .filter((l) => l !== null)
      .join("\n");

    setDraft(`Name: ${data.get("name")}\nEmail: ${data.get("email")}\nPhone: ${data.get("phone") ?? ""}\n\n${message}`);
    if (!LEAD_WEBHOOK_ENABLED) { setStatus("ready"); return; }
    setStatus("sending");
    try {
      const res = await fetch(LEAD_WEBHOOK_URL, {
        signal: AbortSignal.timeout(12000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone") || null,
          company: data.get("company") || null,
          projectType: data.get("projectType"),
          message,
          source: "venue-experience",
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      form.reset();
    } catch {
      // The pipeline is unreachable — hand the brief to the mail client so the
      // enquiry still reaches us.
      setStatus("error");
    }
  };

  return (
    <section
      className="v-contact"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: `translateY(${visible ? 0 : 24}px)`,
      }}
      aria-hidden={!visible}
      inert={!visible}
      aria-label="Start a project"
    >
      <div className="v-contact-card">
        <div className="v-contact-head">
          <span className="v-mono">Let&rsquo;s build your next experience</span>
          <h2>Start a project</h2>
        </div>

        <div className="v-contact-actions">
          <a
            className="v-btn v-btn--primary"
            href={contactLinks.whatsapp()}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={visible ? 0 : -1}
          >
            WhatsApp
          </a>
          <a className="v-btn" href={contactLinks.call()} tabIndex={visible ? 0 : -1}>
            Call {CONTACT.phoneDisplay}
          </a>
          <a className="v-btn" href={contactLinks.email()} tabIndex={visible ? 0 : -1}>
            Email
          </a>
          <Link className="v-btn" href="/contact" tabIndex={visible ? 0 : -1}>
            Full contact page
          </Link>
        </div>

        <form className="v-form" onSubmit={submit}>
          <div className="v-form-grid">
            <div className="v-field">
              <label htmlFor="v-name">Name</label>
              <input id="v-name" name="name" required autoComplete="name" tabIndex={visible ? 0 : -1} />
            </div>
            <div className="v-field">
              <label htmlFor="v-company">Company</label>
              <input id="v-company" name="company" autoComplete="organization" tabIndex={visible ? 0 : -1} />
            </div>
            <div className="v-field">
              <label htmlFor="v-phone">Phone</label>
              <input id="v-phone" name="phone" type="tel" autoComplete="tel" tabIndex={visible ? 0 : -1} />
            </div>
            <div className="v-field">
              <label htmlFor="v-email">Email</label>
              <input id="v-email" name="email" type="email" required autoComplete="email" tabIndex={visible ? 0 : -1} />
            </div>
          </div>

          <div className="v-form-row">
          <div className="v-field">
            <label htmlFor="v-type">Project type</label>
            <select id="v-type" name="projectType" required defaultValue="" tabIndex={visible ? 0 : -1}>
              <option value="" disabled>
                Select a project type
              </option>
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="v-field">
            <label htmlFor="v-desc">Project description</label>
            <textarea
              id="v-desc"
              name="description"
              required
              rows={3}
              placeholder="Event, venue, date, audience, and what you need on screen."
              tabIndex={visible ? 0 : -1}
            />
          </div>
          </div>

          <div className="v-contact-actions">
            <button
              type="submit"
              className="v-btn v-btn--primary"
              disabled={status === "sending"}
              tabIndex={visible ? 0 : -1}
            >
              {status === "sending" ? "Sending…" : LEAD_WEBHOOK_ENABLED ? "Send enquiry" : "Prepare enquiry"}
            </button>
            {status !== "idle" && (
              <p
                className="v-form-status"
                data-state={status === "sent" ? "ok" : status === "error" ? "error" : undefined}
                role="status"
              >
                {status === "sent"
                  ? "Thank you — we've got it and we'll come back to you."
                  : status === "error" || status === "ready"
                    ? "Your draft is ready, not sent. Choose email or WhatsApp below, then send it to our team."
                    : ""}
              </p>
            )}
          </div>
          {(status === "ready" || status === "error") && <div className="v-contact-actions">
            <a className="v-btn" href={`${contactLinks.email()}&body=${encodeURIComponent(draft)}`}>Open email draft</a>
            <a className="v-btn" href={contactLinks.whatsapp(draft)} target="_blank" rel="noopener noreferrer">Open WhatsApp draft</a>
          </div>}
        </form>

        <div className="v-contact-details">
          <span>livegridAV · {CONTACT.address}</span>
          <a href={contactLinks.call()}>{CONTACT.phoneDisplay}</a>
          <a href={contactLinks.email()}>{CONTACT.email}</a>
        </div>
      </div>
    </section>
  );
}
