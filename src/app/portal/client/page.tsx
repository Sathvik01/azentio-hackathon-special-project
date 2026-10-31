import { notFound } from "next/navigation";
import Link from "next/link";
import { getActor } from "@/server/auth/actor";
import { isClientMember } from "@/server/policy";
import { listContent, listUsableOfferings } from "@/server/repo/catalog";
import { listMyObservations } from "@/server/repo/observations";
import { listIdeaStatusForParticipants } from "@/server/repo/insights";
import { STATUS_LABEL } from "@/server/learning/stateMachine";
import { Badge, CardLink, Empty, PageHeader, RowList, Section, Stat, StatStrip, fmtDate } from "@/components/ui";

export const metadata = { title: "Client dashboard" };

const pad = (n: number) => String(n).padStart(2, "0");

export default async function ClientDashboard() {
  const actor = await getActor();
  if (!isClientMember(actor)) notFound();
  const [offerings, sessions, briefings, mine, ideas] = await Promise.all([
    listUsableOfferings(actor),
    listContent(actor, ["SESSION", "BROADCAST"]),
    listContent(actor, ["BRIEFING", "RELEASE_NOTE"]),
    listMyObservations(actor),
    listIdeaStatusForParticipants(actor),
  ]);

  return (
    <>
      <PageHeader eyebrow="Client workspace · private" title={actor.active!.orgName} subtitle="Your organisation's private workspace. Other clients can't see anything here.">
        <Link href="/portal/client/observations/new" className="btn">New observation</Link>
      </PageHeader>

      <StatStrip cols={5}>
        <Stat label="Entitled offerings" value={pad(offerings.length)} />
        <Stat label="Private drafts" value={pad(mine.filter((o) => o.status === "DRAFT").length)} />
        <Stat label="In review" value={pad(mine.filter((o) => ["SUBMITTED", "IN_REVIEW"].includes(o.status)).length)} />
        <Stat label="Needs clarification" value={pad(mine.filter((o) => o.status === "RETURNED").length)} />
        <Stat label="Published copies" value={pad(mine.filter((o) => o.status === "PUBLISHED").length)} />
      </StatStrip>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-8">
          <Section title="My contributions" meta={<Link href="/portal/client/observations" className="link">All →</Link>}>
            {mine.length ? (
              <RowList>
                {mine.slice(0, 6).map((o) => (
                  <CardLink
                    key={o.id}
                    href={`/portal/client/observations/${o.id}`}
                    title={o.title}
                    badge={<Badge tone={o.status === "PUBLISHED" ? "teal" : o.status === "RETURNED" ? "amber" : "gray"}>{STATUS_LABEL[o.status]}</Badge>}
                  >
                    v{o.version} · updated <span className="data">{fmtDate(o.updatedAt)}</span>
                  </CardLink>
                ))}
              </RowList>
            ) : (
              <Empty title="No observations yet">Start a private draft — nothing is shared until you choose to.</Empty>
            )}
          </Section>

          <Section title="Improvement updates" meta="shared status only">
            {ideas.length ? (
              <RowList>
                {ideas.map((i) => (
                  <CardLink key={i.id} href="/portal/client/updates" title={i.title} badge={<Badge tone="blue">{i.status}</Badge>}>
                    {i.offering} · {i.ownerTeam} · <span className="data">{fmtDate(i.updatedAt)}</span>
                  </CardLink>
                ))}
              </RowList>
            ) : (
              <Empty title="No shared improvement updates yet" />
            )}
          </Section>

          {briefings.length > 0 && (
            <Section title="Briefings & release notes">
              <RowList>
                {briefings.map((b) => (
                  <div key={b.id} className="border-b border-line px-4 py-3 last:border-b-0">
                    <p className="text-sm font-medium">{b.title}</p>
                    <p className="text-xs text-muted">{b.summary}</p>
                  </div>
                ))}
              </RowList>
            </Section>
          )}
        </div>

        <div className="space-y-8">
          <Section title="Entitled offerings" meta={pad(offerings.length)}>
            {offerings.length ? (
              <RowList>
                {offerings.map((o) => (
                  <CardLink key={o.id} href="/portal/client/sandbox" title={o.name}>{o.category}</CardLink>
                ))}
              </RowList>
            ) : (
              <Empty title="No entitlements yet">Your Azentio contact can enable product sandboxes.</Empty>
            )}
          </Section>
          <Section title="Sessions & webinars">
            {sessions.length ? (
              <RowList>
                {sessions.map((s) => (
                  <div key={s.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <span className="data text-xs text-brand">{fmtDate(s.startsAt)}</span>
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted">{s.summary}</p>
                    </div>
                  </div>
                ))}
              </RowList>
            ) : (
              <Empty title="No sessions scheduled" />
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
