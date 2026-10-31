/*
 * HTTP-level acceptance tests against the running app (npm run dev). Sessions are created directly
 * in the database (database-session strategy), so no browser or email round-trip is needed.
 * Run: npm run test:acceptance   (APP_URL defaults to http://localhost:3000)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const db = new PrismaClient();
const tokens: string[] = [];

async function session(email: string) {
  const user = await db.user.update({ where: { email }, data: { emailVerified: new Date() } });
  const token = `test-${randomBytes(16).toString("hex")}`;
  await db.session.create({ data: { sessionToken: token, userId: user.id, expires: new Date(Date.now() + 3600_000) } });
  tokens.push(token);
  return token;
}

const get = (path: string, token?: string, extraCookie = "") =>
  fetch(`${BASE}${path}`, { redirect: "manual", headers: { cookie: [token && `authjs.session-token=${token}`, extraCookie].filter(Boolean).join("; ") } });

let nate: string, hema: string, asha: string, maya: string;

beforeAll(async () => {
  [nate, hema, asha, maya] = await Promise.all([
    session("nate.member@northwind.example"),
    session("hema.member@harbor.example"),
    session("asha.employee@azentio.com"),
    session("maya.multi@consult.example"),
  ]);
});

afterAll(async () => {
  await db.session.deleteMany({ where: { sessionToken: { in: tokens } } });
  await db.$disconnect();
});

describe("direct API and media requests are enforced on the server", () => {
  it("anonymous: no private API, media or portal access", async () => {
    const empMedia = await db.mediaAsset.findFirstOrThrow({ where: { content: { audience: "EMPLOYEE" } } });
    const pubMedia = await db.mediaAsset.findFirstOrThrow({ where: { content: { audience: "PUBLIC" } } });
    expect((await get(`/api/media/${empMedia.id}`)).status).toBe(404);
    expect((await get(`/api/media/${pubMedia.id}`)).status).toBe(200);
    expect((await get("/api/shared")).status).toBe(404);
    expect((await get("/portal/learning")).status).toBe(307);
  });

  it("client A cannot fetch client B's observation (IDOR)", async () => {
    const hemaUser = await db.user.findUniqueOrThrow({ where: { email: "hema.member@harbor.example" } });
    const harborObs = await db.observation.findFirstOrThrow({ where: { authorId: hemaUser.id } });
    expect((await get(`/api/observations/${harborObs.id}`, nate)).status).toBe(404);
    expect((await get(`/api/observations/${harborObs.id}`, hema)).status).toBe(200);
  });

  it("clients cannot load employee media, content or pages by URL", async () => {
    const empMedia = await db.mediaAsset.findFirstOrThrow({ where: { content: { audience: "EMPLOYEE" } } });
    const empContent = await db.contentItem.findFirstOrThrow({ where: { audience: "EMPLOYEE" } });
    expect((await get(`/api/media/${empMedia.id}`, nate)).status).toBe(404);
    expect((await get(`/api/content/${empContent.id}`, nate)).status).toBe(404);
    expect((await get("/portal/employee/playground", nate)).status).toBe(404);
    expect((await get("/portal/moderation", asha)).status).toBe(404); // employee without moderator grant
    expect((await get(`/api/media/${empMedia.id}`, asha)).status).toBe(200);
  });

  it("a forged active-workspace cookie is ignored", async () => {
    const harbor = await db.organization.findUniqueOrThrow({ where: { slug: "harbor" } });
    const res = await get("/portal/client", nate, `azn_active_org=${harbor.id}`);
    const html = await res.text();
    expect(html).toContain("Northwind Bank");
    expect(html).not.toContain("Harbor Finance</p>");
  });

  it("multi-membership users must pick a workspace explicitly", async () => {
    const res = await get("/portal/client", maya);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/workspace");
  });

  it("shared search payload carries no tenant or author identifiers", async () => {
    const res = await get("/api/shared?q=seasonal", hema);
    expect(res.status).toBe(200);
    const body = await res.text();
    const orgIds = (await db.organization.findMany()).map((o) => o.id);
    for (const id of orgIds) expect(body).not.toContain(id);
    expect(body).not.toMatch(/authorId|orgId|reviewerNote/);
  });

  it("client AIRA never cites employee-only material", async () => {
    const res = await fetch(`${BASE}/api/aira`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `authjs.session-token=${nate}` },
      body: JSON.stringify({ question: "What is Project Lighthouse?" }),
    });
    const a = await res.json();
    expect(JSON.stringify(a.citations)).not.toMatch(/Lighthouse/);
    expect(a.scope).toMatch(/Client scope/);
  });

  it("session endpoint never exposes the session token", async () => {
    const body = await (await get("/api/auth/session", nate)).text();
    expect(body).not.toContain(nate);
  });
});
