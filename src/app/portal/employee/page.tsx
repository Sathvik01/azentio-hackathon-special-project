import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { canManageIdeas, canModerate, isEmployee } from "@/server/policy";
import { listContent } from "@/server/repo/catalog";
import { listIdeasInternal, listThemes } from "@/server/repo/insights";
import { listQueue } from "@/server/repo/moderation";
import { Badge, CardLink, Empty, PageHeader, RowList, Section, Stat, StatStrip, fmtDate } from "@/components/ui";
import { IDEA_STATUS_LABEL } from "@/server/dto";

export const metadata = { title: "Employee dashboard" };

export default async function EmployeeDashboard() {
  const actor = await getActor();
  if (!isEmployee(actor)) notFound();
  const [sessions, experiments, ideas, themes, queue] = await Promise.all([
    listContent(actor, ["BROADCAST", "SESSION"], "EMPLOYEE"),
    listContent(actor, ["EXPERIMENT"]),
    listIdeasInternal(actor),
    listThemes(actor),
    canModerate(actor) ? listQueue(actor) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Employee workspace"
        title={`Welcome${actor.name ? `, ${actor.name.split(" ")[0]}` : ""}`}
        subtitle="Nothing here appears in public or client search, or in client AIRA answers."
      >
        <Link href="/portal/employee/playground" className="btn">Open Playground</Link>
      </PageHeader>

      <StatStrip>
        <Stat label="Internal sessions" value={String(sessions.length).padStart(2, "0")} />
        <Stat label="Experiments" value={String(experiments.length).padStart(2, "0")} />
        <Stat label={canManageIdeas(actor) ? "Improvement ideas" : "Assigned ideas"} value={String(ideas.length).padStart(2, "0")} />
        <Stat label="Moderation queue" value={canModerate(actor) ? String(queue.length).padStart(2, "0") : "—"} hint={canModerate(actor) ? undefined : "Requires moderator grant"} />
      </StatStrip>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <Section title={canManageIdeas(actor) ? "Improvement ideas" : "Ideas assigned to you"} meta={`${ideas.length} total`}>
            {ideas.length ? (
              <RowList>
                {ideas.slice(0, 6).map((i) => (
                  <CardLink key={i.id} href={`/portal/ideas/${i.id}`} title={i.title} badge={<><Badge>{i.priority}</Badge><Badge tone="blue">{IDEA_STATUS_LABEL[i.status]}</Badge></>}>
                    {i.ownerTeam} · {i.evidence.length} evidence links · updated <span className="data">{fmtDate(i.updatedAt)}</span>
                  </CardLink>
                ))}
              </RowList>
            ) : (
              <Empty title="No ideas assigned" />
            )}
          </Section>

          <Section title="Approved themes" meta="distinct orgs, k ≥ 3">
            <RowList>
              {themes.map((t) => (
                <CardLink
                  key={t.id}
                  href={`/portal/learning/themes/${t.id}`}
                  title={t.title}
                  badge={<Badge tone={t.distinctOrgs.suppressed ? "amber" : "teal"}>{t.distinctOrgs.suppressed ? "orgs suppressed" : `${t.distinctOrgs.value} orgs`}</Badge>}
                >
                  {t.evidenceRefs.join(" · ")}
                </CardLink>
              ))}
            </RowList>
          </Section>
        </div>

        <div className="space-y-8">
          <Section title="Upcoming internal sessions">
            <RowList>
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <span className="data text-xs text-brand">{fmtDate(s.startsAt)}</span>
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted">{s.summary}</p>
                  </div>
                </div>
              ))}
            </RowList>
          </Section>
          <Section title="Quick links">
            <RowList>
              <CardLink href="/portal/employee/playground" title="Playground">Guided synthetic scenarios</CardLink>
              <CardLink href="/portal/employee/live" title="Live & recordings">Employee broadcasts</CardLink>
              <CardLink href="/portal/employee/knowledge" title="Knowledge library">Owners, review dates, release notes</CardLink>
              <CardLink href="/portal/aira" title="Ask AIRA">Cited answers in employee scope</CardLink>
            </RowList>
          </Section>
        </div>
      </div>
    </>
  );
}
