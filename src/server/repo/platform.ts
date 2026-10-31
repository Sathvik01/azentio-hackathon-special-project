import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma, type Tx } from "@/server/db";
import type { UserActor } from "@/server/policy/actor";

/** Every privileged or state-changing action writes one of these in the same transaction. */
export function audit(
  tx: Tx,
  actorId: string | null,
  action: string,
  resourceType: string,
  resourceId: string,
  data?: Prisma.InputJsonValue,
) {
  return tx.auditEvent.create({ data: { actorId, action, resourceType, resourceId, data } });
}

/** In-app notification (required, P0) + a queued outbox row for future email (P1). Nothing here claims delivery. */
export async function notify(
  tx: Tx,
  userId: string,
  title: string,
  body: string,
  link: string | undefined,
  idempotencyKey: string,
) {
  await tx.notification.create({ data: { userId, title, body, link } });
  const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) {
    await tx.outbox.upsert({
      where: { idempotencyKey },
      update: {},
      create: { idempotencyKey, channel: "email", recipient: user.email, subject: title },
    });
  }
}

export function listNotifications(actor: UserActor) {
  return prisma.notification.findMany({ where: { userId: actor.userId }, orderBy: { createdAt: "desc" }, take: 50 });
}

export function unreadCount(actor: UserActor) {
  return prisma.notification.count({ where: { userId: actor.userId, readAt: null } });
}

export function markAllRead(actor: UserActor) {
  return prisma.notification.updateMany({ where: { userId: actor.userId, readAt: null }, data: { readAt: new Date() } });
}
