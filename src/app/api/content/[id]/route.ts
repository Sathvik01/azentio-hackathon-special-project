import { getActor } from "@/server/auth/actor";
import { getContent } from "@/server/repo/catalog";
import { json } from "../../_lib";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return json(async () => getContent(await getActor(), id));
}
