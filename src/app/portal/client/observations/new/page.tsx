import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { canCreateObservation } from "@/server/policy";
import { listOfferings } from "@/server/repo/catalog";
import { createObservationAction } from "@/server/actions/learning";
import { ObservationForm } from "@/components/ObservationForm";
import { Flash, PageHeader, type SP } from "@/components/ui";

export const metadata = { title: "New observation" };

export default async function NewObservation({ searchParams }: { searchParams: SP }) {
  const [actor, sp] = await Promise.all([getActor(), searchParams]);
  if (!canCreateObservation(actor)) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title="New observation" subtitle="Market observations, trends, product gaps, operational challenges, successful practices or improvement suggestions." />
      <Flash searchParams={sp} />
      <ObservationForm action={createObservationAction} offerings={await listOfferings()} submitLabel="Save private draft" />
    </div>
  );
}
