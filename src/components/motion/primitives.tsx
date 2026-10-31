"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, type Variants } from "motion/react";

const VIEWPORT = { once: true, margin: "-15% 0px" } as const;

/** Entrance on first view: a short rise, or a left-to-right clip wipe. */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = "rise",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "rise" | "wipe";
}) {
  const hidden = variant === "wipe" ? { clipPath: "inset(0 100% 0 0)" } : { opacity: 0, y: 12 };
  const shown = variant === "wipe" ? { clipPath: "inset(0 0% 0 0)" } : { opacity: 1, y: 0 };
  return (
    <motion.div className={className} initial={hidden} whileInView={shown} viewport={VIEWPORT} transition={{ delay }}>
      {children}
    </motion.div>
  );
}

const containers = { div: motion.div, ul: motion.ul, ol: motion.ol, dl: motion.dl };
const items = { div: motion.div, li: motion.li };

const staggerParent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

export const itemVariants: Record<"slide" | "rise" | "wipe", Variants> = {
  slide: { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } },
  rise: { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } },
  wipe: { hidden: { clipPath: "inset(0 100% 0 0)" }, show: { clipPath: "inset(0 0% 0 0)" } },
};

/** Children marked <StaggerItem> enter one after another once the group scrolls into view. */
export function Stagger({
  children,
  className,
  as = "div",
  onMount = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: keyof typeof containers;
  /** Above-the-fold groups animate on mount instead of on scroll. */
  onMount?: boolean;
}) {
  const Tag = containers[as];
  const trigger = onMount ? { animate: "show" } : { whileInView: "show", viewport: VIEWPORT };
  return (
    <Tag className={className} variants={staggerParent} initial="hidden" {...trigger}>
      {children}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
  variant = "slide",
}: {
  children: React.ReactNode;
  className?: string;
  as?: keyof typeof items;
  variant?: keyof typeof itemVariants;
}) {
  const Tag = items[as];
  return (
    <Tag className={className} variants={itemVariants[variant]}>
      {children}
    </Tag>
  );
}

/** Hard divider that draws from the left when it scrolls into view — the page's signature motif. */
export function DrawRule({ className = "h-0.5 bg-ink", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      aria-hidden
      className={`origin-left ${className}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.9, delay }}
    />
  );
}

/** Mono figure that counts up from zero; non-numeric values (e.g. "k≥3") simply fade in. */
export function CountUp({ value, className, pad = 2, delay = 0 }: { value: string; className?: string; pad?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const target = /^\d+$/.test(value) ? Number(value) : null;
  const [text, setText] = useState(target === null ? value : "0".padStart(pad, "0"));

  useEffect(() => {
    if (target === null || !inView) return;
    const controls = animate(0, target, {
      duration: 1.1,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setText(String(Math.round(v)).padStart(pad, "0")),
    });
    return () => controls.stop();
  }, [inView, target, pad, delay]);

  if (target === null) {
    return (
      <motion.span ref={ref} className={className} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={VIEWPORT} transition={{ delay: delay + 0.6 }}>
        {value}
      </motion.span>
    );
  }
  return (
    <span ref={ref} className={className} aria-label={value}>
      {text}
    </span>
  );
}

/** Headline line that rises from behind a mask on page load. */
export function MaskLine({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span className={`block ${className ?? ""}`} initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.8, delay }}>
        {children}
      </motion.span>
    </span>
  );
}

/** Mono label typed out character by character. Screen readers get the whole string at once. */
export function TypeLine({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <motion.p
      className={className}
      aria-label={text}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: delay } } }}
    >
      {[...text].map((ch, i) => (
        <motion.span key={i} aria-hidden variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.01 } } }}>
          {ch}
        </motion.span>
      ))}
    </motion.p>
  );
}
