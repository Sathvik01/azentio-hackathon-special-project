import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { InvalidRequest, NotFoundOrDenied } from "@/server/errors";

/** Uniform JSON error mapping: denied and missing are both 404 so IDs can't be probed. */
export async function json<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json(await fn(), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof NotFoundOrDenied) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (e instanceof ZodError || e instanceof InvalidRequest) return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    throw e;
  }
}
