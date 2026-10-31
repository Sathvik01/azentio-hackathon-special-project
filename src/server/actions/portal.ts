"use server";

import { cookies } from "next/headers";
import type { Grant } from "@prisma/client";
import { getActor, requireUser, ACTIVE_ORG_COOKIE } from "@/server/auth/actor";
import { contentInput, ideaInput, ideaStatusInput, inviteInput, themeInput } from "@/lib/schemas";
import * as insights from "@/server/repo/insights";
import * as orgs from "@/server/repo/orgs";
import * as catalog from "@/server/repo/catalog";
import * as playground from "@/server/repo/playground";
import { deny, InvalidRequest } from "@/server/errors";
import { act, formObject, str } from "./util";

// ───────── Workspace ─────────

/** The cookie only *requests* a workspace; getActor() re-validates it against memberships on every request. */
export async function switchWorkspaceAction(fd: FormData) {
  await act("/workspace", async () => {
    const a = await requireUser();
    const orgId = str(fd, "orgId");
    if (!a.memberships.some((m) => m.orgId === orgId)) deny();
    (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
    return "/portal";
  });
}

export async function acceptInvitationAction(token: string, fd: FormData) {
  await act(`/invite/${token}`, async () => {
    if (str(fd, "terms") !== "on") throw new InvalidRequest("Please review and accept the workspace terms.");
    const orgId = await orgs.acceptInvitation(await getActor(), token);
    (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
    return "/portal/client";
  }, "Welcome! You joined the workspace. Nothing you write is shared unless you choose to.");
}

// ───────── Client org admin ─────────

export async function inviteAction(fd: FormData) {
  await act("/portal/client/admin", async () => {
    const i = inviteInput.parse(formObject(fd));
    await orgs.inviteMember(await getActor(), i.email, i.role);
  }, "Invitation created and handed to the mail server (see Mailpit). Delivery is not confirmed.");
}

export async function revokeInvitationAction(id: string) {
  await act("/portal/client/admin", async () => orgs.revokeInvitation(await getActor(), id), "Invitation revoked.");
}

export async function setMemberRoleAction(membershipId: string, fd: FormData) {
  await act("/portal/client/admin", async () => {
    const role = inviteInput.shape.role.parse(str(fd, "role"));
    await orgs.setMembership(await getActor(), membershipId, { role });
  }, "Role updated.");
}

export async function revokeMemberAction(membershipId: string) {
  await act("/portal/client/admin", async () => orgs.setMembership(await getActor(), membershipId, { revoke: true }), "Membership revoked and sessions ended.");
}

// ───────── Themes & ideas ─────────

export async function createThemeAction(fd: FormData) {
  await act("/portal/ideas", async () => {
    const t = await insights.createTheme(await getActor(), themeInput.parse({ ...formObject(fd), refs: fd.getAll("refs") }));
    return `/portal/learning/themes/${t.id}`;
  }, "Theme created.");
}

export async function createIdeaAction(fd: FormData) {
  await act("/portal/ideas", async () => {
    const i = await insights.createIdea(await getActor(), ideaInput.parse({ ...formObject(fd), refs: fd.getAll("refs") }));
    return `/portal/ideas/${i.id}`;
  }, "Improvement idea created.");
}

export async function changeIdeaStatusAction(id: string, fd: FormData) {
  await act(`/portal/ideas/${id}`, async () => insights.changeIdeaStatus(await getActor(), id, ideaStatusInput.parse(formObject(fd))), "Status updated and audited.");
}

// ───────── Content publishing ─────────

export async function saveContentAction(fd: FormData) {
  await act("/portal/publish", async () => {
    const c = contentInput.parse(formObject(fd));
    await catalog.saveContent(await getActor(), { ...c, id: c.id || undefined, startsAt: c.startsAt || null });
  }, "Content saved.");
}

// ───────── Portal admin ─────────

export async function provisionEmployeeAction(fd: FormData) {
  await act("/portal/admin", async () => orgs.provisionEmployee(await getActor(), str(fd, "email"), str(fd, "name")), "Employee provisioned.");
}

export async function grantAction(fd: FormData) {
  await act("/portal/admin", async () =>
    orgs.grantRole(await getActor(), str(fd, "userId"), str(fd, "grant") as Grant, {
      orgId: str(fd, "orgId") || undefined,
      hours: Number(str(fd, "hours")) || undefined,
      reason: str(fd, "reason") || undefined,
    }), "Grant recorded in the audit log.");
}

export async function revokeGrantAction(id: string) {
  await act("/portal/admin", async () => orgs.revokeGrant(await getActor(), id), "Grant revoked.");
}

export async function entitlementAction(orgId: string, offeringId: string, enabled: boolean) {
  await act("/portal/admin", async () => orgs.setEntitlement(await getActor(), orgId, offeringId, enabled));
}

// ───────── Playground ─────────

export async function runScenarioAction(back: string, fd: FormData) {
  await act(back, async () => {
    const r = await playground.runScenario(await getActor(), str(fd, "scenarioId"));
    return `${back}?run=${r.id}`;
  });
}

export async function runFeedbackAction(back: string, runId: string, fd: FormData) {
  await act(`${back}?run=${runId}`, async () =>
    playground.saveRunFeedback(await getActor(), runId, { rating: str(fd, "rating"), comment: str(fd, "comment").slice(0, 1000) }), "Thanks for the feedback.");
}
