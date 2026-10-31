import type { Audience, Grant, MembershipRole, ObsStatus, ObsVisibility, SharingProposal } from "@prisma/client";
import type { Actor, UserActor } from "./actor";

/*
 * Single source of truth for authorisation. Everything is deny-by-default:
 * a function returns true only when identity, active workspace and audience all permit it.
 * Navigation menus are derived from these functions, never the other way round.
 */

export function isUser(a: Actor): a is UserActor {
  return a.kind === "user";
}

/** Employee experience requires the Azentio workspace to be the active one. */
export function isEmployee(a: Actor): a is UserActor {
  return isUser(a) && a.isEmployee && a.active?.orgType === "AZENTIO";
}

export function isClientMember(a: Actor): a is UserActor {
  return isUser(a) && a.active?.orgType === "CLIENT";
}

export function isClientAdmin(a: Actor): a is UserActor {
  return isClientMember(a) && a.active!.role === "CLIENT_ADMIN";
}

function hasGrant(a: Actor, g: Grant): boolean {
  return isEmployee(a) && a.grants.includes(g);
}

export const canModerate = (a: Actor) => hasGrant(a, "MODERATE_LEARNING");
export const canPublishContent = (a: Actor) => hasGrant(a, "PUBLISH_CONTENT");
export const canManageIdeas = (a: Actor) => hasGrant(a, "PRODUCT_OWNER");
export const canAdminPortal = (a: Actor) => hasGrant(a, "PORTAL_ADMIN");

/** Approved shared learning is for authenticated participants only — never public. */
export function canAccessCommunity(a: Actor): boolean {
  return isEmployee(a) || isClientMember(a);
}

function hasSupportAccess(a: Actor, orgId: string | null | undefined): boolean {
  return !!orgId && isEmployee(a) && a.supportOrgIds.includes(orgId);
}

function entitled(a: UserActor, offeringId: string | null | undefined): boolean {
  return !offeringId || a.entitledOfferingIds.includes(offeringId);
}

export type ContentRef = {
  audience: Audience | null | undefined;
  orgId: string | null;
  offeringId: string | null;
  published: boolean;
};

export function canReadContent(a: Actor, c: ContentRef): boolean {
  if (!c.published && !canPublishContent(a)) return false;
  switch (c.audience) {
    case "PUBLIC":
      return true;
    case "EMPLOYEE":
      return isEmployee(a);
    case "CLIENTS":
      return (isClientMember(a) && entitled(a, c.offeringId)) || isEmployee(a);
    case "CLIENT_ORG":
      return (
        (isClientMember(a) && a.active!.orgId === c.orgId && entitled(a, c.offeringId)) ||
        hasSupportAccess(a, c.orgId)
      );
    default:
      // Missing or unknown audience metadata is a denial, not a public fallback.
      return false;
  }
}

export function canUseOffering(a: Actor, offeringId: string): boolean {
  return (isClientMember(a) && a.entitledOfferingIds.includes(offeringId)) || isEmployee(a);
}

export type ObservationRef = {
  authorId: string;
  orgId: string;
  visibility: ObsVisibility;
  sharingProposal: SharingProposal;
  status: ObsStatus;
};

export function isAuthor(a: Actor, o: ObservationRef): boolean {
  return isClientMember(a) && a.userId === o.authorId && a.active!.orgId === o.orgId;
}

export function canReadObservation(a: Actor, o: ObservationRef): boolean {
  if (isAuthor(a, o)) return true;
  if (isClientMember(a) && a.active!.orgId === o.orgId && o.visibility === "ORG") return true;
  // Moderators see only what an author explicitly proposed for community sharing — never unsubmitted drafts.
  if (canModerate(a) && o.sharingProposal === "COMMUNITY" && o.status !== "DRAFT") return true;
  return hasSupportAccess(a, o.orgId);
}

export function canEditObservation(a: Actor, o: ObservationRef): boolean {
  return isAuthor(a, o) && (o.status === "DRAFT" || o.status === "RETURNED");
}

export function canCreateObservation(a: Actor): boolean {
  return isClientMember(a);
}

const CLIENT_ASSIGNABLE: MembershipRole[] = ["MEMBER", "CLIENT_ADMIN"];

/** Client admins manage only their own org and only client roles; platform roles are never assignable here. */
export function canManageMembers(a: Actor, orgId: string, role?: MembershipRole): boolean {
  if (role && !CLIENT_ASSIGNABLE.includes(role)) return false;
  if (isClientAdmin(a) && a.active!.orgId === orgId) return true;
  return canAdminPortal(a);
}

export type IdeaRef = { ownerId: string; visibleToClients: boolean };

export function canReadIdeaInternal(a: Actor, i: IdeaRef): boolean {
  return canManageIdeas(a) || (isEmployee(a) && a.userId === i.ownerId);
}

export function canEditIdea(a: Actor, i: IdeaRef): boolean {
  return canManageIdeas(a) && (a as UserActor).userId === i.ownerId;
}

export function canReadIdeaStatus(a: Actor, i: IdeaRef): boolean {
  return isEmployee(a) || (isClientMember(a) && i.visibleToClients);
}

export function canReadAudit(a: Actor): boolean {
  return canAdminPortal(a);
}
