/*
 * Small-cohort suppression for shared statistics. Counts are always distinct contributing
 * organisations, never post volume. A minimum cohort size is a floor, not a privacy guarantee.
 */
export function minCohort(): number {
  const n = Number(process.env.MIN_COHORT_ORGS ?? 3);
  return Number.isFinite(n) && n >= 3 ? n : 3;
}

export type SafeCount = { value: number | null; suppressed: boolean };

export function safeCount(distinctOrgs: number, k = minCohort()): SafeCount {
  return distinctOrgs >= k ? { value: distinctOrgs, suppressed: false } : { value: null, suppressed: true };
}

/**
 * A facet breakdown is only shown when every displayed bucket meets the threshold;
 * otherwise subtracting one bucket from the total could reveal a small group.
 */
export function safeBreakdown(
  buckets: { key: string; distinctOrgs: number }[],
  k = minCohort(),
): { key: string; count: SafeCount }[] | null {
  if (buckets.some((b) => b.distinctOrgs > 0 && b.distinctOrgs < k)) return null;
  return buckets.map((b) => ({ key: b.key, count: safeCount(b.distinctOrgs, k) }));
}
