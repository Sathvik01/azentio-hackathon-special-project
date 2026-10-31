import "server-only";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { Actor } from "@/server/policy/actor";
import { canAccessCommunity, isEmployee } from "@/server/policy";
import { getChatModel, aiProviderLabel } from "@/server/ai/client";
import { ftsSharedIds, getSharedByRefs } from "@/server/repo/shared";
import { listThemes } from "@/server/repo/insights";
import { listContent } from "@/server/repo/catalog";
import { prismaSharedRefsByIds } from "@/server/repo/airaSupport";

export type AiraSource = { ref: string; kind: "shared" | "theme" | "content"; title: string; text: string; href: string };

export type AiraAnswer = {
  answer: string;
  citations: AiraSource[];
  limitations: string;
  mode: "llm" | "extractive" | "no-evidence";
  scope: string;
  provider: string;
};

function terms(q: string) {
  return [...new Set(q.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])];
}

function score(text: string, ts: string[]) {
  const t = text.toLowerCase();
  return ts.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
}

/**
 * Retrieval is scoped by the same policy as every other read:
 *  - public visitors: PUBLIC content only
 *  - client members: approved shared copies + themes + content their workspace may read (never EMPLOYEE)
 *  - employees: the above plus employee content
 * Private drafts, source records and moderation notes are never retrievable.
 */
export async function retrieve(actor: Actor, question: string, k = 8): Promise<AiraSource[]> {
  const ts = terms(question);
  const sources: (AiraSource & { s: number })[] = [];

  if (canAccessCommunity(actor)) {
    const ids = await ftsSharedIds(question, k);
    const refs = await prismaSharedRefsByIds(ids);
    const shared = await getSharedByRefs(refs);
    shared.sort((a, b) => refs.indexOf(a.ref) - refs.indexOf(b.ref));
    shared.forEach((s, i) =>
      sources.push({
        ref: s.ref,
        kind: "shared",
        title: s.title,
        text: `${s.body} (Offering: ${s.offering}; ${s.industry}; ${s.region}; ${s.period})`,
        href: `/portal/learning/${s.ref}`,
        s: 10 - i,
      }),
    );
    for (const t of await listThemes(actor)) {
      const s = score(`${t.title} ${t.summary}`, ts);
      if (s > 0)
        sources.push({
          ref: `THEME-${t.id.slice(-6).toUpperCase()}`,
          kind: "theme",
          title: t.title,
          text: `${t.summary} Limitations: ${t.limitations} Contributing organisations: ${t.distinctOrgs.suppressed ? "suppressed (below minimum cohort)" : t.distinctOrgs.value}.`,
          href: `/portal/learning/themes/${t.id}`,
          s: s + 2,
        });
    }
  }

  for (const c of await listContent(actor)) {
    const s = score(`${c.title} ${c.summary} ${c.body}`, ts);
    if (s > 0) {
      sources.push({
        ref: `DOC-${c.id.slice(-6).toUpperCase()}`,
        kind: "content",
        title: c.title,
        text: `${c.summary} ${c.body}`.slice(0, 900),
        href: canAccessCommunity(actor) ? "/portal" : "/insights",
        s,
      });
    }
  }

  return sources.sort((a, b) => b.s - a.s).slice(0, k).map(({ s: _s, ...rest }) => rest);
}

const answerSchema = z.object({
  answer: z.string().describe("Concise answer grounded only in the provided sources, 2-6 sentences."),
  citations: z.array(z.string()).describe("Refs (e.g. LRN-0001) of the sources actually used."),
  limitations: z.string().describe("Caveats: sample size, de-identification, no causal or prevalence claims."),
}).describe("AIRA's cited answer"); // some providers reject tools without a description

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are AIRA, Azentio's insight assistant. Answer ONLY from the numbered sources provided.
Rules:
- Cite source refs you used. Never invent refs.
- If the sources don't answer the question, say so.
- Popularity is not market prevalence; never claim causation. Mention small samples.
- Never speculate about which client or organisation contributed something.
- Summaries do not retrain any model; do not say otherwise.`,
  ],
  ["human", "Sources:\n{sources}\n\nQuestion: {question}"],
]);

function scopeLabel(actor: Actor) {
  if (isEmployee(actor)) return "Employee scope: approved shared learning, themes and employee content";
  if (canAccessCommunity(actor)) return "Client scope: approved shared learning, themes and content entitled to your workspace";
  return "Public scope: public website content only";
}

function extractive(sources: AiraSource[]): string {
  const snippet = (t: string) => (t.length > 180 ? `${t.slice(0, 180).replace(/\s+\S*$/, "")}…` : t);
  const lines = sources.slice(0, 5).map((s) => `• [${s.ref}] ${s.title} — ${snippet(s.text)}`);
  return `AI synthesis is unavailable, so here are the most relevant approved sources:\n${lines.join("\n")}`;
}

export async function askAira(actor: Actor, question: string): Promise<AiraAnswer> {
  const sources = await retrieve(actor, question);
  const base = { scope: scopeLabel(actor), provider: aiProviderLabel() };
  if (!sources.length) {
    return {
      ...base,
      answer: "I couldn't find approved evidence you're permitted to see that addresses this question.",
      citations: [],
      limitations: "Only reviewed, currently published material within your access scope is searched.",
      mode: "no-evidence",
    };
  }

  const llm = getChatModel();
  if (llm) {
    try {
      const chain = prompt.pipe(llm.withStructuredOutput(answerSchema, { name: "aira_answer", method: "functionCalling" }));
      const out = await chain.invoke({
        question,
        sources: sources.map((s) => `[${s.ref}] (${s.kind}) ${s.title}: ${s.text}`).join("\n"),
      });
      // Drop any citation the model invented: only retrieved refs survive.
      const cited = sources.filter((s) => out.citations.includes(s.ref));
      return { ...base, answer: out.answer, citations: cited.length ? cited : sources.slice(0, 3), limitations: out.limitations, mode: "llm" };
    } catch (e) {
      console.warn("[aira] LLM call failed, using extractive fallback:", (e as Error).message);
    }
  }
  return {
    ...base,
    answer: extractive(sources),
    citations: sources.slice(0, 5),
    limitations: "Extractive listing of approved sources; no synthesis performed.",
    mode: "extractive",
  };
}

/** Optional plain-language explanation of a SYNTHETIC playground result. Only synthetic data is sent. */
export async function explainSyntheticRun(title: string, inputs: unknown, outputs: unknown): Promise<string | null> {
  const llm = getChatModel();
  if (!llm) return null;
  try {
    const res = await llm.invoke([
      ["system", "Explain this sandbox result to a banker in 3 short sentences. It uses synthetic data and is not a credit or business decision; say so."],
      ["human", `Scenario: ${title}\nInputs: ${JSON.stringify(inputs)}\nOutputs: ${JSON.stringify(outputs)}`],
    ]);
    return typeof res.content === "string" ? res.content : null;
  } catch {
    return null;
  }
}
