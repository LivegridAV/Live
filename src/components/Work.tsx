import Reveal from "./Reveal";

const PROJECTS = [
  {
    title: "Aurora Retail Flagship",
    tag: "Interactive storefront",
    gradient:
      "radial-gradient(120% 120% at 20% 10%, rgba(63,214,200,0.28), transparent 55%), linear-gradient(160deg, #17403a, #13201e)",
  },
  {
    title: "Pulse Arena",
    tag: "360° stage backdrop",
    gradient:
      "radial-gradient(120% 120% at 80% 20%, rgba(31,160,147,0.4), transparent 60%), linear-gradient(160deg, #0f2a2f, #13201e)",
  },
  {
    title: "Grid Tower Lobby",
    tag: "Ambient media facade",
    gradient:
      "radial-gradient(120% 120% at 50% 90%, rgba(63,214,200,0.22), transparent 55%), linear-gradient(160deg, #14312c, #13201e)",
  },
];

export default function Work() {
  return (
    <section id="work" className="bg-ink py-24 text-text-inv md:py-32">
      <div className="mx-auto max-w-[1180px] px-6 md:px-12">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-glow">
            Selected work
          </p>
          <h2 className="mt-4 max-w-[20ch] text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
            Signals we&apos;ve brought to life.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {/* featured video tile */}
          <Reveal className="md:row-span-2">
            <div className="group relative h-full min-h-[360px] overflow-hidden rounded-[20px] border border-ink-soft">
              <video
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                poster="/brand/profile-1024.png"
              >
                <source src="/brand/hero-dark.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-glow">
                  Featured
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Live Signal Wall</h3>
                <p className="mt-1 text-text-inv/60">
                  Generative content driven by the room.
                </p>
              </div>
            </div>
          </Reveal>

          {PROJECTS.slice(0, 2).map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06}>
              <div
                className="group relative flex min-h-[172px] flex-col justify-end overflow-hidden rounded-[20px] border border-ink-soft p-7 transition-transform duration-300 hover:-translate-y-1"
                style={{ background: p.gradient }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-glow/90">
                  {p.tag}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{p.title}</h3>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div
            className="mt-5 flex min-h-[160px] flex-col justify-end overflow-hidden rounded-[20px] border border-ink-soft p-7"
            style={{ background: PROJECTS[2].gradient }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-glow/90">
              {PROJECTS[2].tag}
            </p>
            <h3 className="mt-2 text-xl font-semibold">{PROJECTS[2].title}</h3>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
