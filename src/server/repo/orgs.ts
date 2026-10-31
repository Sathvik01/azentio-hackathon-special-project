import "server-only";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import type { Grant, MembershipRole } from "@prisma/client";
import { prisma } from "@/server/db";
import type { Actor, UserActor } from "@/server/policy/actor";
import { canAdminPortal, canManageMembers, canReadAudit, isClientAdmin, isUser } from "@/server/policy";
import { deny, InvalidRequest } from "@/server/errors";
import { audit } from "./platform";

export const TERMS_VERSION = "2026-10";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function maskEmail(email: string) {
  const [u, d] = email.split("@");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(1, u.length - 2))}@${d}`;
}

// ───────── Client org administration ─────────

/** Client admins manage their *active* org only; the org ID is never taken from the request. */
function managedOrgId(actor: Actor, requestedOrgId?: string): string {
  if (isClientAdmin(actor)) return actor.active!.orgId;
  if (canAdminPortal(actor) && requestedOrgId) return requestedOrgId;
  deny();
}

export async function getOrgAdminView(actor: Actor, requestedOrgId?: string) {
  const orgId = managedOrgId(actor, requestedOrgId);
  const [org, members, invitations] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.membership.findMany({ where: { orgId }, include: { user: { select: { email: true, name: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.invitation.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } }),
  ]);
  const now = new Date();
  return {
    org,
    members,
    invitations: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      state: i.acceptedAt ? "Accepted" : i.revokedAt ? "Revoked" : i.expiresAt < now ? "Expired" : "Pending",
      expiresAt: i.expiresAt,
    })),
  };
}

async function sendInviteEmail(to: string, orgName: string, role: MembershipRole, link: string, idempotencyKey: string) {
  const outbox = await prisma.outbox.create({ data: { idempotencyKey, channel: "email", recipient: to, subject: `Invitation to ${orgName} on azentio.ai` } });
  try {
    await nodemailer.createTransport(process.env.EMAIL_SERVER).sendMail({
      to,
      from: process.env.EMAIL_FROM,
      subject: `Invitation to ${orgName} on azentio.ai`,
      text: `You have been invited to join ${orgName} on azentio.ai as ${role === "CLIENT_ADMIN" ? "client administrator" : "member"}.\n\nAccept (single use, expires in 7 days): ${link}\n\nSign in with this email address to accept. Joining a workspace is not consent to share or train on your data.`,
    });
    // SENT = handed to the configured SMTP server. It is not a delivery confirmation.
    await prisma.outbox.update({ where: { id: outbox.id }, data: { status: "SENT" } });
  } catch {
    await prisma.outbox.update({ where: { id: outbox.id }, data: { status: "FAILED" } });
  }
}

export async function inviteMember(actor: Actor, email: string, role: MembershipRole, requestedOrgId?: string) {
  const orgId = managedOrgId(actor, requestedOrgId);
  if (!canManageMembers(actor, orgId, role)) deny();
  const a = actor as UserActor;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org || org.type !== "CLIENT") deny();
  if (email.endsWith("@azentio.com")) throw new InvalidRequest("Employees are provisioned by a portal administrator, not invited into client workspaces.");

  const token = randomBytes(32).toString("base64url");
  const inv = await prisma.$transaction(async (tx) => {
    await tx.invitation.updateMany({ where: { orgId, email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    const inv = await tx.invitation.create({
      data: { orgId, email, role, tokenHash: hash(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS), invitedById: a.userId },
    });
    await audit(tx, a.userId, "invitation.create", "Invitation", inv.id, { orgId, role, email: maskEmail(email) });
    return inv;
  });
  await sendInviteEmail(email, org.name, role, `${process.env.AUTH_URL ?? "http://localhost:3000"}/invite/${token}`, `invite:${inv.id}`);
  return inv.id;
}

export async function revokeInvitation(actor: Actor, invitationId: string) {
  const inv = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!inv || !canManageMembers(actor, inv.orgId) || managedOrgId(actor, inv.orgId) !== inv.orgId) deny();
  await prisma.$transaction(async (tx) => {
    await tx.invitation.update({ where: { id: inv.id }, data: { revokedAt: new Date() } });
    await audit(tx, (actor as UserActor).userId, "invitation.revoke", "Invitation", inv.id);
  });
}

export async function setMembership(actor: Actor, membershipId: string, change: { role?: MembershipRole; revoke?: boolean }) {
  const m = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!m || managedOrgId(actor, m.orgId) !== m.orgId || !canManageMembers(actor, m.orgId, change.role)) deny();
  if (m.role === "EMPLOYEE") deny();
  const a = actor as UserActor;
  if (m.userId === a.userId) throw new InvalidRequest("You cannot change your own membership.");
  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: m.id },
      data: change.revoke ? { status: "REVOKED" } : { role: change.role, status: "ACTIVE" },
    });
    if (change.revoke) await tx.session.deleteMany({ where: { userId: m.userId } });
    await audit(tx, a.userId, change.revoke ? "membership.revoke" : "membership.role", "Membership", m.id, { from: m.role, to: change.role ?? null });
  });
}

// ───────── Invitation acceptance ─────────

export async function getInvitationByToken(token: string) {
  const inv = await prisma.invitation.findUnique({ where: { tokenHash: hash(token) }, include: { org: true } });
  if (!inv) return null;
  const state = inv.acceptedAt ? "used" : inv.revokedAt ? "revoked" : inv.expiresAt < new Date() ? "expired" : "valid";
  return { orgName: inv.org.name, role: inv.role, maskedEmail: maskEmail(inv.email), state, email: inv.email } as const;
}

/** Accept only for the exact verified account the invitation names; single use. */
export async function acceptInvitation(actor: Actor, token: string) {
  if (!isUser(actor)) deny();
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invitation.findUnique({ where: { tokenHash: hash(token) } });
    if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt < new Date()) throw new InvalidRequest("This invitation is no longer valid.");
    if (inv.email.toLowerCase() !== actor.email.toLowerCase()) throw new InvalidRequest("This invitation was issued to a different email address.");
    await tx.membership.upsert({
      where: { userId_orgId: { userId: actor.userId, orgId: inv.orgId } },
      update: { role: inv.role, status: "ACTIVE" },
      create: { userId: actor.userId, orgId: inv.orgId, role: inv.role },
    });
    await tx.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
    await tx.termsAcceptance.upsert({
      where: { userId_orgId_version: { userId: actor.userId, orgId: inv.orgId, version: TERMS_VERSION } },
      update: {},
      create: { userId: actor.userId, orgId: inv.orgId, version: TERMS_VERSION },
    });
    await audit(tx, actor.userId, "invitation.accept", "Invitation", inv.id, { orgId: inv.orgId, role: inv.role });
    return inv.orgId;
  });
}

// ───────── Portal administration (privileged, audited) ─────────

function requireAdmin(actor: Actor): UserActor {
  if (!canAdminPortal(actor)) deny();
  return actor as UserActor;
}

export async function getAdminOverview(actor: Actor) {
  requireAdmin(actor);
  const [orgs, users, offerings, provisions] = await Promise.all([
    prisma.organization.findMany({ include: { entitlements: true, _count: { select: { memberships: true } } }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ include: { grants: true, memberships: { include: { org: true } } }, orderBy: { email: "asc" } }),
    prisma.offering.findMany({ orderBy: { name: "asc" } }),
    prisma.employeeProvision.findMany(),
  ]);
  return { orgs, users, offerings, provisions };
}

export async function provisionEmployee(actor: Actor, email: string, name: string) {
  const a = requireAdmin(actor);
  const e = email.trim().toLowerCase();
  if (!e.endsWith("@azentio.com")) throw new InvalidRequest("Employee identities must be @azentio.com.");
  await prisma.$transaction(async (tx) => {
    const azentio = await tx.organization.findFirstOrThrow({ where: { type: "AZENTIO" } });
    await tx.employeeProvision.upsert({ where: { email: e }, update: {}, create: { email: e, approvedById: a.userId } });
    const user = await tx.user.upsert({ where: { email: e }, update: {}, create: { email: e, name } });
    await tx.membership.upsert({
      where: { userId_orgId: { userId: user.id, orgId: azentio.id } },
      update: { status: "ACTIVE" },
      create: { userId: user.id, orgId: azentio.id, role: "EMPLOYEE" },
    });
    await audit(tx, a.userId, "employee.provision", "User", user.id, { email: e });
  });
}

export async function grantRole(actor: Actor, userId: string, grant: Grant, opts: { orgId?: string; hours?: number; reason?: string }) {
  const a = requireAdmin(actor);
  if (grant === "SUPPORT_ACCESS" && (!opts.orgId || !opts.reason)) throw new InvalidRequest("Support access needs a client org and a reason.");
  await prisma.$transaction(async (tx) => {
    const g = await tx.roleGrant.create({
      data: {
        userId,
        grant,
        orgId: grant === "SUPPORT_ACCESS" ? opts.orgId : null,
        expiresAt: grant === "SUPPORT_ACCESS" ? new Date(Date.now() + (opts.hours ?? 4) * 3600_000) : null,
        reason: opts.reason,
        grantedById: a.userId,
      },
    });
    await audit(tx, a.userId, "grant.create", "RoleGrant", g.id, { userId, grant, orgId: g.orgId, expiresAt: g.expiresAt?.toISOString() ?? null, reason: opts.reason ?? null });
  });
}

export async function revokeGrant(actor: Actor, grantId: string) {
  const a = requireAdmin(actor);
  await prisma.$transaction(async (tx) => {
    const g = await tx.roleGrant.delete({ where: { id: grantId } });
    await audit(tx, a.userId, "grant.revoke", "RoleGrant", g.id, { userId: g.userId, grant: g.grant });
  });
}

export async function setEntitlement(actor: Actor, orgId: string, offeringId: string, enabled: boolean) {
  const a = requireAdmin(actor);
  await prisma.$transaction(async (tx) => {
    if (enabled) await tx.entitlement.upsert({ where: { orgId_offeringId: { orgId, offeringId } }, update: {}, create: { orgId, offeringId } });
    else await tx.entitlement.deleteMany({ where: { orgId, offeringId } });
    await audit(tx, a.userId, enabled ? "entitlement.grant" : "entitlement.revoke", "Organization", orgId, { offeringId });
  });
}

export async function listAudit(actor: Actor, take = 200) {
  if (!canReadAudit(actor)) deny();
  return prisma.auditEvent.findMany({ orderBy: { at: "desc" }, take });
}
