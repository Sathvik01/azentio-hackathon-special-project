import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { canReadAudit } from "@/server/policy";
import { listAudit } from "@/server/repo/orgs";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const actor = await getActor();
  if (!canReadAudit(actor)) notFound();
  const events = await listAudit(actor);
  return (
    <>
      <PageHeader title="Audit log" subtitle="Privileged actions, lifecycle transitions, grants, entitlements and status changes (latest 200)." />
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-xs">
          <thead className="bg-paper text-left text-muted uppercase">
            <tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Resource</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Data</th></tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-line align-top">
                <td className="px-3 py-2 whitespace-nowrap">{e.at.toLocaleString("en-GB")}</td>
                <td className="px-3 py-2 font-mono">{e.action}</td>
                <td className="px-3 py-2">{e.resourceType} <span className="text-muted">{e.resourceId.slice(-8)}</span></td>
                <td className="px-3 py-2 text-muted">{e.actorId?.slice(-8) ?? "system"}</td>
                <td className="px-3 py-2"><code className="break-all">{e.data ? JSON.stringify(e.data) : ""}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
