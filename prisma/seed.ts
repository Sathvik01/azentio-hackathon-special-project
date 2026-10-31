/*
 * Synthetic demo data. Every organisation, person and figure here is fictional.
 * Re-run safely with `npm run demo:reset`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient, type Grant, type MembershipRole, type ObsStatus, type ObsType, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const d = (s: string) => new Date(`${s}T00:00:00Z`);

async function main() {
  // ───────── Organisations ─────────
  const azentio = await prisma.organization.create({ data: { name: "Azentio", slug: "azentio", type: "AZENTIO" } });
  const northwind = await prisma.organization.create({ data: { name: "Northwind Bank", slug: "northwind", type: "CLIENT", industry: "Banking", region: "Middle East & Africa" } });
  const harbor = await prisma.organization.create({ data: { name: "Harbor Finance", slug: "harbor", type: "CLIENT", industry: "Non-bank lending", region: "Asia-Pacific" } });
  const cedar = await prisma.organization.create({ data: { name: "Cedar Credit Union", slug: "cedar", type: "CLIENT", industry: "Credit union", region: "Europe" } });

  // ───────── Offerings & entitlements ─────────
  const off = async (slug: string, name: string, category: string, tagline: string, description: string, internalNotes: string) =>
    prisma.offering.create({ data: { slug, name, category, tagline, description, internalNotes } });
  const fai = await off(
    "financial-analysis-intelligence",
    "Financial Analysis Intelligence",
    "Credit analytics",
    "Automated spreading, ratio analysis and explainable financial commentary.",
    "Turns borrower financial statements into standardised spreads, ratios and plain-language commentary so analysts spend time on judgement rather than data entry.",
    "Prototype: seasonality-aware comparisons under evaluation (internal Project Lighthouse). Do not discuss externally.",
  );
  const rri = await off(
    "regulatory-reporting-intelligence",
    "Regulatory Reporting Intelligence",
    "Regulatory reporting",
    "Pre-validate regulatory returns before submission.",
    "Cross-field validation, reconciliation and explanation of regulatory returns, with an audit trail of every check.",
    "Rules engine v2 migration planned; current false-positive rate ~8% on synthetic tests.",
  );
  const doc = await off(
    "document-intelligence",
    "Document Intelligence",
    "Document processing",
    "Extract, classify and route financial documents with confidence scores.",
    "Extracts fields from invoices, statements and trade documents, routing low-confidence fields to human review.",
    "Arabic/English mixed-script model is experimental.",
  );
  const credit = await off(
    "credit-decisioning-assistant",
    "Credit Decisioning Assistant",
    "Lending",
    "Explainable scorecards and decision support for SME lending.",
    "Transparent, points-based decision support with reason codes. Sandbox outputs are never credit decisions.",
    "Exploring monotonic gradient boosting as challenger model.",
  );
  const collections = await off(
    "collections-insights",
    "Collections Insights",
    "Collections",
    "Early-warning signals and treatment recommendations.",
    "Prioritises collections effort with early-warning indicators and explainable treatment suggestions.",
    "Early-warning thresholds being re-tuned with product team.",
  );
  const entitle = (org: string, ...ids: string[]) => prisma.entitlement.createMany({ data: ids.map((offeringId) => ({ orgId: org, offeringId })) });
  await entitle(northwind.id, fai.id, rri.id, doc.id);
  await entitle(harbor.id, fai.id, credit.id);
  await entitle(cedar.id, collections.id, doc.id);

  // ───────── People ─────────
  const employee = async (email: string, name: string, grants: Grant[] = []) => {
    await prisma.employeeProvision.create({ data: { email } });
    const u = await prisma.user.create({ data: { email, name } });
    await prisma.membership.create({ data: { userId: u.id, orgId: azentio.id, role: "EMPLOYEE" } });
    for (const grant of grants) await prisma.roleGrant.create({ data: { userId: u.id, grant } });
    return u;
  };
  const client = async (email: string, name: string, memberships: [string, MembershipRole][]) => {
    const u = await prisma.user.create({ data: { email, name } });
    for (const [orgId, role] of memberships) {
      await prisma.membership.create({ data: { userId: u.id, orgId, role } });
      await prisma.termsAcceptance.create({ data: { userId: u.id, orgId, version: "2026-10" } });
    }
    return u;
  };

  const asha = await employee("asha.employee@azentio.com", "Asha Raman");
  const priya = await employee("priya.publisher@azentio.com", "Priya Nair", ["PUBLISH_CONTENT"]);
  const omar = await employee("omar.moderator@azentio.com", "Omar Haddad", ["MODERATE_LEARNING"]);
  const lena = await employee("lena.product@azentio.com", "Lena Fischer", ["PRODUCT_OWNER"]);
  const sam = await employee("sam.admin@azentio.com", "Sam Okafor", ["PORTAL_ADMIN"]);

  const nora = await client("nora.admin@northwind.example", "Nora Al-Mansouri", [[northwind.id, "CLIENT_ADMIN"]]);
  const nate = await client("nate.member@northwind.example", "Nate Silva", [[northwind.id, "MEMBER"]]);
  const hari = await client("hari.admin@harbor.example", "Hari Menon", [[harbor.id, "CLIENT_ADMIN"]]);
  const hema = await client("hema.member@harbor.example", "Hema Iyer", [[harbor.id, "MEMBER"]]);
  const cara = await client("cara.admin@cedar.example", "Cara Byrne", [[cedar.id, "CLIENT_ADMIN"]]);
  const colm = await client("colm.member@cedar.example", "Colm Doyle", [[cedar.id, "MEMBER"]]);
  await client("maya.multi@consult.example", "Maya Chen", [[northwind.id, "MEMBER"], [cedar.id, "MEMBER"]]);

  // ───────── Content & private media ─────────
  const mediaDir = path.join(process.cwd(), "storage", "media");
  mkdirSync(mediaDir, { recursive: true });
  const svg = (title: string, sub: string, color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="400" viewBox="0 0 960 400"><rect width="960" height="400" fill="${color}"/><circle cx="480" cy="170" r="54" fill="none" stroke="#fff" stroke-width="6"/><path d="M466 145 L506 170 L466 195 Z" fill="#fff"/><text x="480" y="290" font-family="Segoe UI,Arial" font-size="34" fill="#fff" text-anchor="middle">${title}</text><text x="480" y="335" font-family="Segoe UI,Arial" font-size="20" fill="#ffffffcc" text-anchor="middle">${sub}</text></svg>`;
  writeFileSync(path.join(mediaDir, "public-explainer.svg"), svg("Explainable AI in credit analysis", "Public video · 4 min", "#0e7c86"));
  writeFileSync(path.join(mediaDir, "employee-allhands.svg"), svg("Q4 Product All-hands (internal)", "Employees only · recording", "#3b2a6b"));

  const content = (data: Prisma.ContentItemUncheckedCreateInput) => prisma.contentItem.create({ data });
  await content({ kind: "BANNER", audience: "PUBLIC", title: "Hackathon 2026 registrations are open", summary: "Build governed AI for financial services — register your team.", body: "See the Hackathon page." });
  await content({ kind: "INSIGHT", audience: "PUBLIC", title: "Why explainability matters in SME lending", summary: "Reason codes help analysts and borrowers trust automated recommendations.", body: "Explainable outputs let credit teams challenge automated suggestions, document their judgement and meet supervisory expectations for model governance.", startsAt: d("2026-09-12") });
  await content({ kind: "INSIGHT", audience: "PUBLIC", title: "From documents to decisions", summary: "How document intelligence shortens onboarding.", body: "Confidence-scored extraction routes only uncertain fields to people, cutting manual keying while keeping humans in the loop.", startsAt: d("2026-08-03") });
  const video = await content({ kind: "VIDEO", audience: "PUBLIC", title: "Explainable AI in credit analysis (video)", summary: "A four-minute walkthrough of reason codes.", body: "Approved public video.", startsAt: d("2026-07-20") });
  await prisma.mediaAsset.create({ data: { contentId: video.id, fileName: "public-explainer.svg", mimeType: "image/svg+xml", path: "public-explainer.svg" } });

  const allHands = await content({ kind: "RECORDING", audience: "EMPLOYEE", title: "Q4 Product All-hands recording", summary: "Roadmap themes and Playground updates.", body: "Internal recording. Includes unreleased roadmap discussion.", startsAt: d("2026-10-02"), ownerName: "Priya Nair" });
  await prisma.mediaAsset.create({ data: { contentId: allHands.id, fileName: "employee-allhands.svg", mimeType: "image/svg+xml", path: "employee-allhands.svg" } });
  await content({ kind: "BROADCAST", audience: "EMPLOYEE", title: "Live: Collective learning moderation clinic", summary: "How we de-identify shared observations.", body: "Internal live session for moderators and product owners.", startsAt: d("2026-11-06"), ownerName: "Omar Haddad" });
  await content({ kind: "SESSION", audience: "EMPLOYEE", title: "Hackathon team formation (internal)", summary: "Find teammates for the employee hackathon track.", body: "Employee-only team space kickoff.", startsAt: d("2026-11-10") });
  await content({ kind: "EXPERIMENT", audience: "EMPLOYEE", title: "Project Lighthouse — seasonality-aware spreading", summary: "Internal experiment comparing seasonal baselines.", body: "Project Lighthouse prototype uses prior-year same-month baselines. Employee-only; never cite externally.", ownerName: "Lena Fischer", reviewDate: d("2026-12-15") });
  await content({ kind: "EXPERIMENT", audience: "EMPLOYEE", title: "Mixed-script invoice OCR", summary: "Arabic/English extraction experiment.", body: "Experimental model; accuracy not yet validated.", ownerName: "Asha Raman", reviewDate: d("2026-10-01") });
  await content({ kind: "KNOWLEDGE", audience: "EMPLOYEE", title: "Moderation playbook v1", summary: "How to coarsen geography, dates and amounts.", body: "Replace country with region, dates with quarters, exact amounts with ranges. Escalate rare observations.", ownerName: "Omar Haddad", reviewDate: d("2027-01-31") });
  await content({ kind: "KNOWLEDGE", audience: "EMPLOYEE", title: "Sandbox data policy", summary: "Synthetic data only in demos.", body: "Never load client data into sandboxes without written approval.", ownerName: "Sam Okafor", reviewDate: d("2026-09-30") });
  await content({ kind: "RELEASE_NOTE", audience: "EMPLOYEE", title: "Internal build 4.3-rc1", summary: "Release candidate notes (internal).", body: "Includes unreleased features behind flags.", ownerName: "Lena Fischer", reviewDate: d("2026-11-30") });
  await content({ kind: "RELEASE_NOTE", audience: "CLIENTS", offeringId: fai.id, title: "Financial Analysis Intelligence 4.2 release notes", summary: "Improved ratio commentary and export.", body: "Released features only." });
  await content({ kind: "SESSION", audience: "CLIENTS", offeringId: fai.id, title: "Invitation-only webinar: seasonality in SME credit", summary: "For Financial Analysis Intelligence clients.", body: "Discussion of approved shared themes.", startsAt: d("2026-11-20") });
  await content({ kind: "BRIEFING", audience: "CLIENT_ORG", orgId: northwind.id, title: "Northwind quarterly briefing", summary: "Your organisation's quarterly product briefing.", body: "Organisation-specific briefing for Northwind Bank only." });

  // ───────── Collective learning: seasonality scenario ─────────
  let refN = 0;
  const observation = async (o: {
    author: { id: string };
    org: { id: string };
    type: ObsType;
    title: string;
    body: string;
    offeringId: string;
    industry: string;
    region: string;
    start: string;
    end: string;
    status: ObsStatus;
    visibility?: "PRIVATE" | "ORG";
    community?: boolean;
    attribution?: boolean;
    flags?: string[];
    returnReason?: string;
  }) =>
    prisma.observation.create({
      data: {
        authorId: o.author.id,
        orgId: o.org.id,
        type: o.type,
        title: o.title,
        body: o.body,
        offeringId: o.offeringId,
        industry: o.industry,
        region: o.region,
        periodStart: d(o.start),
        periodEnd: d(o.end),
        evidenceType: "INTERNAL_METRICS",
        confidence: "MEDIUM",
        visibility: o.visibility ?? "PRIVATE",
        sharingProposal: o.community ? "COMMUNITY" : "NONE",
        status: o.status,
        sensitiveFlags: o.flags ?? [],
        returnReason: o.returnReason,
        submittedAt: o.community && o.status !== "DRAFT" ? d("2026-10-05") : null,
        consents: { create: { store: true, publishShared: !!o.community, attribution: !!o.attribution, training: false, recordedById: o.author.id } },
      },
    });

  const publish = async (obs: { id: string; orgId: string; type: ObsType; offeringId: string; industry: string; version: number }, title: string, body: string, region: string, period: string, attribution: string | null) => {
    refN += 1;
    const s = await prisma.sharedObservation.create({
      data: {
        publicRef: `LRN-${String(refN).padStart(4, "0")}`,
        version: obs.version,
        type: obs.type,
        title,
        body,
        offeringId: obs.offeringId,
        industry: obs.industry,
        regionCoarse: region,
        periodLabel: period,
        attributionOrgName: attribution,
        publishedAt: d("2026-10-08"),
        source: { create: { observationId: obs.id, orgId: obs.orgId } },
      },
    });
    await prisma.moderationDecision.create({ data: { observationId: obs.id, sharedId: s.id, moderatorId: omar.id, action: "publish", reason: "Approved for community sharing", reviewerNote: "Coarsened region and period." } });
    await prisma.auditEvent.create({ data: { actorId: omar.id, action: "shared.publish", resourceType: "SharedObservation", resourceId: s.id, data: { observationId: obs.id, ref: s.publicRef } } });
    await prisma.notification.create({ data: { userId: (await prisma.observation.findUniqueOrThrow({ where: { id: obs.id } })).authorId, title: "Contribution published", body: `A reviewed copy is now visible as ${s.publicRef}.`, link: `/portal/client/observations/${obs.id}` } });
    return s;
  };

  const o1 = await observation({
    author: nate, org: northwind, type: "MARKET_OBSERVATION", offeringId: fai.id, industry: "Banking", region: "United Arab Emirates", start: "2026-04-01", end: "2026-09-30", status: "PUBLISHED", community: true,
    title: "Seasonal SME revenue dips read as deterioration",
    body: "Our relationship managers see agricultural and trading SMEs flagged for deterioration in the summer months when revenue predictably dips. Month-on-month comparisons ignore the business's normal seasonal pattern, so analysts override the flag manually.",
  });
  const s1 = await publish(o1, "Seasonal SME revenue dips read as deterioration",
    "Relationship teams observe that SMEs with predictable seasonal revenue (e.g. agriculture, trading) are flagged for deterioration during their normal low season. Month-on-month comparisons ignore the seasonal pattern, leading to manual overrides.",
    "Middle East & Africa", "Q2–Q3 2026", null);

  const o2 = await observation({
    author: hema, org: harbor, type: "PRODUCT_GAP", offeringId: fai.id, industry: "Non-bank lending", region: "India", start: "2026-05-01", end: "2026-08-31", status: "PUBLISHED", community: true, attribution: true,
    title: "Agri-input SMEs flagged by month-on-month comparisons",
    body: "Agri-input distributors show a 40-60% revenue swing between sowing and off-season. Our analysts want comparisons against the same month last year rather than the previous month, with an explanation the borrower can understand.",
  });
  const s2 = await publish(o2, "Agri-input SMEs flagged by month-on-month comparisons",
    "Agri-input distributors show large revenue swings between sowing and off-season. Analysts would prefer comparisons against the same period in the prior year, with an explanation suitable for borrowers.",
    "Asia-Pacific", "Q2–Q3 2026", "Harbor Finance");

  const o3 = await observation({
    author: colm, org: cedar, type: "OPERATIONAL_CHALLENGE", offeringId: fai.id, industry: "Credit union", region: "Ireland", start: "2026-06-01", end: "2026-09-30", status: "PUBLISHED", community: true,
    title: "Tourism-season cash flow and covenant tests",
    body: "Members running seasonal tourism businesses breach quarterly cash-flow covenants each winter despite healthy annual results. We now apply annualised tests manually for these members.",
  });
  await prisma.moderationDecision.create({ data: { observationId: o3.id, moderatorId: omar.id, action: "return", reason: "Please remove the reference to a specific village and member count so the observation can't identify the members concerned." } });
  const s3 = await publish(o3, "Seasonal tourism businesses and quarterly covenant tests",
    "Members running seasonal tourism businesses can breach quarterly cash-flow covenants in the off-season despite healthy annual results. Some lenders apply annualised tests manually for such borrowers.",
    "Europe", "Q2–Q3 2026", null);

  const o4 = await observation({
    author: hema, org: harbor, type: "OPERATIONAL_CHALLENGE", offeringId: rri.id, industry: "Non-bank lending", region: "India", start: "2026-07-01", end: "2026-09-30", status: "PUBLISHED", community: true,
    title: "Manual reconciliation before liquidity returns",
    body: "Teams spend two days each quarter reconciling totals across HQLA levels before submission because source systems disagree.",
  });
  const s4 = await publish(o4, "Manual reconciliation before liquidity returns",
    "Reporting teams spend significant time each quarter reconciling totals across asset levels before submitting liquidity returns, because source systems disagree.",
    "Asia-Pacific", "Q3 2026", null);

  const o5 = await observation({
    author: nate, org: northwind, type: "PRODUCT_GAP", offeringId: doc.id, industry: "Banking", region: "United Arab Emirates", start: "2026-07-01", end: "2026-09-30", status: "PUBLISHED", community: true,
    title: "Bilingual invoices reduce extraction confidence",
    body: "Trade invoices mixing Arabic and English fields regularly fall below our confidence threshold, so most need manual review.",
  });
  const s5 = await publish(o5, "Bilingual invoices reduce extraction confidence",
    "Trade invoices mixing two scripts often fall below extraction confidence thresholds, so most need manual review.",
    "Middle East & Africa", "Q3 2026", null);

  // Items in other states for the demo
  await observation({
    author: hari, org: harbor, type: "EMERGING_TREND", offeringId: credit.id, industry: "Non-bank lending", region: "India", start: "2026-08-01", end: "2026-09-30", status: "RETURNED", community: true,
    title: "Festival-season credit demand spikes",
    body: "Our branch in Pune saw demand for working-capital top-ups jump ahead of the festival season; approvals queued for a week. Customer Mr. Sharma waited 9 days.",
    flags: ["customer_identity"],
    returnReason: "Please remove the customer name and the specific branch city; describe the pattern rather than an individual case.",
  }).then((o) => prisma.moderationDecision.create({ data: { observationId: o.id, moderatorId: omar.id, action: "return", reason: o.returnReason } }));

  const q = await observation({
    author: nora, org: northwind, type: "PRODUCT_GAP", offeringId: doc.id, industry: "Banking", region: "United Arab Emirates", start: "2026-09-01", end: "2026-10-15", status: "SUBMITTED", community: true,
    title: "Trade-finance document turnaround",
    body: "Confidential: our largest trade client's letters of credit worth AED 2,450,000 took 3 days to process because document checks are manual. Faster discrepancy detection would help across the market.",
    flags: ["confidential", "precise_amount"],
  });
  await prisma.notification.create({ data: { userId: nora.id, title: "Contribution submitted", body: `"${q.title}" is waiting for moderator review.`, link: `/portal/client/observations/${q.id}` } });

  await observation({
    author: nate, org: northwind, type: "MARKET_OBSERVATION", offeringId: fai.id, industry: "Banking", region: "United Arab Emirates", start: "2026-10-01", end: "2026-10-20", status: "DRAFT",
    title: "Notes from branch visits (private draft)",
    body: "Rough private notes: several SME owners asked about seasonal repayment holidays; need to verify before sharing anything.",
  });
  await observation({
    author: nora, org: northwind, type: "IMPROVEMENT_SUGGESTION", offeringId: rri.id, industry: "Banking", region: "United Arab Emirates", start: "2026-09-01", end: "2026-09-30", status: "DRAFT", visibility: "ORG",
    title: "Internal: pricing committee feedback on reporting tools",
    body: "Organisation-only note for Northwind colleagues summarising our pricing committee's view of reporting tooling. Not for sharing outside Northwind.",
  });

  // ───────── Themes & ideas ─────────
  const seasonality = await prisma.theme.create({
    data: {
      title: "Seasonality context",
      summary: "Across approved contributions, lenders report that SMEs with predictable seasonal revenue are flagged for deterioration in their normal low season, and that same-period prior-year comparisons or annualised tests would better reflect performance.",
      limitations: "Small sample: three organisations across three regions, observation periods Q2–Q3 2026. Self-reported observations, not measured prevalence.",
      offeringId: fai.id,
      createdById: lena.id,
      evidence: { create: [s1, s2, s3].map((s) => ({ sharedId: s.id })) },
    },
  });
  await prisma.theme.create({
    data: {
      title: "Bilingual document extraction",
      summary: "Mixed-script trade documents may need dedicated extraction support.",
      limitations: "Single contributing organisation so far; organisation counts are suppressed.",
      offeringId: doc.id,
      createdById: lena.id,
      evidence: { create: [{ sharedId: s5.id }] },
    },
  });
  void s4;

  const idea = await prisma.improvementIdea.create({
    data: {
      title: "Seasonality-aware comparison explanation",
      problem: "Month-on-month comparisons flag seasonal SMEs during their normal low season, creating manual overrides and confusing borrower conversations.",
      offeringId: fai.id,
      proposedOutcome: "Offer a same-period prior-year comparison and a plain-language seasonality explanation alongside existing ratios.",
      ownerTeam: "Financial Analysis product team",
      ownerId: lena.id,
      priority: "P1",
      status: "UNDER_REVIEW",
      visibleToClients: true,
      publicStatusNote: "Under review: we are assessing a seasonality-aware comparison view informed by the shared ‘Seasonality context’ theme. This is not a delivery commitment.",
      themeId: seasonality.id,
      evidence: { create: [s1, s2, s3].map((s) => ({ sharedId: s.id })) },
      changes: { create: [{ to: "PROPOSED", note: "Idea created from Seasonality context theme", changedById: lena.id, at: d("2026-10-09") }, { from: "PROPOSED", to: "UNDER_REVIEW", note: "Prioritised for discovery (internal)", changedById: lena.id, at: d("2026-10-12") }] },
    },
  });
  for (const u of [nate, hema, colm]) {
    await prisma.notification.create({ data: { userId: u.id, title: "Improvement update", body: `An improvement your contribution informed is now "Under review": ${idea.title}.`, link: "/portal/client/updates" } });
  }
  await prisma.improvementIdea.create({
    data: {
      title: "Collections early-warning threshold tuning",
      problem: "Early-warning alerts fire too late for seasonal borrowers.",
      offeringId: collections.id,
      proposedOutcome: "Season-adjusted thresholds for early-warning indicators.",
      ownerTeam: "Collections squad",
      ownerId: asha.id,
      priority: "P2",
      status: "PROPOSED",
      visibleToClients: false,
      publicStatusNote: "Being explored internally.",
      changes: { create: { to: "PROPOSED", note: "Created", changedById: asha.id } },
    },
  });

  await prisma.auditEvent.create({ data: { actorId: sam.id, action: "seed.complete", resourceType: "System", resourceId: "seed", data: { orgs: 4, note: "synthetic data" } } });
  void priya; void cara;

  console.log("Seeded synthetic demo data: 3 client orgs, 12 users, 5 published shared observations, 2 themes, 2 ideas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
