import { PageHeader } from "@/components/ui";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="prose-plain mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="About azentio.ai" />
      <p>
        azentio.ai brings together Azentio&apos;s AI offerings for banking, financial services and insurance with a secure collaboration portal for employees and
        client organisations.
      </p>
      <p>
        The portal&apos;s collective learning hub lets clients contribute market observations, emerging trends and improvement ideas. Moderators review and
        de-identify proposed contributions before anything is shared with other participants, and authors can withdraw at any time.
      </p>
      <h2 className="mt-8 mb-2 text-lg font-semibold">What collective learning is — and isn&apos;t</h2>
      <p>
        Collective learning means reviewed contributions and safe summaries shared among authorised participants. It is <strong>not</strong> federated machine
        learning, and AIRA&apos;s summaries do not retrain any model. Any future model-training programme would be separate, opt-in, and require its own consent.
      </p>
      <h2 className="mt-8 mb-2 text-lg font-semibold">Withdrawal</h2>
      <p>
        Withdrawing a contribution removes it from the shared feed, search, theme counts and AIRA immediately in this prototype (production SLA: within 60 seconds).
        Copies that people have already viewed, exported or quoted elsewhere cannot be recalled automatically.
      </p>
    </div>
  );
}
