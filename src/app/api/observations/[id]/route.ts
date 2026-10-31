import { getActor } from "@/server/auth/actor";
import { getObservation } from "@/server/repo/observations";
import { json } from "../../_lib";

/** Direct API access to a private source record goes through the same policy as the UI. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return json(async () => {
    const r = await getObservation(await getActor(), id);
    const o = r.observation;
    return {
      id: o.id,
      title: o.title,
      body: o.body,
      status: o.status,
      visibility: o.visibility,
      sharingProposal: o.sharingProposal,
      version: o.version,
      decisions: r.decisions,
      sharedCopies: r.sharedCopies,
    };
  });
}
