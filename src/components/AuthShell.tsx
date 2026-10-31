import { Logo } from "./Logo";

/** Split auth screen: dense brand/context column left, task column right. */
export function AuthShell({ title, eyebrow, children, aside }: { title: string; eyebrow: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[5fr_7fr]">
      <div className="flex flex-col justify-between border-b-2 border-signal bg-ink px-8 py-8 text-white lg:border-r-2 lg:border-b-0">
        <Logo />
        <div className="my-10">
          <p className="font-mono text-xs tracking-wider text-signal-light uppercase">Collaboration portal</p>
          <p className="mt-3 max-w-sm text-3xl leading-tight font-semibold">Build intelligence. Create impact.</p>
          {aside ?? (
            <ul className="mt-8 max-w-sm border-t border-white/15 text-sm text-white/70">
              {[
                ["01", "Employees: verified @azentio.com identity + approved provisioning"],
                ["02", "Clients: invitation into a registered organisation"],
                ["03", "Every request checked on the server, per workspace"],
              ].map(([n, t]) => (
                <li key={n} className="grid grid-cols-[2.5rem_minmax(0,1fr)] border-b border-white/10 py-3">
                  <span className="data text-signal-light">{n}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="font-mono text-xs tracking-wide text-white/40">SYNTHETIC DATA · LOCAL PROTOTYPE</p>
      </div>
      <div className="flex items-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-lg">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 border-b-2 border-ink pb-3 text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
