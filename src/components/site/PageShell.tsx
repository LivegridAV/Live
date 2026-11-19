"use client";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lg-dark flex min-h-full flex-col bg-paper text-text">
      {/* Scroll edge: content passing under the floating controls softens
          instead of meeting an opaque bar (Liquid Glass, liquid-glass.css). */}
      <div aria-hidden className="lg-scroll-edge" data-on={scrolled || open} />
      <header className="fixed inset-x-0 top-0 z-50">
        <nav className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4 md:px-12">
          <Link href="/" className="flex items-center gap-3 text-text">
            <SignalGrid cell={14} gap={3} palette="dark" animate={false} glow={false} />
            <Wordmark className="text-xl" accent="glow" />
          </Link>

          <div className="lg-glass-pill hidden items-center gap-1 py-1.5 pl-2 pr-1.5 lg:flex">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href || pathname.startsWith(l.href + "/") ? "page" : undefined}
                className="lg-nav-link text-sm text-muted hover:text-text"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="lg-btn lg-btn-primary ml-2 !px-5 !py-2.5 text-sm"
            >
              Start a project
            </Link>
          </div>

          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="lg-glass-pill flex h-11 w-11 items-center justify-center text-text lg:hidden"
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
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              style={{ transformOrigin: "top right" }}
              className="lg-glass-sheet mx-3 overflow-hidden lg:hidden"
            >
              <div className="flex flex-col gap-1 p-3">
                {NAV.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === l.href ? "page" : undefined}
                    className="lg-sheet-item px-4 py-3 text-text/85 transition-colors hover:bg-white/5 aria-[current=page]:bg-white/[0.07] aria-[current=page]:text-text"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="lg-btn lg-btn-primary mt-2 px-5 py-3 text-center"
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
      <div className="mx-auto flex max-w-[1180px] flex-col gap-12 px-6 py-16 lg:flex-row lg:justify-between md:px-12">
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
