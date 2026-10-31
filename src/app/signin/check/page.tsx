import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  const mailpit = process.env.NODE_ENV !== "production" ? process.env.MAILPIT_URL : undefined;
  return (
    <AuthShell eyebrow="Link sent" title="Check your email">
      {/* Same message whether or not the address is registered, so membership can't be probed. */}
      <p className="text-sm text-muted">If this address is registered or invited, a single-use sign-in link is on its way. It expires in 15 minutes.</p>
      {mailpit && (
        <a href={mailpit} target="_blank" className="btn mt-6">
          Open local Mailpit inbox
        </a>
      )}
    </AuthShell>
  );
}
