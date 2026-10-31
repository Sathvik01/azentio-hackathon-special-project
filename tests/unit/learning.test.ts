import { describe, expect, it } from "vitest";
import { allowedActions, InvalidTransition, nextStatus } from "@/server/learning/stateMachine";
import { scanText } from "@/server/learning/scan";
import { safeBreakdown, safeCount } from "@/server/learning/aggregate";
import { coarsenRegion, periodLabel } from "@/server/learning/coarsen";
import { toIdeaStatusDTO, toSharedDTO } from "@/server/dto";
import { observationInput } from "@/lib/schemas";

describe("lifecycle state machine", () => {
  it("follows the happy path", () => {
    expect(nextStatus("DRAFT", "submit", "author")).toBe("SUBMITTED");
    expect(nextStatus("SUBMITTED", "claim", "moderator")).toBe("IN_REVIEW");
    expect(nextStatus("IN_REVIEW", "return", "moderator")).toBe("RETURNED");
    expect(nextStatus("RETURNED", "submit", "author")).toBe("SUBMITTED");
    expect(nextStatus("IN_REVIEW", "publish", "moderator")).toBe("PUBLISHED");
    expect(nextStatus("PUBLISHED", "suspend", "moderator")).toBe("SUSPENDED");
    expect(nextStatus("SUSPENDED", "reinstate", "moderator")).toBe("PUBLISHED");
    expect(nextStatus("PUBLISHED", "withdraw", "author")).toBe("WITHDRAWN");
  });
  it("rejects illegal transitions", () => {
    expect(() => nextStatus("DRAFT", "publish", "moderator")).toThrow(InvalidTransition);
    expect(() => nextStatus("DRAFT", "submit", "moderator")).toThrow(InvalidTransition);
    expect(() => nextStatus("PUBLISHED", "publish", "moderator")).toThrow(InvalidTransition);
    expect(() => nextStatus("WITHDRAWN", "reinstate", "moderator")).toThrow(InvalidTransition);
    expect(() => nextStatus("SUBMITTED", "publish", "author")).toThrow(InvalidTransition);
  });
  it("a draft can't be withdrawn (it was never shared) and moderators can't act on drafts", () => {
    expect(allowedActions("DRAFT", "author")).toEqual(["submit"]);
    expect(allowedActions("DRAFT", "moderator")).toEqual([]);
  });
});

describe("sensitive-content scan", () => {
  it("flags typical restricted content", () => {
    const ids = scanText("Customer Mr. Smith, account 1234 5678 9012 3456, paid AED 2,450,000 under NDA — confidential. password: x").map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["account_number", "customer_identity", "precise_amount", "confidential", "credential"]));
  });
  it("passes a pattern-level description", () => {
    expect(scanText("Seasonal SMEs are flagged during their normal low season; prior-year comparisons would help.")).toEqual([]);
  });
});

describe("aggregation safeguards", () => {
  it("suppresses below the minimum cohort", () => {
    expect(safeCount(2, 3)).toEqual({ value: null, suppressed: true });
    expect(safeCount(3, 3)).toEqual({ value: 3, suppressed: false });
  });
  it("suppresses a whole breakdown when any bucket is small (anti-differencing)", () => {
    expect(safeBreakdown([{ key: "A", distinctOrgs: 4 }, { key: "B", distinctOrgs: 1 }], 3)).toBeNull();
    expect(safeBreakdown([{ key: "A", distinctOrgs: 3 }, { key: "B", distinctOrgs: 5 }], 3)).toHaveLength(2);
  });
});

describe("de-identification helpers", () => {
  it("coarsens country and date", () => {
    expect(coarsenRegion("Ireland")).toBe("Europe");
    expect(periodLabel(new Date("2026-04-03"), new Date("2026-09-30"))).toBe("Q2–Q3 2026");
    expect(periodLabel(new Date("2025-11-01"), new Date("2026-01-15"))).toBe("Q4 2025–Q1 2026");
  });
});

describe("shared DTOs never carry tenant or internal fields", () => {
  const FORBIDDEN = ["orgId", "authorId", "tenant", "reviewerNote", "source", "priority", "ownerId", "observationId"];
  it("SharedDTO", () => {
    const dto = toSharedDTO(
      { id: "s", publicRef: "LRN-1", version: 1, type: "MARKET_OBSERVATION", title: "t", body: "b", offeringId: "o", industry: "i", regionCoarse: "r", periodLabel: "p", attributionOrgName: null, status: "PUBLISHED", publishedAt: new Date(), updatedAt: new Date() },
      () => "Offering",
    );
    for (const k of FORBIDDEN) expect(Object.keys(dto)).not.toContain(k);
  });
  it("IdeaStatusDTO", () => {
    const dto = toIdeaStatusDTO(
      { id: "i", title: "t", problem: "p", offeringId: "o", proposedOutcome: "x", ownerTeam: "team", ownerId: "secret", priority: "P1", status: "UNDER_REVIEW", publicStatusNote: "n", visibleToClients: true, themeId: null, createdAt: new Date(), updatedAt: new Date(), theme: null },
      () => "Offering",
    );
    for (const k of FORBIDDEN) expect(Object.keys(dto)).not.toContain(k);
  });
});

describe("observation validation", () => {
  const base = {
    type: "MARKET_OBSERVATION", title: "A valid title", body: "x".repeat(50), offeringId: "o", industry: "Banking", region: "India",
    periodStart: "2026-01-01", periodEnd: "2026-03-31", evidenceType: "ANECDOTAL", confidence: "LOW", visibility: "PRIVATE", sharingProposal: "NONE",
  };
  it("accepts a private draft without any sharing permission", () => {
    expect(observationInput.safeParse(base).success).toBe(true);
  });
  it("requires publish permission to propose community sharing", () => {
    expect(observationInput.safeParse({ ...base, sharingProposal: "COMMUNITY" }).success).toBe(false);
    expect(observationInput.safeParse({ ...base, sharingProposal: "COMMUNITY", consentPublish: "on" }).success).toBe(true);
  });
  it("enforces length limits and period order", () => {
    expect(observationInput.safeParse({ ...base, body: "short" }).success).toBe(false);
    expect(observationInput.safeParse({ ...base, periodEnd: "2025-01-01" }).success).toBe(false);
  });
});
