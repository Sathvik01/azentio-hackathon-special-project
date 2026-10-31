import { getActor } from "@/server/auth/actor";
import { isEmployee } from "@/server/policy";
import { aiProviderLabel } from "@/server/ai/client";
import { AiraChat } from "@/components/AiraChat";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Ask AIRA" };

export default async function PortalAira() {
  const actor = await getActor();
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Ask AIRA"
        subtitle={`AIRA retrieves only approved, currently published material you're permitted to see, and cites it. Withdrawn items disappear immediately. Model: ${aiProviderLabel()}.`}
      />
      <AiraChat
        suggestions={[
          "What are clients observing about seasonal SME cash flow?",
          "Which themes relate to Financial Analysis Intelligence?",
          isEmployee(actor) ? "What experiments are running internally?" : "What improvements are under review?",
        ]}
      />
    </div>
  );
}
