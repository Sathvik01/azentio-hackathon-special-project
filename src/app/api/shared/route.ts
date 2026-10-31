import type { ObsType } from "@prisma/client";
import { getActor } from "@/server/auth/actor";
import { searchShared } from "@/server/repo/shared";
import { json } from "../_lib";

/** Search API for approved shared learning. Same visibility + cohort suppression as the UI. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  return json(async () =>
    searchShared(await getActor(), {
      q: u.get("q") ?? undefined,
      offeringId: u.get("offering") ?? undefined,
      industry: u.get("industry") ?? undefined,
      region: u.get("region") ?? undefined,
      period: u.get("period") ?? undefined,
      type: (u.get("type") as ObsType) ?? undefined,
    }),
  );
}
