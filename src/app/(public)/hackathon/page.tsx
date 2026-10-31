import { hackathonRegisterAction } from "@/server/actions/public";
import { Flash, PageHeader, type SP } from "@/components/ui";
import { LIMITS } from "@/lib/schemas";

export const metadata = { title: "Hackathon" };

export default async function HackathonPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader eyebrow="Event · 2026" title="azentio.ai Hackathon 2026" subtitle="Build intelligence. Create shared value. Register your interest and team." />
      <Flash searchParams={sp} />
      <dl className="mb-6 border-t-2 border-ink bg-white">
        {[
          ["Format", "Two-day build sprint, hybrid"],
          ["Data", "Synthetic datasets only"],
          ["Themes", "Collective learning, explainable AI, document intelligence"],
        ].map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8rem_minmax(0,1fr)] border-b border-line px-4 py-2.5 text-sm">
            <dt className="font-mono text-xs tracking-wider text-muted uppercase">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <form action={hackathonRegisterAction} className="card space-y-4">
        <input type="hidden" name="eventSlug" value="hackathon-2026" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required maxLength={LIMITS.name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="team">Team name (optional)</label>
          <input id="team" name="team" maxLength={LIMITS.name} className="input" />
        </div>
        <button className="btn">Register interest</button>
      </form>
    </div>
  );
}
