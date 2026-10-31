import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { switchWorkspaceAction } from "@/server/actions/portal";
import { signOutAction } from "@/server/actions/public";
import { AuthShell } from "@/components/AuthShell";
import { Badge } from "@/components/ui";

export const metadata = { title: "Choose workspace" };

export default async function WorkspacePage() {
  const actor = await getActor();
  if (actor.kind !== "user") redirect("/signin");
  return (
    <AuthShell eyebrow={actor.email} title="Choose a workspace">
      <p className="text-sm text-muted">Data never crosses between workspaces. Your choice is re-validated against your memberships on every request.</p>
      {actor.memberships.length === 0 ? (
        <p className="mt-6 border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Your identity is verified but you don&apos;t have an approved membership yet. Ask your organisation administrator for an invitation.
        </p>
      ) : (
        <div className="mt-6 border-t-2 border-ink">
          {actor.memberships.map((m, i) => (
            <form key={m.orgId} action={switchWorkspaceAction}>
              <input type="hidden" name="orgId" value={m.orgId} />
              <button className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-line px-1 py-3 text-left hover:bg-signal-soft">
                <span className="data text-sm text-brand">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-medium">{m.orgName}</span>
                <span className="flex gap-1">
                  <Badge tone={m.orgType === "AZENTIO" ? "violet" : "teal"}>{m.orgType === "AZENTIO" ? "Employee" : "Client"}</Badge>
                  {actor.active?.orgId === m.orgId && <Badge tone="blue">Active</Badge>}
                </span>
              </button>
            </form>
          ))}
        </div>
      )}
      <form action={signOutAction} className="mt-6">
        <button className="font-mono text-xs text-muted uppercase hover:text-ink">Sign out</button>
      </form>
    </AuthShell>
  );
}
