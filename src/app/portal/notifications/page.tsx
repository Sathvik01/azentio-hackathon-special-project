import Link from "next/link";
import { requireUser } from "@/server/auth/actor";
import { listNotifications, markAllRead } from "@/server/repo/platform";
import { Empty, PageHeader, fmtDate } from "@/components/ui";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const actor = await requireUser();
  const items = await listNotifications(actor);
  // Viewing the page marks items read; in-app status is the P0 channel (email is queued, never claimed delivered).
  await markAllRead(actor);
  return (
    <>
      <PageHeader title="Notifications" subtitle="In-app status updates. Email copies are queued in an outbox for a future provider; nothing here means an email was delivered." />
      {items.length === 0 ? (
        <Empty title="No notifications" />
      ) : (
        <div className="rounded-xl border border-line bg-white">
          {items.map((n) => (
            <div key={n.id} className={`border-b border-line px-4 py-3 last:border-0 ${n.readAt ? "" : "bg-amber-50/50"}`}>
              <div className="flex justify-between gap-2">
                <p className="font-medium">{n.title}</p>
                <span className="text-xs text-muted">{fmtDate(n.createdAt)}</span>
              </div>
              <p className="text-sm text-muted">{n.body}</p>
              {n.link && <Link href={n.link} className="link text-xs">Open</Link>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
