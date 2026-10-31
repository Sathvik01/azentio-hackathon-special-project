import type { Grant } from "@prisma/client";
import { buildActor, type ActorData, type UserActor } from "@/server/policy/actor";

export const ORG = { azentio: "org-az", a: "org-a", b: "org-b" };

export function employee(grants: Grant[] = [], extra: Partial<ActorData> = {}): UserActor {
  return buildActor(
    {
      userId: "emp",
      email: "e@azentio.com",
      name: "Emp",
      employeeProvisioned: true,
      memberships: [{ orgId: ORG.azentio, orgName: "Azentio", orgType: "AZENTIO", role: "EMPLOYEE" }],
      grants: grants.map((grant) => ({ grant, orgId: null, expiresAt: null })),
      entitlementsByOrg: {},
      ...extra,
    },
    ORG.azentio,
  );
}

export function client(org = ORG.a, role: "MEMBER" | "CLIENT_ADMIN" = "MEMBER", entitled: string[] = ["off-1"], userId = `u-${org}`): UserActor {
  return buildActor(
    {
      userId,
      email: `${userId}@client.example`,
      name: "Client",
      employeeProvisioned: false,
      memberships: [{ orgId: org, orgName: org, orgType: "CLIENT", role }],
      grants: [],
      entitlementsByOrg: { [org]: entitled },
    },
    org,
  );
}
