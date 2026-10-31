import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { getForReview } from "@/server/repo/moderation";
import { NotFoundOrDenied } from "@/server/errors";
import { allowedActions, STATUS_LABEL } from "@/server/learning/stateMachine";
import { flagLabel } from "@/server/learning/scan";
import { REGIONS } from "@/server/learning/coarsen";
import { offeringNameLookup } from "@/server/repo/catalog";
import { claimAction, publishAction, rejectAction, returnAction } from "@/server/actions/learning";
import { Badge, Flash, Notice, PageHeader, fmtDate, human, type SP } from "@/components/ui";
import { LIMITS } from "@/lib/schemas";

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const [{ id }, sp, actor] = await Promise.all([params, searchParams, getActor()]);
  const r = await getForReview(actor, id).catch((e) => {
    if (e instanceof NotFoundOrDenied) notFound();
    throw e;
  });
  const o = r.observation;
  const name = await offeringNameLookup();
  const actions = allowedActions(o.status, "moderator");

  return (
    <div>
      <Link href="/portal/moderation" className="link text-sm">← Moderation</Link>
      <PageHeader title={o.title} subtitle={`${human(o.type)} · ${name(o.offeringId)} · v${o.version} · ${STATUS_LABEL[o.status]}`}>
        {actions.includes("claim") && (
          <form action={claimAction.bind(null, o.id)}><button className="btn-secondary">Claim for review</button></form>
        )}
      </PageHeader>
      <Flash searchParams={sp} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="card">
            <p className="text-xs font-medium text-muted uppercase">Private source (never shared as-is)</p>
            <p className="mt-2 text-sm whitespace-pre-line">{o.body}</p>
            <dl className="mt-4 grid grid-cols-2 gap-1 text-xs">
              <dt className="text-muted">Source organisation</dt><dd>{r.sourceOrgName}</dd>
              <dt className="text-muted">Market</dt><dd>{o.region}</dd>
              <dt className="text-muted">Industry</dt><dd>{o.industry}</dd>
              <dt className="text-muted">Period</dt><dd>{fmtDate(o.periodStart)} – {fmtDate(o.periodEnd)}</dd>
              <dt className="text-muted">Evidence</dt><dd>{human(o.evidenceType)} · {human(o.confidence)}</dd>
              {o.link && (<><dt className="text-muted">Link</dt><dd className="truncate">{o.link}</dd></>)}
            </dl>
          </div>
          {r.flags.length > 0 && (
            <Notice tone="amber">
              <p className="font-medium">Sensitive-content flags</p>
              <ul className="mt-1 list-disc pl-5">{r.flags.map((f) => <li key={f}>{flagLabel(f)}</li>)}</ul>
            </Notice>
          )}
          <div className="card text-xs">
            <p className="font-medium">Author permissions</p>
            <ul className="mt-1 space-y-0.5">
              <li>Publish reviewed copy: {r.consent?.publishShared ? "✓ granted" : "✗ not granted"}</li>
              <li>Organisation attribution: {r.consent?.attribution ? "✓ opted in" : "✗ anonymous"}</li>
              <li>Future training programme: {r.consent?.training ? "opted in (no programme running)" : "no"}</li>
            </ul>
          </div>
          {r.decisions.length > 0 && (
            <div className="card text-xs">
              <p className="font-medium">Decision log (reviewer notes are internal)</p>
              <ul className="mt-1 space-y-1">
                {r.decisions.map((d) => (
                  <li key={d.id}>{fmtDate(d.createdAt)} · {human(d.action)}{d.reason ? ` — ${d.reason}` : ""}{d.reviewerNote ? <em className="text-muted"> (note: {d.reviewerNote})</em> : null}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="space-y-4">
          {actions.includes("publish") ? (
            <form action={publishAction.bind(null, o.id)} className="card space-y-3 border-brand/40">
              <p className="font-semibold">Prepare the shared copy</p>
              <p className="text-xs text-muted">
                Only these reviewed fields are published. Remove names, rare details, precise amounts and dates. Removing a name alone doesn&apos;t make a rare
                observation anonymous.
              </p>
              <div>
                <label className="label" htmlFor="title">Shared title</label>
                <input id="title" name="title" defaultValue={r.suggested.title} required minLength={8} maxLength={LIMITS.title} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="body">Shared text (redact here)</label>
                <textarea id="body" name="body" defaultValue={r.suggested.body} required minLength={40} maxLength={LIMITS.body} rows={8} className="input" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="regionCoarse">Region (coarsened)</label>
                  <select id="regionCoarse" name="regionCoarse" defaultValue={r.suggested.regionCoarse} className="input">
                    {[...REGIONS, "Global"].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="periodLabel">Period (coarsened)</label>
                  <input id="periodLabel" name="periodLabel" defaultValue={r.suggested.periodLabel} required className="input" />
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="includeAttribution" disabled={!r.consent?.attribution} className="mt-1" />
                <span>Show “{r.sourceOrgName}” as contributor {r.consent?.attribution ? "(author opted in)" : "— author did not opt in"}</span>
              </label>
              {r.flags.length > 0 && (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="acknowledgeFlags" className="mt-1" />
                  <span>I reviewed the flags; any remaining matches are not identifying.</span>
                </label>
              )}
              <div>
                <label className="label" htmlFor="reviewerNote">Internal reviewer note (never shown to clients)</label>
                <input id="reviewerNote" name="reviewerNote" maxLength={1000} className="input" />
              </div>
              <button className="btn">Publish reviewed copy</button>
            </form>
          ) : (
            <Notice>This item is {STATUS_LABEL[o.status].toLowerCase()}; no publishing action is available.</Notice>
          )}

          {actions.includes("return") && (
            <form action={returnAction.bind(null, o.id)} className="card space-y-2">
              <p className="font-semibold">Request clarification</p>
              <textarea name="reason" required minLength={5} maxLength={1000} rows={2} className="input" placeholder="What should the author clarify or remove?" />
              <button className="btn-secondary">Return to author</button>
            </form>
          )}
          {actions.includes("reject") && (
            <form action={rejectAction.bind(null, o.id)} className="card space-y-2">
              <p className="font-semibold">Reject</p>
              <textarea name="reason" required minLength={5} maxLength={1000} rows={2} className="input" placeholder="e.g. duplicate of LRN-0002, or unsafe to de-identify" />
              <button className="btn-danger">Reject</button>
            </form>
          )}
          <Badge tone="gray">Every decision is recorded in the audit log and the author is notified in-app.</Badge>
        </section>
      </div>
    </div>
  );
}
