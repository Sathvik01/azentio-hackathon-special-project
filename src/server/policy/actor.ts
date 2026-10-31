import type { Grant, MembershipRole, OrgType } from "@prisma/client";

export type ActorMembership = {
  orgId: string;
  orgName: string;
  orgType: OrgType;
  role: MembershipRole;
};

export type AnonymousActor = { kind: "anonymous" };

export type UserActor = {
  kind: "user";
  userId: string;
  email: string;
  name: string | null;
  /** Verified @azentio.com identity + approved provision + active Azentio membership. */
  isEmployee: boolean;
  /** Unexpired platform grants. Only effective while the Azentio workspace is active. */
  grants: Grant[];
  /** Client orgs this user holds an explicit, unexpired support/moderation authorisation for. */
  supportOrgIds: string[];
  memberships: ActorMembership[];
  /** Validated server-side against memberships; null means the user must pick a workspace. */
  active: ActorMembership | null;
  /** Offerings the active client org is entitled to. */
  entitledOfferingIds: string[];
};

export type Actor = AnonymousActor | UserActor;

export const ANONYMOUS: AnonymousActor = { kind: "anonymous" };

export type ActorData = {
  userId: string;
  email: string;
  name: string | null;
  employeeProvisioned: boolean;
  memberships: ActorMembership[];
  grants: { grant: Grant; orgId: string | null; expiresAt: Date | null }[];
  entitlementsByOrg: Record<string, string[]>;
};

const EMPLOYEE_DOMAIN = "@azentio.com";

/** Pure: turns loaded rows + the requested workspace cookie into an Actor. Never trusts the cookie blindly. */
export function buildActor(data: ActorData, requestedOrgId: string | undefined, now = new Date()): UserActor {
  const live = data.grants.filter((g) => !g.expiresAt || g.expiresAt > now);
  const requested = data.memberships.find((m) => m.orgId === requestedOrgId);
  const active = requested ?? (data.memberships.length === 1 ? data.memberships[0] : null);

  const isEmployee =
    data.email.toLowerCase().endsWith(EMPLOYEE_DOMAIN) &&
    data.employeeProvisioned &&
    data.memberships.some((m) => m.orgType === "AZENTIO" && m.role === "EMPLOYEE");

  return {
    kind: "user",
    userId: data.userId,
    email: data.email,
    name: data.name,
    isEmployee,
    grants: isEmployee ? [...new Set(live.filter((g) => g.grant !== "SUPPORT_ACCESS").map((g) => g.grant))] : [],
    supportOrgIds: isEmployee
      ? live.filter((g) => g.grant === "SUPPORT_ACCESS" && g.orgId).map((g) => g.orgId as string)
      : [],
    memberships: data.memberships,
    active,
    entitledOfferingIds: active?.orgType === "CLIENT" ? (data.entitlementsByOrg[active.orgId] ?? []) : [],
  };
}
