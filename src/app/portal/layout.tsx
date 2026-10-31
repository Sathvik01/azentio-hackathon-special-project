import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { canAdminPortal, canManageIdeas, canModerate, canPublishContent, isClientAdmin, isClientMember, isEmployee } from "@/server/policy";
import { unreadCount } from "@/server/repo/platform";
import { signOutAction } from "@/server/actions/public";
import { Logo } from "@/components/Logo";

type NavGroup = { label: string; items: [string, string][] };

/** Navigation is derived from the server-side policy for convenience only; every page and action re-checks. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (actor.kind !== "user") redirect("/signin?callbackUrl=/portal");
  if (!actor.active) redirect("/workspace");

  const groups: NavGroup[] = [];
  if (isEmployee(actor)) {
    groups.push({
      label: "Employee",
      items: [["/portal/employee", "Dashboard"], ["/portal/employee/playground", "Playground"], ["/portal/employee/live", "Live & recordings"], ["/portal/employee/knowledge", "Knowledge & experiments"]],
    });
  }
  if (isClientMember(actor)) {
    groups.push({
      label: "Workspace",
      items: [["/portal/client", "Dashboard"], ["/portal/client/sandbox", "Sandboxes"], ["/portal/client/observations", "Observations"], ["/portal/client/updates", "Improvement updates"]],
    });
  }
  const learning: [string, string][] = [["/portal/learning", "Shared feed"], ["/portal/learning/themes", "Themes"], ["/portal/aira", "Ask AIRA"]];
  groups.push({ label: "Collective learning", items: learning });

  const governance: [string, string][] = [];
  if (canModerate(actor)) governance.push(["/portal/moderation", "Moderation"]);
  if (canManageIdeas(actor)) governance.push(["/portal/ideas", "Improvement ideas"]);
  else if (isEmployee(actor)) governance.push(["/portal/ideas", "Assigned ideas"]);
  if (canPublishContent(actor)) governance.push(["/portal/publish", "Publishing"]);
  if (isClientAdmin(actor)) governance.push(["/portal/client/admin", "Organisation admin"]);
  if (canAdminPortal(actor)) governance.push(["/portal/admin", "Portal admin"], ["/portal/admin/audit", "Audit log"]);
  if (governance.length) groups.push({ label: isEmployee(actor) ? "Operations" : "Administration", items: governance });

  const unread = await unreadCount(actor);
  const employee = actor.active.orgType === "AZENTIO";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full shrink-0 border-signal bg-ink text-white md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto md:border-r-2">
        <div className="border-b border-white/10 px-5 py-4">
          <Logo />
        </div>
        <div className="border-b border-white/10 px-5 py-4">
          <p className="font-mono text-xs tracking-wider text-white/50 uppercase">Active workspace</p>
          <p className="mt-1 font-semibold">{actor.active.orgName}</p>
          <p className="mt-0.5 font-mono text-xs text-signal-light uppercase">
            {employee ? "Employee" : `Client · ${actor.active.role === "CLIENT_ADMIN" ? "Admin" : "Member"}`}
          </p>
          {actor.memberships.length > 1 && (
            <Link href="/workspace" className="mt-2 inline-block font-mono text-xs text-white/70 underline underline-offset-4 hover:text-signal-light">
              Switch workspace
            </Link>
          )}
        </div>
        <nav className="flex flex-wrap gap-x-6 px-3 py-3 md:block">
          {groups.map((g) => (
            <div key={g.label} className="mb-3">
              <p className="px-2 py-1 font-mono text-xs tracking-wider text-white/40 uppercase">{g.label}</p>
              {g.items.map(([href, label]) => (
                <Link key={href} href={href} className="block border-l-2 border-transparent px-2 py-1.5 text-sm text-white/80 hover:border-signal hover:bg-white/5 hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-b border-line bg-white px-6 py-2.5 font-mono text-xs">
          <Link href="/portal/notifications" className="flex items-center gap-2 text-ink hover:text-brand">
            NOTIFICATIONS
            {unread > 0 && <span className="bg-signal px-1.5 py-px font-semibold text-white">{unread}</span>}
          </Link>
          <span className="text-muted">{actor.email}</span>
          <form action={signOutAction}>
            <button className="text-muted hover:text-ink">SIGN OUT</button>
          </form>
        </header>
        <main className="w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
