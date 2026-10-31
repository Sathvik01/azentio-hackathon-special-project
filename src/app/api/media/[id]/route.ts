import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getActor } from "@/server/auth/actor";
import { getMediaForActor } from "@/server/repo/catalog";
import { NotFoundOrDenied } from "@/server/errors";

const MEDIA_ROOT = path.join(process.cwd(), "storage", "media");

/** Every media request — including direct URL hits — re-checks the parent content's audience. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const m = await getMediaForActor(await getActor(), id);
    const file = path.resolve(MEDIA_ROOT, m.path);
    if (!file.startsWith(MEDIA_ROOT + path.sep)) throw new NotFoundOrDenied();
    const data = await readFile(file);
    return new NextResponse(data, {
      headers: { "content-type": m.mimeType, "cache-control": "private, no-store", "content-disposition": `inline; filename="${m.fileName}"` },
    });
  } catch (e) {
    if (e instanceof NotFoundOrDenied || (e as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw e;
  }
}
