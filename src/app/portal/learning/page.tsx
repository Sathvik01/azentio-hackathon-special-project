import Link from "next/link";
import { notFound } from "next/navigation";
import type { ObsType } from "@prisma/client";
import { getActor } from "@/server/auth/actor";
import { canAccessCommunity } from "@/server/policy";
import { feedFilterOptions, listBookmarks, searchShared } from "@/server/repo/shared";
import { listOfferings } from "@/server/repo/catalog";
import { minCohort } from "@/server/learning/aggregate";
import { Badge, CardLink, Empty, PageHeader, RowList, Section, Stat, StatStrip, human, type SP } from "@/components/ui";

export const metadata = { title: "Shared learning" };

const TYPES = ["MARKET_OBSERVATION", "EMERGING_TREND", "PRODUCT_GAP", "OPERATIONAL_CHALLENGE", "SUCCESSFUL_PRACTICE", "IMPROVEMENT_SUGGESTION"];

export default async function LearningFeed({ searchParams }: { searchParams: SP }) {
  const [actor, sp] = await Promise.all([getActor(), searchParams]);
  if (!canAccessCommunity(actor)) notFound();
  const [res, opts, offerings, bookmarks] = await Promise.all([
    searchShared(actor, { q: sp.q, offeringId: sp.offering, industry: sp.industry, region: sp.region, period: sp.period, type: sp.type as ObsType | undefined }),
    feedFilterOptions(actor),
    listOfferings(),
    listBookmarks(actor),
  ]);
  const k = minCohort();
  const sel = (name: string, label: string, values: [string, string][]) => (
    <div>
      <label className="label text-xs" htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={sp[name] ?? ""} className="input">
        <option value="">All</option>
        {values.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="Cross-client · moderator-reviewed" title="Shared learning" subtitle="Approved, de-identified contributions from the learning community — separate from your organisation's private workspace. Authors can withdraw at any time." />

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <form className="space-y-3 border-t-2 border-ink bg-white p-4 lg:sticky lg:top-6 lg:self-start">
          <p className="font-mono text-xs font-semibold tracking-wide uppercase">Filters</p>
          <div>
            <label className="label" htmlFor="q">Search</label>
            <input id="q" name="q" defaultValue={sp.q} className="input" placeholder="seasonal cash flow" />
          </div>
          {sel("offering", "Offering", offerings.filter((o) => opts.offeringIds.includes(o.id)).map((o) => [o.id, o.name]))}
          {sel("industry", "Industry", opts.industries.map((i) => [i, i]))}
          {sel("region", "Region", opts.regions.map((r) => [r, r]))}
          {sel("period", "Period", opts.periods.map((p) => [p, p]))}
          {sel("type", "Topic", TYPES.map((t) => [t, human(t)]))}
          <div className="flex gap-2 pt-1">
            <button className="btn">Apply</button>
            <Link href="/portal/learning" className="btn-secondary">Reset</Link>
          </div>
        </form>

        <div className="min-w-0 space-y-6">
          <StatStrip cols={3}>
            <Stat label="Matching contributions" value={String(res.items.length).padStart(2, "0")} />
            <Stat
              label="Distinct contributing orgs"
              value={res.contributingOrgs.suppressed ? "SUPPRESSED" : String(res.contributingOrgs.value).padStart(2, "0")}
              hint={res.contributingOrgs.suppressed ? `Fewer than ${k} organisations — hidden to protect contributors.` : "Repeat posts from one organisation count once."}
            />
            <div className="px-4 py-3">
              <p className="font-mono text-xs font-medium tracking-wide text-muted uppercase">By industry</p>
              {res.byIndustry ? (
                <ul className="data mt-1 text-xs">{res.byIndustry.map((b) => <li key={b.key} className="flex justify-between"><span>{b.key}</span><span>{b.count.suppressed ? "—" : `${b.count.value} orgs`}</span></li>)}</ul>
              ) : (
                <p className="mt-1 text-xs leading-snug text-muted">Suppressed: a group is below {k} organisations.</p>
              )}
            </div>
          </StatStrip>

          {res.items.length === 0 ? (
            <Empty title="No approved contributions match these filters" />
          ) : (
            <div className="border-t-2 border-ink bg-white">
              <div className="hidden grid-cols-[6rem_minmax(0,1fr)_10rem_7rem] gap-4 border-b border-line px-4 py-2 font-mono text-xs tracking-wide text-muted uppercase md:grid">
                <span>Ref</span><span>Contribution</span><span>Context</span><span>Period</span>
              </div>
              {res.items.map((s) => (
                <Link key={s.ref} href={`/portal/learning/${s.ref}`} className="group grid gap-1 border-b border-line px-4 py-3 last:border-b-0 hover:bg-signal-soft md:grid-cols-[6rem_minmax(0,1fr)_10rem_7rem] md:gap-4">
                  <span className="data text-sm text-brand">{s.ref}</span>
                  <div className="min-w-0">
                    <p className="font-medium group-hover:text-brand">{s.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{s.body}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge>{human(s.type)}</Badge>
                      <Badge tone="gray">{s.offering}</Badge>
                      <Badge tone={s.attribution ? "blue" : "gray"}>{s.attribution ?? "Anonymous"}</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted">{s.industry}<br />{s.region}</span>
                  <span className="data text-xs">{s.period}</span>
                </Link>
              ))}
            </div>
          )}

          {bookmarks.length > 0 && (
            <Section title="Your bookmarks" meta={String(bookmarks.length).padStart(2, "0")}>
              <RowList>
                {bookmarks.map((b) => (
                  <CardLink key={b.ref} href={`/portal/learning/${b.ref}`} code={b.ref} title={b.title} />
                ))}
              </RowList>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
