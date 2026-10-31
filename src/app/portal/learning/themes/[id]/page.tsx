import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { getTheme } from "@/server/repo/insights";
import { NotFoundOrDenied } from "@/server/errors";
import { minCohort } from "@/server/learning/aggregate";
import { Badge, Notice, PageHeader, Stat, StatStrip, fmtDate, human } from "@/components/ui";

export default async function ThemePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, actor] = await Promise.all([params, getActor()]);
  const r = await getTheme(actor, id).catch((e) => {
    if (e instanceof NotFoundOrDenied) notFound();
    throw e;
  });
  const t = r.theme;
  const k = minCohort();
  return (
    <div className="max-w-5xl">
      <Link href="/portal/learning/themes" className="link font-mono text-xs uppercase">← Themes</Link>
      <PageHeader eyebrow={t.offering ?? "Cross-offering"} title={t.title} subtitle={`Updated ${fmtDate(t.updatedAt)}`} />
      <StatStrip cols={3}>
        <Stat label="Approved contributions" value={String(r.evidence.length).padStart(2, "0")} />
        <Stat
          label="Distinct organisations"
          value={t.distinctOrgs.suppressed ? "SUPPRESSED" : String(t.distinctOrgs.value).padStart(2, "0")}
          hint={t.distinctOrgs.suppressed ? `Below the minimum of ${k}.` : "Repeat posts count once."}
        />
        <Stat label="Observation periods" value={<span className="text-base">{t.periods.join(", ") || "—"}</span>} />
      </StatStrip>

      <div className="card mt-4">
        <p className="leading-relaxed">{t.summary}</p>
      </div>
      <div className="mt-4">
        <Notice tone="amber">
          <strong>Confidence & limitations:</strong> {t.limitations} Repeat posts from one organisation are counted once. This theme is not evidence of market
          prevalence or causation.
        </Notice>
      </div>

      <h2 className="mt-8 mb-3 font-semibold">Supporting evidence</h2>
      <div className="border-t-2 border-ink">
        {r.evidence.map((s) => (
          <Link key={s.ref} href={`/portal/learning/${s.ref}`} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 border-b border-line bg-white px-4 py-3 hover:bg-signal-soft">
            <span className="data text-sm text-brand">{s.ref}</span><div><span className="font-medium">{s.title}</span>
            <p className="text-xs text-muted">{human(s.type)} · {s.industry} · {s.region} · <span className="data">{s.period}</span></p></div>
          </Link>
        ))}
      </div>

      {r.ideas.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 font-semibold">Linked improvement ideas</h2>
          {r.ideas.map((i) => (
            <div key={i.id} className="card mb-2">
              <div className="flex justify-between"><p className="font-medium">{i.title}</p><Badge tone="blue">{i.status}</Badge></div>
              <p className="mt-1 text-sm text-muted">{i.statusNote}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
