import { ANONYMOUS } from "@/server/policy/actor";
import { listContent } from "@/server/repo/catalog";
import { Badge, PageHeader, fmtDate } from "@/components/ui";

export const metadata = { title: "Insights & media" };

export default async function InsightsPage() {
  // The public page always uses the anonymous scope, even for signed-in users.
  const items = await listContent(ANONYMOUS, ["INSIGHT", "VIDEO"]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader title="Insights & media" subtitle="Public articles and approved videos." />
      <div className="space-y-4">
        {items.map((i) => (
          <article key={i.id} className="card">
            <div className="flex items-center gap-2">
              <Badge tone={i.kind === "VIDEO" ? "violet" : "teal"}>{i.kind === "VIDEO" ? "Video" : "Insight"}</Badge>
              <span className="text-xs text-muted">{fmtDate(i.startsAt)}</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold">{i.title}</h2>
            <p className="mt-1 text-sm text-muted">{i.summary}</p>
            <p className="mt-3 text-sm leading-relaxed">{i.body}</p>
            {i.mediaIds.map((m) => (
              // Media streams through a policy-checked route; there is no static public URL.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m} src={`/api/media/${m}`} alt={i.title} className="mt-4 w-full rounded-lg border border-line" />
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}
