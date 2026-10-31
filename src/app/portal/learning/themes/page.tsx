import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { canAccessCommunity } from "@/server/policy";
import { listThemes } from "@/server/repo/insights";
import { minCohort } from "@/server/learning/aggregate";
import { Badge, Empty, PageHeader, fmtDate } from "@/components/ui";

export const metadata = { title: "Themes" };

export default async function ThemesPage() {
  const actor = await getActor();
  if (!canAccessCommunity(actor)) notFound();
  const themes = await listThemes(actor);
  const k = minCohort();
  return (
    <>
      <PageHeader
        eyebrow="Insight dashboard"
        title="Themes"
        subtitle={`Recurring patterns across approved contributions. Organisation counts appear only when at least ${k} distinct organisations contributed. Popularity is not market prevalence.`}
      />
      {themes.length === 0 ? (
        <Empty title="No themes yet" />
      ) : (
        <div className="border-t-2 border-ink bg-white">
          <div className="hidden grid-cols-[minmax(0,1fr)_9rem_8rem_8rem_7rem] gap-4 border-b border-line px-4 py-2 font-mono text-xs tracking-wide text-muted uppercase lg:grid">
            <span>Theme</span><span>Offering</span><span>Evidence</span><span>Distinct orgs</span><span>Updated</span>
          </div>
          {themes.map((t) => (
            <Link key={t.id} href={`/portal/learning/themes/${t.id}`} className="group grid gap-2 border-b border-line px-4 py-4 last:border-b-0 hover:bg-signal-soft lg:grid-cols-[minmax(0,1fr)_9rem_8rem_8rem_7rem] lg:gap-4">
              <div className="min-w-0">
                <p className="font-semibold group-hover:text-brand">{t.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{t.summary}</p>
                <p className="data mt-1 text-xs text-brand">{t.evidenceRefs.join(" · ")}</p>
              </div>
              <span className="text-xs text-muted">{t.offering ?? "Cross-offering"}</span>
              <span className="data text-sm">{String(t.evidenceRefs.length).padStart(2, "0")} items</span>
              <span>
                {t.distinctOrgs.suppressed ? <Badge tone="amber">&lt; {k} · suppressed</Badge> : <span className="data text-sm font-semibold">{String(t.distinctOrgs.value).padStart(2, "0")} orgs</span>}
              </span>
              <span className="data text-xs text-muted">{fmtDate(t.updatedAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
