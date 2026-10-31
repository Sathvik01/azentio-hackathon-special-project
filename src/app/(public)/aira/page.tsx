import { AiraChat } from "@/components/AiraChat";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Ask AIRA" };

export default function PublicAiraPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="Ask AIRA" subtitle="AIRA answers from content you are allowed to see and cites its sources. Signed out, that means public content only." />
      <AiraChat suggestions={["What does Financial Analysis Intelligence do?", "How is shared learning governed?", "Tell me about the hackathon"]} />
    </div>
  );
}
