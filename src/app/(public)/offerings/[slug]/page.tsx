import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { getInternalNotes, getOfferingBySlug } from "@/server/repo/catalog";
import { Badge, Notice } from "@/components/ui";

export default async function OfferingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [offering, actor] = await Promise.all([getOfferingBySlug(slug), getActor()]);
  if (!offering) notFound();
  // Only returns notes when the server-side policy says the caller is an employee.
  const internal = await getInternalNotes(actor, slug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-medium tracking-wide text-brand uppercase">{offering.category}</p>
      <h1 className="mt-1 text-3xl font-semibold">{offering.name}</h1>
      <p className="mt-2 text-lg text-muted">{offering.tagline}</p>
      <p className="mt-6 leading-relaxed">{offering.description}</p>
      <div className="mt-8 flex gap-3">
        <Link href={`/demo?offering=${offering.slug}`} className="btn">
          Request a demo
        </Link>
        <Link href="/signin" className="btn-secondary">
          Client sandbox (sign in)
        </Link>
      </div>
      {internal && (
        <div className="mt-10">
          <Notice tone="amber">
            <div className="mb-1 flex items-center gap-2">
              <Badge tone="amber">Employee only</Badge> Internal prototype notes
            </div>
            {internal}
          </Notice>
        </div>
      )}
    </div>
  );
}
