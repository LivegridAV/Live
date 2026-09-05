import Link from "next/link";
import NavV2 from "@/components/v2/NavV2";
import HeroStage from "@/components/v2/hero/HeroStage";
import Reveal2 from "@/components/v2/Reveal2";
import ContactV2 from "@/components/v2/ContactV2";
import Motif, { type MotifKey } from "@/components/v2/motifs";
import { V2_CATEGORIES, V2_WORK } from "@/components/v2/data";
import { CONTACT, contactLinks } from "@/experience/contact";

const HERO_STRIP: [string, string][] = [
  ["LED", "Indoor · outdoor · floor"],
  ["3D", "Naked-eye anamorphic"],
  ["Servers", "Show control · media"],
  ["Live", "Switch · stream"],
  ["One team", "Designed & operated"],
];

/** The V2 homepage content, shared by `/` (production) and `/design-v2`
 *  (noindex preview). Rendered inside a `.v2root` wrapper by its host. */
export default function V2Home() {
  return (
    <>
      <NavV2 />

      {/* ── 01 · HERO (Gate 1: CSS stage; 3D wired in Gate 2) ── */}
      <section className="v2-hero">
        <HeroStage />
        <div className="v2-hero-scrim" aria-hidden />
        <div className="v2-hero-inner">
          <div className="v2-wrap">
            <p className="v2-eyebrow">LIVEGRIDAV <span className="dot">·</span> EXPERIENCE ENGINEERING</p>
            <h1 className="v2-display v2-hero-title">
              We turn ideas into<br /><span className="warm">unforgettable</span> experiences
            </h1>
            <p className="v2-lead v2-hero-lead">
              AV engineering, content, LED, projection and show technology —
              designed, programmed and operated as one.
            </p>
            <div className="v2-hero-ctas">
              <a className="v2-btn v2-btn--primary" href="#work">Explore our work</a>
              <a className="v2-btn v2-btn--ghost" href="#contact">Start a project</a>
            </div>
            <dl className="v2-hero-strip">
              {HERO_STRIP.map(([t, s]) => (
                <div key={t}><dt>{t}</dt><dd>{s}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── 02 · BRAND STATEMENT ── */}
      <section className="v2-section v2-band">
        <div className="v2-wrap">
          <Reveal2>
            <div className="v2-statement">
              <p>We design the <span className="k">pixels</span>.</p>
              <p>We engineer the <span className="cyan">signal</span>.</p>
              <p>We run the <span className="k">show</span>.</p>
            </div>
            <p className="v2-lead" style={{ marginTop: 30 }}>
              One production team across the whole visual chain — so the LED wall,
              the content on it, the servers behind it and the operator at front of
              house are all designed to work as a single system.
            </p>
          </Reveal2>
        </div>
      </section>

      {/* ── 03–07 · SERVICE STORY (grouped, editorial — not a card wall) ── */}
      <section className="v2-section" id="services">
        <div className="v2-wrap">
          <Reveal2>
            <p className="v2-eyebrow">WHAT WE DO <span className="dot">·</span> SERVICES</p>
            <h2 className="v2-h2" style={{ marginTop: 16, maxWidth: "18ch" }}>
              Every part of the visual show, engineered.
            </h2>
          </Reveal2>

          {V2_CATEGORIES.map((cat, ci) => {
            const featured = cat.services.filter((s) => s.motif);
            const rest = cat.services.filter((s) => !s.motif);
            return (
              <div className="v2-cat" key={cat.key}>
                <Reveal2>
                  <div className="v2-cat-head">
                    <div>
                      <span className="idx">{String(ci + 1).padStart(2, "0")}</span>
                      <h3 className="v2-h3" style={{ marginTop: 10 }}>{cat.title}</h3>
                    </div>
                    <p className="v2-body" style={{ maxWidth: "34ch" }}>{cat.blurb}</p>
                  </div>
                </Reveal2>

                {featured.map((s) => (
                  <Reveal2 key={s.name}>
                    <article className="v2-svc">
                      <div className="v2-svc-copy">
                        <h3 className="v2-h3">{s.name}</h3>
                        <p className="v2-body">{s.desc}</p>
                        {s.tags && (
                          <div className="v2-svc-tags">
                            {s.tags.map((t) => <span className="v2-tag" key={t}>{t}</span>)}
                          </div>
                        )}
                        <Link className="v2-svc-more" href={s.href}>Explore {s.name} <span aria-hidden>→</span></Link>
                      </div>
                      <div className="v2-svc-media">
                        <Motif name={s.motif as MotifKey} />
                      </div>
                    </article>
                  </Reveal2>
                ))}

                {rest.length > 0 && (
                  <Reveal2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18, marginTop: 28 }}>
                      {rest.map((s) => (
                        <Link key={s.name} href={s.href} style={{ textDecoration: "none", color: "inherit", borderTop: "1px solid var(--v2-line)", paddingTop: 16 }}>
                          <h4 className="v2-h3" style={{ fontSize: 19 }}>{s.name}</h4>
                          <p className="v2-body" style={{ marginTop: 8, fontSize: 14.5 }}>{s.desc}</p>
                        </Link>
                      ))}
                    </div>
                  </Reveal2>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 08 · WORK / CAPABILITY STUDIES ── */}
      <section className="v2-section v2-band" id="work">
        <div className="v2-wrap">
          <Reveal2>
            <p className="v2-eyebrow">SELECTED WORK <span className="dot">·</span> CAPABILITY STUDIES</p>
            <h2 className="v2-h2" style={{ marginTop: 16, maxWidth: "16ch" }}>The shows we build.</h2>
            <p className="v2-lead" style={{ marginTop: 16 }}>
              The kinds of systems LivegridAV designs and operates. Studies of real
              capability — not client case studies.
            </p>
          </Reveal2>
          <Reveal2 style={{ marginTop: 34 }}>
            <div className="v2-work-grid">
              {V2_WORK.map((w) => (
                <Link className={`v2-work-item ${w.span}`} href="/work" key={w.name}>
                  <div className="glow"><Motif name={w.motif as MotifKey} /></div>
                  <p className="v2-work-meta">{w.meta}</p>
                  <h3 className="v2-h3" style={{ fontSize: 22 }}>{w.name}</h3>
                  <p className="v2-work-sub">{w.sub}</p>
                </Link>
              ))}
            </div>
          </Reveal2>
        </div>
      </section>

      {/* ── 10 · CONTACT ── */}
      <section className="v2-section" id="contact">
        <div className="v2-wrap">
          <div className="v2-contact">
            <div>
              <Reveal2>
                <p className="v2-eyebrow">START A PROJECT <span className="dot">·</span> CONTACT</p>
                <h2 className="v2-h2" style={{ marginTop: 16, maxWidth: "14ch" }}>Let&apos;s plan your show.</h2>
                <p className="v2-lead" style={{ marginTop: 16 }}>
                  Tell us the venue, the date and what you want on screen — we&apos;ll take it from there.
                </p>
              </Reveal2>
              <Reveal2 style={{ marginTop: 30 }}>
                <div className="v2-contact-facts">
                  <div className="v2-fact"><span className="v2-kicker">Email</span><a href={contactLinks.email()}>{CONTACT.email}</a></div>
                  <div className="v2-fact"><span className="v2-kicker">Phone</span><a href={contactLinks.call()}>{CONTACT.phoneDisplay}</a></div>
                  <div className="v2-fact"><span className="v2-kicker">WhatsApp</span><a href={contactLinks.whatsapp()} target="_blank" rel="noopener noreferrer">Message us</a></div>
                  <div className="v2-fact"><span className="v2-kicker">Studio</span><span className="val">{CONTACT.address}</span></div>
                </div>
              </Reveal2>
            </div>
            <Reveal2>
              <ContactV2 />
            </Reveal2>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="v2-footer">
        <div className="v2-wrap">
          <div className="v2-footer-grid">
            <div>
              <div className="v2-brand" style={{ marginBottom: 14 }}><b>livegrid<span style={{ color: "var(--v2-cyan)" }}>AV</span></b></div>
              <p className="v2-body" style={{ maxWidth: "34ch" }}>
                LED displays, content and show technology — designed, built and operated as one visual production.
              </p>
            </div>
            <div>
              <h4>Explore</h4>
              <a href="#work">Work</a><a href="#services">Services</a><Link href="/av-lab">AV Lab</Link><Link href="/led">LED</Link>
            </div>
            <div>
              <h4>Company</h4>
              <Link href="/about">About</Link><Link href="/insights">Insights</Link><a href="#contact">Contact</a>
            </div>
            <div>
              <h4>Contact</h4>
              <a href={contactLinks.email()}>{CONTACT.email}</a>
              <a href={contactLinks.call()}>{CONTACT.phoneDisplay}</a>
              <a href={contactLinks.whatsapp()} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          </div>
          <div className="v2-footer-foot">
            <span>© {new Date().getFullYear()} livegridAV</span>
            <span>Hyderabad · Telangana</span>
          </div>
        </div>
      </footer>
    </>
  );
}
