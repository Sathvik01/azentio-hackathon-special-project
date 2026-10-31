import { demoRequestAction } from "@/server/actions/public";
import { listOfferings } from "@/server/repo/catalog";
import { Flash, PageHeader, type SP } from "@/components/ui";
import { LIMITS } from "@/lib/schemas";

export const metadata = { title: "Request a demo" };

export default async function DemoPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const offerings = await listOfferings();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader title="Request a demo" subtitle="Tell us what you'd like to see. Please don't include customer or account information." />
      <Flash searchParams={sp} />
      <form action={demoRequestAction} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required maxLength={LIMITS.name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="company">Company</label>
            <input id="company" name="company" required maxLength={LIMITS.name} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="offeringSlug">Offering</label>
          <select id="offeringSlug" name="offeringSlug" defaultValue={sp.offering ?? ""} className="input">
            <option value="">Not sure yet</option>
            {offerings.map((o) => (
              <option key={o.slug} value={o.slug}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="message">What would you like to see?</label>
          <textarea id="message" name="message" required minLength={10} maxLength={LIMITS.message} rows={4} className="input" />
        </div>
        <button className="btn">Send request</button>
      </form>
    </div>
  );
}
