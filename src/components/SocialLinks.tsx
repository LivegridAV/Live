import { SOCIAL, type SocialAccount } from "@/experience/contact";

/**
 * Links to livegridAV's own social accounts (contact.ts SOCIAL), with small
 * line icons drawn in currentColor so they take each surface's text colour.
 * Server-safe: no state, no client JavaScript.
 */

function Glyph({ id }: { id: SocialAccount["id"] }) {
  const common = {
    width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
  };
  if (id === "instagram") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common} fill="currentColor" stroke="none">
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.3H7.6V13h2.7v8z" />
    </svg>
  );
}

export default function SocialLinks({
  className = "",
  linkClassName = "",
  showLabel = false,
  tabIndex,
}: {
  className?: string;
  linkClassName?: string;
  /** Show the network name next to the icon. */
  showLabel?: boolean;
  tabIndex?: number;
}) {
  return (
    <ul className={className} aria-label="livegridAV on social media">
      {SOCIAL.map((s) => (
        <li key={s.id}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={showLabel ? undefined : `livegridAV on ${s.label}`}
            className={linkClassName}
            tabIndex={tabIndex}
          >
            <Glyph id={s.id} />
            {showLabel && <span>{s.label}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
