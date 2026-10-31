import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { isClientMember } from "@/server/policy";
import { Playground } from "@/components/Playground";
import { Flash, PageHeader, type SP } from "@/components/ui";

export const metadata = { title: "Sandboxes" };

export default async function ClientSandbox({ searchParams }: { searchParams: SP }) {
  const [actor, sp] = await Promise.all([getActor(), searchParams]);
  if (!isClientMember(actor)) notFound();
  return (
    <>
      <PageHeader title="Product sandboxes" subtitle="Guided demonstrations for offerings your organisation is entitled to. Runs are isolated to you and this workspace." />
      <Flash searchParams={sp} />
      <Playground actor={actor} back="/portal/client/sandbox" runId={sp.run} />
    </>
  );
}
