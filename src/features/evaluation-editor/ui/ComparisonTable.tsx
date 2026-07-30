import type { ExperimentComparison } from "~/entities/evaluation/model/evaluation.js";
import { formatMetric } from "../lib/metrics.js";

interface ComparisonTableProps {
  readonly comparison: ExperimentComparison | undefined;
  readonly comparisonError: boolean;
}

export function ComparisonTable({
  comparison,
  comparisonError,
}: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-sm border border-hair bg-s1 p-4">
      <h3 className="text-sm font-semibold">Baseline comparison</h3>
      {comparisonError && (
        <p role="alert" className="mt-2 text-xs text-danger">
          Comparison is temporarily unavailable.
        </p>
      )}
      <table className="mt-3 w-full min-w-[480px] text-left text-xs">
        <thead>
          <tr className="text-ink-muted">
            <th>Variant</th>
            <th>Succeeded</th>
            <th>Mean score</th>
            <th>Total cost</th>
          </tr>
        </thead>
        <tbody>
          {comparison?.variants.map((row) => (
            <tr key={row.variantId} className="border-t border-hair">
              <td className="py-2 font-medium">{row.name}</td>
              <td>{row.succeeded}</td>
              <td>{formatMetric(row.meanScore)}</td>
              <td>${row.totalCostUsd.toFixed(4)}</td>
            </tr>
          ))}
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
