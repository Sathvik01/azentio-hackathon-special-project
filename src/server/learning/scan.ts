/*
 * Deterministic sensitive-content heuristics. Runs locally; private drafts are never sent to an AI provider.
 * A scan is a prompt for human review, not a privacy guarantee.
 */
export type ScanFlag = { id: string; label: string };

const RULES: { id: string; label: string; re: RegExp }[] = [
  { id: "account_number", label: "Possible account or card number", re: /\b\d(?:[ -]?\d){9,18}\b/ },
  { id: "iban", label: "Possible IBAN", re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/ },
  { id: "email", label: "Email address", re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  { id: "phone", label: "Phone number", re: /(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]\d{3,4}[\s-]\d{3,4}\b/ },
  { id: "credential", label: "Credential or secret", re: /\b(password|passwd|api[_ -]?key|secret|token)\b\s*[:=]/i },
  {
    id: "confidential",
    label: "Confidential / contractual wording",
    re: /\b(confidential|under nda|not for distribution|pricing agreement|contract(ed)? rate|commercial terms)\b/i,
  },
  {
    id: "customer_identity",
    label: "Possible customer identity",
    re: /\b(customer|client|borrower|account holder)\s+(name|id|number)\b|\b(Mr|Mrs|Ms|Dr)\.?\s+[A-Z][a-z]+/,
  },
  { id: "precise_amount", label: "Precise monetary amount", re: /(?:[$€£₹]|\b(?:USD|EUR|GBP|INR|AED|SAR)\s?)\d[\d,]*(?:\.\d+)?/i },
  { id: "precise_date", label: "Precise date (consider a quarter)", re: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/ },
];

export function scanText(...parts: (string | null | undefined)[]): ScanFlag[] {
  const text = parts.filter(Boolean).join("\n");
  return RULES.filter((r) => r.re.test(text)).map(({ id, label }) => ({ id, label }));
}

export function flagLabel(id: string): string {
  return RULES.find((r) => r.id === id)?.label ?? id;
}
