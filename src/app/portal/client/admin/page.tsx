import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { isClientAdmin } from "@/server/policy";
import { getOrgAdminView } from "@/server/repo/orgs";
import { inviteAction, revokeInvitationAction, revokeMemberAction, setMemberRoleAction } from "@/server/actions/portal";
import { Badge, Flash, PageHeader, fmtDate, type SP } from "@/components/ui";

export const metadata = { title: "Organisation admin" };

export default async function OrgAdminPage({ searchParams }: { searchParams: SP }) {
  const [actor, sp] = await Promise.all([getActor(), searchParams]);
  if (!isClientAdmin(actor)) notFound();
  const v = await getOrgAdminView(actor);
  const me = actor.kind === "user" ? actor.userId : "";

  return (
    <>
      <PageHeader title={`Administer ${v.org?.name}`} subtitle="Invite and manage members of your organisation. You can assign Member or Client administrator only." />
      <Flash searchParams={sp} />

      <form action={inviteAction} className="card mb-8 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label className="label" htmlFor="email">Invite by email</label>
          <input id="email" name="email" type="email" required className="input" placeholder="colleague@yourbank.example" />
        </div>
        <div>
          <label className="label" htmlFor="role">Role</label>
          <select id="role" name="role" className="input">
            <option value="MEMBER">Member</option>
            <option value="CLIENT_ADMIN">Client administrator</option>
          </select>
        </div>
        <button className="btn">Send invitation</button>
        <p className="w-full text-xs text-muted">Single-use link, expires in 7 days, accepted only by the invited verified email.</p>
      </form>

      <h2 className="mb-2 font-semibold">Members</h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs text-muted uppercase">
            <tr><th className="px-4 py-2">Member</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">State</th><th className="px-4 py-2" /></tr>
          </thead>
          <tbody>
            {v.members.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="px-4 py-2">{m.user.name ?? m.user.email}<div className="text-xs text-muted">{m.user.email}</div></td>
                <td className="px-4 py-2">
                  {m.userId === me ? (
                    <Badge>{m.role === "CLIENT_ADMIN" ? "Client administrator" : "Member"} (you)</Badge>
                  ) : (
                    <form action={setMemberRoleAction.bind(null, m.id)} className="flex gap-2">
                      <select name="role" defaultValue={m.role} className="input py-1">
                        <option value="MEMBER">Member</option>
                        <option value="CLIENT_ADMIN">Client administrator</option>
                      </select>
                      <button className="btn-secondary py-1">Save</button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-2"><Badge tone={m.status === "ACTIVE" ? "teal" : "red"}>{m.status === "ACTIVE" ? "Active" : "Revoked"}</Badge></td>
                <td className="px-4 py-2 text-right">
                  {m.userId !== me && m.status === "ACTIVE" && (
                    <form action={revokeMemberAction.bind(null, m.id)}><button className="text-xs text-red-700 hover:underline">Revoke</button></form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 font-semibold">Invitations</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs text-muted uppercase">
            <tr><th className="px-4 py-2">Email</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">State</th><th className="px-4 py-2">Expires</th><th /></tr>
          </thead>
          <tbody>
            {v.invitations.map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="px-4 py-2">{i.email}</td>
                <td className="px-4 py-2">{i.role === "CLIENT_ADMIN" ? "Client administrator" : "Member"}</td>
                <td className="px-4 py-2"><Badge tone={i.state === "Pending" ? "amber" : i.state === "Accepted" ? "teal" : "gray"}>{i.state}</Badge></td>
                <td className="px-4 py-2">{fmtDate(i.expiresAt)}</td>
                <td className="px-4 py-2 text-right">
                  {i.state === "Pending" && (
                    <form action={revokeInvitationAction.bind(null, i.id)}><button className="text-xs text-red-700 hover:underline">Revoke</button></form>
                  )}
                </td>
              </tr>
            ))}
            {v.invitations.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No invitations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
