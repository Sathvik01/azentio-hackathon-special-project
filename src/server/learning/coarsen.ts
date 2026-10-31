// De-identification helpers used when a moderator prepares the shared copy.

export const COUNTRY_TO_REGION: Record<string, string> = {
  "United Arab Emirates": "Middle East & Africa",
  "Saudi Arabia": "Middle East & Africa",
  Egypt: "Middle East & Africa",
  Jordan: "Middle East & Africa",
  Kenya: "Middle East & Africa",
  Nigeria: "Middle East & Africa",
  India: "Asia-Pacific",
  Singapore: "Asia-Pacific",
  Malaysia: "Asia-Pacific",
  Indonesia: "Asia-Pacific",
  Philippines: "Asia-Pacific",
  Australia: "Asia-Pacific",
  "United Kingdom": "Europe",
  Ireland: "Europe",
  Germany: "Europe",
  France: "Europe",
  Netherlands: "Europe",
  "United States": "Americas",
  Canada: "Americas",
};

export const COUNTRIES = Object.keys(COUNTRY_TO_REGION);
export const REGIONS = [...new Set(Object.values(COUNTRY_TO_REGION))];

export const INDUSTRIES = ["Banking", "Non-bank lending", "Credit union", "Insurance", "Microfinance", "Islamic finance"];

export function coarsenRegion(countryOrRegion: string): string {
  return COUNTRY_TO_REGION[countryOrRegion] ?? (REGIONS.includes(countryOrRegion) ? countryOrRegion : "Global");
}

function quarter(d: Date): { q: number; y: number } {
  return { q: Math.floor(d.getUTCMonth() / 3) + 1, y: d.getUTCFullYear() };
}

/** "Q2 2026" or "Q2–Q3 2026" or "Q4 2025–Q1 2026": never a precise date. */
export function periodLabel(start: Date, end: Date): string {
  const a = quarter(start);
  const b = quarter(end);
  if (a.y === b.y && a.q === b.q) return `Q${a.q} ${a.y}`;
  if (a.y === b.y) return `Q${a.q}–Q${b.q} ${a.y}`;
  return `Q${a.q} ${a.y}–Q${b.q} ${b.y}`;
}
