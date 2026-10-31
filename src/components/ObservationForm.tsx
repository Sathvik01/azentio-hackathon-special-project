import type { Consent, Observation } from "@prisma/client";
import type { OfferingDTO } from "@/server/dto";
import { COUNTRIES, INDUSTRIES } from "@/server/learning/coarsen";
import { LIMITS } from "@/lib/schemas";
import { human } from "./ui";

const TYPES = ["MARKET_OBSERVATION", "EMERGING_TREND", "PRODUCT_GAP", "OPERATIONAL_CHALLENGE", "SUCCESSFUL_PRACTICE", "IMPROVEMENT_SUGGESTION"];
const EVIDENCE = ["ANECDOTAL", "INTERNAL_METRICS", "CUSTOMER_FEEDBACK", "MARKET_RESEARCH", "REGULATORY_CHANGE"];

const iso = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "");

export function ObservationForm({
  action,
  offerings,
  o,
  consent,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<void>;
  offerings: OfferingDTO[];
  o?: Observation;
  consent?: Consent | null;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Before you write</p>
        <p className="mt-1">
          Leave out customer names or identities, account or card numbers, transaction-level data, credentials, confidential contract or pricing terms, and anything
          restricted. Describe patterns, not individual cases. An automatic scan will flag likely issues, but it is not a privacy guarantee.
        </p>
      </div>

      <section className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="type">Type</label>
            <select id="type" name="type" defaultValue={o?.type ?? "MARKET_OBSERVATION"} className="input">
              {TYPES.map((t) => <option key={t} value={t}>{human(t)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="offeringId">Related offering</label>
            <select id="offeringId" name="offeringId" defaultValue={o?.offeringId} required className="input">
              {offerings.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" defaultValue={o?.title} required minLength={8} maxLength={LIMITS.title} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="body">Observation</label>
          <textarea id="body" name="body" defaultValue={o?.body} required minLength={40} maxLength={LIMITS.body} rows={7} className="input" />
          <p className="mt-1 text-xs text-muted">40–{LIMITS.body} characters.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="industry">Industry</label>
            <select id="industry" name="industry" defaultValue={o?.industry} className="input">
              {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="region">Country / market</label>
            <select id="region" name="region" defaultValue={o?.region} className="input">
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted">Shared copies use a broader region.</p>
          </div>
          <div>
            <label className="label" htmlFor="periodStart">Observation period start</label>
            <input id="periodStart" name="periodStart" type="date" defaultValue={iso(o?.periodStart)} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="periodEnd">Observation period end</label>
            <input id="periodEnd" name="periodEnd" type="date" defaultValue={iso(o?.periodEnd)} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="evidenceType">Evidence type</label>
            <select id="evidenceType" name="evidenceType" defaultValue={o?.evidenceType ?? "ANECDOTAL"} className="input">
              {EVIDENCE.map((e) => <option key={e} value={e}>{human(e)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="confidence">Confidence</label>
            <select id="confidence" name="confidence" defaultValue={o?.confidence ?? "MEDIUM"} className="input">
              {["LOW", "MEDIUM", "HIGH"].map((c) => <option key={c} value={c}>{human(c)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="link">Supporting link (optional)</label>
          <input id="link" name="link" type="url" defaultValue={o?.link ?? ""} maxLength={LIMITS.link} className="input" placeholder="https://… (public sources only)" />
          <p className="mt-1 text-xs text-muted">Attachments aren&apos;t supported in this prototype; link to public material instead.</p>
        </div>
      </section>

      <section className="card space-y-4">
        <p className="font-semibold">Who can see this, and how it may be used</p>
        <fieldset className="space-y-2 text-sm">
          <legend className="label">Visibility of your original</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="visibility" value="PRIVATE" defaultChecked={(o?.visibility ?? "PRIVATE") === "PRIVATE"} className="mt-1" />
            <span><strong>Private to me</strong> — only you.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="visibility" value="ORG" defaultChecked={o?.visibility === "ORG"} className="mt-1" />
            <span><strong>Within my organisation</strong> — colleagues in this workspace only. Never other clients.</span>
          </label>
        </fieldset>
        <fieldset className="space-y-2 text-sm">
          <legend className="label">Community sharing</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="sharingProposal" value="NONE" defaultChecked={(o?.sharingProposal ?? "NONE") === "NONE"} className="mt-1" />
            <span><strong>Don&apos;t propose</strong> — stays in this workspace.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="sharingProposal" value="COMMUNITY" defaultChecked={o?.sharingProposal === "COMMUNITY"} className="mt-1" />
            <span>
              <strong>Propose for the approved learning community</strong> — after you submit, a moderator reviews and de-identifies a separate copy. Only that reviewed
              copy is shared with authorised participants. Your original stays private.
            </span>
          </label>
        </fieldset>
        <fieldset className="space-y-2 rounded-md bg-paper p-3 text-sm">
          <legend className="label">Separate permissions</legend>
          <p className="text-xs text-muted">Storing and processing this contribution in your workspace is required to save it. Everything below is optional and independent.</p>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="consentPublish" defaultChecked={consent?.publishShared} className="mt-1" />
            <span>Publish a moderator-reviewed, de-identified copy to the learning community (needed for community proposals).</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="consentAttribution" defaultChecked={consent?.attribution} className="mt-1" />
            <span>Show my organisation&apos;s name on the shared copy (subject to review). Off = anonymous.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="consentTraining" defaultChecked={consent?.training} className="mt-1" />
            <span>
              Allow use in a <em>future, separate</em> model-training or federated-learning programme. No such programme runs today; recorded for consent history only.
            </span>
          </label>
        </fieldset>
      </section>

      <div className="flex gap-3">
        <button className="btn">{submitLabel}</button>
        <p className="self-center text-xs text-muted">Saving creates a private draft — it never shares anything.</p>
      </div>
    </form>
  );
}
