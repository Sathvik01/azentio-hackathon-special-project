import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { canPublishContent, isEmployee } from "@/server/policy";
import { listContent } from "@/server/repo/catalog";
import { Badge, PageHeader, fmtDate } from "@/components/ui";

export const metadata = { title: "Live & recordings" };

export default async function LivePage() {
  const actor = await getActor();
  if (!isEmployee(actor)) notFound();
  const items = await listContent(actor, ["BROADCAST", "RECORDING", "SESSION"], "EMPLOYEE");
  return (
    <>
      <PageHeader
        title="Internal live sessions & recordings"
        subtitle={
          canPublishContent(actor)
            ? "You hold a publishing grant: configure sessions from Publishing."
            : "Restricted to the employee audience. Only staff with a publishing grant can change broadcasts."
        }
      />
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.id} className="card">
            <div className="flex items-center gap-2">
              <Badge tone={i.kind === "RECORDING" ? "gray" : "violet"}>{i.kind === "RECORDING" ? "Recording" : "Live"}</Badge>
              <span className="text-xs text-muted">{fmtDate(i.startsAt)}</span>
            </div>
            <p className="mt-2 font-semibold">{i.title}</p>
            <p className="text-sm text-muted">{i.summary}</p>
            <p className="mt-2 text-sm">{i.body}</p>
            {i.mediaIds.map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m} src={`/api/media/${m}`} alt={i.title} className="mt-3 max-w-md rounded-lg border border-line" />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
