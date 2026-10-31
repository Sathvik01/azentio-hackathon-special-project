/*
 * Deterministic sandbox scenarios over SYNTHETIC data. Outputs are demonstrations,
 * never approved credit or business decisions.
 */
export type ScenarioResult = {
  headline: string;
  metrics: { label: string; value: string }[];
  evidence: string[];
  caveats: string[];
};

export type Scenario = {
  id: string;
  offeringSlug: string;
  title: string;
  description: string;
  inputs: Record<string, unknown>;
  run: (inputs: Record<string, unknown>) => ScenarioResult;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export const SCENARIOS: Scenario[] = [
  {
    id: "fai-seasonality",
    offeringSlug: "financial-analysis-intelligence",
    title: "Seasonal SME cash-flow comparison",
    description: "Compare a synthetic agri-supplies SME's month-on-month revenue with a seasonality-aware baseline.",
    inputs: {
      business: "Synthetic SME — agricultural supplies",
      monthlyRevenue: [42, 38, 61, 88, 95, 71, 40, 33, 30, 52, 79, 90].map((k) => k * 1000),
      priorYearMonthlyRevenue: [40, 35, 58, 84, 91, 69, 37, 31, 29, 49, 75, 86].map((k) => k * 1000),
    },
    run: (i) => {
      const cur = i.monthlyRevenue as number[];
      const prev = i.priorYearMonthlyRevenue as number[];
      const cv = sd(cur) / mean(cur);
      const peakTrough = Math.max(...cur) / Math.min(...cur);
      const naiveDrop = (cur[7] - cur[6]) / cur[6];
      const yoy = (cur[7] - prev[7]) / prev[7];
      const seasonal = cv > 0.3;
      return {
        headline: seasonal
          ? `Strong seasonality detected: a ${(naiveDrop * 100).toFixed(0)}% month-on-month dip is in line with last year (+${(yoy * 100).toFixed(1)}% YoY).`
          : "No material seasonality detected.",
        metrics: [
          { label: "Coefficient of variation", value: cv.toFixed(2) },
          { label: "Peak / trough ratio", value: `${peakTrough.toFixed(1)}×` },
          { label: "Naive month-on-month (Jul→Aug)", value: `${(naiveDrop * 100).toFixed(1)}%` },
          { label: "Same month vs prior year", value: `${(yoy * 100).toFixed(1)}%` },
          { label: "Annual revenue (synthetic)", value: fmt(cur.reduce((a, b) => a + b, 0)) },
        ],
        evidence: [
          "Monthly series compared against the prior-year same-month baseline.",
          "Seasonality flagged when coefficient of variation > 0.30.",
        ],
        caveats: ["Synthetic data.", "Simulated output — not a credit decision.", "Two years of history is a small sample."],
      };
    },
  },
  {
    id: "rri-validation",
    offeringSlug: "regulatory-reporting-intelligence",
    title: "Regulatory return pre-validation",
    description: "Run cross-field checks over a synthetic liquidity return before submission.",
    inputs: {
      rows: [
        { line: "HQLA Level 1", value: 1200 },
        { line: "HQLA Level 2A", value: 300 },
        { line: "HQLA Level 2B", value: 250 },
        { line: "Total HQLA", value: 1700 },
        { line: "Net cash outflows (30d)", value: 1400 },
      ],
    },
    run: (i) => {
      const rows = i.rows as { line: string; value: number }[];
      const v = (l: string) => rows.find((r) => r.line === l)?.value ?? 0;
      const sum = v("HQLA Level 1") + v("HQLA Level 2A") + v("HQLA Level 2B");
      const l2Share = (v("HQLA Level 2A") + v("HQLA Level 2B")) / sum;
      const lcr = v("Total HQLA") / v("Net cash outflows (30d)");
      const issues = [
        sum !== v("Total HQLA") ? `Total HQLA (${v("Total HQLA")}) ≠ sum of levels (${sum}).` : null,
        l2Share > 0.4 ? `Level 2 assets are ${(l2Share * 100).toFixed(0)}% of HQLA (cap 40%).` : null,
      ].filter(Boolean) as string[];
      return {
        headline: issues.length ? `${issues.length} validation issue(s) found before submission.` : "All checks passed.",
        metrics: [
          { label: "Liquidity coverage ratio (synthetic)", value: `${(lcr * 100).toFixed(0)}%` },
          { label: "Level 2 share", value: `${(l2Share * 100).toFixed(0)}%` },
        ],
        evidence: issues.length ? issues : ["Totals reconcile; Level 2 cap respected."],
        caveats: ["Synthetic return.", "Illustrative rules only — not a regulatory opinion."],
      };
    },
  },
  {
    id: "doc-extraction",
    offeringSlug: "document-intelligence",
    title: "Invoice field extraction review",
    description: "Route low-confidence extracted fields from a synthetic invoice to human review.",
    inputs: {
      threshold: 0.85,
      fields: [
        { name: "Supplier", value: "Example Trading LLC", confidence: 0.97 },
        { name: "Invoice date", value: "Q3 2026", confidence: 0.91 },
        { name: "Total", value: "12,400.00", confidence: 0.78 },
        { name: "Tax ID", value: "SYN-000-123", confidence: 0.64 },
      ],
    },
    run: (i) => {
      const t = i.threshold as number;
      const fields = i.fields as { name: string; value: string; confidence: number }[];
      const low = fields.filter((f) => f.confidence < t);
      return {
        headline: `${low.length} of ${fields.length} fields need human review.`,
        metrics: fields.map((f) => ({ label: f.name, value: `${(f.confidence * 100).toFixed(0)}%${f.confidence < t ? " — review" : ""}` })),
        evidence: [`Confidence threshold: ${(t * 100).toFixed(0)}%.`],
        caveats: ["Synthetic document.", "Simulated confidences."],
      };
    },
  },
  {
    id: "credit-scorecard",
    offeringSlug: "credit-decisioning-assistant",
    title: "Explainable scorecard walkthrough",
    description: "Score a synthetic applicant with a transparent points-based scorecard.",
    inputs: { yearsTrading: 6, debtServiceCoverage: 1.35, utilisation: 0.62, latePayments12m: 1 },
    run: (i) => {
      const pts = [
        { label: "Years trading", value: Math.min(30, (i.yearsTrading as number) * 5) },
        { label: "Debt service coverage", value: (i.debtServiceCoverage as number) >= 1.25 ? 35 : 15 },
        { label: "Facility utilisation", value: (i.utilisation as number) < 0.7 ? 20 : 5 },
        { label: "Late payments (12m)", value: Math.max(0, 15 - 7 * (i.latePayments12m as number)) },
      ];
      const total = pts.reduce((a, p) => a + p.value, 0);
      return {
        headline: `Sandbox score ${total}/100 — band ${total >= 75 ? "A" : total >= 55 ? "B" : "C"}.`,
        metrics: pts.map((p) => ({ label: p.label, value: `${p.value} pts` })),
        evidence: ["Points-based scorecard with published weights."],
        caveats: ["Synthetic applicant.", "Simulated output — not a credit or business decision."],
      };
    },
  },
];

export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id);
