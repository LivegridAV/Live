"use client";
import { motion } from "motion/react";
import SignalGrid from "./SignalGrid";

const STATS = [
  { value: "10+", label: "years experience" },
  { value: "500+", label: "events delivered" },
  { value: "24/7", label: "technical team" },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-ink text-text-inv">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[600px] w-[600px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(63,214,200,0.35) 0%, rgba(31,160,147,0.12) 40%, transparent 70%)",
        }}
      />

      <div className="mx-auto grid max-w-[1180px] items-center gap-16 px-6 pb-24 pt-32 md:grid-cols-[1.1fr_0.9fr] md:px-12 md:pb-32 md:pt-40">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-mono text-xs uppercase tracking-[0.24em] text-glow"
          >
            Interactive LED · Signal Grid
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mt-5 text-5xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-7xl"
          >
            Video walls that
            <br />
            come to <span className="text-glow">life.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
            className="mt-6 max-w-[46ch] text-lg leading-relaxed text-text-inv/70"
          >
            We design, build, and install interactive LED displays that turn any
            wall, stage, or storefront into a living signal.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.24 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <a
              href="#contact"
              className="rounded-xl bg-glow px-6 py-3.5 font-medium text-ink transition-[filter] hover:brightness-110"
            >
              Start your build
            </a>
            <a
              href="#work"
              className="rounded-xl border border-ink-soft px-6 py-3.5 font-medium text-text-inv transition-colors hover:border-glow hover:text-glow"
            >
              See our work
            </a>
          </motion.div>

          <div className="mt-14 flex flex-wrap gap-10 border-t border-ink-soft pt-8">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 + i * 0.08 }}
              >
                <div className="text-3xl font-semibold tracking-[-0.02em] text-text-inv">
                  {s.value}
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* signal grid mark */}
        <div className="flex justify-center md:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <SignalGrid cell={54} gap={11} palette="dark" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
