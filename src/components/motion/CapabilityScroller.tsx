"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";

export type Pillar = { name: string; desc: string; points: readonly string[] };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Pinned scrollytelling: the panel sticks while the page scrolls through one step per pillar.
 * Native scrolling is never captured — the section is simply taller than the viewport.
 */
export function CapabilityScroller({ pillars }: { pillars: readonly Pillar[] }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const fill = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  const [active, setActive] = useState(0);
  const n = pillars.length;

  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(n - 1, Math.max(0, Math.floor(v * n)))));

  // Jump to a step by scrolling the window to that step's slice of the section.
  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (span * (i + 0.5)) / n, behavior: "smooth" });
  };

  const Heading = (
    <div>
      <p className="eyebrow">What we do</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
        Intelligence in
        <br />
        every layer.
      </h2>
      <p className="mt-3 max-w-xs text-sm text-muted">Capabilities designed to connect information, intelligence and action.</p>
    </div>
  );

  // Static fallback: small screens see everything expanded.
  const staticList = (
    <ol className="border-t-2 border-ink">
      {pillars.map((p, i) => (
        <li key={p.name} className="grid grid-cols-[3rem_minmax(0,1fr)] border-b border-line py-5">
          <span className="data text-sm text-brand">{pad(i + 1)}</span>
          <div>
            <p className="text-lg font-semibold">{p.name}</p>
            <p className="text-sm text-muted">{p.desc}</p>
            <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {p.points.map((pt) => (
                <li key={pt} className="border-l-2 border-signal pl-2">{pt}</li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );

  // Both variants are always rendered and switched by viewport in CSS,
  // so server and client markup match and the scroll target always exists.
  return (
    <>
      <section className="border-b-2 border-ink bg-paper lg:hidden">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[16rem_minmax(0,1fr)]">
          {Heading}
          {staticList}
        </div>
      </section>

      <section ref={ref} className="relative hidden border-b-2 border-ink bg-paper lg:block" style={{ height: `${n * 55}vh` }}>
        <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] items-center">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-[16rem_3rem_minmax(0,1fr)] gap-8 px-4">
            <div className="flex flex-col justify-between py-4">
              {Heading}
              <div>
                <p className="font-mono text-xs tracking-wide text-muted uppercase">Step</p>
                <p className="data text-5xl font-semibold text-ink">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={active} className="inline-block" initial={{ y: "60%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-60%", opacity: 0 }} transition={{ duration: 0.35 }}>
                      {pad(active + 1)}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-2xl text-muted"> / {pad(n)}</span>
                </p>
              </div>
            </div>

            {/* Vertical progress rail with tick marks per step. */}
            <div className="relative mx-auto h-full w-0.5 bg-line" aria-hidden>
              <motion.div className="absolute inset-x-0 top-0 h-full origin-top bg-signal" style={{ scaleY: fill }} />
              {pillars.map((p, i) => (
                <span key={p.name} className={`absolute -left-[5px] h-3 w-3 border-2 transition-colors ${i <= active ? "border-signal bg-signal" : "border-line bg-paper"}`} style={{ top: `calc(${(i / (n - 1)) * 100}% - 6px)` }} />
              ))}
            </div>

            <ol className="border-t-2 border-ink">
              {pillars.map((p, i) => {
                const on = i === active;
                return (
                  <li key={p.name} className={`border-b border-line transition-colors ${on ? "bg-white" : ""}`}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={on ? "step" : undefined}
                      className={`grid w-full grid-cols-[3rem_minmax(0,1fr)_auto] items-baseline border-l-4 px-4 py-3 text-left transition-colors ${on ? "border-signal" : "border-transparent hover:border-line"}`}
                    >
                      <span className={`data text-sm ${on ? "text-brand" : "text-muted"}`}>{pad(i + 1)}</span>
                      <span className={`text-lg font-semibold ${on ? "text-ink" : "text-ink/45"}`}>{p.name}</span>
                      <span className={`text-xs ${on ? "text-muted" : "text-transparent"}`}>{p.desc}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.div
                          key="detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="overflow-hidden"
                        >
                          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 pb-4 pl-16 text-sm">
                            {p.points.map((pt, j) => (
                              <motion.li
                                key={pt}
                                className="border-l-2 border-signal pl-2"
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.12 + j * 0.06, duration: 0.3 }}
                              >
                                {pt}
                              </motion.li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
