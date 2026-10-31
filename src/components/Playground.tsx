import { runFeedbackAction, runScenarioAction } from "@/server/actions/portal";
import { getRun, listMyRuns, listScenarios } from "@/server/repo/playground";
import { explainSyntheticRun } from "@/server/aira";
import { getScenario } from "@/server/playground/scenarios";
import type { ScenarioResult } from "@/server/playground/scenarios";
import type { Actor } from "@/server/policy/actor";
import { Badge, Empty, Notice, fmtDate } from "./ui";

/** Shared by the employee Playground and client sandboxes; scenarios are filtered by entitlement on the server. */
export async function Playground({ actor, back, runId }: { actor: Actor; back: string; runId?: string }) {
  const [scenarios, runs] = await Promise.all([listScenarios(actor), listMyRuns(actor)]);
  const run = runId ? await getRun(actor, runId).catch(() => null) : null;
  const result = run?.outputs as ScenarioResult | undefined;
  const scenario = run ? getScenario(run.scenarioId) : undefined;
  const explanation = run && result && scenario ? await explainSyntheticRun(scenario.title, run.inputs, result) : null;

  if (!scenarios.length) return <Empty title="No sandbox demonstrations are enabled for this workspace.">Ask your Azentio contact about entitlements.</Empty>;

  return (
    <div className="space-y-6">
      <Notice tone="amber">
        <strong>Sample data.</strong> Every scenario uses synthetic inputs and simulated outputs. Results are demonstrations, not approved credit or business decisions.
      </Notice>
      <div className="grid gap-4 md:grid-cols-2">
        {scenarios.map((s) => (
          <div key={s.id} className="card">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{s.title}</p>
              <Badge tone="gray">Synthetic</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{s.description}</p>
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-brand">Inspect inputs</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-paper p-2">{JSON.stringify(s.inputs, null, 2)}</pre>
            </details>
            <form action={runScenarioAction.bind(null, back)} className="mt-3">
              <input type="hidden" name="scenarioId" value={s.id} />
              <button className="btn">Run demonstration</button>
            </form>
          </div>
        ))}
      </div>

      {run && result && (
        <div className="card border-brand/40">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Run {run.id.slice(-6)} · {fmtDate(run.createdAt)}</p>
            <Badge tone="amber">Simulated output</Badge>
          </div>
          <p className="mt-2 text-lg font-semibold">{result.headline}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {result.metrics.map((m) => (
              <div key={m.label} className="rounded-md bg-paper p-3">
                <p className="text-xs text-muted">{m.label}</p>
                <p className="font-medium">{m.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium">Evidence</p>
          <ul className="list-disc pl-5 text-sm text-muted">{result.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
          <p className="mt-3 text-sm font-medium">Caveats</p>
          <ul className="list-disc pl-5 text-sm text-muted">{result.caveats.map((e) => <li key={e}>{e}</li>)}</ul>
          {explanation && (
            <div className="mt-4 rounded-md bg-sky-50 p-3 text-sm text-sky-900">
              <p className="text-xs font-medium uppercase">AI explanation (synthetic data only)</p>
              <p className="mt-1">{explanation}</p>
            </div>
          )}
          <form action={runFeedbackAction.bind(null, back, run.id)} className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
            <div>
              <label className="label" htmlFor="rating">Was this useful?</label>
              <select id="rating" name="rating" className="input">
                <option value="useful">Useful</option>
                <option value="unclear">Unclear</option>
                <option value="incorrect">Looks incorrect</option>
              </select>
            </div>
            <div className="min-w-60 flex-1">
              <label className="label" htmlFor="comment">Structured feedback</label>
              <input id="comment" name="comment" maxLength={1000} className="input" placeholder="What would make this more useful?" />
            </div>
            <button className="btn-secondary">Send feedback</button>
          </form>
        </div>
      )}

      {runs.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Your recent runs (private to you in this workspace)</p>
          <div className="flex flex-wrap gap-2">
            {runs.map((r) => (
              <a key={r.id} href={`${back}?run=${r.id}`} className="rounded-md border border-line bg-white px-3 py-1 text-xs hover:border-brand">
                {getScenario(r.scenarioId)?.title ?? r.scenarioId} · {fmtDate(r.createdAt)}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
