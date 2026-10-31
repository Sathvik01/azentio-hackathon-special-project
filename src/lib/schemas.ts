import { z } from "zod";

// Shared by forms (HTML constraints) and server actions (authoritative validation).
export const LIMITS = { title: 140, body: 4000, reason: 1000, link: 500, name: 120, message: 2000 } as const;

const trimmed = (max: number, min = 1) => z.string().trim().min(min).max(max);
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const observationInput = z
  .object({
    type: z.enum([
      "MARKET_OBSERVATION",
      "EMERGING_TREND",
      "PRODUCT_GAP",
      "OPERATIONAL_CHALLENGE",
      "SUCCESSFUL_PRACTICE",
      "IMPROVEMENT_SUGGESTION",
    ]),
    title: trimmed(LIMITS.title, 8),
    body: trimmed(LIMITS.body, 40),
    offeringId: z.string().min(1),
    industry: trimmed(60),
    region: trimmed(60),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    evidenceType: z.enum(["ANECDOTAL", "INTERNAL_METRICS", "CUSTOMER_FEEDBACK", "MARKET_RESEARCH", "REGULATORY_CHANGE"]),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    link: z.union([z.literal(""), z.string().trim().url().max(LIMITS.link)]).optional(),
    visibility: z.enum(["PRIVATE", "ORG"]),
    sharingProposal: z.enum(["NONE", "COMMUNITY"]),
    consentPublish: checkbox,
    consentAttribution: checkbox,
    consentTraining: checkbox,
  })
  .refine((v) => v.periodEnd >= v.periodStart, { message: "Observation period end must be after start", path: ["periodEnd"] })
  .refine((v) => v.sharingProposal === "NONE" || v.consentPublish, {
    message: "Proposing community sharing requires permission to publish a reviewed copy",
    path: ["consentPublish"],
  });

export type ObservationInput = z.infer<typeof observationInput>;

export const publishInput = z.object({
  title: trimmed(LIMITS.title, 8),
  body: trimmed(LIMITS.body, 40),
  regionCoarse: trimmed(60),
  periodLabel: trimmed(40),
  includeAttribution: checkbox,
  acknowledgeFlags: checkbox,
  reviewerNote: z.string().trim().max(LIMITS.reason).optional(),
});

export const reasonInput = z.object({ reason: trimmed(LIMITS.reason, 5) });

export const reportInput = z.object({
  reason: z.enum(["MISLEADING", "CONFIDENTIAL", "IDENTIFYING", "INAPPROPRIATE", "DUPLICATE"]),
  details: z.string().trim().max(LIMITS.reason).optional(),
});

export const inviteInput = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  role: z.enum(["MEMBER", "CLIENT_ADMIN"]),
});

export const themeInput = z.object({
  title: trimmed(LIMITS.title, 4),
  summary: trimmed(LIMITS.body, 20),
  limitations: trimmed(LIMITS.reason, 10),
  offeringId: z.string().optional(),
  refs: z.array(z.string()).min(1, "Link at least one approved contribution"),
});

export const ideaInput = z.object({
  title: trimmed(LIMITS.title, 4),
  problem: trimmed(LIMITS.body, 20),
  offeringId: z.string().min(1),
  proposedOutcome: trimmed(LIMITS.body, 10),
  ownerTeam: trimmed(80),
  priority: z.enum(["P1", "P2", "P3"]),
  themeId: z.string().optional(),
  refs: z.array(z.string()).default([]),
  publicStatusNote: trimmed(LIMITS.reason, 10),
  visibleToClients: checkbox,
});

export const ideaStatusInput = z.object({
  status: z.enum(["PROPOSED", "UNDER_REVIEW", "PLANNED", "IN_PROGRESS", "RELEASED", "NOT_PROCEEDING"]),
  note: trimmed(LIMITS.reason, 5),
  publicStatusNote: trimmed(LIMITS.reason, 10),
  visibleToClients: checkbox,
});

export const contentInput = z.object({
  id: z.string().optional(),
  kind: z.enum(["BANNER", "INSIGHT", "VIDEO", "BROADCAST", "RECORDING", "SESSION", "KNOWLEDGE", "RELEASE_NOTE", "EXPERIMENT", "BRIEFING"]),
  title: trimmed(LIMITS.title, 3),
  summary: trimmed(400, 3),
  body: trimmed(LIMITS.body, 3),
  audience: z.enum(["PUBLIC", "EMPLOYEE", "CLIENTS"]),
  published: checkbox,
  startsAt: z.union([z.literal(""), z.coerce.date()]).optional(),
});

export const demoRequestInput = z.object({
  name: trimmed(LIMITS.name),
  company: trimmed(LIMITS.name),
  email: z.string().trim().email().max(200),
  offeringSlug: z.string().optional(),
  message: trimmed(LIMITS.message, 10),
});

export const eventRegistrationInput = z.object({
  name: trimmed(LIMITS.name),
  email: z.string().trim().email().max(200),
  team: z.string().trim().max(LIMITS.name).optional(),
  eventSlug: z.string().min(1),
});

export const airaInput = z.object({ question: trimmed(500, 3) });
