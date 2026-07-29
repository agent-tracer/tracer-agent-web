import type { ExecutionWithScores, ExperimentComparison } from "~/entities/evaluation/model/evaluation.js";
import { formatMetric, formatPercent } from "../lib/metrics.js";

interface ComparisonTableProps {
  readonly comparison: ExperimentComparison | undefined;
  readonly comparisonError: boolean;
  readonly executions: readonly ExecutionWithScores[];
}

/** variantId별로 실제 돈 resolvedPromptHash를 모아, 비교가 실제로 다른 프롬프트를 겨눴는지 드러낸다. */
function promptHashesByVariant(
  executions: readonly ExecutionWithScores[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of executions) {
    const hash = row.execution.resolvedPromptHash;
    if (hash === null) continue;
    const set = map.get(row.execution.variantId) ?? new Set<string>();
    set.add(hash);
    map.set(row.execution.variantId, set);
  }
  return map;
}

function shortHash(hash: string): string {
  return hash.slice(0, 10);
}

export function ComparisonTable({
  comparison,
  comparisonError,
  executions,
}: ComparisonTableProps) {
  const hashesByVariant = promptHashesByVariant(executions);
  const singleHashes = (comparison?.variants ?? [])
    .map((row) => hashesByVariant.get(row.variantId))
    .filter((set): set is ReadonlySet<string> => set !== undefined && set.size === 1)
    .map((set) => [...set][0]);
  const allSameHash =
    (comparison?.variants.length ?? 0) > 1 &&
    singleHashes.length === (comparison?.variants.length ?? 0) &&
    new Set(singleHashes).size === 1;

  return (
    <div className="overflow-x-auto rounded-sm border border-hair bg-s1 p-4">
      <h3 className="text-sm font-semibold">Baseline comparison</h3>
      {comparisonError && (
        <p role="alert" className="mt-2 text-xs text-danger">
          Comparison is temporarily unavailable.
        </p>
      )}
      {comparison?.warnings.map((warning) => (
        <p key={warning} className="mt-2 text-xs text-warn">
          {warning}
        </p>
      ))}
      {allSameHash && (
        <p role="alert" className="mt-2 text-xs text-danger">
          Every variant ran the identical resolved prompt hash. This comparison
          has not actually compared different prompts.
        </p>
      )}
      <table className="mt-3 w-full min-w-[840px] text-left text-xs">
        <thead>
          <tr className="text-ink-muted">
            <th>Variant</th>
            <th>Samples</th>
            <th>Success</th>
            <th>Mean score</th>
            <th>Δ score</th>
            <th>Mean cost</th>
            <th>P95 latency</th>
            <th>Prompt hash</th>
          </tr>
        </thead>
        <tbody>
          {comparison?.variants.map((row) => {
            const hashes = hashesByVariant.get(row.variantId);
            const hashLabel =
              hashes === undefined || hashes.size === 0
                ? "—"
                : hashes.size === 1
                  ? shortHash([...hashes][0]!)
                  : `mixed (${hashes.size})`;
            return (
              <tr key={row.variantId} className="border-t border-hair">
                <td className="py-2 font-medium">
                  {row.name}
                  {row.baseline ? " (baseline)" : ""}
                </td>
                <td>
                  {row.sampleSize}/{row.executionCount}
                </td>
                <td>{formatPercent(row.successRate)}</td>
                <td>{formatMetric(row.meanScore)}</td>
                <td>{formatMetric(row.scoreDeltaFromBaseline)}</td>
                <td>${row.meanCostUsd.toFixed(4)}</td>
                <td>
                  {row.p95LatencyMs === null ? "—" : `${row.p95LatencyMs} ms`}
                </td>
                <td>
                  <code
                    className="break-all"
                    title={hashes ? [...hashes].join(", ") : undefined}
                  >
                    {hashLabel}
                  </code>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!comparison?.variants.length && (
        <p className="mt-3 text-xs text-ink-muted">
          Comparison appears after executions and scores are stored.
        </p>
      )}
    </div>
  );
}
