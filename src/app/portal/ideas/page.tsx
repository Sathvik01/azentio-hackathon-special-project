import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { canManageIdeas, isEmployee } from "@/server/policy";
import { listIdeasInternal, listThemes } from "@/server/repo/insights";
import { listPublishedForLinking } from "@/server/repo/shared";
import { listOfferings } from "@/server/repo/catalog";
import { createIdeaAction, createThemeAction } from "@/server/actions/portal";
import { IDEA_STATUS_LABEL } from "@/server/dto";
import { Badge, Empty, Flash, PageHeader, fmtDate, type SP } from "@/components/ui";

export const metadata = { title: "Improvement ideas" };

export default async function IdeasPage({ searchParams }: { searchParams: SP }) {
  const [actor, sp] = await Promise.all([getActor(), searchParams]);
  if (!isEmployee(actor)) notFound();
  const po = canManageIdeas(actor);
  const [ideas, themes, evidence, offerings] = await Promise.all([
    listIdeasInternal(actor),
    po ? listThemes(actor) : Promise.resolve([]),
    po ? listPublishedForLinking(actor) : Promise.resolve([]),
    listOfferings(),
  ]);

  const evidencePicker = (
    <fieldset className="max-h-48 space-y-1 overflow-auto rounded-md border border-line p-2 text-xs">
      <legend className="label">Supporting approved contributions</legend>
      {evidence.map((e) => (
        <label key={e.ref} className="flex gap-2">
          <input type="checkbox" name="refs" value={e.ref} /> <span className="font-mono text-brand">{e.ref}</span> {e.title}
        </label>
      ))}
    </fieldset>
  );

  return (
    <>
      <PageHeader
        title={po ? "Improvement ideas" : "Ideas assigned to you"}
        subtitle="Connect recurring themes to product improvements. Internal priority and discussion never reach clients; only the public status note does."
      />
      <Flash searchParams={sp} />

      {ideas.length === 0 ? (
        <Empty title="No ideas yet" />
      ) : (
        <div className="mb-8 rounded-xl border border-line bg-white">
          {ideas.map((i) => (
            <Link key={i.id} href={`/portal/ideas/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 last:border-0 hover:bg-paper">
              <div>
                <p className="font-medium">{i.title}</p>
                <p className="text-xs text-muted">{i.ownerTeam} · {i.evidence.length} evidence links · updated {fmtDate(i.updatedAt)}</p>
              </div>
              <div className="flex gap-2">
                <Badge tone="gray">{i.priority}</Badge>
                {i.visibleToClients ? <Badge tone="teal">Shared status</Badge> : <Badge>Internal</Badge>}
                <Badge tone="blue">{IDEA_STATUS_LABEL[i.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      {po && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form action={createThemeAction} className="card space-y-3">
            <p className="font-semibold">New theme</p>
            <input name="title" required minLength={4} maxLength={140} placeholder="Theme title" className="input" />
            <textarea name="summary" required minLength={20} maxLength={4000} rows={3} placeholder="Summary of the pattern across approved contributions" className="input" />
            <textarea name="limitations" required minLength={10} maxLength={1000} rows={2} placeholder="Confidence & limitations (sample size, coverage…)" className="input" />
            <select name="offeringId" className="input">
              <option value="">Cross-offering</option>
              {offerings.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {evidencePicker}
            <button className="btn">Create theme</button>
          </form>

          <form action={createIdeaAction} className="card space-y-3">
            <p className="font-semibold">New improvement idea</p>
            <input name="title" required minLength={4} maxLength={140} placeholder="Title" className="input" />
            <textarea name="problem" required minLength={20} maxLength={4000} rows={3} placeholder="Problem statement" className="input" />
            <textarea name="proposedOutcome" required minLength={10} maxLength={4000} rows={2} placeholder="Proposed outcome" className="input" />
            <div className="grid gap-2 sm:grid-cols-3">
              <select name="offeringId" required className="input">
                {offerings.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <input name="ownerTeam" required maxLength={80} placeholder="Owner team" className="input" />
              <select name="priority" className="input" title="Internal only">
                <option>P1</option><option>P2</option><option>P3</option>
              </select>
            </div>
            <select name="themeId" className="input">
              <option value="">No theme</option>
              {themes.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            {evidencePicker}
            <textarea name="publicStatusNote" required minLength={10} maxLength={1000} rows={2} placeholder="Plain-language status note participants may see (no roadmap commitments)" className="input" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToClients" /> Share status with learning-community participants</label>
            <button className="btn">Create idea</button>
          </form>
        </div>
      )}
    </>
  );
}
