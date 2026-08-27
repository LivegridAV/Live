"use client";
import { FormEvent, useState } from "react";
import { CONTACT, contactLinks, LEAD_WEBHOOK_URL } from "@/experience/contact";

/**
 * Guided project brief (brief §37). Posts straight to the marketing lead pipeline
 * (n8n → backend agent), and falls back to opening the visitor's mail client if
 * the webhook is unreachable, so an enquiry is never lost. A WhatsApp handoff
 * carries the current selections into a prefilled chat.
 */

const PROJECT_TYPES = [
  "Corporate Event", "Conference", "Product Launch", "Live Event", "Exhibition",
  "LED Requirement", "Projection", "Content / 3D", "Anamorphic",
  "Show Control / Media Server", "Virtual Event", "Hybrid Event", "Streaming",
  "Web Development", "Other",
];

const NEEDS = [
  "AV Engineering", "Content & Visuals", "LED Displays", "3D / Anamorphic",
  "Projection Mapping", "Show Control", "Live Production", "Virtual / Hybrid",
  "Streaming", "Sound", "Lighting", "Web",
];

export default function ContactBrief() {
  const [projectType, setProjectType] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [typeError, setTypeError] = useState(false);

  const toggleNeed = (n: string) =>
    setNeeds((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  const buildMessage = (data: FormData) =>
    [
      `Project type: ${projectType || "—"}`,
      `Needs: ${needs.length ? needs.join(", ") : "—"}`,
      data.get("date") ? `Date: ${data.get("date")}` : null,
      data.get("city") ? `City: ${data.get("city")}` : null,
      data.get("venue") ? `Venue: ${data.get("venue")}` : null,
      data.get("dimensions") ? `Approx. dimensions: ${data.get("dimensions")}` : null,
      data.get("audience") ? `Audience: ${data.get("audience")}` : null,
      "",
      `${data.get("brief") ?? ""}`,
    ]
      .filter((l) => l !== null)
      .join("\n");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectType) {
      setTypeError(true);
      return;
    }
    const form = e.currentTarget;
    const data = new FormData(form);
    const message = buildMessage(data);

    setStatus("sending");
    try {
      const res = await fetch(LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone") || null,
          company: data.get("company") || null,
          projectType,
          needs,
          message,
        }),
      });
      if (!res.ok) throw new Error(`webhook responded ${res.status}`);
      setStatus("sent");
      form.reset();
      setProjectType("");
      setNeeds([]);
    } catch {
      // pipeline unreachable — hand the brief to the mail client so it still arrives.
      const body = [`Name: ${data.get("name")}`, `Email: ${data.get("email")}`, `Company: ${data.get("company") ?? ""}`, "", message].join("\n");
      window.location.href = `${contactLinks.email("Project brief — livegridav.com")}&body=${encodeURIComponent(body)}`;
      setStatus("error");
    }
  };

  const whatsapp = () => {
    const text = [
      "Hi LiveGridAV — I'd like to plan a project.",
      projectType ? `Type: ${projectType}` : null,
      needs.length ? `Needs: ${needs.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(contactLinks.whatsapp(text), "_blank", "noopener,noreferrer");
  };

  if (status === "sent") {
    return (
      <div className="rounded-[24px] border border-line bg-white p-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Brief received</p>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.01em] text-text">
          Thanks — it&rsquo;s with our team.
        </h2>
        <p className="mx-auto mt-3 max-w-[46ch] leading-relaxed text-muted">
          We&rsquo;ll be in touch shortly. For anything urgent, reach us on WhatsApp
          or {CONTACT.email}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={whatsapp}
            className="rounded-xl bg-aqua px-6 py-3 text-sm font-medium text-white transition-[filter] hover:brightness-110"
          >
            Continue on WhatsApp
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-12">
      {/* Step 1 — what are we building */}
      <fieldset>
        <legend className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">
          What are we building?
        </legend>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {PROJECT_TYPES.map((t) => {
            const on = t === projectType;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setProjectType(t);
                  setTypeError(false);
                }}
                className={`rounded-lg px-3.5 py-2 text-sm transition-colors ${
                  on
                    ? "bg-aqua text-white"
                    : "border border-line text-muted hover:border-aqua hover:text-aqua"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        {typeError && (
          <p className="mt-3 text-sm text-[#c0453b]">Please pick what you&rsquo;re building.</p>
        )}
      </fieldset>

      {/* Step 2 — what do you need */}
      <fieldset>
        <legend className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">
          What do you need? <span className="text-faint">(select any)</span>
        </legend>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {NEEDS.map((n) => {
            const on = needs.includes(n);
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                onClick={() => toggleNeed(n)}
                className={`rounded-lg px-3.5 py-2 text-sm transition-colors ${
                  on
                    ? "bg-ink text-text-inv"
                    : "border border-line text-muted hover:border-aqua hover:text-aqua"
                }`}
              >
                {on ? "✓ " : ""}
                {n}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Step 3 — the details */}
      <fieldset>
        <legend className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">The details</legend>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Event date" name="date" placeholder="March 2026 / TBC" />
          <Field label="City" name="city" placeholder="Hyderabad" />
          <Field label="Venue" name="venue" placeholder="Convention centre / TBC" />
          <Field label="Approx. screen size" name="dimensions" placeholder="e.g. 6m × 3.5m" />
          <Field label="Audience" name="audience" placeholder="e.g. 500" />
          <Field label="Company" name="company" placeholder="Your company" autoComplete="organization" />
          <Field label="Your name" name="name" required autoComplete="name" placeholder="Full name" />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="Optional" />
          <Field label="Email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" className="sm:col-span-2" />
          <label className="sm:col-span-2 block">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">The brief</span>
            <textarea
              name="brief"
              required
              rows={4}
              placeholder="Tell us about the show…"
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-text outline-none transition-colors placeholder:text-faint focus:border-aqua"
            />
          </label>
        </div>
      </fieldset>

      {status === "error" && (
        <p className="text-sm text-muted">
          We opened your mail client so the brief still reaches {CONTACT.email}.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-xl bg-aqua px-7 py-3.5 text-sm font-medium text-white transition-[filter] hover:brightness-110 disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send project brief"}
        </button>
        <button
          type="button"
          onClick={whatsapp}
          className="rounded-xl border border-line px-7 py-3.5 text-sm font-medium text-text transition-colors hover:border-aqua hover:text-aqua"
        >
          Continue on WhatsApp
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
        {label}
        {required && <span className="text-aqua"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-text outline-none transition-colors placeholder:text-faint focus:border-aqua"
      />
    </label>
  );
}
