"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useInView, useReducedMotion } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  /** Spring stiffness/damping — lower stiffness = slower, more dramatic count. */
  duration?: "fast" | "normal" | "slow";
}

const SPRING_CONFIG = {
  fast: { stiffness: 120, damping: 20 },
  normal: { stiffness: 60, damping: 18 },
  slow: { stiffness: 30, damping: 16 },
};

/**
 * Counts up from 0 to `value` when it scrolls into view, using a spring
 * rather than a linear tween so it decelerates naturally instead of
 * stopping abruptly. Falls back to the plain final number instantly when
 * prefers-reduced-motion is set — this is a decorative flourish, not
 * information that requires the animation to convey meaning.
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
  duration = "normal",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, SPRING_CONFIG[duration]);

  useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, value, motionValue]);

  useEffect(() => {
    if (!ref.current) return;
    if (reducedMotion) {
      ref.current.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
      return;
    }
    const unsubscribe = spring.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${latest.toFixed(decimals)}${suffix}`;
      }
    });
    return unsubscribe;
  }, [spring, decimals, prefix, suffix, reducedMotion, value]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {(0).toFixed(decimals)}
      {suffix}
    </motion.span>
  );
}
