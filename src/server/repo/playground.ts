import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { Actor, UserActor } from "@/server/policy/actor";
import { canUseOffering, isClientMember, isEmployee } from "@/server/policy";
import { getScenario, SCENARIOS } from "@/server/playground/scenarios";
import { deny } from "@/server/errors";

async function offeringIdBySlug(slug: string) {
  return (await prisma.offering.findUnique({ where: { slug }, select: { id: true } }))?.id;
}

export async function listScenarios(actor: Actor) {
  if (!isEmployee(actor) && !isClientMember(actor)) deny();
  const out = [];
  for (const s of SCENARIOS) {
    const id = await offeringIdBySlug(s.offeringSlug);
    if (id && canUseOffering(actor, id)) out.push({ id: s.id, title: s.title, description: s.description, offeringSlug: s.offeringSlug, inputs: s.inputs });
  }
  return out;
}

export async function runScenario(actor: Actor, scenarioId: string) {
  const s = getScenario(scenarioId);
  if (!s) deny();
  const offeringId = await offeringIdBySlug(s.offeringSlug);
  if (!offeringId || !canUseOffering(actor, offeringId)) deny();
  const a = actor as UserActor;
  const outputs = s.run(s.inputs);
  // Runs are isolated per user and active workspace.
  return prisma.playgroundRun.create({
    data: { userId: a.userId, orgId: a.active?.orgId ?? null, scenarioId, inputs: s.inputs as Prisma.InputJsonValue, outputs: outputs as unknown as Prisma.InputJsonValue },
  });
}

export async function listMyRuns(actor: Actor) {
  if (!isEmployee(actor) && !isClientMember(actor)) deny();
  return prisma.playgroundRun.findMany({
    where: { userId: actor.userId, orgId: actor.active?.orgId ?? null },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

export async function getRun(actor: Actor, runId: string) {
  if (!isEmployee(actor) && !isClientMember(actor)) deny();
  const r = await prisma.playgroundRun.findUnique({ where: { id: runId } });
  if (!r || r.userId !== actor.userId || r.orgId !== (actor.active?.orgId ?? null)) deny();
  return r;
}

export async function saveRunFeedback(actor: Actor, runId: string, feedback: { rating: string; comment: string }) {
  await getRun(actor, runId);
  await prisma.playgroundRun.update({ where: { id: runId }, data: { feedback } });
}
