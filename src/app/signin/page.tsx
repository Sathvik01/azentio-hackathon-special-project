import { signInAction } from "@/server/actions/public";
import { AuthShell } from "@/components/AuthShell";
import type { SP } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const mailpit = process.env.NODE_ENV !== "production" ? process.env.MAILPIT_URL : undefined;
  return (
    <AuthShell eyebrow="Secure access" title="Sign in to the portal">
      <p className="text-sm text-muted">
        We&apos;ll email you a single-use sign-in link, valid for 15 minutes. Employees use their @azentio.com address; clients use the address their invitation was
        sent to.
      </p>
      {sp.error && (
        <p role="alert" className="mt-4 border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
          Sign-in failed or the link expired. Please request a new link.
        </p>
      )}
      <form action={signInAction} className="mt-6 space-y-3">
        <input type="hidden" name="callbackUrl" value={sp.callbackUrl ?? "/portal"} />
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" required autoFocus className="input" placeholder="you@company.com" />
        <button className="btn">Email me a sign-in link</button>
      </form>
      {mailpit && (
        <p className="mt-8 border-t border-line pt-3 font-mono text-xs text-muted">
          LOCAL DEMO · links are delivered to{" "}
          <a href={mailpit} target="_blank" className="link">
            {mailpit}
          </a>
        </p>
      )}
    </AuthShell>
  );
}
