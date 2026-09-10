/** Central contact endpoints (source of truth: Contact.txt). */
export const CONTACT = {
  email: "livegridav@gmail.com",
  phone: "+917801013919",
  phoneDisplay: "+91 78010 13919",
  whatsapp: "917801013919", // digits only for wa.me
  address: "20-1320 Serilingampally, Hyderabad, Telangana 500050",
} as const;

export const contactLinks = {
  email: (subject = "Event enquiry — livegridav.com") =>
    `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}`,
  call: () => `tel:${CONTACT.phone}`,
  whatsapp: (text = "Hi LiveGridAV — I'd like a quote for an event.") =>
    `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`,
};

/**
 * n8n webhook that feeds the backend's Marketing agent (records the lead,
 * dedupes by email, scores/segments, hands qualified leads to Sales).
 * This is a public intake URL — n8n holds the real backend API key
 * server-side, so nothing secret is ever shipped to the browser.
 * Override at build time with NEXT_PUBLIC_LEAD_WEBHOOK_URL if the n8n host
 * ever changes; this is a static export, so the env var must be set before
 * `next build`, not at runtime.
 */
export const LEAD_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_LEAD_WEBHOOK_URL ??
  "https://n8n.livegridav.com/webhook/livegridav-lead-capture";
