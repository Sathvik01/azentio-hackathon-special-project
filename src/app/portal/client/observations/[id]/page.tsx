import { notFound } from "next/navigation";
import Link from "next/link";
import { getActor } from "@/server/auth/actor";
import { getObservation } from "@/server/repo/observations";
import { listOfferings, offeringNameLookup } from "@/server/repo/catalog";
import { NotFoundOrDenied } from "@/server/errors";
import { STATUS_LABEL, allowedActions } from "@/server/learning/stateMachine";
import { flagLabel } from "@/server/learning/scan";
import { reviseObservationAction, submitObservationAction, updateObservationAction, withdrawObservationAction } from "@/server/actions/learning";
import { ObservationForm } from "@/components/ObservationForm";
import { Badge, Flash, Notice, PageHeader, fmtDate, human, type SP } from "@/components/ui";

export const metadata = { title: "Observation" };

export default async function ObservationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const [{ id }, sp, actor] = await Promise.all([params, searchParams, getActor()]);
  const r = await getObservation(actor, id).catch((e) => {
    if (e instanceof NotFoundOrDenied) notFound();
    throw e;
  });
  const o = r.observation;
  const name = await offeringNameLookup();
  const actions = r.isAuthor ? allowedActions(o.status, "author") : [];
  const canSubmit = actions.includes("submit") && o.sharingProposal === "COMMUNITY" && r.consent?.publishShared;
  const published = r.sharedCopies.find((s) => s.status === "PUBLISHED");

  if (sp.edit && r.canEdit) {
    return (
      <div className="max-w-3xl">
        <PageHeader title={`Edit: ${o.title}`} subtitle={`Version ${o.version} · ${STATUS_LABEL[o.status]}`} />
        <Flash searchParams={sp} />
        {o.status === "RETURNED" && o.returnReason && <Notice tone="amber">Moderator asked: {o.returnReason}</Notice>}
        <div className="mt-4">
          <ObservationForm action={updateObservationAction.bind(null, o.id)} offerings={await listOfferings()} o={o} consent={r.consent} submitLabel="Save changes" />
        </div>
      </div>
    );
  }

  const audience =
    o.sharingProposal === "COMMUNITY"
      ? published
        ? "Your original: " + (o.visibility === "ORG" ? "your organisation" : "only you") + ". A reviewed, de-identified copy is visible to authorised learning-community participants (employees and client members) and may be cited by AIRA."
        : "Your original: " + (o.visibility === "ORG" ? "your organisation" : "only you") + ". Once submitted, moderators can review it. Nothing is shared with other clients until a reviewed copy is published."
      : o.visibility === "ORG"
        ? `Colleagues in ${actor.kind === "user" ? actor.active?.orgName : "your organisation"}. Never other clients, never AIRA.`
        : "Only you. Never other clients, never AIRA.";

  return (
    <div className="max-w-4xl">
      <PageHeader title={o.title} subtitle={`${human(o.type)} · ${name(o.offeringId)} · version ${o.version}`}>
        {r.canEdit && <Link href={`?edit=1`} className="btn-secondary">Edit</Link>}
      </PageHeader>
      <Flash searchParams={sp} />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={o.status === "PUBLISHED" ? "teal" : o.status === "RETURNED" ? "amber" : "gray"}>{STATUS_LABEL[o.status]}</Badge>
        <Badge tone="blue">{o.visibility === "ORG" ? "Organisation-visible" : "Private to author"}</Badge>
        {o.sharingProposal === "COMMUNITY" && <Badge tone="violet">Proposed for community</Badge>}
      </div>

      {o.status === "RETURNED" && o.returnReason && (
        <div className="mb-4"><Notice tone="amber"><strong>Clarification requested:</strong> {o.returnReason} — edit and resubmit.</Notice></div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card">
            <p className="text-xs font-medium text-muted uppercase">Your original (private source)</p>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{o.body}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <dt className="text-muted">Industry</dt><dd>{o.industry}</dd>
              <dt className="text-muted">Market</dt><dd>{o.region}</dd>
              <dt className="text-muted">Period</dt><dd>{fmtDate(o.periodStart)} – {fmtDate(o.periodEnd)}</dd>
              <dt className="text-muted">Evidence</dt><dd>{human(o.evidenceType)} · {human(o.confidence)} confidence</dd>
              {o.link && (<><dt className="text-muted">Link</dt><dd className="truncate"><a className="link" href={o.link}>{o.link}</a></dd></>)}
            </dl>
            {o.sensitiveFlags.length > 0 && (
              <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-medium">Possible sensitive content flagged for review:</p>
                <ul className="mt-1 list-disc pl-4">{o.sensitiveFlags.map((f) => <li key={f}>{flagLabel(f)}</li>)}</ul>
                <p className="mt-1">This scan is a prompt, not a guarantee. Please remove anything identifying.</p>
              </div>
            )}
          </div>

          {r.sharedCopies.map((s) => (
            <div key={s.dto.ref} className="card border-teal-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted uppercase">Shared copy {s.dto.ref} (v{s.dto.version})</p>
                <Badge tone={s.status === "PUBLISHED" ? "teal" : "gray"}>{human(s.status)}</Badge>
              </div>
              <p className="mt-2 font-medium">{s.dto.title}</p>
              <p className="mt-1 text-sm whitespace-pre-line">{s.dto.body}</p>
              <p className="mt-2 text-xs text-muted">{s.dto.industry} · {s.dto.region} · {s.dto.period} · {s.dto.attribution ? `Attributed to ${s.dto.attribution}` : "Anonymous"}</p>
            </div>
          ))}

          {r.decisions.length > 0 && (
            <div className="card">
              <p className="text-xs font-medium text-muted uppercase">Moderation history</p>
              <ul className="mt-2 space-y-1 text-sm">
                {r.decisions.map((d, i) => (
                  <li key={i}>
                    <span className="text-muted">{fmtDate(d.createdAt)}</span> — {human(d.action)}{d.reason ? `: ${d.reason}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card text-sm">
            <p className="font-semibold">Who can see this</p>
            <p className="mt-1 text-muted">{audience}</p>
            {r.consent && (
              <ul className="mt-3 space-y-1 text-xs">
                <li>Store & process in workspace: {r.consent.store ? "yes" : "no"}</li>
                <li>Publish reviewed shared copy: {r.consent.publishShared ? "yes" : "no"}</li>
                <li>Organisation attribution: {r.consent.attribution ? "opted in" : "no (anonymous)"}</li>
                <li>Future training programme: {r.consent.training ? "opted in (no programme running)" : "no"}</li>
              </ul>
            )}
          </div>

          {r.isAuthor && (
            <div className="card space-y-3 text-sm">
              <p className="font-semibold">Actions</p>
              {canSubmit && (
                <form action={submitObservationAction.bind(null, o.id)}>
                  <button className="btn w-full justify-center">Submit for review</button>
                  <p className="mt-1 text-xs text-muted">A moderator will review and de-identify a separate shared copy.</p>
                </form>
              )}
              {actions.includes("submit") && !canSubmit && (
                <p className="text-xs text-muted">To share with the learning community, edit and choose “Propose for the approved learning community” with publishing permission.</p>
              )}
              {o.status === "PUBLISHED" && (
                <form action={reviseObservationAction.bind(null, o.id)}>
                  <button className="btn-secondary w-full justify-center">Create revised version</button>
                  <p className="mt-1 text-xs text-muted">Material edits need fresh review; the current copy stays until the new one is approved.</p>
                </form>
              )}
              {actions.includes("withdraw") && (
                <form action={withdrawObservationAction.bind(null, o.id)}>
                  <button className="btn-danger w-full justify-center">Withdraw</button>
                  <p className="mt-1 text-xs text-muted">
                    Removes the shared copy from feed, search, theme counts and AIRA immediately (production SLA ≤ 60s). Copies people already viewed can&apos;t be recalled.
                  </p>
                </form>
              )}
            </div>
          )}

          {r.consentHistory.length > 1 && (
            <details className="card text-xs">
              <summary className="cursor-pointer font-medium">Consent history ({r.consentHistory.length})</summary>
              <ul className="mt-2 space-y-1">
                {r.consentHistory.map((c) => (
                  <li key={c.id}>{fmtDate(c.recordedAt)}: publish {c.publishShared ? "✓" : "✗"} · attribution {c.attribution ? "✓" : "✗"} · training {c.training ? "✓" : "✗"}</li>
                ))}
              </ul>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
