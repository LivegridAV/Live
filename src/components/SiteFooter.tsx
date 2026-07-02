import SignalGrid from "./SignalGrid";
import Wordmark from "./Wordmark";
import { CONTACT, contactLinks } from "@/experience/contact";

const COLS = [
  {
    heading: "Company",
    links: [
      { label: "Work", href: "#work" },
      { label: "Services", href: "#services" },
      { label: "Process", href: "#process" },
    ],
  },
  {
    heading: "Contact",
    links: [
      { label: CONTACT.email, href: `mailto:${CONTACT.email}` },
      { label: CONTACT.phoneDisplay, href: contactLinks.call() },
      { label: "WhatsApp", href: contactLinks.whatsapp() },
      { label: "Get a quote", href: "#contact" },
    ],
  },
  {
    heading: "Social",
    links: [
      { label: "Instagram", href: "#" },
      { label: "LinkedIn", href: "#" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-ink-soft bg-ink text-text-inv">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-12 px-6 py-16 md:flex-row md:justify-between md:px-12">
        <div className="max-w-xs">
          <div className="flex items-center gap-3">
            <SignalGrid cell={16} gap={3} palette="dark" animate={false} glow={false} />
            <Wordmark className="text-xl" accent="glow" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-text-inv/55">
            Interactive LED displays and video walls that turn any space into a
            living signal.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-text-inv/55">
            {CONTACT.address}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {COLS.map((c) => (
            <div key={c.heading}>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
                {c.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-text-inv/70 transition-colors hover:text-glow"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-ink-soft">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-faint md:flex-row md:justify-between md:px-12">
          <span>© {new Date().getFullYear()} livegridAV</span>
          <span>Signal Grid — locked.</span>
        </div>
      </div>
    </footer>
  );
}
