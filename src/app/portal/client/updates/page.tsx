import { getActor } from "@/server/auth/actor";
import { listIdeaStatusForParticipants } from "@/server/repo/insights";
import { NotFoundOrDenied } from "@/server/errors";
import { notFound } from "next/navigation";
import { Badge, Empty, PageHeader, fmtDate } from "@/components/ui";

export const metadata = { title: "Improvement updates" };

export default async function UpdatesPage() {
  const ideas = await listIdeaStatusForParticipants(await getActor()).catch((e) => {
    if (e instanceof NotFoundOrDenied) notFound();
    throw e;
  });
  return (
    <>
      <PageHeader
        title="Improvement updates"
        subtitle="How shared themes are informing Azentio offerings. Statuses are plain-language and are not delivery commitments unless stated."
      />
      {ideas.length === 0 ? (
        <Empty title="No shared improvement updates yet" />
      ) : (
        <div className="space-y-3">
          {ideas.map((i) => (
            <div key={i.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{i.title}</p>
                <Badge tone="blue">{i.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                {i.offering} · Owner: {i.ownerTeam} · Last update {fmtDate(i.updatedAt)} {i.themeTitle && `· Theme: ${i.themeTitle}`}
              </p>
              <p className="mt-2 text-sm">{i.statusNote}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
