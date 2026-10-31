import "server-only";
import type { ObsType, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { Actor, UserActor } from "@/server/policy/actor";
import { canAccessCommunity, canModerate } from "@/server/policy";
import { safeBreakdown, safeCount } from "@/server/learning/aggregate";
import { toSharedDTO, type SharedDTO } from "@/server/dto";
import { deny } from "@/server/errors";
import { audit, notify } from "./platform";
import { offeringNameLookup } from "./catalog";

export type FeedFilters = {
  q?: string;
  offeringId?: string;
  industry?: string;
  region?: string;
  period?: string;
  type?: ObsType;
};

function requireCommunity(actor: Actor): UserActor {
  if (!canAccessCommunity(actor)) deny();
  return actor as UserActor;
}

/** Only alphanumeric words reach to_tsquery, so user input can't inject tsquery syntax. */
function toTerms(q: string): string[] {
  return [...new Set(q.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].slice(0, 12);
}

/** Full-text match over PUBLISHED shared copies only. The status filter lives in the same SQL query. */
export async function ftsSharedIds(q: string, limit = 50): Promise<string[]> {
  const terms = toTerms(q);
  if (!terms.length) return [];
  const tsq = terms.join(" | ");
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "SharedObservation"
    WHERE status = 'PUBLISHED'
      AND to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', ${tsq})
    ORDER BY ts_rank(to_tsvector('english', title || ' ' || body), to_tsquery('english', ${tsq})) DESC
    LIMIT ${limit}`;
  return rows.map((r) => r.id);
}

/** Distinct contributing organisations behind a set of shared items, computed server-side; org IDs never leave. */
export async function distinctOrgCount(sharedIds: string[]): Promise<number> {
  if (!sharedIds.length) return 0;
  const rows = await prisma.sharedSourceLink.findMany({
    where: { sharedId: { in: sharedIds }, shared: { status: "PUBLISHED" } },
    select: { orgId: true },
    distinct: ["orgId"],
  });
  return rows.length;
}

async function breakdown(ids: string[], field: "industry" | "regionCoarse") {
  const links = await prisma.sharedSourceLink.findMany({
    where: { sharedId: { in: ids } },
    select: { orgId: true, shared: { select: { industry: true, regionCoarse: true } } },
  });
  const byKey = new Map<string, Set<string>>();
  for (const l of links) {
    const key = l.shared[field];
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key)!.add(l.orgId);
  }
  return safeBreakdown([...byKey].map(([key, orgs]) => ({ key, distinctOrgs: orgs.size })));
}

export async function searchShared(actor: Actor, f: FeedFilters) {
  requireCommunity(actor);
  const where: Prisma.SharedObservationWhereInput = {
    status: "PUBLISHED",
    ...(f.offeringId && { offeringId: f.offeringId }),
    ...(f.industry && { industry: f.industry }),
    ...(f.region && { regionCoarse: f.region }),
    ...(f.period && { periodLabel: f.period }),
    ...(f.type && { type: f.type }),
  };
  let order: string[] | null = null;
  if (f.q?.trim()) {
    order = await ftsSharedIds(f.q);
    where.id = { in: order };
  }
  const rows = await prisma.sharedObservation.findMany({ where, orderBy: { publishedAt: "desc" } });
  if (order) rows.sort((a, b) => order!.indexOf(a.id) - order!.indexOf(b.id));

  const name = await offeringNameLookup();
  const ids = rows.map((r) => r.id);
  return {
    items: rows.map((r) => toSharedDTO(r, name)),
    // Counts obey the same visibility as the records, then small-cohort suppression.
    contributingOrgs: safeCount(await distinctOrgCount(ids)),
    byIndustry: await breakdown(ids, "industry"),
    byRegion: await breakdown(ids, "regionCoarse"),
  };
}

export async function feedFilterOptions(actor: Actor) {
  requireCommunity(actor);
  const rows = await prisma.sharedObservation.findMany({
    where: { status: "PUBLISHED" },
    select: { industry: true, regionCoarse: true, periodLabel: true, offeringId: true },
  });
  const uniq = (xs: string[]) => [...new Set(xs)].sort();
  return {
    industries: uniq(rows.map((r) => r.industry)),
    regions: uniq(rows.map((r) => r.regionCoarse)),
    periods: uniq(rows.map((r) => r.periodLabel)),
    offeringIds: uniq(rows.map((r) => r.offeringId)),
  };
}

export async function getShared(actor: Actor, ref: string) {
  const a = requireCommunity(actor);
  const s = await prisma.sharedObservation.findUnique({
    where: { publicRef: ref },
    include: { themes: { include: { theme: true } }, bookmarks: { where: { userId: a.userId } }, feedback: { where: { userId: a.userId } } },
  });
  // Suspended/withdrawn copies disappear for participants immediately; moderators can still open suspended ones.
  if (!s || (s.status !== "PUBLISHED" && !(canModerate(actor) && s.status === "SUSPENDED"))) deny();
  const name = await offeringNameLookup();
  return {
    item: toSharedDTO(s, name),
    status: s.status,
    themes: s.themes.map((t) => ({ id: t.theme.id, title: t.theme.title })),
    bookmarked: s.bookmarks.length > 0,
    myFeedback: s.feedback[0]?.kind ?? null,
  };
}

export async function getSharedByRefs(refs: string[]): Promise<SharedDTO[]> {
  const rows = await prisma.sharedObservation.findMany({ where: { publicRef: { in: refs }, status: "PUBLISHED" } });
  const name = await offeringNameLookup();
  return rows.map((r) => toSharedDTO(r, name));
}

export async function listPublishedForLinking(actor: Actor) {
  requireCommunity(actor);
  const name = await offeringNameLookup();
  return (await prisma.sharedObservation.findMany({ where: { status: "PUBLISHED" }, orderBy: { publicRef: "asc" } })).map((r) =>
    toSharedDTO(r, name),
  );
}

/** Reporters never need to name another client; the report only references the public item. */
export async function reportShared(actor: Actor, ref: string, reason: string, details?: string) {
  const a = requireCommunity(actor);
  await prisma.$transaction(async (tx) => {
    const s = await tx.sharedObservation.findUnique({ where: { publicRef: ref } });
    if (!s || s.status !== "PUBLISHED") deny();
    const r = await tx.report.create({ data: { sharedId: s.id, reporterId: a.userId, reason, details } });
    await audit(tx, a.userId, "shared.report", "SharedObservation", s.id, { reportId: r.id, reason });
    const moderators = await tx.roleGrant.findMany({ where: { grant: "MODERATE_LEARNING" }, select: { userId: true } });
    for (const m of moderators) {
      await notify(tx, m.userId, "New report", `${s.publicRef} was reported as ${reason.toLowerCase()}.`, "/portal/moderation", `report:${r.id}:mod:${m.userId}`);
    }
  });
}

export async function toggleBookmark(actor: Actor, ref: string) {
  const a = requireCommunity(actor);
  const s = await prisma.sharedObservation.findUnique({ where: { publicRef: ref } });
  if (!s || s.status !== "PUBLISHED") deny();
  const key = { userId_sharedId: { userId: a.userId, sharedId: s.id } };
  const existing = await prisma.bookmark.findUnique({ where: key });
  if (existing) await prisma.bookmark.delete({ where: key });
  else await prisma.bookmark.create({ data: { userId: a.userId, sharedId: s.id } });
}

export async function listBookmarks(actor: Actor) {
  const a = requireCommunity(actor);
  const rows = await prisma.bookmark.findMany({ where: { userId: a.userId, shared: { status: "PUBLISHED" } }, include: { shared: true } });
  const name = await offeringNameLookup();
  return rows.map((b) => toSharedDTO(b.shared, name));
}

export async function setFeedback(actor: Actor, ref: string, kind: "USEFUL" | "NEEDS_EVIDENCE") {
  const a = requireCommunity(actor);
  const s = await prisma.sharedObservation.findUnique({ where: { publicRef: ref } });
  if (!s || s.status !== "PUBLISHED") deny();
  await prisma.sharedFeedback.upsert({
    where: { userId_sharedId: { userId: a.userId, sharedId: s.id } },
    update: { kind },
    create: { userId: a.userId, sharedId: s.id, kind },
  });
}
