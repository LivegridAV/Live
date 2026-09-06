"use client";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import SignalGrid from "../SignalGrid";
import Wordmark from "../Wordmark";
import { CONTACT, contactLinks } from "@/experience/contact";

/**
 * Route-aware chrome for every standard (non-experience) page. Light `paper`
 * surface, real route links — distinct from the homepage's anchor-based nav,
 * which only works inside the single-page experience. Primary CTAs point to
 * guaranteed-live contact channels (WhatsApp / email), never a homepage anchor
 * that may not exist once the WebGL experience has replaced the classic DOM.
 */

const NAV = [
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "AV Lab", href: "/av-lab" },
  { label: "About", href: "/about" },
  { label: "Insights", href: "/insights" },
];

export default function PageShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lg-dark flex min-h-full flex-col bg-paper text-text">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled
            ? "border-b border-line bg-paper/90 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4 md:px-12">
          <Link href="/" className="flex items-center gap-3 text-text">
            <SignalGrid cell={14} gap={3} palette="dark" animate={false} glow={false} />
            <Wordmark className="text-xl" accent="glow" />
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted transition-colors hover:text-text"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="rounded-xl bg-aqua px-5 py-2.5 text-sm font-medium text-white transition-[filter] hover:brightness-110"
            >
              Start a project
            </Link>
          </div>

          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text md:hidden"
          >
            <div className="space-y-1.5">
              <span className="block h-0.5 w-6 bg-current" />
              <span className="block h-0.5 w-6 bg-current" />
            </div>
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-line bg-paper md:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
                {NAV.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-2 py-3 text-text/80 hover:bg-line/50"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-xl bg-aqua px-5 py-3 text-center font-medium text-white"
                >
                  Start a project
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">{children}</main>

      <ShellFooter />
    </div>
  );
}

function ShellFooter() {
  return (
    <footer className="border-t border-ink-soft bg-ink text-text-inv">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-12 px-6 py-16 md:flex-row md:justify-between md:px-12">
        <div className="max-w-xs">
          <div className="flex items-center gap-3">
            <SignalGrid cell={16} gap={3} palette="dark" animate={false} glow={false} />
            <Wordmark className="text-xl" accent="glow" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-text-inv/55">
            Interactive LED displays, content and show technology — designed,
            built and operated as one visual production.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-text-inv/55">{CONTACT.address}</p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Explore</p>
            <ul className="mt-4 space-y-2.5">
              {[
                { label: "The experience", href: "/" },
                { label: "Work", href: "/work" },
                { label: "Services", href: "/services" },
                { label: "LED", href: "/led" },
                { label: "Equipment", href: "/equipment" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-text-inv/70 transition-colors hover:text-glow">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">More</p>
            <ul className="mt-4 space-y-2.5">
              {[
                { label: "AV Lab", href: "/av-lab" },
                { label: "Insights", href: "/insights" },
                { label: "About", href: "/about" },
                { label: "Contact", href: "/contact" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-text-inv/70 transition-colors hover:text-glow">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Contact</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href={contactLinks.email()} className="text-sm text-text-inv/70 transition-colors hover:text-glow">
                  {CONTACT.email}
                </a>
              </li>
              <li>
                <a href={contactLinks.call()} className="text-sm text-text-inv/70 transition-colors hover:text-glow">
                  {CONTACT.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={contactLinks.whatsapp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-text-inv/70 transition-colors hover:text-glow"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
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
