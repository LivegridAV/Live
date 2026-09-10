import Link from "next/link";
import Reveal from "./Reveal";
import { PROJECTS } from "@/content/site";
import { slugify, vibeBg } from "@/content/work";

export default function Work() {
  const [featured, ...rest] = PROJECTS;

  return (
    <section id="work" className="bg-ink py-24 text-text-inv md:py-32">
      <div className="mx-auto max-w-[1180px] px-6 md:px-12">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-glow">
            Selected work
          </p>
          <h2 className="mt-4 max-w-[20ch] text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
            Shows we&apos;ve brought to life.
          </h2>
          <Link
            href="/work"
            className="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-glow transition-colors hover:text-text-inv"
          >
            View all work →
          </Link>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {/* featured tile — the headline project over the brand reel */}
          <Reveal className="md:row-span-2">
            <Link
              href={`/work/${slugify(featured.name)}`}
              className="group relative block h-full min-h-[380px] overflow-hidden rounded-[20px] border border-ink-soft transition-colors hover:border-glow/50"
            >
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
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
              <div className="absolute bottom-0 left-0 p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-glow">
                  Featured · {featured.year}
                </p>
                <h3 className="mt-2 text-2xl font-semibold">{featured.name}</h3>
                <p className="mt-1 text-text-inv/70">
                  {featured.client} · {featured.location}
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-text-inv/50">
                  {featured.led} · {featured.gear}
                </p>
              </div>
            </Link>
          </Reveal>

          {rest.slice(0, 2).map((p, i) => (
            <Reveal key={p.name} delay={i * 0.06}>
              <Link
                href={`/work/${slugify(p.name)}`}
                className="group relative flex min-h-[182px] flex-col justify-end overflow-hidden rounded-[20px] border border-ink-soft p-7 transition-transform duration-300 hover:-translate-y-1 hover:border-glow/50"
                style={{ background: vibeBg(p.vibe) }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-glow/90">
                  {p.client} · {p.year}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-text-inv/60">{p.led}</p>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* the rest of the city */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.slice(2).map((p, i) => (
            <Reveal key={p.name} delay={(i % 3) * 0.06}>
              <Link
                href={`/work/${slugify(p.name)}`}
                className="flex min-h-[150px] flex-col justify-end overflow-hidden rounded-[20px] border border-ink-soft p-6 transition-transform duration-300 hover:-translate-y-1 hover:border-glow/50"
                style={{ background: vibeBg(p.vibe) }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-glow/90">
                  {p.client} · {p.year}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-text-inv/55">
                  {p.location} · {p.led}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
