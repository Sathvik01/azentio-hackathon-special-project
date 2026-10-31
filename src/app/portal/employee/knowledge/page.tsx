import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { isEmployee } from "@/server/policy";
import { listContent } from "@/server/repo/catalog";
import { Badge, PageHeader, fmtDate } from "@/components/ui";

export const metadata = { title: "Knowledge & experiments" };

const SECTIONS = [
  ["EXPERIMENT", "Experiment submissions"],
  ["KNOWLEDGE", "Internal knowledge library"],
  ["RELEASE_NOTE", "Release notes"],
] as const;

export default async function KnowledgePage() {
  const actor = await getActor();
  if (!isEmployee(actor)) notFound();
  const items = await listContent(actor, ["EXPERIMENT", "KNOWLEDGE", "RELEASE_NOTE"]);
  const now = new Date();
  return (
    <>
      <PageHeader title="Knowledge, experiments & release notes" subtitle="Every item has an owner and a review date. Employee-only items never enter public/client search or AIRA." />
      {SECTIONS.map(([kind, label]) => (
        <section key={kind} className="mb-8">
          <h2 className="mb-3 font-semibold">{label}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {items
              .filter((i) => i.kind === kind)
              .map((i) => {
                const overdue = i.reviewDate && new Date(i.reviewDate) < now;
                return (
                  <div key={i.id} className="card">
                    <p className="font-semibold">{i.title}</p>
                    <p className="text-sm text-muted">{i.summary}</p>
                    <p className="mt-2 text-sm">{i.body}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge>Owner: {i.ownerName ?? "Unassigned"}</Badge>
                      <Badge tone={overdue ? "red" : "gray"}>Review {overdue ? "overdue" : "due"}: {fmtDate(i.reviewDate)}</Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}
