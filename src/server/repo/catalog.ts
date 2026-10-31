import "server-only";
import type { Audience, ContentKind, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { Actor, UserActor } from "@/server/policy/actor";
import { canPublishContent, canReadContent, canUseOffering, isClientMember, isEmployee } from "@/server/policy";
import { toContentDTO, toOfferingDTO } from "@/server/dto";
import { deny } from "@/server/errors";
import { audit } from "./platform";

// ───────── Offerings ─────────

export async function listOfferings() {
  return (await prisma.offering.findMany({ orderBy: { name: "asc" } })).map(toOfferingDTO);
}

export async function getOfferingBySlug(slug: string) {
  const o = await prisma.offering.findUnique({ where: { slug } });
  return o ? toOfferingDTO(o) : null;
}

/** Employee-only prototype notes; empty for everyone else. */
export async function getInternalNotes(actor: Actor, slug: string) {
  if (!isEmployee(actor)) return null;
  return (await prisma.offering.findUnique({ where: { slug } }))?.internalNotes ?? null;
}

export async function offeringNameLookup() {
  const all = await prisma.offering.findMany({ select: { id: true, name: true } });
  const map = new Map(all.map((o) => [o.id, o.name]));
  return (id: string) => map.get(id) ?? "Unknown offering";
}

export async function listUsableOfferings(actor: Actor) {
  if (!isEmployee(actor) && !isClientMember(actor)) return [];
  const all = await prisma.offering.findMany({ orderBy: { name: "asc" } });
  return all.filter((o) => canUseOffering(actor, o.id)).map(toOfferingDTO);
}

// ───────── Content ─────────

/** SQL pre-filter mirroring canReadContent; results are re-checked with the policy (defence in depth). */
function contentWhere(actor: Actor): Prisma.ContentItemWhereInput {
  const or: Prisma.ContentItemWhereInput[] = [{ audience: "PUBLIC" }];
  const u = actor as UserActor;
  if (isEmployee(actor)) {
    or.push({ audience: "EMPLOYEE" }, { audience: "CLIENTS" });
    if (u.supportOrgIds.length) or.push({ audience: "CLIENT_ORG", orgId: { in: u.supportOrgIds } });
  } else if (isClientMember(u)) {
    const entitled = { OR: [{ offeringId: null }, { offeringId: { in: u.entitledOfferingIds } }] };
    or.push({ audience: "CLIENTS", ...entitled }, { audience: "CLIENT_ORG", orgId: u.active!.orgId, ...entitled });
  }
  return canPublishContent(actor) ? { OR: or } : { OR: or, published: true };
}

export async function listContent(actor: Actor, kinds?: ContentKind[], audience?: Audience) {
  const items = await prisma.contentItem.findMany({
    where: { AND: [contentWhere(actor), kinds ? { kind: { in: kinds } } : {}, audience ? { audience } : {}] },
    include: { media: { select: { id: true } } },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
  });
  return items.filter((c) => canReadContent(actor, c)).map(toContentDTO);
}

export async function getContent(actor: Actor, id: string) {
  const c = await prisma.contentItem.findUnique({ where: { id }, include: { media: { select: { id: true } } } });
  if (!c || !canReadContent(actor, c)) deny();
  return toContentDTO(c);
}

/** Media inherits its parent content's audience; checked on every request including direct URLs. */
export async function getMediaForActor(actor: Actor, mediaId: string) {
  const m = await prisma.mediaAsset.findUnique({ where: { id: mediaId }, include: { content: true } });
  if (!m || !canReadContent(actor, m.content)) deny();
  return { fileName: m.fileName, mimeType: m.mimeType, path: m.path };
}

export async function listAllContentForPublisher(actor: Actor) {
  if (!canPublishContent(actor)) deny();
  return prisma.contentItem.findMany({
    where: { audience: { in: ["PUBLIC", "EMPLOYEE", "CLIENTS"] } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveContent(
  actor: Actor,
  input: {
    id?: string;
    kind: ContentKind;
    title: string;
    summary: string;
    body: string;
    audience: Audience;
    published: boolean;
    startsAt?: Date | null;
  },
) {
  if (!canPublishContent(actor)) deny();
  // Publishers manage public, employee and all-client audiences; org-specific content needs admin context.
  if (input.audience === "CLIENT_ORG") deny();
  const { id, ...data } = input;
  return prisma.$transaction(async (tx) => {
    const before = id ? await tx.contentItem.findUnique({ where: { id } }) : null;
    if (id && (!before || before.audience === "CLIENT_ORG")) deny();
    const saved = id
      ? await tx.contentItem.update({ where: { id }, data })
      : await tx.contentItem.create({ data: { ...data, ownerName: actor.kind === "user" ? actor.name : null } });
    await audit(tx, actor.kind === "user" ? actor.userId : null, id ? "content.update" : "content.create", "ContentItem", saved.id, {
      audienceBefore: before?.audience ?? null,
      audienceAfter: saved.audience,
      published: saved.published,
    });
    return saved;
  });
}

// ───────── Public forms ─────────

export function createDemoRequest(data: { name: string; company: string; email: string; offeringSlug?: string; message: string }) {
  return prisma.demoRequest.create({ data });
}

export function createEventRegistration(data: { name: string; email: string; team?: string; eventSlug: string }) {
  return prisma.eventRegistration.create({ data });
}
