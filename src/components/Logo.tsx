import Link from "next/link";

export function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Link href="/" className={`inline-flex items-baseline gap-0.5 text-lg font-semibold tracking-tight ${tone === "light" ? "text-white" : "text-ink"}`}>
      azentio<span className={tone === "light" ? "text-signal-light" : "text-signal"}>.ai</span>
    </Link>
  );
}
