import "server-only";
import { z } from "zod";
import { prisma, type Tx } from "@/server/db";
import type { Actor, UserActor } from "@/server/policy/actor";
import { canModerate, canReadObservation } from "@/server/policy";
import { nextStatus, type ObsAction } from "@/server/learning/stateMachine";
import { scanText } from "@/server/learning/scan";
import { coarsenRegion, periodLabel } from "@/server/learning/coarsen";
import { publishInput } from "@/lib/schemas";
import { deny, InvalidRequest } from "@/server/errors";
import { audit, notify } from "./platform";

function requireModerator(actor: Actor): UserActor {
  if (!canModerate(actor)) deny();
  return actor as UserActor;
}

/** Queue holds only items an author explicitly proposed for community sharing. Drafts never appear. */
export async function listQueue(actor: Actor) {
  requireModerator(actor);
  const rows = await prisma.observation.findMany({
    where: { sharingProposal: "COMMUNITY", status: { in: ["SUBMITTED", "IN_REVIEW", "RETURNED"] } },
    orderBy: { submittedAt: "asc" },
  });
  return rows.filter((o) => canReadObservation(actor, o));
}

export async function listReports(actor: Actor) {
  requireModerator(actor);
  return prisma.report.findMany({ where: { status: "OPEN" }, include: { shared: true }, orderBy: { createdAt: "asc" } });
}

export async function listRecentlyPublished(actor: Actor) {
  requireModerator(actor);
  return prisma.sharedObservation.findMany({ where: { status: { in: ["PUBLISHED", "SUSPENDED"] } }, orderBy: { publishedAt: "desc" }, take: 30 });
}

export async function getForReview(actor: Actor, id: string) {
  requireModerator(actor);
  const o = await prisma.observation.findUnique({
    where: { id },
    include: { consents: { orderBy: { recordedAt: "desc" } }, decisions: { orderBy: { createdAt: "desc" } } },
  });
  if (!o || !canReadObservation(actor, o)) deny();
  const org = await prisma.organization.findUnique({ where: { id: o.orgId }, select: { name: true } });
  const consent = o.consents[0] ?? null;
  return {
    observation: o,
    consent,
    decisions: o.decisions,
    // The moderator sees the source org to judge identifiability; it only reaches the shared copy if the author opted in.
    sourceOrgName: org?.name ?? "",
    suggested: {
      title: o.title,
      body: o.body,
      regionCoarse: coarsenRegion(o.region),
      periodLabel: periodLabel(o.periodStart, o.periodEnd),
    },
    flags: o.sensitiveFlags,
  };
}

async function transition(tx: Tx, actor: UserActor, id: string, action: ObsAction, reason: string | null, data: Record<string, unknown> = {}) {
  const o = await tx.observation.findUnique({ where: { id } });
  if (!o || !canReadObservation(actor, o)) deny();
  const to = nextStatus(o.status, action, "moderator");
  await tx.observation.update({ where: { id }, data: { status: to, ...data } });
  await tx.moderationDecision.create({ data: { observationId: id, moderatorId: actor.userId, action, reason } });
  await audit(tx, actor.userId, `moderation.${action}`, "Observation", id, { from: o.status, to });
  return o;
}

const AUTHOR_LINK = (id: string) => `/portal/client/observations/${id}`;

export async function claim(actor: Actor, id: string) {
  const m = requireModerator(actor);
  await prisma.$transaction((tx) => transition(tx, m, id, "claim", null));
}

export async function returnForClarification(actor: Actor, id: string, reason: string) {
  const m = requireModerator(actor);
  await prisma.$transaction(async (tx) => {
    const o = await transition(tx, m, id, "return", reason, { returnReason: reason });
    await notify(tx, o.authorId, "Clarification requested", `A moderator asked for clarification on "${o.title}": ${reason}`, AUTHOR_LINK(id), `obs:${id}:return:${Date.now()}`);
  });
}

export async function reject(actor: Actor, id: string, reason: string) {
  const m = requireModerator(actor);
  await prisma.$transaction(async (tx) => {
    const o = await transition(tx, m, id, "reject", reason);
    await notify(tx, o.authorId, "Contribution not published", `"${o.title}" was not published: ${reason}`, AUTHOR_LINK(id), `obs:${id}:reject`);
  });
}

async function nextPublicRef(tx: Tx) {
  const n = await tx.sharedObservation.count();
  return `LRN-${String(n + 1).padStart(4, "0")}`;
}

