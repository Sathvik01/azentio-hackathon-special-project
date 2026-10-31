import Link from "next/link";

/** Left-anchored header with a heavy ink rule; actions sit flush right. */
export function PageHeader({ title, subtitle, eyebrow, children }: { title: string; subtitle?: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 grid gap-4 border-b-2 border-ink pb-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="border-l-4 border-signal pl-4">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Section label: mono caps with a running rule. */
export function Section({ title, meta, children }: { title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-3">
        <h2 className="font-mono text-xs font-semibold tracking-wide whitespace-nowrap text-ink uppercase">{title}</h2>
        <span className="h-px flex-1 bg-line" />
        {meta && <span className="font-mono text-xs text-muted">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

const TONES = {
  gray: "border-line text-muted",
  teal: "border-signal bg-signal-soft text-brand-600",
  amber: "border-amber-400 bg-amber-50 text-amber-900",
  red: "border-red-500 bg-red-50 text-red-800",
  blue: "border-ink text-ink",
  violet: "border-ink bg-ink text-white",
} as const;

/** Square status tag in mono type. */
export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={`inline-flex items-center border px-1.5 py-px font-mono text-xs font-medium tracking-wide whitespace-nowrap uppercase ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-line bg-white px-4 py-6">
      <p className="font-mono text-xs tracking-wide text-muted uppercase">— {title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Flash({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  if (searchParams.error)
    return <div role="alert" className="mb-4 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800">{searchParams.error}</div>;
  if (searchParams.ok)
    return <div role="status" className="mb-4 border-l-4 border-signal bg-signal-soft px-4 py-3 text-sm text-brand-600">{searchParams.ok}</div>;
  return null;
}

export function Notice({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "amber" }) {
  const cls = tone === "amber" ? "border-amber-500 bg-amber-50 text-amber-900" : "border-ink bg-white text-ink";
  return <div className={`border-l-4 px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

/** Strip of metrics separated by hard dividers; numbers in mono. Use inside <StatStrip>. */
export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="px-4 py-3">
      <p className="font-mono text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="data mt-1 text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs leading-snug text-muted">{hint}</p>}
    </div>
  );
}

export function StatStrip({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const c = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 5: "sm:grid-cols-3 lg:grid-cols-5" }[cols];
  return <div className={`grid divide-y divide-line border border-line border-t-2 border-t-ink bg-white sm:divide-x sm:divide-y-0 ${c}`}>{children}</div>;
}

/** Dense list row: title left, tags right, hard divider between rows. Wrap rows in <RowList>. */
export function CardLink({ href, title, children, badge, code: refCode }: { href: string; title: string; children?: React.ReactNode; badge?: React.ReactNode; code?: string }) {
  return (
    <Link href={href} className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-line bg-white px-4 py-3 last:border-b-0 hover:bg-signal-soft">
      <div className="min-w-0">
        <p className="font-medium group-hover:text-brand">
          {refCode && <span className="data mr-2 text-xs text-brand">{refCode}</span>}
          {title}
        </p>
        {children && <div className="mt-0.5 text-xs text-muted">{children}</div>}
      </div>
      {badge && <div className="flex flex-wrap justify-end gap-1">{badge}</div>}
    </Link>
  );
}

export function RowList({ children }: { children: React.ReactNode }) {
  return <div className="border border-line border-t-2 border-t-ink bg-white">{children}</div>;
}

export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const human = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export type SP = Promise<Record<string, string | undefined>>;
