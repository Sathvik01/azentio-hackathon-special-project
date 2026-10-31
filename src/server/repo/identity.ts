import "server-only";
import { prisma } from "@/server/db";
import type { ActorData } from "@/server/policy/actor";

export async function loadActorData(userId: string): Promise<ActorData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: { where: { status: "ACTIVE" }, include: { org: true } },
      grants: true,
    },
  });
  if (!user) return null;

  const provision = await prisma.employeeProvision.findUnique({ where: { email: user.email.toLowerCase() } });
  const clientOrgIds = user.memberships.filter((m) => m.org.type === "CLIENT").map((m) => m.orgId);
  const entitlements = await prisma.entitlement.findMany({ where: { orgId: { in: clientOrgIds } } });

  const entitlementsByOrg: Record<string, string[]> = {};
  for (const e of entitlements) (entitlementsByOrg[e.orgId] ??= []).push(e.offeringId);

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    // emailVerified is set by Auth.js once a magic link has been used.
    employeeProvisioned: !!provision && !!user.emailVerified,
    memberships: user.memberships.map((m) => ({ orgId: m.orgId, orgName: m.org.name, orgType: m.org.type, role: m.role })),
    grants: user.grants.map((g) => ({ grant: g.grant, orgId: g.orgId, expiresAt: g.expiresAt })),
    entitlementsByOrg,
  };
}

/** Who may be sent a sign-in link at all. An arbitrary address never gets a trusted membership by signing in. */
export async function isKnownIdentity(rawEmail: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return false;
  const [provision, member, invite] = await Promise.all([
    prisma.employeeProvision.findUnique({ where: { email } }),
    prisma.membership.findFirst({ where: { user: { email }, status: "ACTIVE" } }),
    prisma.invitation.findFirst({ where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  return !!(provision || member || invite);
}
