"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

// Shared easing — a slightly overshooting ease-out reads as more alive
// than a linear/standard ease, without being bouncy enough to feel silly
// on a productivity tool. Used consistently across all reveal motion so
// the whole app moves with one signature "feel".
const EASE = [0.16, 1, 0.3, 1] as const;

// Made deliberately large/slow/obvious — a subtle 8-16px, 300-500ms fade
// reads as "nothing happened" unless you're staring right at it. This is
// meant to be unmistakable: real travel distance, real duration, real
// stagger gap between items.
const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 48, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};

/**
 * Wraps a single element/section with a fade-up-on-mount reveal. Use for
 * page headers, hero stats, and standalone cards that aren't part of a
 * list (lists should use StaggerContainer + StaggerItem instead so their
 * children cascade rather than all popping in at once).
 */
export function FadeUp({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Wraps a list of cards/items so children cascade in one after another
 * rather than appearing simultaneously — the "wow" list-load moment. */
export function StaggerContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="visible" variants={staggerContainerVariants}>
      {children}
    </motion.div>
  );
}

/** A single item inside a StaggerContainer. Must be a direct child. */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUpVariants}>
      {children}
    </motion.div>
  );
}

/**
 * Wraps route-level page content so navigating between pages has a soft
 * cross-fade + slight rise instead of an abrupt cut — applied once in the
 * (app) layout rather than per-page, so every route gets it for free.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** A card that lifts, glows, and very slightly scales on hover — an
 * escalation of Card's existing `interactive` prop for cards that should
 * feel like the primary, tappable focus of a section. */
export function MotionCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileHover={{ y: -8, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
