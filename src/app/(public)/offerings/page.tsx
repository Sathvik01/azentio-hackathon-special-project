import Link from "next/link";
import { listOfferings } from "@/server/repo/catalog";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Offerings" };

export default async function OfferingsPage() {
  const offerings = await listOfferings();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Catalogue" title="Offerings" subtitle="AI-assisted products for financial institutions. Sandbox demonstrations use synthetic data only." />
      <div className="border-t-2 border-ink">
        {offerings.map((o, i) => (
          <Link
            key={o.id}
            href={`/offerings/${o.slug}`}
            className="group grid gap-2 border-b border-line py-5 hover:bg-signal-soft md:grid-cols-[3rem_16rem_minmax(0,1fr)_1.5rem] md:gap-6"
          >
            <span className="data text-sm text-brand">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="text-lg font-semibold group-hover:text-brand">{o.name}</p>
              <p className="font-mono text-xs tracking-wider text-muted uppercase">{o.category}</p>
            </div>
            <p className="text-sm leading-relaxed text-muted">{o.description}</p>
            <span className="hidden text-brand md:block">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
