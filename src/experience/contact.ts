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
