import Link from "next/link";
import { getActor } from "@/server/auth/actor";
import { getInvitationByToken } from "@/server/repo/orgs";
import { acceptInvitationAction } from "@/server/actions/portal";
import { Flash, type SP } from "@/components/ui";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Invitation" };

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: SP }) {
  const [{ token }, sp, actor] = await Promise.all([params, searchParams, getActor()]);
  const inv = await getInvitationByToken(token);

  const shell = (body: React.ReactNode) => (
    <AuthShell eyebrow="Workspace invitation" title={inv && inv.state === "valid" ? `Join ${inv.orgName}` : "Invitation unavailable"}>
      {body}
    </AuthShell>
  );

  if (!inv || inv.state !== "valid") {
    return shell(
      <>
        <p className="mt-2 text-sm text-muted">This invitation link is invalid, already used, revoked or expired. Ask your organisation administrator for a new one.</p>
      </>,
    );
  }

  if (actor.kind !== "user") {
    return shell(
      <>
        <p className="mt-2 text-sm text-muted">
          You&apos;ve been invited as {inv.role === "CLIENT_ADMIN" ? "a client administrator" : "a member"}. Sign in with <strong>{inv.maskedEmail}</strong> to
          continue.
        </p>
        <Link href={`/signin?callbackUrl=/invite/${token}`} className="btn mt-6">
          Verify my email
        </Link>
      </>,
    );
  }

  const matches = actor.email.toLowerCase() === inv.email.toLowerCase();
  return shell(
    <>
      <Flash searchParams={sp} />
      {!matches ? (
        <p className="mt-3 border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
          You&apos;re signed in as {actor.email}, but this invitation is for {inv.maskedEmail}. Sign out and sign in with the invited address.
        </p>
      ) : (
        <form action={acceptInvitationAction.bind(null, token)} className="mt-4 space-y-4 text-sm">
          <div className="border-l-4 border-ink bg-paper p-4">
            <p className="font-medium">Workspace terms & how sharing works</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>Your workspace is private to {inv.orgName}. Other clients can&apos;t see it.</li>
              <li>Everything you write starts as a private draft. Saving never shares anything.</li>
              <li>You choose: private to you, within your organisation, or <em>proposed</em> for the learning community.</li>
              <li>Community proposals are reviewed and de-identified by a moderator before anyone else sees them; you can withdraw at any time.</li>
              <li>Publishing, organisation attribution and any future model-training are separate permissions you grant per contribution.</li>
              <li>
                <strong>Joining this workspace is not consent to share or train on your data.</strong>
              </li>
            </ul>
          </div>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="terms" required className="mt-1" /> I have read the workspace terms and the sharing explanation.
          </label>
          <button className="btn">Accept invitation</button>
        </form>
      )}
    </>,
  );
}
