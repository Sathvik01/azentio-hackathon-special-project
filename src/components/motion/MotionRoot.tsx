"use client";

import { MotionConfig } from "motion/react";

/**
 * Site-wide motion defaults: precise ease, no springy bounce.
 * Product decision (2026-10-30): the homepage always animates, even when the OS requests reduced motion.
 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="never" transition={{ duration: 0.6, ease: [0.2, 0.7, 0.1, 1] }}>
      {children}
    </MotionConfig>
  );
}
