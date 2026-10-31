import { notFound } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { isEmployee } from "@/server/policy";
import { Playground } from "@/components/Playground";
import { Flash, PageHeader, type SP } from "@/components/ui";

export const metadata = { title: "Playground" };

export default async function EmployeePlayground({ searchParams }: { searchParams: SP }) {
  const [actor, sp] = await Promise.all([getActor(), searchParams]);
  if (!isEmployee(actor)) notFound();
  return (
    <>
      <PageHeader title="Employee Playground" subtitle="Choose an offering scenario, inspect inputs, run a deterministic demonstration, review evidence and leave structured feedback." />
      <Flash searchParams={sp} />
      <Playground actor={actor} back="/portal/employee/playground" runId={sp.run} />
    </>
  );
}
