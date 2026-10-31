import "server-only";
import type { IdeaStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";
import type { Actor, UserActor } from "@/server/policy/actor";
import { canAccessCommunity, canEditIdea, canManageIdeas, canReadIdeaInternal, canReadIdeaStatus, isEmployee } from "@/server/policy";
import { safeCount } from "@/server/learning/aggregate";
import { toIdeaStatusDTO, toSharedDTO, toThemeDTO, IDEA_STATUS_LABEL } from "@/server/dto";
import { ideaInput, ideaStatusInput, themeInput } from "@/lib/schemas";
import { deny, InvalidRequest } from "@/server/errors";
import { audit, notify } from "./platform";
import { offeringNameLookup } from "./catalog";
import { distinctOrgCount } from "./shared";

// ───────── Themes ─────────

async function themeDTO(themeId: string) {
  const t = await prisma.theme.findUnique({
    where: { id: themeId },
    include: { evidence: { include: { shared: true } } },
  });
  if (!t) return null;
  // Withdrawn, suspended or superseded evidence drops out of themes immediately.
  const live = t.evidence.map((e) => e.shared).filter((s) => s.status === "PUBLISHED");
  const name = await offeringNameLookup();
  return { dto: toThemeDTO(t, live, safeCount(await distinctOrgCount(live.map((s) => s.id))), name), live, name };
}

export async function listThemes(actor: Actor) {
  if (!canAccessCommunity(actor)) deny();
  const themes = await prisma.theme.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true } });
  const out = [];
  for (const t of themes) {
    const r = await themeDTO(t.id);
    if (r) out.push(r.dto);
  }
  return out;
}

export async function getTheme(actor: Actor, id: string) {
  if (!canAccessCommunity(actor)) deny();
  const r = await themeDTO(id);
  if (!r) deny();
  const ideas = await prisma.improvementIdea.findMany({ where: { themeId: id }, include: { theme: true } });
  return {
    theme: r.dto,
    evidence: r.live.map((s) => toSharedDTO(s, r.name)),
    ideas: ideas.filter((i) => canReadIdeaStatus(actor, i)).map((i) => toIdeaStatusDTO(i, r.name)),
  };
}

async function publishedIdsForRefs(refs: string[]) {
  const rows = await prisma.sharedObservation.findMany({ where: { publicRef: { in: refs }, status: "PUBLISHED" }, select: { id: true } });
  if (rows.length !== refs.length) throw new InvalidRequest("Evidence must be currently published shared contributions.");
  return rows.map((r) => r.id);
}

export async function createTheme(actor: Actor, raw: z.input<typeof themeInput>) {
  if (!canManageIdeas(actor)) deny();
  const a = actor as UserActor;
  const input = themeInput.parse(raw);
  const ids = await publishedIdsForRefs(input.refs);
  return prisma.$transaction(async (tx) => {
    const t = await tx.theme.create({
      data: {
        title: input.title,
        summary: input.summary,
        limitations: input.limitations,
        offeringId: input.offeringId || null,
        createdById: a.userId,
        evidence: { create: ids.map((sharedId) => ({ sharedId })) },
      },
    });
    await audit(tx, a.userId, "theme.create", "Theme", t.id, { evidence: input.refs });
    return t;
  });
}

// ───────── Improvement ideas ─────────

export async function listIdeasInternal(actor: Actor) {
  if (!isEmployee(actor)) deny();
  const rows = await prisma.improvementIdea.findMany({
    where: canManageIdeas(actor) ? {} : { ownerId: actor.userId },
    include: { theme: true, evidence: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.filter((i) => canReadIdeaInternal(actor, i));
}

export async function getIdeaInternal(actor: Actor, id: string) {
  const i = await prisma.improvementIdea.findUnique({
    where: { id },
    include: { theme: true, evidence: { include: { shared: true } }, changes: { orderBy: { at: "desc" } } },
  });
  if (!i || !canReadIdeaInternal(actor, i)) deny();
  const name = await offeringNameLookup();
  return {
    idea: i,
    canEdit: canEditIdea(actor, i),
    // Assignment grants access only to evidence explicitly linked — and only while it's still published.
    evidence: i.evidence.map((e) => e.shared).filter((s) => s.status === "PUBLISHED").map((s) => toSharedDTO(s, name)),
    offering: name(i.offeringId),
  };
}

export async function createIdea(actor: Actor, raw: z.input<typeof ideaInput>) {
  if (!canManageIdeas(actor)) deny();
  const a = actor as UserActor;
  const input = ideaInput.parse(raw);
  const ids = input.refs.length ? await publishedIdsForRefs(input.refs) : [];
  return prisma.$transaction(async (tx) => {
    const i = await tx.improvementIdea.create({
      data: {
        title: input.title,
        problem: input.problem,
        offeringId: input.offeringId,
        proposedOutcome: input.proposedOutcome,
        ownerTeam: input.ownerTeam,
        ownerId: a.userId,
        priority: input.priority,
        publicStatusNote: input.publicStatusNote,
        visibleToClients: input.visibleToClients,
        themeId: input.themeId || null,
        evidence: { create: ids.map((sharedId) => ({ sharedId })) },
        changes: { create: { to: "PROPOSED", note: "Idea created", changedById: a.userId } },
      },
    });
    await audit(tx, a.userId, "idea.create", "ImprovementIdea", i.id, { evidence: input.refs, visibleToClients: input.visibleToClients });
    return i;
  });
}

export async function changeIdeaStatus(actor: Actor, id: string, raw: z.input<typeof ideaStatusInput>) {
  const input = ideaStatusInput.parse(raw);
  await prisma.$transaction(async (tx) => {
    const i = await tx.improvementIdea.findUnique({ where: { id }, include: { evidence: true } });
    if (!i || !canEditIdea(actor, i)) deny();
    const a = actor as UserActor;
    await tx.improvementIdea.update({
      where: { id },
      data: { status: input.status as IdeaStatus, publicStatusNote: input.publicStatusNote, visibleToClients: input.visibleToClients },
    });
    await tx.ideaStatusChange.create({ data: { ideaId: id, from: i.status, to: input.status, note: input.note, changedById: a.userId } });
    await audit(tx, a.userId, "idea.status", "ImprovementIdea", id, { from: i.status, to: input.status, visibleToClients: input.visibleToClients });

    // Close the loop with contributors of linked evidence — a theme-level message, no private source material.
    if (input.visibleToClients) {
      const links = await tx.sharedSourceLink.findMany({ where: { sharedId: { in: i.evidence.map((e) => e.sharedId) } } });
      const obs = await tx.observation.findMany({ where: { id: { in: links.map((l) => l.observationId) } }, select: { authorId: true } });
      for (const authorId of new Set(obs.map((o) => o.authorId))) {
        await notify(
          tx,
          authorId,
          "Improvement update",
          `An improvement your contribution informed is now "${IDEA_STATUS_LABEL[input.status as IdeaStatus]}": ${i.title}. ${input.publicStatusNote}`,
          "/portal/client/updates",
          `idea:${id}:${input.status}:${authorId}`,
        );
      }
    }
  });
}

export async function listIdeaStatusForParticipants(actor: Actor) {
  if (!canAccessCommunity(actor)) deny();
  const rows = await prisma.improvementIdea.findMany({ include: { theme: true }, orderBy: { updatedAt: "desc" } });
  const name = await offeringNameLookup();
  return rows.filter((i) => canReadIdeaStatus(actor, i) && i.visibleToClients).map((i) => toIdeaStatusDTO(i, name));
}
