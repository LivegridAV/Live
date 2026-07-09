"use client";
import { useSyncExternalStore } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const emptySubscribe = () => () => {};

export default function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const reduce = useReducedMotion();
  // Gate the reduced-motion branch behind mount so the server render and the
  // first client render are identical (otherwise the `hidden` variant differs
  // and React reports a hydration mismatch).
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const reduced = mounted && reduce;

  const MotionTag = motion[as];
  const variants: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : y },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduced ? 0 : 0.5,
        ease: [0.22, 1, 0.36, 1],
        delay: reduced ? 0 : delay,
      },
    },
  };
  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </MotionTag>
  );
}
