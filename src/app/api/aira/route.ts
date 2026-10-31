import { getActor } from "@/server/auth/actor";
import { askAira } from "@/server/aira";
import { airaInput } from "@/lib/schemas";
import { json } from "../_lib";

export async function POST(req: Request) {
  return json(async () => {
    const { question } = airaInput.parse(await req.json());
    return askAira(await getActor(), question);
  });
}
