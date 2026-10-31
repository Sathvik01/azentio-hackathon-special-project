import { describe, expect, it } from "vitest";
import { buildActor } from "@/server/policy/actor";
import { ANONYMOUS } from "@/server/policy/actor";
import * as p from "@/server/policy";
import { client, employee, ORG } from "../fixtures";

const content = (audience: string | null, extra: Partial<p.ContentRef> = {}): p.ContentRef =>
  ({ audience, orgId: null, offeringId: null, published: true, ...extra }) as p.ContentRef;

describe("actor construction", () => {
  it("never trusts a workspace cookie for an org the user isn't a member of", () => {
    const a = buildActor(
      { userId: "u", email: "u@x.example", name: null, employeeProvisioned: false, grants: [], entitlementsByOrg: {}, memberships: [
        { orgId: ORG.a, orgName: "A", orgType: "CLIENT", role: "MEMBER" },
        { orgId: ORG.b, orgName: "B", orgType: "CLIENT", role: "MEMBER" },
      ] },
      "org-forged",
    );
    expect(a.active).toBeNull(); // multi-membership + invalid cookie → must choose explicitly
  });

  it("employee status needs domain + provision + membership, and an email suffix alone is not enough", () => {
    expect(employee().isEmployee).toBe(true);
    expect(employee([], { employeeProvisioned: false }).isEmployee).toBe(false);
    expect(employee([], { email: "e@azentio.com.evil.example" }).isEmployee).toBe(false);
  });

  it("drops expired grants and ignores grants for non-employees", () => {
    const past = new Date(Date.now() - 1000);
    const a = employee([], { grants: [{ grant: "MODERATE_LEARNING", orgId: null, expiresAt: past }] });
    expect(p.canModerate(a)).toBe(false);
    const c = buildActor(
      { userId: "c", email: "c@client.example", name: null, employeeProvisioned: false, entitlementsByOrg: {}, grants: [{ grant: "PORTAL_ADMIN", orgId: null, expiresAt: null }], memberships: [{ orgId: ORG.a, orgName: "A", orgType: "CLIENT", role: "CLIENT_ADMIN" }] },
      ORG.a,
    );
    expect(p.canAdminPortal(c)).toBe(false);
  });
});

describe("least privilege (IAM-02)", () => {
  it("employee status grants none of the separate permissions", () => {
    const e = employee();
    expect([p.canModerate(e), p.canPublishContent(e), p.canManageIdeas(e), p.canAdminPortal(e)]).toEqual([false, false, false, false]);
  });
  it("each grant enables only itself", () => {
    const m = employee(["MODERATE_LEARNING"]);
    expect(p.canModerate(m)).toBe(true);
    expect(p.canPublishContent(m)).toBe(false);
    expect(p.canAdminPortal(m)).toBe(false);
  });
});

describe("content audiences", () => {
  const cases: [string, p.ContentRef, Record<"anon" | "emp" | "clientA" | "clientB", boolean>][] = [
    ["PUBLIC", content("PUBLIC"), { anon: true, emp: true, clientA: true, clientB: true }],
    ["EMPLOYEE", content("EMPLOYEE"), { anon: false, emp: true, clientA: false, clientB: false }],
    ["CLIENTS (entitled offering)", content("CLIENTS", { offeringId: "off-1" }), { anon: false, emp: true, clientA: true, clientB: false }],
    ["CLIENT_ORG A", content("CLIENT_ORG", { orgId: ORG.a }), { anon: false, emp: false, clientA: true, clientB: false }],
    ["missing audience", content(null), { anon: false, emp: false, clientA: false, clientB: false }],
  ];
  const actors = { anon: ANONYMOUS, emp: employee(), clientA: client(ORG.a), clientB: client(ORG.b, "MEMBER", []) };
  for (const [name, ref, expected] of cases) {
    it(name, () => {
      for (const [k, a] of Object.entries(actors)) expect(p.canReadContent(a, ref), `${name} / ${k}`).toBe(expected[k as keyof typeof expected]);
    });
  }
  it("unpublished content is visible only to publishers", () => {
    const draft = content("PUBLIC", { published: false });
    expect(p.canReadContent(ANONYMOUS, draft)).toBe(false);
    expect(p.canReadContent(employee(["PUBLISH_CONTENT"]), draft)).toBe(true);
  });
  it("support access to a client org requires an explicit unexpired grant", () => {
    const ref = content("CLIENT_ORG", { orgId: ORG.a });
    expect(p.canReadContent(employee(["PORTAL_ADMIN"]), ref)).toBe(false);
    const support = employee([], { grants: [{ grant: "SUPPORT_ACCESS", orgId: ORG.a, expiresAt: new Date(Date.now() + 3600_000) }] });
    expect(p.canReadContent(support, ref)).toBe(true);
  });
});

