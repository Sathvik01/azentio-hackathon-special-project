import Link from "next/link";
import { getActor } from "@/server/auth/actor";
import { Logo } from "@/components/Logo";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { ScrollHeader } from "@/components/motion/ScrollChrome";

const NAV = [
  ["/offerings", "Offerings"],
  ["/insights", "Insights & media"],
  ["/hackathon", "Hackathon"],
  ["/about", "Governance"],
  ["/aira", "Ask AIRA"],
] as const;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="bg-ink-2 font-mono text-xs tracking-wide text-white/60">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-1.5">
          <span>BFSI · Middle East · Africa · Asia</span>
          <span>Prototype · synthetic data only</span>
        </div>
      </div>
      <ScrollHeader>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 transition-[padding] duration-300 group-data-[compact=true]:py-1.5">
          <Logo />
          <nav className="flex flex-wrap gap-5 text-sm text-white/75">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-signal-light">
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex gap-2">
            <Link href={actor.kind === "user" ? "/portal" : "/signin"} className="px-3 py-1.5 text-sm text-white/80 hover:text-white">
              {actor.kind === "user" ? "Open portal →" : "Sign in"}
            </Link>
            <Link href="/demo" className="btn py-1.5">
              Request a demo
            </Link>
          </div>
        </div>
      </ScrollHeader>
      <main className="flex-1">
        <MotionRoot>{children}</MotionRoot>
      </main>
      <footer className="border-t-2 border-ink bg-paper">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-xs text-muted md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo tone="dark" />
            <p className="mt-2 max-w-md">Build intelligence. Create impact. Hackathon prototype — all client data shown is synthetic.</p>
          </div>
          <div>
            <p className="eyebrow mb-2">Collaboration</p>
            <p>Shared learning is moderator-reviewed and de-identified. Joining a workspace is not consent to share or train on your data.</p>
          </div>
          <div>
            <p className="eyebrow mb-2">Explore</p>
            <ul className="space-y-1">
              {NAV.map(([href, label]) => (
                <li key={href}><Link href={href} className="hover:text-ink">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
