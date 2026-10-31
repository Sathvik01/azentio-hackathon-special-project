import "server-only";
import { prisma } from "@/server/db";

/** Maps FTS hit IDs to public refs, preserving rank order. Only PUBLISHED rows are returned. */
export async function prismaSharedRefsByIds(ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const rows = await prisma.sharedObservation.findMany({ where: { id: { in: ids }, status: "PUBLISHED" }, select: { id: true, publicRef: true } });
  const byId = new Map(rows.map((r) => [r.id, r.publicRef]));
  return ids.map((id) => byId.get(id)).filter((r): r is string => !!r);
}