describe("observations", () => {
  const obs = (over: Partial<p.ObservationRef> = {}): p.ObservationRef => ({
    authorId: `u-${ORG.a}`, orgId: ORG.a, visibility: "PRIVATE", sharingProposal: "NONE", status: "DRAFT", ...over,
  });
  it("private drafts are visible to the author only", () => {
    expect(p.canReadObservation(client(ORG.a), obs())).toBe(true);
    expect(p.canReadObservation(client(ORG.a, "MEMBER", [], "colleague"), obs())).toBe(false);
    expect(p.canReadObservation(client(ORG.b), obs())).toBe(false);
    expect(p.canReadObservation(employee(["MODERATE_LEARNING"]), obs())).toBe(false);
    expect(p.canReadObservation(employee(["PORTAL_ADMIN"]), obs())).toBe(false);
  });
  it("org visibility stays inside the tenant", () => {
    const o = obs({ visibility: "ORG" });
    expect(p.canReadObservation(client(ORG.a, "MEMBER", [], "colleague"), o)).toBe(true);
    expect(p.canReadObservation(client(ORG.b), o)).toBe(false);
  });
  it("moderators see community proposals only after submission", () => {
    const m = employee(["MODERATE_LEARNING"]);
    expect(p.canReadObservation(m, obs({ sharingProposal: "COMMUNITY", status: "DRAFT" }))).toBe(false);
    expect(p.canReadObservation(m, obs({ sharingProposal: "COMMUNITY", status: "SUBMITTED" }))).toBe(true);
    expect(p.canReadObservation(m, obs({ sharingProposal: "NONE", status: "SUBMITTED", visibility: "ORG" }))).toBe(false);
  });
  it("only the author can edit, and only drafts or returned items", () => {
    expect(p.canEditObservation(client(ORG.a), obs())).toBe(true);
    expect(p.canEditObservation(client(ORG.a), obs({ status: "PUBLISHED" }))).toBe(false);
    expect(p.canEditObservation(client(ORG.a, "CLIENT_ADMIN", [], "admin"), obs())).toBe(false);
  });
});

describe("client administration", () => {
  it("client admins manage only their own org and only client roles", () => {
    const admin = client(ORG.a, "CLIENT_ADMIN");
    expect(p.canManageMembers(admin, ORG.a, "MEMBER")).toBe(true);
    expect(p.canManageMembers(admin, ORG.a, "CLIENT_ADMIN")).toBe(true);
    expect(p.canManageMembers(admin, ORG.a, "EMPLOYEE")).toBe(false);
    expect(p.canManageMembers(admin, ORG.b, "MEMBER")).toBe(false);
    expect(p.canManageMembers(client(ORG.a), ORG.a, "MEMBER")).toBe(false);
  });
});

describe("shared learning access", () => {
  it("is for authenticated participants only", () => {
    expect(p.canAccessCommunity(ANONYMOUS)).toBe(false);
    expect(p.canAccessCommunity(client())).toBe(true);
    expect(p.canAccessCommunity(employee())).toBe(true);
  });
  it("clients see idea status only when shared", () => {
    expect(p.canReadIdeaStatus(client(), { ownerId: "x", visibleToClients: false })).toBe(false);
    expect(p.canReadIdeaStatus(client(), { ownerId: "x", visibleToClients: true })).toBe(true);
  });
});
