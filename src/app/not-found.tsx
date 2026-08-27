import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import SignalGrid from "@/components/SignalGrid";

export default function NotFound() {
  return (
    <PageShell>
      <section className="flex min-h-[70vh] items-center bg-paper py-32">
        <div className="mx-auto max-w-[620px] px-6 text-center md:px-12">
          <div className="flex justify-center">
            <SignalGrid cell={16} gap={4} palette="light" animate glow />
          </div>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-aqua">404 · Signal lost</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.02em] text-text md:text-5xl">
            This page isn&rsquo;t on the grid.
          </h1>
          <p className="mx-auto mt-4 max-w-[44ch] leading-relaxed text-muted">
            The link may be old or mistyped. Let&rsquo;s get you back to something
            that lights up.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-xl bg-aqua px-6 py-3 text-sm font-medium text-white transition-[filter] hover:brightness-110"
            >
              Back to home
            </Link>
            <Link
              href="/services"
              className="rounded-xl border border-line px-6 py-3 text-sm font-medium text-text transition-colors hover:border-aqua hover:text-aqua"
            >
              Browse services
            </Link>
            <Link
              href="/work"
              className="rounded-xl border border-line px-6 py-3 text-sm font-medium text-text transition-colors hover:border-aqua hover:text-aqua"
            >
              See our work
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
