/*
 * Runs the server-side repositories against the seeded local database (npm run setup first).
 * Actors are built exactly as getActor() builds them, minus the HTTP session.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { buildActor, ANONYMOUS, type UserActor } from "@/server/policy/actor";
import { loadActorData } from "@/server/repo/identity";
import * as obs from "@/server/repo/observations";
import * as mod from "@/server/repo/moderation";
import * as shared from "@/server/repo/shared";
import * as insights from "@/server/repo/insights";
import * as orgs from "@/server/repo/orgs";
import { getMediaForActor, listContent } from "@/server/repo/catalog";
import { retrieve } from "@/server/aira";
import { NotFoundOrDenied } from "@/server/errors";

const db = new PrismaClient();
const created: string[] = [];

async function actor(email: string, orgSlug?: string): Promise<UserActor> {
  const u = await db.user.update({ where: { email }, data: { emailVerified: new Date() } });
  const data = (await loadActorData(u.id))!;
  const org = orgSlug ? await db.organization.findUniqueOrThrow({ where: { slug: orgSlug } }) : null;
  return buildActor(data, org?.id);
}

let nate: UserActor, nora: UserActor, hema: UserActor, colm: UserActor, omar: UserActor, asha: UserActor, lena: UserActor, maya: UserActor;
let fai: string;

beforeAll(async () => {
  [nate, nora, hema, colm, omar, asha, lena] = await Promise.all([
    actor("nate.member@northwind.example"),
    actor("nora.admin@northwind.example"),
    actor("hema.member@harbor.example"),
    actor("colm.member@cedar.example"),
    actor("omar.moderator@azentio.com"),
    actor("asha.employee@azentio.com"),
    actor("lena.product@azentio.com"),
  ]);
  maya = await actor("maya.multi@consult.example", "cedar");
  fai = (await db.offering.findUniqueOrThrow({ where: { slug: "financial-analysis-intelligence" } })).id;
});

afterAll(async () => {
  const links = await db.sharedSourceLink.findMany({ where: { observationId: { in: created } } });
  await db.sharedObservation.deleteMany({ where: { id: { in: links.map((l) => l.sharedId) } } });
  await db.observation.deleteMany({ where: { id: { in: created } } });
  await db.notification.deleteMany({ where: { body: { contains: "Zebrafinch" } } });
  await db.auditEvent.deleteMany({ where: { resourceId: { in: [...created, ...links.map((l) => l.sharedId)] } } });
  await db.$disconnect();
});

const input = (title: string, community: boolean) => ({
  type: "MARKET_OBSERVATION" as const,
  title,
  body: "Seasonal SMEs zebrafinch pattern observed across several portfolios during the low season this year.",
  offeringId: fai,
  industry: "Banking",
  region: "United Arab Emirates",
  periodStart: new Date("2026-04-01"),
  periodEnd: new Date("2026-06-30"),
  evidenceType: "ANECDOTAL" as const,
  confidence: "LOW" as const,
  link: "",
  visibility: "PRIVATE" as const,
  sharingProposal: community ? ("COMMUNITY" as const) : ("NONE" as const),
  consentPublish: community,
  consentAttribution: false,
  consentTraining: false,
});

describe("tenant isolation", () => {
  it("a client cannot read another tenant's private observation by ID", async () => {
    const other = await db.observation.findFirstOrThrow({ where: { orgId: { not: nate.active!.orgId } } });
    await expect(obs.getObservation(nate, other.id)).rejects.toBeInstanceOf(NotFoundOrDenied);
  });
  it("org-only observations are visible to colleagues, not other tenants, and never queued", async () => {
    const orgOnly = await db.observation.findFirstOrThrow({ where: { visibility: "ORG", sharingProposal: "NONE" } });
    await expect(obs.getObservation(nate, orgOnly.id)).resolves.toBeTruthy();
    await expect(obs.getObservation(hema, orgOnly.id)).rejects.toBeInstanceOf(NotFoundOrDenied);
    expect((await mod.listQueue(omar)).map((o) => o.id)).not.toContain(orgOnly.id);
  });
  it("a multi-membership user only sees the active workspace", async () => {
    expect(maya.active?.orgName).toBe("Cedar Credit Union");
    const northwindOrgOnly = await db.observation.findFirstOrThrow({ where: { visibility: "ORG", orgId: nate.active!.orgId } });
    await expect(obs.getObservation(maya, northwindOrgOnly.id)).rejects.toBeInstanceOf(NotFoundOrDenied);
  });
  it("client sees only org-specific content for its own org", async () => {
    const titles = (await listContent(hema)).map((c) => c.title);
    expect(titles).not.toContain("Northwind quarterly briefing");
    expect((await listContent(nate)).map((c) => c.title)).toContain("Northwind quarterly briefing");
  });
  it("employee-only media is denied to clients and anonymous visitors", async () => {
    const m = await db.mediaAsset.findFirstOrThrow({ where: { content: { audience: "EMPLOYEE" } } });
    await expect(getMediaForActor(nate, m.id)).rejects.toBeInstanceOf(NotFoundOrDenied);
    await expect(getMediaForActor(ANONYMOUS, m.id)).rejects.toBeInstanceOf(NotFoundOrDenied);
    await expect(getMediaForActor(asha, m.id)).resolves.toBeTruthy();
  });
});

describe("collective-learning lifecycle", () => {
  it("saving never shares: a draft is invisible to moderators and the feed", async () => {
    const o = await obs.createObservation(nate, input("Zebrafinch private draft test", true));
    created.push(o.id);
    expect(o.status).toBe("DRAFT");
    expect((await mod.listQueue(omar)).map((x) => x.id)).not.toContain(o.id);
    await expect(mod.getForReview(omar, o.id)).rejects.toBeInstanceOf(NotFoundOrDenied);
    expect((await shared.searchShared(hema, { q: "zebrafinch" })).items).toHaveLength(0);
  });

  it("a non-community item cannot be submitted to the queue", async () => {
    const o = await obs.createObservation(nate, input("Zebrafinch org-only test", false));
    created.push(o.id);
    await expect(obs.submitObservation(nate, o.id)).rejects.toThrow(/community sharing/);
  });

  it("submit → publish → visible in feed/AIRA → withdraw → gone immediately", async () => {
    const o = await obs.createObservation(nate, input("Zebrafinch lifecycle test", true));
    created.push(o.id);
    await obs.submitObservation(nate, o.id);
    expect((await mod.listQueue(omar)).map((x) => x.id)).toContain(o.id);

    const s = await mod.publish(omar, o.id, {
      title: "Zebrafinch shared copy",
      body: "Seasonal SMEs zebrafinch pattern observed across several portfolios during the low season.",
      regionCoarse: "Middle East & Africa",
      periodLabel: "Q2 2026",
      includeAttribution: false,
      acknowledgeFlags: false,
    });
    const feed = await shared.searchShared(hema, { q: "zebrafinch" });
    expect(feed.items.map((i) => i.ref)).toContain(s.publicRef);
    expect(JSON.stringify(feed)).not.toContain(nate.active!.orgId);
    expect(JSON.stringify(feed)).not.toContain(nate.userId);
    expect((await retrieve(hema, "zebrafinch")).map((r) => r.ref)).toContain(s.publicRef);

    await obs.withdrawObservation(nate, o.id);
    expect((await shared.searchShared(hema, { q: "zebrafinch" })).items).toHaveLength(0);
    expect((await retrieve(hema, "zebrafinch")).map((r) => r.ref)).not.toContain(s.publicRef);
    await expect(shared.getShared(hema, s.publicRef)).rejects.toBeInstanceOf(NotFoundOrDenied);
  });

  it("attribution cannot be published without the author's opt-in", async () => {
    const o = await obs.createObservation(nate, input("Zebrafinch attribution test", true));
    created.push(o.id);
    await obs.submitObservation(nate, o.id);
    await expect(
      mod.publish(omar, o.id, { title: "Zebrafinch attributed", body: "x".repeat(60), regionCoarse: "Europe", periodLabel: "Q2 2026", includeAttribution: true, acknowledgeFlags: false }),
    ).rejects.toThrow(/attribution/);
  });

  it("an ordinary employee cannot moderate", async () => {
    await expect(mod.listQueue(asha)).rejects.toBeInstanceOf(NotFoundOrDenied);
  });
});

describe("themes and aggregation", () => {
  it("Seasonality context shows 3 distinct organisations", async () => {
    const t = (await insights.listThemes(colm)).find((x) => x.title === "Seasonality context")!;
    expect(t.distinctOrgs).toEqual({ value: 3, suppressed: false });
    expect(t.limitations).toMatch(/Small sample/);
  });
  it("a single-organisation theme has its count suppressed", async () => {
    const t = (await insights.listThemes(colm)).find((x) => x.title === "Bilingual document extraction")!;
    expect(t.distinctOrgs.suppressed).toBe(true);
  });
  it("clients see the shared idea status without internal priority or owner", async () => {
    const ideas = await insights.listIdeaStatusForParticipants(hema);
    expect(ideas.map((i) => i.title)).toContain("Seasonality-aware comparison explanation");
    expect(JSON.stringify(ideas)).not.toMatch(/"priority"|P1|ownerId/);
    expect(ideas.map((i) => i.title)).not.toContain("Collections early-warning threshold tuning");
  });
  it("only product owners create ideas", async () => {
    await expect(insights.createIdea(asha, {} as Parameters<typeof insights.createIdea>[1])).rejects.toBeInstanceOf(NotFoundOrDenied);
    void lena;
  });
});

describe("AIRA scope", () => {
  it("never retrieves employee-only content for clients or the public", async () => {
    for (const a of [nate, ANONYMOUS]) {
      const refs = await retrieve(a, "Project Lighthouse seasonality experiment internal");
      expect(refs.map((r) => r.title).join(" ")).not.toMatch(/Lighthouse/);
    }
    const emp = await retrieve(asha, "Project Lighthouse seasonality experiment internal");
    expect(emp.map((r) => r.title).join(" ")).toMatch(/Lighthouse/);
  });
  it("public scope excludes shared learning entirely", async () => {
    expect((await retrieve(ANONYMOUS, "seasonal SME revenue")).every((r) => r.kind === "content")).toBe(true);
  });
});

describe("client administration", () => {
  it("cannot escalate or cross tenants", async () => {
    await expect(orgs.inviteMember(nora, "x@evil.example", "EMPLOYEE")).rejects.toBeInstanceOf(NotFoundOrDenied);
    const harborMember = await db.membership.findFirstOrThrow({ where: { org: { slug: "harbor" } } });
    await expect(orgs.setMembership(nora, harborMember.id, { role: "CLIENT_ADMIN" })).rejects.toBeInstanceOf(NotFoundOrDenied);
    await expect(orgs.grantRole(nora, nora.userId, "MODERATE_LEARNING", {})).rejects.toBeInstanceOf(NotFoundOrDenied);
    await expect(orgs.getOrgAdminView(nate)).rejects.toBeInstanceOf(NotFoundOrDenied);
  });
});
