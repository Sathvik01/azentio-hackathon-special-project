import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/actor";
import { isClientMember, isEmployee } from "@/server/policy";

export default async function PortalHome() {
  const actor = await getActor();
  if (isEmployee(actor)) redirect("/portal/employee");
  if (isClientMember(actor)) redirect("/portal/client");
  redirect("/workspace");
}