/** Publishes a separate, reviewed representation. Only the reviewed fields are copied — no source metadata. */
export async function publish(actor: Actor, id: string, raw: z.input<typeof publishInput>) {
  const m = requireModerator(actor);
  const input = publishInput.parse(raw);
  const residual = scanText(input.title, input.body);
  if (residual.length && !input.acknowledgeFlags) {
    throw new InvalidRequest(`The shared copy still triggers: ${residual.map((f) => f.label).join(", ")}. Redact or acknowledge.`);
  }

  return prisma.$transaction(async (tx) => {
    const src = await tx.observation.findUnique({ where: { id }, include: { consents: { orderBy: { recordedAt: "desc" }, take: 1 } } });
    if (!src) deny();
    const consent = src.consents[0];
    if (!consent?.publishShared) throw new InvalidRequest("Author has not given permission to publish a shared copy.");
    if (input.includeAttribution && !consent.attribution) throw new InvalidRequest("Author has not opted in to organisation attribution.");

    const o = await transition(tx, m, id, "publish", "Approved for community sharing");
    const org = input.includeAttribution ? await tx.organization.findUnique({ where: { id: o.orgId } }) : null;

    const shared = await tx.sharedObservation.create({
      data: {
        publicRef: await nextPublicRef(tx),
        version: o.version,
        type: o.type,
        title: input.title,
        body: input.body,
        offeringId: o.offeringId,
        industry: o.industry,
        regionCoarse: input.regionCoarse,
        periodLabel: input.periodLabel,
        attributionOrgName: org?.name ?? null,
        source: { create: { observationId: o.id, orgId: o.orgId } },
      },
    });

    await tx.moderationDecision.create({
      data: {
        observationId: id,
        sharedId: shared.id,
        moderatorId: m.userId,
        action: "publish.copy",
        reviewerNote: input.reviewerNote || null,
        redactions: { titleChanged: input.title !== o.title, bodyChanged: input.body !== o.body, region: input.regionCoarse, period: input.periodLabel },
      },
    });

    // A new version replaces the previous shared copy; theme evidence carries forward to the reviewed version.
    if (o.previousId) {
      const prevLinks = await tx.sharedSourceLink.findMany({ where: { observationId: o.previousId } });
      const prevIds = prevLinks.map((l) => l.sharedId);
      await tx.sharedObservation.updateMany({ where: { id: { in: prevIds }, status: { in: ["PUBLISHED", "SUSPENDED"] } }, data: { status: "SUPERSEDED" } });
      await tx.observation.update({ where: { id: o.previousId }, data: { status: "SUPERSEDED" } });
      const themeLinks = await tx.themeEvidence.findMany({ where: { sharedId: { in: prevIds } } });
      for (const t of themeLinks) {
        await tx.themeEvidence.upsert({ where: { themeId_sharedId: { themeId: t.themeId, sharedId: shared.id } }, update: {}, create: { themeId: t.themeId, sharedId: shared.id } });
      }
    }

    await audit(tx, m.userId, "shared.publish", "SharedObservation", shared.id, { observationId: id, ref: shared.publicRef, attribution: !!org });
    await notify(tx, o.authorId, "Contribution published", `A reviewed copy of "${o.title}" is now visible to the learning community as ${shared.publicRef}.`, AUTHOR_LINK(id), `obs:${id}:publish:${shared.id}`);
    return shared;
  });
}

async function sharedTransition(actor: Actor, ref: string, action: "suspend" | "reinstate" | "remove", reason: string) {
  const m = requireModerator(actor);
  await prisma.$transaction(async (tx) => {
    const s = await tx.sharedObservation.findUnique({ where: { publicRef: ref }, include: { source: true } });
    if (!s?.source) deny();
    const o = await transition(tx, m, s.source.observationId, action, reason);
    const status = action === "suspend" ? "SUSPENDED" : action === "reinstate" ? "PUBLISHED" : "WITHDRAWN";
    await tx.sharedObservation.update({ where: { id: s.id }, data: { status } });
    if (action !== "suspend") {
      await tx.report.updateMany({ where: { sharedId: s.id, status: "OPEN" }, data: { status: "RESOLVED", resolution: `${action}: ${reason}` } });
    }
    const verb = { suspend: "temporarily unpublished while a report is reviewed", reinstate: "reinstated after review", remove: "removed after review" }[action];
    await notify(tx, o.authorId, `Shared contribution ${verb.split(" ")[0]}`, `${s.publicRef} ("${s.title}") was ${verb}. Reason: ${reason}`, AUTHOR_LINK(o.id), `shared:${s.id}:${action}:${Date.now()}`);
  });
}

export const suspendShared = (a: Actor, ref: string, reason: string) => sharedTransition(a, ref, "suspend", reason);
export const reinstateShared = (a: Actor, ref: string, reason: string) => sharedTransition(a, ref, "reinstate", reason);
export const removeShared = (a: Actor, ref: string, reason: string) => sharedTransition(a, ref, "remove", reason);

export async function dismissReport(actor: Actor, reportId: string, resolution: string) {
  const m = requireModerator(actor);
  await prisma.$transaction(async (tx) => {
    const r = await tx.report.update({ where: { id: reportId }, data: { status: "RESOLVED", resolution } });
    await audit(tx, m.userId, "report.dismiss", "Report", r.id, { resolution });
    await notify(tx, r.reporterId, "Report reviewed", `Thank you — a moderator reviewed your report and recorded: ${resolution}`, undefined, `report:${r.id}:resolved`);
  });
}
