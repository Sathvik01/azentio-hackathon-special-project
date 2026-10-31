import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { canPublishContent } from "@/server/policy";
import { listAllContentForPublisher } from "@/server/repo/catalog";
import { saveContentAction } from "@/server/actions/portal";
import { Badge, Flash, PageHeader, fmtDate, human, type SP } from "@/components/ui";

export const metadata = { title: "Publishing" };

const KINDS = ["BANNER", "INSIGHT", "VIDEO", "BROADCAST", "RECORDING", "SESSION", "KNOWLEDGE", "RELEASE_NOTE", "EXPERIMENT", "BRIEFING"];
const AUD = { PUBLIC: "Public", EMPLOYEE: "Employees only", CLIENTS: "All client members" } as const;

function ContentForm({ c }: { c?: Awaited<ReturnType<typeof listAllContentForPublisher>>[number] }) {
  return (
    <form action={saveContentAction} className="grid gap-2 md:grid-cols-6">
      {c && <input type="hidden" name="id" value={c.id} />}
      <select name="kind" defaultValue={c?.kind ?? "INSIGHT"} className="input md:col-span-1">{KINDS.map((k) => <option key={k} value={k}>{human(k)}</option>)}</select>
      <input name="title" defaultValue={c?.title} required minLength={3} maxLength={140} placeholder="Title" className="input md:col-span-2" />
      <select name="audience" defaultValue={c?.audience ?? "PUBLIC"} className="input md:col-span-1">
        {Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input name="startsAt" type="date" defaultValue={c?.startsAt?.toISOString().slice(0, 10)} className="input md:col-span-1" />
      <label className="flex items-center gap-2 text-sm md:col-span-1"><input type="checkbox" name="published" defaultChecked={c?.published ?? true} /> Published</label>
      <input name="summary" defaultValue={c?.summary} required minLength={3} maxLength={400} placeholder="Summary" className="input md:col-span-6" />
      <textarea name="body" defaultValue={c?.body} required minLength={3} maxLength={4000} rows={2} placeholder="Body" className="input md:col-span-5" />
      <button className="btn md:col-span-1">{c ? "Save" : "Create"}</button>
    </form>
  );
}

export default async function PublishPage({ searchParams }: { searchParams: SP }) {
  const [actor, sp] = await Promise.all([getActor(), searchParams]);
  if (!canPublishContent(actor)) notFound();
  const items = await listAllContentForPublisher(actor);
  return (
    <>
      <PageHeader
        title="Publishing"
        subtitle="Manage banners, public content, sessions and video audiences. Audience changes are audited. Publishing grants no access to private learning records."
      />
      <Flash searchParams={sp} />
      <div className="card mb-6">
        <p className="mb-3 font-semibold">New content</p>
        <ContentForm />
      </div>
      <div className="space-y-3">
        {items.map((c) => (
          <details key={c.id} className="card">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2">
              <Badge>{human(c.kind)}</Badge>
              <Badge tone={c.audience === "PUBLIC" ? "teal" : c.audience === "EMPLOYEE" ? "violet" : "blue"}>{AUD[c.audience as keyof typeof AUD]}</Badge>
              {!c.published && <Badge tone="amber">Draft</Badge>}
              <span className="font-medium">{c.title}</span>
              <span className="text-xs text-muted">updated {fmtDate(c.updatedAt)}</span>
            </summary>
            <div className="mt-3"><ContentForm c={c} /></div>
          </details>
        ))}
      </div>
    </>
  );
}
