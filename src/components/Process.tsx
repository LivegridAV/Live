import Reveal from "./Reveal";

const STEPS = [
  { n: "01", title: "Discover", body: "We map your space, audience, goals, and the content you want to run." },
  { n: "02", title: "Engineer", body: "Pixel pitch, structure, power, and control — spec'd to last." },
  { n: "03", title: "Install", body: "Clean build, color-calibrated, tested, and signed off on site." },
  { n: "04", title: "Support", body: "Live monitoring, content updates, and 24/7 response." },
];

export default function Process() {
  return (
    <section id="process" className="bg-paper py-24 md:py-32">
      <div className="mx-auto max-w-[1180px] px-6 md:px-12">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">
            How it works
          </p>
          <h2 className="mt-4 max-w-[16ch] text-4xl font-semibold tracking-[-0.02em] text-text md:text-5xl">
            Four steps to first light.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <div className="border-t border-line pt-5">
                <span className="font-mono text-sm tracking-[0.1em] text-aqua">
                  {s.n}
                </span>
                <h3 className="mt-4 text-xl font-semibold tracking-[-0.01em] text-text">
                  {s.title}
                </h3>
                <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
