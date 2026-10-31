import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { ANONYMOUS, buildActor, type Actor, type UserActor } from "@/server/policy/actor";
import { loadActorData } from "@/server/repo/identity";
import { deny } from "@/server/errors";

export const ACTIVE_ORG_COOKIE = "azn_active_org";

/** Resolves the caller on every request: session → memberships/grants from DB → validated active workspace. */
export const getActor = cache(async (): Promise<Actor> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return ANONYMOUS;
  const data = await loadActorData(userId);
  if (!data) return ANONYMOUS;
  const requested = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  return buildActor(data, requested);
});

export async function requireUser(): Promise<UserActor> {
  const a = await getActor();
  if (a.kind !== "user") deny();
  return a;
}
