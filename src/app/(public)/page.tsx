import Link from "next/link";
import { getActor } from "@/server/auth/actor";
import { listContent, listOfferings } from "@/server/repo/catalog";
import { CountUp, DrawRule, MaskLine, Reveal, Stagger, StaggerItem, TypeLine } from "@/components/motion/primitives";
import { CapabilityScroller, type Pillar } from "@/components/motion/CapabilityScroller";
import { GovernanceLedger, InsightsLedger, OfferingsLedger } from "@/components/motion/HomeSections";

// Capability pillars and sub-points from the azentio.ai reference prototype (docs/reference-prototype.md).
const PILLARS: readonly Pillar[] = [
  {
    name: "Intelligent Decisioning",
    desc: "Turn policies, evidence and data into informed recommendations.",
    points: ["Evaluate applications against configurable policies", "Analyse risk, financial data and historical patterns", "Simulate policy changes", "Evidence-backed recommendations"],
  },
  {
    name: "Document Intelligence",
    desc: "Extract, interpret and validate complex information.",
    points: ["Classify and extract information", "Validate across documents", "Detect inconsistencies", "Deliver structured data"],
  },
  {
    name: "AI Agents & Automation",
    desc: "Connect intelligence with workflows and human oversight.",
    points: ["Interpret tasks", "Coordinate connected workflows", "Automate multi-step activities", "Human approvals and audit trails"],
  },
  {
    name: "Analytics & Insights",
    desc: "Transform data into actionable intelligence.",
    points: ["Unify data sources", "Identify trends and root causes", "Compare portfolios and simulate scenarios", "Produce actionable insights"],
  },
  {
    name: "Configurable AI Platforms",
    desc: "Adapt solutions to evolving business requirements.",
    points: ["Configure rules", "Map databases and APIs", "Manage templates and modules", "Track versions and approvals"],
  },
  {
    name: "Trusted Enterprise AI",
    desc: "Design for security, accountability and traceability.",
    points: ["Enterprise SSO and RBAC", "Protect data", "Maintain audit records", "Human oversight and governance"],
  },
];

const GOVERNANCE = [
  ["Private by default", "Every contribution starts as a draft in your organisation's workspace. Saving never shares."],
  ["Reviewed before shared", "Moderators redact and coarsen a separate copy; your original never leaves your tenant."],
  ["k ≥ 3 suppression", "Cross-client statistics appear only when at least three organisations contributed."],
  ["Withdraw any time", "Withdrawal removes a contribution from feed, search, themes and AIRA immediately."],
] as const;

export default async function Home() {
  const actor = await getActor();
  const [offerings, banners, insights] = await Promise.all([
    listOfferings(),
    listContent(actor, ["BANNER"], "PUBLIC"),
    listContent(actor, ["INSIGHT", "VIDEO"], "PUBLIC"),
  ]);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      {banners.map((b) => (
        <div key={b.id} className="border-b border-line bg-signal-soft">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2 text-sm">
            <span className="bg-ink px-1.5 py-px font-mono text-xs tracking-wider text-signal-light uppercase">Notice</span>
            <strong className="font-semibold">{b.title}</strong>
            <span className="text-muted">{b.summary}</span>
            <Link href="/hackathon" className="link ml-auto text-xs">Register →</Link>
          </div>
        </div>
      ))}

      {/* Asymmetric hero: editorial left, capability index right. */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[7fr_5fr]">
          <div className="px-4 py-14 lg:py-20 lg:pr-12">
            <TypeLine text="azentio.ai — applied AI for BFSI" className="eyebrow" />
            <h1 className="mt-4 max-w-2xl text-4xl leading-[1.05] font-semibold tracking-tight text-ink sm:text-6xl">
              <MaskLine delay={0.25}>Build intelligence.</MaskLine>
              <MaskLine delay={0.37} className="text-brand">Create impact.</MaskLine>
            </h1>
            <Reveal delay={0.55}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
                AI products for banking, insurance and capital markets, with a governed portal where clients and Azentio teams turn market observations into better
                offerings.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/offerings" className="btn">Explore offerings</Link>
                <Link href="/demo" className="btn-secondary">Request a demo</Link>
              </div>
            </Reveal>
            <div className="mt-12 max-w-xl">
              <DrawRule className="h-px bg-line" delay={0.7} />
              <dl className="grid grid-cols-3 divide-x divide-line">
                {[
                  [pad(offerings.length), "Offerings"],
                  [pad(PILLARS.length), "Capabilities"],
                  ["k≥3", "Cohort floor"],
                ].map(([v, l], i) => (
                  <div key={l} className="px-3 py-3 first:pl-0">
                    <dt className="font-mono text-xs tracking-wide text-muted uppercase">{l}</dt>
                    <dd className="data mt-1 text-2xl font-semibold">
                      <CountUp value={v} delay={0.8 + i * 0.1} />
                    </dd>
                  </div>
                ))}
              </dl>
              <DrawRule className="h-px bg-line" delay={0.8} />
            </div>
          </div>
          <div className="bg-ink text-white">
            <div className="flex items-center justify-between border-b border-white/15 px-6 py-3">
              <p className="font-mono text-xs tracking-wider text-signal-light uppercase">Capability index</p>
              <p className="font-mono text-xs text-white/50">{pad(PILLARS.length)} entries</p>
            </div>
            <Stagger as="ol" onMount>
              {PILLARS.map((p, i) => (
                <StaggerItem as="li" key={p.name} className="grid grid-cols-[3rem_minmax(0,1fr)] border-b border-white/10 px-6 py-4 last:border-b-0">
                  <span className="data text-sm text-signal-light">{pad(i + 1)}</span>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="mt-0.5 text-xs text-white/60">{p.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* Pinned scrollytelling through the six capabilities. */}
      <CapabilityScroller pillars={PILLARS} />

      <section className="mx-auto max-w-7xl px-4 py-14">
        <OfferingsLedger offerings={offerings} />
      </section>

      {/* Governance ledger: dark band, left label, rule-separated principles. */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <Reveal>
            <p className="font-mono text-xs tracking-wider text-signal-light uppercase">Collaboration portal</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Governed collective learning</h2>
            <p className="mt-2 text-sm text-white/60">Employees, clients and moderators each work inside an enforced boundary.</p>
          </Reveal>
          <GovernanceLedger items={GOVERNANCE} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <Reveal>
            <p className="eyebrow">Library</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Insights & media</h2>
            <Link href="/insights" className="link mt-4 inline-block text-sm">All insights →</Link>
          </Reveal>
          <InsightsLedger insights={insights} />
        </div>
      </section>
    </>
  );
}
