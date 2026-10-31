"use client";

import { useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";

/**
 * Sticky public header that compacts after the first scroll and carries a reading-progress rule.
 * Children are server-rendered header contents; this wrapper only owns the scroll behaviour.
 */
export function ScrollHeader({ children }: { children: React.ReactNode }) {
  const { scrollY, scrollYProgress } = useScroll();
  const [compact, setCompact] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setCompact(y > 48));
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  return (
    <header data-compact={compact} className="group sticky top-0 z-20 border-b-2 border-signal bg-ink text-white">
      {children}
      <motion.div aria-hidden className="absolute right-0 -bottom-0.5 left-0 h-0.5 origin-left bg-signal-bright" style={{ scaleX: progress }} />
    </header>
  );
}
