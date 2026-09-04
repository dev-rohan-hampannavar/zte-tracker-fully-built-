"use client";

import { motion, useReducedMotion } from "framer-motion";

interface RadialProgressProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  /** Adds a soft drop-shadow glow matching `color` and animates the ring
   * sweeping in on mount rather than just transitioning on value change.
   * Opt-in so existing call sites (Statistics) keep their current plain
   * appearance unless they ask for the richer version. */
  glow?: boolean;
}

/**
 * Radial progress ring. Originally written inline in the Statistics page;
 * extracted here once a second page (Job Readiness) needed the same
 * construction, per the "reuse, don't duplicate a third time" rule.
 */
export function RadialProgress({
  value,
  size = 120,
  stroke = 10,
  label,
  sublabel,
  color = "var(--accent)",
  glow = false,
}: RadialProgressProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        {glow ? (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={reducedMotion ? { duration: 0 } : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono-tabular leading-none">{Math.round(value)}%</span>
        {label && <span className="text-[10px] text-muted mt-1 text-center leading-tight px-1">{label}</span>}
      </div>
      {sublabel && (
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-muted whitespace-nowrap">
          {sublabel}
        </span>
      )}
    </div>
  );
}
