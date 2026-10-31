"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, type Variants } from "motion/react";
import type { ContentDTO, OfferingDTO } from "@/server/dto";
import { fmtDate } from "@/components/ui";
import { DrawRule, itemVariants, Stagger } from "./primitives";

const VIEWPORT = { once: true, margin: "-15% 0px" } as const;
const pad = (n: number) => String(n).padStart(2, "0");
const COLS = "md:grid-cols-[3rem_minmax(0,1.3fr)_10rem_minmax(0,2fr)_1.5rem]";

/** Catalogue table: rule draws, rows index in, and the sticky label tracks the row in view. */
export function OfferingsLedger({ offerings }: { offerings: OfferingDTO[] }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow">Catalogue</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Offerings</h2>
        <p className="mt-2 text-sm text-muted">Sandbox demonstrations run on synthetic data only and never constitute credit or business decisions.</p>
        <p className="data mt-4 hidden text-sm text-brand lg:block" aria-hidden>
          {pad(current + 1)} <span className="text-muted">/ {pad(offerings.length)}</span>
        </p>
        <Link href="/offerings" className="link mt-4 inline-block text-sm">Full catalogue →</Link>
      </div>
      <div>
        <DrawRule className="h-0.5 bg-ink" />
        <div className={`hidden gap-4 border-b border-line py-2 font-mono text-xs tracking-wide text-muted uppercase md:grid ${COLS}`}>
          <span>No.</span><span>Offering</span><span>Domain</span><span>Summary</span><span />
        </div>
        <Stagger>
          {offerings.map((o, i) => (
            <motion.div key={o.id} variants={itemVariants.slide} onViewportEnter={() => setCurrent(i)} viewport={{ margin: "-45% 0px -45% 0px" }}>
              <Link href={`/offerings/${o.slug}`} className={`group grid gap-1 border-b border-line py-4 hover:bg-signal-soft md:gap-4 ${COLS}`}>
                <span className="data text-sm text-brand">{pad(i + 1)}</span>
                <span className="font-semibold group-hover:text-brand">{o.name}</span>
                <span className="font-mono text-xs text-muted uppercase">{o.category}</span>
                <span className="text-sm text-muted">{o.tagline}</span>
                <span className="hidden text-brand transition-transform group-hover:translate-x-1 md:block">→</span>
              </Link>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </div>
  );
}

/** Dark governance band: rules draw, then each principle wipes in. */
export function GovernanceLedger({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div>
      <DrawRule className="h-px bg-white/20" />
      <Stagger className="grid sm:grid-cols-2">
        {items.map(([t, d], i) => (
          <motion.div key={t} variants={itemVariants.wipe} className="border-b border-white/15 py-5 sm:odd:border-r sm:odd:pr-6 sm:even:pl-6">
            <p className="data text-xs text-signal-light">§{i + 1}</p>
            <p className="mt-1 font-semibold">{t}</p>
            <p className="mt-1 text-sm text-white/65">{d}</p>
          </motion.div>
        ))}
      </Stagger>
    </div>
  );
}

const ledgerRow: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const cell: Variants = { hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } };

/** Insights list read like a ledger being written: date, then type, then entry. */
export function InsightsLedger({ insights }: { insights: ContentDTO[] }) {
  return (
    <div>
      <DrawRule className="h-0.5 bg-ink" />
      <motion.ul initial="hidden" whileInView="show" viewport={VIEWPORT} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15 } } }}>
        {insights.map((i) => (
          <motion.li key={i.id} variants={ledgerRow} className="grid gap-1 border-b border-line py-4 md:grid-cols-[8rem_6rem_minmax(0,1fr)] md:gap-4">
            <motion.span variants={cell} className="data text-xs text-muted">{fmtDate(i.startsAt)}</motion.span>
            <motion.span variants={cell} className="font-mono text-xs tracking-wider text-brand uppercase">{i.kind === "VIDEO" ? "Video" : "Insight"}</motion.span>
            <motion.div variants={cell}>
              <p className="font-semibold">{i.title}</p>
              <p className="text-sm text-muted">{i.summary}</p>
            </motion.div>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
