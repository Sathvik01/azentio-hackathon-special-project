import Link from "next/link";
import { notFound } from "next/navigation";
import type { Observation } from "@prisma/client";
import { getActor } from "@/server/auth/actor";
import { isClientMember } from "@/server/policy";
import { listMyObservations, listOrgObservations } from "@/server/repo/observations";
import { STATUS_LABEL } from "@/server/learning/stateMachine";
import { Badge, Empty, Flash, PageHeader, fmtDate, human, type SP } from "@/components/ui";

export const metadata = { title: "Observations" };

function Row({ o }: { o: Observation }) {
  return (
    <Link href={`/portal/client/observations/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-0 hover:bg-paper">
      <div>
        <p className="font-medium">{o.title}</p>
        <p className="text-xs text-muted">{human(o.type)} · v{o.version} · updated {fmtDate(o.updatedAt)}</p>
      </div>
      <div className="flex gap-2">
        <Badge tone={o.visibility === "ORG" ? "blue" : "gray"}>{o.visibility === "ORG" ? "Organisation" : "Private"}</Badge>
        {o.sharingProposal === "COMMUNITY" && <Badge tone="violet">Community proposal</Badge>}
        <Badge tone={o.status === "PUBLISHED" ? "teal" : o.status === "RETURNED" ? "amber" : "gray"}>{STATUS_LABEL[o.status]}</Badge>
      </div>
    </Link>
  );
}

export default async function ObservationsPage({ searchParams }: { searchParams: SP }) {
  const [actor, sp] = await Promise.all([getActor(), searchParams]);
  if (!isClientMember(actor)) notFound();
  const [mine, org] = await Promise.all([listMyObservations(actor), listOrgObservations(actor)]);
  return (
    <>
      <PageHeader title="Observations" subtitle={`Private to ${actor.active!.orgName}. This is not the cross-client shared feed.`}>
        <Link href="/portal/client/observations/new" className="btn">New observation</Link>
      </PageHeader>
      <Flash searchParams={sp} />
      <div className="mb-3 flex items-center gap-2">
        <Badge tone="blue">Private workspace</Badge>
        <span className="text-xs text-muted">Shared learning lives separately under “Shared learning”.</span>
      </div>
      <h2 className="mb-2 font-semibold">My observations</h2>
      <div className="mb-8 rounded-xl border border-line bg-white">{mine.length ? mine.map((o) => <Row key={o.id} o={o} />) : <Empty title="No observations yet" />}</div>
      <h2 className="mb-2 font-semibold">Our organisation&apos;s observations</h2>
      <div className="rounded-xl border border-line bg-white">
        {org.length ? org.map((o) => <Row key={o.id} o={o} />) : <Empty title="No colleagues have shared observations within the organisation yet" />}
      </div>
    </>
  );
}
