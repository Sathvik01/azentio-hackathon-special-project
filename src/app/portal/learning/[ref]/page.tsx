import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { getShared } from "@/server/repo/shared";
import { NotFoundOrDenied } from "@/server/errors";
import { bookmarkAction, feedbackAction, reportSharedAction } from "@/server/actions/learning";
import { Badge, Flash, Notice, PageHeader, fmtDate, human, type SP } from "@/components/ui";

export default async function SharedItemPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: SP }) {
  const [{ ref }, sp, actor] = await Promise.all([params, searchParams, getActor()]);
  const r = await getShared(actor, ref).catch((e) => {
    if (e instanceof NotFoundOrDenied) notFound();
    throw e;
  });
  const s = r.item;
  return (
    <div className="max-w-3xl">
      <Link href="/portal/learning" className="link text-sm">← Shared learning</Link>
      <PageHeader title={s.title} subtitle={`${s.ref} · v${s.version} · published ${fmtDate(s.publishedAt)}`} />
      <Flash searchParams={sp} />
      {r.status === "SUSPENDED" && <Notice tone="amber">Temporarily unpublished while a report is reviewed (visible to moderators only).</Notice>}
      <div className="card">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge>{human(s.type)}</Badge>
          <Badge tone="gray">{s.offering}</Badge>
          <Badge tone="gray">{s.industry}</Badge>
          <Badge tone="gray">{s.region}</Badge>
          <Badge tone="gray">{s.period}</Badge>
        </div>
        <p className="mt-4 leading-relaxed whitespace-pre-line">{s.body}</p>
        <p className="mt-4 text-xs text-muted">{s.attribution ? `Contributed by ${s.attribution} (opted in, reviewed)` : "Anonymous contributor"} · Reviewed and de-identified by a moderator.</p>
        {r.themes.length > 0 && (
          <p className="mt-2 text-sm">
            Part of theme{r.themes.length > 1 ? "s" : ""}:{" "}
            {r.themes.map((t) => <Link key={t.id} href={`/portal/learning/themes/${t.id}`} className="link mr-2">{t.title}</Link>)}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={bookmarkAction.bind(null, s.ref)}><button className="btn-secondary">{r.bookmarked ? "★ Bookmarked" : "☆ Bookmark"}</button></form>
        <form action={feedbackAction.bind(null, s.ref)}>
          <input type="hidden" name="kind" value="USEFUL" />
          <button className="btn-secondary">{r.myFeedback === "USEFUL" ? "✓ " : ""}Useful</button>
        </form>
        <form action={feedbackAction.bind(null, s.ref)}>
          <input type="hidden" name="kind" value="NEEDS_EVIDENCE" />
          <button className="btn-secondary">{r.myFeedback === "NEEDS_EVIDENCE" ? "✓ " : ""}Needs evidence</button>
        </form>
      </div>

      {r.status === "PUBLISHED" && (
        <details className="card mt-6">
          <summary className="cursor-pointer text-sm font-medium">Report this contribution</summary>
          <form action={reportSharedAction.bind(null, s.ref)} className="mt-3 space-y-3 text-sm">
            <p className="text-xs text-muted">You don&apos;t need to name any other organisation. A moderator may temporarily unpublish it while reviewing.</p>
            <select name="reason" className="input">
              <option value="MISLEADING">Misleading</option>
              <option value="CONFIDENTIAL">Contains confidential information</option>
              <option value="IDENTIFYING">Could identify a client or customer</option>
              <option value="INAPPROPRIATE">Inappropriate</option>
              <option value="DUPLICATE">Duplicate</option>
            </select>
            <textarea name="details" maxLength={1000} rows={3} className="input" placeholder="Optional details" />
            <button className="btn-danger">Submit report</button>
          </form>
        </details>
      )}
    </div>
  );
}
