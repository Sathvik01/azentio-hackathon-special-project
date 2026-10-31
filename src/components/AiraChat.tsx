"use client";

import { useState } from "react";

type Source = { ref: string; kind: string; title: string; href: string };
type Answer = { answer: string; citations: Source[]; limitations: string; mode: string; scope: string; provider: string };

export function AiraChat({ suggestions = [] }: { suggestions?: string[] }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ q: string; a: Answer | { error: string } }[]>([]);

  async function ask(question: string) {
    if (question.trim().length < 3) return;
    setBusy(true);
    try {
      const res = await fetch("/api/aira", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const a = res.ok ? ((await res.json()) as Answer) : { error: `AIRA is unavailable (${res.status}).` };
      setHistory((h) => [{ q: question, a }, ...h]);
      setQ("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex gap-2"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder="Ask about offerings, themes or shared learning…" className="input" />
        <button className="btn" disabled={busy}>
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>
      {history.length === 0 && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="border border-line bg-white px-3 py-1 font-mono text-xs hover:border-ink hover:bg-signal-soft">
              {s}
            </button>
          ))}
        </div>
      )}
      {history.map(({ q, a }, i) => (
        <div key={i} className="card">
          <p className="text-sm font-medium">{q}</p>
          {"error" in a ? (
            <p className="mt-2 text-sm text-red-700">{a.error}</p>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{a.answer}</p>
              {a.citations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.citations.map((c) => (
                    <a key={c.ref} href={c.href} className="border border-line bg-paper px-2 py-1 text-xs hover:border-ink">
                      <span className="font-mono text-brand">{c.ref}</span> {c.title}
                    </a>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-muted">Limitations: {a.limitations}</p>
              <p className="mt-1 text-xs text-muted">
                {a.scope} · {a.mode === "llm" ? `Synthesised by ${a.provider}` : a.mode === "extractive" ? "Extractive fallback" : "No evidence"} · Summaries do not retrain
                any model.
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
