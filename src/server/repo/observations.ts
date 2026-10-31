import "server-only";
import { prisma } from "@/server/db";
import type { Actor, UserActor } from "@/server/policy/actor";
import { canCreateObservation, canEditObservation, canReadObservation, isAuthor, isClientMember } from "@/server/policy";
import { nextStatus } from "@/server/learning/stateMachine";
import { scanText } from "@/server/learning/scan";
import type { ObservationInput } from "@/lib/schemas";
import { deny, InvalidRequest } from "@/server/errors";
import { audit, notify } from "./platform";
import { toSharedDTO } from "@/server/dto";
import { offeringNameLookup } from "./catalog";

function fields(input: ObservationInput) {
  return {
    type: input.type,
    title: input.title,
    body: input.body,
    offeringId: input.offeringId,
    industry: input.industry,
    region: input.region,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    evidenceType: input.evidenceType,
    confidence: input.confidence,
    link: input.link || null,
    visibility: input.visibility,
    sharingProposal: input.sharingProposal,
    sensitiveFlags: scanText(input.title, input.body, input.link).map((f) => f.id),
  };
}

function consentRow(input: ObservationInput, recordedById: string) {
  return {
    store: true,
    publishShared: input.consentPublish,
    attribution: input.consentAttribution,
    training: input.consentTraining,
    recordedById,
  };
}

export async function listMyObservations(actor: Actor) {
  if (!isClientMember(actor)) deny();
  return prisma.observation.findMany({
    where: { authorId: actor.userId, orgId: actor.active!.orgId, status: { not: "SUPERSEDED" } },
    orderBy: { updatedAt: "desc" },
  });
}

