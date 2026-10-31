import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { getIdeaInternal } from "@/server/repo/insights";
import { NotFoundOrDenied } from "@/server/errors";
import { changeIdeaStatusAction } from "@/server/actions/portal";
import { IDEA_STATUS_LABEL } from "@/server/dto";
import { Badge, Flash, PageHeader, fmtDate, type SP } from "@/components/ui";

export default async function IdeaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const [{ id }, sp, actor] = await Promise.all([params, searchParams, getActor()]);
  const r = await getIdeaInternal(actor, id).catch((e) => {
    if (e instanceof NotFoundOrDenied) notFound();
    throw e;
  });
  const i = r.idea;
  return (
    <div className="max-w-4xl">
      <Link href="/portal/ideas" className="link text-sm">← Ideas</Link>
      <PageHeader title={i.title} subtitle={`${r.offering} · ${i.ownerTeam} · updated ${fmtDate(i.updatedAt)}`} />
      <Flash searchParams={sp} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="blue">{IDEA_STATUS_LABEL[i.status]}</Badge>
        <Badge tone="gray">Priority {i.priority} (internal)</Badge>
        {i.visibleToClients ? <Badge tone="teal">Status shared with participants</Badge> : <Badge>Internal only</Badge>}
        {i.theme && <Link href={`/portal/learning/themes/${i.theme.id}`}><Badge tone="violet">Theme: {i.theme.title}</Badge></Link>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card"><p className="text-xs text-muted uppercase">Problem</p><p className="mt-1 text-sm">{i.problem}</p></div>
          <div className="card"><p className="text-xs text-muted uppercase">Proposed outcome</p><p className="mt-1 text-sm">{i.proposedOutcome}</p></div>
          <div className="card">
            <p className="text-xs text-muted uppercase">Supporting evidence (published contributions only)</p>
            <ul className="mt-2 space-y-1 text-sm">
              {r.evidence.map((e) => (
                <li key={e.ref}><Link href={`/portal/learning/${e.ref}`} className="link font-mono">{e.ref}</Link> {e.title}</li>
              ))}
              {r.evidence.length === 0 && <li className="text-muted">No linked evidence currently published.</li>}
            </ul>
          </div>
          <div className="card">
            <p className="text-xs text-muted uppercase">Public status note</p>
            <p className="mt-1 text-sm">{i.publicStatusNote}</p>
          </div>
          <div className="card">
            <p className="text-xs text-muted uppercase">Status history (audited)</p>
            <ul className="mt-2 space-y-1 text-sm">
              {i.changes.map((c) => (
                <li key={c.id}>{fmtDate(c.at)} · {c.from ? `${IDEA_STATUS_LABEL[c.from]} → ` : ""}{IDEA_STATUS_LABEL[c.to]} — {c.note}</li>
              ))}
            </ul>
          </div>
        </div>
        {r.canEdit && (
          <form action={changeIdeaStatusAction.bind(null, i.id)} className="card h-fit space-y-3">
            <p className="font-semibold">Update status</p>
            <select name="status" defaultValue={i.status} className="input">
              {Object.entries(IDEA_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <textarea name="note" required minLength={5} maxLength={1000} rows={2} placeholder="Internal reason for change" className="input" />
            <textarea name="publicStatusNote" defaultValue={i.publicStatusNote} required minLength={10} maxLength={1000} rows={3} className="input" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToClients" defaultChecked={i.visibleToClients} /> Share status with participants</label>
            <p className="text-xs text-muted">Contributors of linked evidence get an in-app update. No private source material is included.</p>
            <button className="btn">Save status</button>
          </form>
        )}
      </div>
    </div>
  );
}
