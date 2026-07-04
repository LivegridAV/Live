import Reveal from "./Reveal";
import { STATS } from "@/content/site";

/**
 * Track record — the classic-site counterpart to the 3D holographic
 * stat pillars (Scene 5). Same four numbers and stories.
 */
export default function Stats() {
  return (
    <section id="track-record" className="bg-ink py-24 text-text-inv md:py-32">
      <div className="mx-auto max-w-[1180px] px-6 md:px-12">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-glow">
            Track record
          </p>
          <h2 className="mt-4 max-w-[16ch] text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
            Numbers that hold a stage.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <div className="border-t border-ink-soft pt-6">
                <div className="text-5xl font-semibold tracking-[-0.03em] md:text-6xl">
                  {s.value}
                  <span className="text-glow">{s.suffix}</span>
                </div>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
                  {s.label}
                </p>
                <p className="mt-3 leading-relaxed text-text-inv/60">
                  {s.story}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
