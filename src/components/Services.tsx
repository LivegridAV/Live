import Link from "next/link";
import Reveal from "./Reveal";
import SignalGrid from "./SignalGrid";
import { SERVICES } from "@/content/site";

/** Maps a homepage service name to its detail route, where one exists yet. */
const SERVICE_SLUG: Record<string, string> = {
  "LED Display Rental": "led-display-rental",
  "Watchout Programming": "show-control-media-server",
  "Live Streaming": "broadcast-streaming",
  "VJ Service": "show-control-media-server",
  "Motion Graphics": "content-design",
  "Naked Eye 3D": "3d-anamorphic",
  "Hybrid Events": "hybrid-events",
};

export default function Services() {
  return (
    <section id="services" className="bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-[1180px] px-6 md:px-12">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">
            What we do
          </p>
          <h2 className="mt-4 max-w-[18ch] text-4xl font-semibold tracking-[-0.02em] text-text md:text-5xl">
            Nine services. One production team.
          </h2>
          <p className="mt-5 max-w-[52ch] leading-relaxed text-muted">
            From the LED wall to the media server to the operator at front of
            house — LiveGridAV designs, builds and runs the whole visual show.
          </p>
          <Link
            href="/services"
            className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-aqua transition-colors hover:text-text"
          >
            View all services →
          </Link>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => {
            const slug = SERVICE_SLUG[s.name];
            const inner = (
              <>
                <div className="flex items-center justify-between">
                  <SignalGrid
                    cell={10}
                    gap={2.5}
                    palette="light"
                    animate={false}
                    glow={false}
                  />
                  <span className="font-mono text-[11px] tracking-[0.2em] text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-[-0.01em] text-text group-hover:text-aqua">
                  {s.name}
                </h3>
                <p className="mt-2 leading-relaxed text-muted">{s.desc}</p>
                {slug && (
                  <span className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-aqua opacity-0 transition-opacity group-hover:opacity-100">
                    Explore →
                  </span>
                )}
              </>
            );
            const cls =
              "group flex h-full flex-col rounded-[20px] border border-line bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/40 hover:shadow-[0_18px_40px_-24px_rgba(31,160,147,0.5)]";
            return (
              <Reveal key={s.name} delay={(i % 3) * 0.06}>
                {slug ? (
                  <Link href={`/services/${slug}`} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <article className={cls}>{inner}</article>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
