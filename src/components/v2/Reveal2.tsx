"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Lightweight reveal-on-scroll. Honours reduced-motion (CSS handles that). */
export default function Reveal2({
  children, className = "", style,
}: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }),
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  return (
    <div ref={ref} className={`v2-reveal ${seen ? "is-in" : ""} ${className}`} style={style}>
      {children}
    </div>
  );
}
