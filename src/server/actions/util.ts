import "server-only";
import { notFound, redirect } from "next/navigation";
import { ZodError } from "zod";
import { InvalidRequest, NotFoundOrDenied } from "@/server/errors";
import { InvalidTransition } from "@/server/learning/stateMachine";

function withParam(path: string, key: string, value: string) {
  const [base, query = ""] = path.split("?");
  const p = new URLSearchParams(query);
  p.set(key, value);
  return `${base}?${p.toString()}`;
}

/**
 * Runs a mutation and redirects. Validation/business errors come back as ?error=…;
 * denials look like a missing page. Unexpected errors propagate.
 */
export async function act(back: string, fn: () => Promise<string | void>, ok?: string): Promise<never> {
  let dest: string;
  try {
    const next = await fn();
    dest = next ?? back;
    if (ok) dest = withParam(dest, "ok", ok);
  } catch (e) {
    if (e instanceof NotFoundOrDenied) notFound();
    if (e instanceof ZodError) dest = withParam(back, "error", e.issues.map((i) => i.message).join("; "));
    else if (e instanceof InvalidRequest || e instanceof InvalidTransition) dest = withParam(back, "error", e.message);
    else throw e;
  }
  redirect(dest);
}

export function formObject(fd: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(fd.entries());
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}
