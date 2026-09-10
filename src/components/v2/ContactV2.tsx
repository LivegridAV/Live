"use client";
import { FormEvent, useState } from "react";
import { CONTACT, contactLinks, LEAD_WEBHOOK_URL } from "@/experience/contact";

/** V2 contact — same lead pipeline as the rest of the site (n8n → sales),
 *  with a mailto fallback so an enquiry is never lost. */
export default function ContactV2() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const message = [
      data.get("event") ? `Event / date: ${data.get("event")}` : null,
      data.get("brief"),
    ].filter(Boolean).join("\n\n");

    setStatus("sending");
    try {
      const res = await fetch(LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"), email: data.get("email"),
          phone: data.get("phone") || null, company: data.get("company") || null, message,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      form.reset();
    } catch {
      const body = [`Name: ${data.get("name")}`, `Email: ${data.get("email")}`, `Event: ${data.get("event")}`, "", `${data.get("brief")}`].join("\n");
      window.location.href = `${contactLinks.email("Quote request — livegridav.com")}&body=${encodeURIComponent(body)}`;
      setStatus("error");
    }
  };

  const label = { idle: "Send the brief", sending: "Sending…", sent: "Sent — we'll be in touch ✓", error: "Opened your email app" }[status];

  return (
    <form onSubmit={submit}>
      <div className="v2-field">
        <span>Your name</span>
        <input name="name" required autoComplete="name" placeholder="Name" />
      </div>
      <div className="v2-field">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
      </div>
      <div className="v2-field">
        <span>Event / date (optional)</span>
        <input name="event" placeholder="Product launch · March" />
      </div>
      <div className="v2-field">
        <span>The brief</span>
        <textarea name="brief" rows={4} required placeholder="Tell us about the show…" />
      </div>
      <button type="submit" className="v2-btn v2-btn--primary" disabled={status === "sending"} style={{ width: "100%", justifyContent: "center" }}>
        {label}
      </button>
      <p className="v2-body" style={{ marginTop: 12, fontSize: 13 }}>
        {status === "error" ? `Delivered to ${CONTACT.email}` : "Goes straight to our team."}
      </p>
    </form>
  );
}