/** "Our organisation's observations": items colleagues chose to make visible in-org. Never cross-tenant. */
export async function listOrgObservations(actor: Actor) {
  if (!isClientMember(actor)) deny();
  const rows = await prisma.observation.findMany({
    where: { orgId: actor.active!.orgId, visibility: "ORG", authorId: { not: actor.userId }, status: { not: "SUPERSEDED" } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.filter((o) => canReadObservation(actor, o));
}

export async function getObservation(actor: Actor, id: string) {
  const o = await prisma.observation.findUnique({
    where: { id },
    include: { consents: { orderBy: { recordedAt: "desc" } }, decisions: { orderBy: { createdAt: "desc" } } },
  });
  if (!o || !canReadObservation(actor, o)) deny();

  const links = await prisma.sharedSourceLink.findMany({ where: { observationId: o.id }, include: { shared: true } });
  const name = await offeringNameLookup();
  const author = isAuthor(actor, o);
  return {
    observation: o,
    isAuthor: author,
    canEdit: canEditObservation(actor, o),
    consent: o.consents[0] ?? null,
    consentHistory: author ? o.consents : [],
    // Authors see decisions and public reasons; internal reviewer notes are stripped.
    decisions: o.decisions.map((d) => ({ action: d.action, reason: d.reason, createdAt: d.createdAt })),
    sharedCopies: links.map((l) => ({ status: l.shared.status, dto: toSharedDTO(l.shared, name) })),
  };
}

export async function createObservation(actor: Actor, input: ObservationInput) {
  if (!canCreateObservation(actor)) deny();
  const a = actor as Extract<Actor, { kind: "user" }>;
  return prisma.$transaction(async (tx) => {
    // Saving always produces a private/org draft. Sharing needs an explicit submit + moderation.
    const o = await tx.observation.create({
      data: { ...fields(input), authorId: a.userId, orgId: a.active!.orgId, status: "DRAFT", consents: { create: consentRow(input, a.userId) } },
    });
    await audit(tx, a.userId, "observation.create", "Observation", o.id, { visibility: o.visibility });
    return o;
  });
}

export async function updateObservation(actor: Actor, id: string, input: ObservationInput) {
  return prisma.$transaction(async (tx) => {
    const o = await tx.observation.findUnique({ where: { id } });
    if (!o || !canEditObservation(actor, o)) deny();
    const a = actor as Extract<Actor, { kind: "user" }>;
    const updated = await tx.observation.update({ where: { id }, data: fields(input) });
    await tx.consent.create({ data: { ...consentRow(input, a.userId), observationId: id } });
    await audit(tx, a.userId, "observation.update", "Observation", id, { status: o.status });
    return updated;
  });
}

export async function submitObservation(actor: Actor, id: string) {
  return prisma.$transaction(async (tx) => {
    const o = await tx.observation.findUnique({ where: { id }, include: { consents: { orderBy: { recordedAt: "desc" }, take: 1 } } });
    if (!o || !isAuthor(actor, o)) deny();
    const a = actor as UserActor;
    if (o.sharingProposal !== "COMMUNITY" || !o.consents[0]?.publishShared) {
      throw new InvalidRequest("Only contributions proposed for community sharing, with publishing permission, can be submitted for review.");
    }
    const to = nextStatus(o.status, "submit", "author");
    await tx.observation.update({ where: { id }, data: { status: to, submittedAt: new Date(), returnReason: null } });
    await audit(tx, a.userId, "observation.submit", "Observation", id, { from: o.status, to });
    await notify(tx, a.userId, "Contribution submitted", `"${o.title}" is waiting for moderator review.`, `/portal/client/observations/${id}`, `obs:${id}:submit:${Date.now()}`);
  });
}

/** Withdrawal takes the shared copy out of feed, search, counts, themes and AIRA in the same transaction. */
export async function withdrawObservation(actor: Actor, id: string) {
  return prisma.$transaction(async (tx) => {
    const o = await tx.observation.findUnique({ where: { id } });
    if (!o || !isAuthor(actor, o)) deny();
    const a = actor as UserActor;
    const to = nextStatus(o.status, "withdraw", "author");
    await tx.observation.update({ where: { id }, data: { status: to } });
    const links = await tx.sharedSourceLink.findMany({ where: { observationId: id } });
    await tx.sharedObservation.updateMany({
      where: { id: { in: links.map((l) => l.sharedId) }, status: { in: ["PUBLISHED", "SUSPENDED"] } },
      data: { status: "WITHDRAWN" },
    });
    await audit(tx, a.userId, "observation.withdraw", "Observation", id, { from: o.status, sharedIds: links.map((l) => l.sharedId) });
    await notify(tx, a.userId, "Contribution withdrawn", `"${o.title}" was withdrawn and removed from shared search and AIRA.`, `/portal/client/observations/${id}`, `obs:${id}:withdraw`);
  });
}

/** A material edit of a published contribution starts a new version that needs fresh review. */
export async function reviseObservation(actor: Actor, id: string) {
  return prisma.$transaction(async (tx) => {
    const o = await tx.observation.findUnique({ where: { id }, include: { consents: { orderBy: { recordedAt: "desc" }, take: 1 } } });
    if (!o || !isAuthor(actor, o) || o.status !== "PUBLISHED") deny();
    const a = actor as UserActor;
    const pending = await tx.observation.findFirst({ where: { previousId: id, status: { notIn: ["WITHDRAWN", "REJECTED"] } } });
    if (pending) return pending;
    const { id: _id, createdAt: _c, updatedAt: _u, submittedAt: _s, returnReason: _r, status: _st, version, consents, ...rest } = o;
    const c = consents[0];
    const draft = await tx.observation.create({
      data: {
        ...rest,
        version: version + 1,
        previousId: id,
        status: "DRAFT",
        consents: c
          ? { create: { store: c.store, publishShared: c.publishShared, attribution: c.attribution, training: c.training, recordedById: a.userId } }
          : undefined,
      },
    });
    await audit(tx, a.userId, "observation.revise", "Observation", draft.id, { previousId: id });
    return draft;
  });
}
