import type { ObsStatus } from "@prisma/client";

export type ObsAction =
  | "submit"
  | "claim"
  | "return"
  | "reject"
  | "publish"
  | "suspend"
  | "reinstate"
  | "remove"
  | "withdraw"
  | "supersede";

export type TransitionActor = "author" | "moderator" | "system";

type Transition = { from: ObsStatus[]; action: ObsAction; to: ObsStatus; by: TransitionActor };

/** The only allowed lifecycle moves. Anything not listed is rejected. */
export const TRANSITIONS: readonly Transition[] = [
  { from: ["DRAFT", "RETURNED"], action: "submit", to: "SUBMITTED", by: "author" },
  { from: ["SUBMITTED"], action: "claim", to: "IN_REVIEW", by: "moderator" },
  { from: ["SUBMITTED", "IN_REVIEW"], action: "return", to: "RETURNED", by: "moderator" },
  { from: ["SUBMITTED", "IN_REVIEW"], action: "reject", to: "REJECTED", by: "moderator" },
  { from: ["SUBMITTED", "IN_REVIEW"], action: "publish", to: "PUBLISHED", by: "moderator" },
  { from: ["PUBLISHED"], action: "suspend", to: "SUSPENDED", by: "moderator" },
  { from: ["SUSPENDED"], action: "reinstate", to: "PUBLISHED", by: "moderator" },
  { from: ["SUSPENDED"], action: "remove", to: "WITHDRAWN", by: "moderator" },
  { from: ["SUBMITTED", "IN_REVIEW", "RETURNED", "PUBLISHED", "SUSPENDED"], action: "withdraw", to: "WITHDRAWN", by: "author" },
  { from: ["PUBLISHED", "SUSPENDED"], action: "supersede", to: "SUPERSEDED", by: "system" },
];

export class InvalidTransition extends Error {
  constructor(from: ObsStatus, action: ObsAction, by: TransitionActor) {
    super(`Cannot ${action} from ${from} as ${by}`);
    this.name = "InvalidTransition";
  }
}

export function nextStatus(from: ObsStatus, action: ObsAction, by: TransitionActor): ObsStatus {
  const t = TRANSITIONS.find((t) => t.action === action && t.by === by && t.from.includes(from));
  if (!t) throw new InvalidTransition(from, action, by);
  return t.to;
}

export function allowedActions(from: ObsStatus, by: TransitionActor): ObsAction[] {
  return TRANSITIONS.filter((t) => t.by === by && t.from.includes(from)).map((t) => t.action);
}

export const STATUS_LABEL: Record<ObsStatus, string> = {
  DRAFT: "Private draft",
  SUBMITTED: "Submitted for review",
  IN_REVIEW: "In review",
  RETURNED: "Returned for clarification",
  REJECTED: "Not published",
  PUBLISHED: "Published (shared copy)",
  SUSPENDED: "Temporarily unpublished",
  WITHDRAWN: "Withdrawn",
  SUPERSEDED: "Replaced by newer version",
};
