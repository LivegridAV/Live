import Reveal from "./Reveal";
import SignalGrid from "./SignalGrid";

const SERVICES = [
  {
    title: "LED Video Walls",
    body: "Fine-pitch indoor and outdoor walls, engineered and calibrated for your exact space and viewing distance.",
  },
  {
    title: "Interactive Installations",
    body: "Touch, motion, and sensor-driven experiences that respond to people in real time.",
  },
  {
    title: "Content & Control",
    body: "Live media, scheduling, and one-tap control — your wall, run from a single screen.",
  },
  {
    title: "Rental & Events",
    body: "Turnkey walls for stages, launches, and pop-ups. Delivered, built, and operated by us.",
  },
];

export default function Services() {
  return (
    <section id="services" className="bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-[1180px] px-6 md:px-12">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">
            What we do
          </p>
          <h2 className="mt-4 max-w-[18ch] text-4xl font-semibold tracking-[-0.02em] text-text md:text-5xl">
            From bare wall to living display.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {SERVICES.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <article className="group h-full rounded-[20px] border border-line bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-aqua/40 hover:shadow-[0_18px_40px_-24px_rgba(31,160,147,0.5)]">
                <SignalGrid
                  cell={11}
                  gap={2.5}
                  palette="light"
                  animate={false}
                  glow={false}
                />
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.01em] text-text">
                  {s.title}
                </h3>
                <p className="mt-3 leading-relaxed text-muted">{s.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
