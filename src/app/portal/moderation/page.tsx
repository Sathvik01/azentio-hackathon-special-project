import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { canModerate } from "@/server/policy";
import { listQueue, listRecentlyPublished, listReports } from "@/server/repo/moderation";
import { dismissReportAction, reinstateAction, removeAction, suspendAction } from "@/server/actions/learning";
import { STATUS_LABEL } from "@/server/learning/stateMachine";
import { Badge, Empty, Flash, PageHeader, fmtDate, human, type SP } from "@/components/ui";

export const metadata = { title: "Moderation" };

function ReasonForm({ action, label, tone = "btn-secondary" }: { action: (fd: FormData) => Promise<void>; label: string; tone?: string }) {
  return (
    <form action={action} className="flex gap-2">
      <input name="reason" required minLength={5} maxLength={1000} placeholder="Reason (shared with contributor)" className="input py-1 text-xs" />
      <button className={`${tone} py-1 text-xs whitespace-nowrap`}>{label}</button>
    </form>
  );
}

export default async function ModerationPage({ searchParams }: { searchParams: SP }) {
  const [actor, sp] = await Promise.all([getActor(), searchParams]);
  if (!canModerate(actor)) notFound();
  const [queue, reports, published] = await Promise.all([listQueue(actor), listReports(actor), listRecentlyPublished(actor)]);

  return (
    <>
      <PageHeader title="Moderation" subtitle="You see only contributions an author explicitly submitted for community sharing. Unsubmitted drafts are never visible here." />
      <Flash searchParams={sp} />

      <h2 className="mb-2 font-semibold">Review queue</h2>
      {queue.length === 0 ? (
        <Empty title="Queue is empty" />
      ) : (
        <div className="mb-8 rounded-xl border border-line bg-white">
          {queue.map((o) => (
            <Link key={o.id} href={`/portal/moderation/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-0 hover:bg-paper">
              <div>
                <p className="font-medium">{o.title}</p>
                <p className="text-xs text-muted">{human(o.type)} · v{o.version} · submitted {fmtDate(o.submittedAt)}</p>
              </div>
              <div className="flex gap-2">
                {o.sensitiveFlags.length > 0 && <Badge tone="red">{o.sensitiveFlags.length} flag(s)</Badge>}
                <Badge tone={o.status === "RETURNED" ? "amber" : "blue"}>{STATUS_LABEL[o.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mt-8 mb-2 font-semibold">Open reports</h2>
      {reports.length === 0 ? (
        <Empty title="No open reports" />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium"><span className="font-mono text-brand">{r.shared.publicRef}</span> {r.shared.title}</p>
                <div className="flex gap-2"><Badge tone="red">{human(r.reason)}</Badge><Badge>{human(r.shared.status)}</Badge></div>
              </div>
              {r.details && <p className="mt-1 text-sm text-muted">“{r.details}”</p>}
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {r.shared.status === "PUBLISHED" && <ReasonForm action={suspendAction.bind(null, r.shared.publicRef)} label="Unpublish temporarily" tone="btn-danger" />}
                {r.shared.status === "SUSPENDED" && <ReasonForm action={reinstateAction.bind(null, r.shared.publicRef)} label="Reinstate" />}
                {r.shared.status === "SUSPENDED" && <ReasonForm action={removeAction.bind(null, r.shared.publicRef)} label="Remove permanently" tone="btn-danger" />}
                <ReasonForm action={dismissReportAction.bind(null, r.id)} label="Close report, no action" />
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 mb-2 font-semibold">Published shared copies</h2>
      <div className="rounded-xl border border-line bg-white text-sm">
        {published.map((s) => (
          <div key={s.id} className="flex items-center justify-between border-b border-line px-4 py-2 last:border-0">
            <Link href={`/portal/learning/${s.publicRef}`} className="hover:underline"><span className="font-mono text-brand">{s.publicRef}</span> {s.title}</Link>
            <Badge tone={s.status === "PUBLISHED" ? "teal" : "amber"}>{human(s.status)}</Badge>
          </div>
        ))}
      </div>
    </>
  );
}
