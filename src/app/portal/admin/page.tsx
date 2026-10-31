import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { canAdminPortal } from "@/server/policy";
import { getAdminOverview } from "@/server/repo/orgs";
import { entitlementAction, grantAction, provisionEmployeeAction, revokeGrantAction } from "@/server/actions/portal";
import { Badge, Flash, PageHeader, fmtDate, human, type SP } from "@/components/ui";

export const metadata = { title: "Portal admin" };

const GRANTS = ["PUBLISH_CONTENT", "MODERATE_LEARNING", "PRODUCT_OWNER", "PORTAL_ADMIN", "SUPPORT_ACCESS"];

export default async function AdminPage({ searchParams }: { searchParams: SP }) {
  const [actor, sp] = await Promise.all([getActor(), searchParams]);
  if (!canAdminPortal(actor)) notFound();
  const { orgs, users, offerings, provisions } = await getAdminOverview(actor);
  const clientOrgs = orgs.filter((o) => o.type === "CLIENT");
  const employees = users.filter((u) => provisions.some((p) => p.email === u.email));
  const now = new Date();

  return (
    <>
      <PageHeader title="Portal administration" subtitle="Organisations, entitlements, employee provisioning and role grants. Every change is audited. Admin does not imply access to private client content." />
      <Flash searchParams={sp} />

      <h2 className="mb-2 font-semibold">Client entitlements</h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs text-muted uppercase">
            <tr><th className="px-3 py-2">Organisation</th>{offerings.map((o) => <th key={o.id} className="px-3 py-2">{o.name}</th>)}</tr>
          </thead>
          <tbody>
            {clientOrgs.map((org) => (
              <tr key={org.id} className="border-t border-line">
                <td className="px-3 py-2">{org.name}<div className="text-xs text-muted">{org.industry} · {org._count.memberships} members</div></td>
                {offerings.map((o) => {
                  const on = org.entitlements.some((e) => e.offeringId === o.id);
                  return (
                    <td key={o.id} className="px-3 py-2">
                      <form action={entitlementAction.bind(null, org.id, o.id, !on)}>
                        <button className={`rounded px-2 py-0.5 text-xs ${on ? "bg-teal-100 text-teal-900" : "bg-slate-100 text-slate-500"}`}>{on ? "Enabled" : "Off"}</button>
                      </form>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form action={provisionEmployeeAction} className="card space-y-3">
          <p className="font-semibold">Provision employee</p>
          <p className="text-xs text-muted">Organiser-approved provisioning: the person must also verify the @azentio.com address by magic link.</p>
          <input name="email" type="email" required placeholder="name@azentio.com" className="input" />
          <input name="name" required maxLength={120} placeholder="Full name" className="input" />
          <button className="btn">Provision</button>
        </form>

        <form action={grantAction} className="card space-y-3">
          <p className="font-semibold">Grant a role</p>
          <select name="userId" required className="input">
            {employees.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.email} ({u.email})</option>)}
          </select>
          <select name="grant" className="input">{GRANTS.map((g) => <option key={g} value={g}>{human(g)}</option>)}</select>
          <div className="grid grid-cols-2 gap-2">
            <select name="orgId" className="input" defaultValue="">
              <option value="">(Support access: choose org)</option>
              {clientOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <input name="hours" type="number" min={1} max={72} defaultValue={4} className="input" title="Support access duration (hours)" />
          </div>
          <input name="reason" maxLength={300} placeholder="Reason / ticket reference (required for support access)" className="input" />
          <button className="btn">Grant</button>
        </form>
      </div>

      <h2 className="mt-8 mb-2 font-semibold">Employees & grants</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs text-muted uppercase"><tr><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Grants</th></tr></thead>
          <tbody>
            {employees.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-3 py-2">{u.name}<div className="text-xs text-muted">{u.email}{u.emailVerified ? "" : " · not yet verified"}</div></td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {u.grants.length === 0 && <span className="text-xs text-muted">None (ordinary employee)</span>}
                    {u.grants.map((g) => (
                      <form key={g.id} action={revokeGrantAction.bind(null, g.id)} className="inline-flex items-center gap-1">
                        <Badge tone={g.expiresAt && g.expiresAt < now ? "gray" : "violet"}>
                          {human(g.grant)}{g.orgId ? ` · ${orgs.find((o) => o.id === g.orgId)?.name}` : ""}{g.expiresAt ? ` · until ${fmtDate(g.expiresAt)}` : ""}
                        </Badge>
                        <button className="text-xs text-red-700" title="Revoke">✕</button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
