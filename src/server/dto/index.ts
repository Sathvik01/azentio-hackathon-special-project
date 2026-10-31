import type { ContentItem, ImprovementIdea, IdeaStatus, Offering, SharedObservation, Theme } from "@prisma/client";
import type { SafeCount } from "@/server/learning/aggregate";

/*
 * Explicit allow-list serialisers. Anything that leaves the server for a shared/client audience
 * goes through one of these, so tenant IDs, authors, reviewer notes and internal priority can't leak.
 */

export type OfferingDTO = { id: string; slug: string; name: string; category: string; tagline: string; description: string };

export function toOfferingDTO(o: Offering): OfferingDTO {
  return { id: o.id, slug: o.slug, name: o.name, category: o.category, tagline: o.tagline, description: o.description };
}

export type SharedDTO = {
  ref: string;
  version: number;
  type: string;
  title: string;
  body: string;
  offering: string;
  industry: string;
  region: string;
  period: string;
  attribution: string | null;
  publishedAt: string;
};

export function toSharedDTO(s: SharedObservation, offeringName: (id: string) => string): SharedDTO {
  return {
    ref: s.publicRef,
    version: s.version,
    type: s.type,
    title: s.title,
    body: s.body,
    offering: offeringName(s.offeringId),
    industry: s.industry,
    region: s.regionCoarse,
    period: s.periodLabel,
    attribution: s.attributionOrgName,
    publishedAt: s.publishedAt.toISOString(),
  };
}

export type ThemeDTO = {
  id: string;
  title: string;
  summary: string;
  limitations: string;
  offering: string | null;
  evidenceRefs: string[];
  distinctOrgs: SafeCount;
  periods: string[];
  updatedAt: string;
};

export function toThemeDTO(
  t: Theme,
  evidence: SharedObservation[],
  distinctOrgs: SafeCount,
  offeringName: (id: string) => string,
): ThemeDTO {
  return {
    id: t.id,
    title: t.title,
    summary: t.summary,
    limitations: t.limitations,
    offering: t.offeringId ? offeringName(t.offeringId) : null,
    evidenceRefs: evidence.map((e) => e.publicRef),
    distinctOrgs,
    periods: [...new Set(evidence.map((e) => e.periodLabel))],
    updatedAt: t.updatedAt.toISOString(),
  };
}

export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = {
  PROPOSED: "Proposed",
  UNDER_REVIEW: "Under review",
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  RELEASED: "Released",
  NOT_PROCEEDING: "Not proceeding",
};

/** What a client may see about an idea: no priority, no owner identity, no private evidence. */
export type IdeaStatusDTO = {
  id: string;
  title: string;
  offering: string;
  ownerTeam: string;
  status: string;
  statusNote: string;
  themeTitle: string | null;
  updatedAt: string;
};

export function toIdeaStatusDTO(
  i: ImprovementIdea & { theme: Theme | null },
  offeringName: (id: string) => string,
): IdeaStatusDTO {
  return {
    id: i.id,
    title: i.title,
    offering: offeringName(i.offeringId),
    ownerTeam: i.ownerTeam,
    status: IDEA_STATUS_LABEL[i.status],
    statusNote: i.publicStatusNote,
    themeTitle: i.theme?.title ?? null,
    updatedAt: i.updatedAt.toISOString(),
  };
}

export type ContentDTO = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  body: string;
  ownerName: string | null;
  reviewDate: string | null;
  startsAt: string | null;
  mediaIds: string[];
};

export function toContentDTO(c: ContentItem & { media?: { id: string }[] }): ContentDTO {
  return {
    id: c.id,
    kind: c.kind,
    title: c.title,
    summary: c.summary,
    body: c.body,
    ownerName: c.ownerName,
    reviewDate: c.reviewDate?.toISOString() ?? null,
    startsAt: c.startsAt?.toISOString() ?? null,
    mediaIds: c.media?.map((m) => m.id) ?? [],
  };
}
