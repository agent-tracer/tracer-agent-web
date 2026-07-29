import { useState } from "react";
import type { ExperimentComparison, ExperimentDetail, ExperimentPreview, ExecutionWithScores } from "~/entities/evaluation/model/evaluation.js";
import { ComparisonTable } from "./ComparisonTable.js";
import { Metric } from "./Metric.js";

interface ExperimentRunProps {
  readonly experimentId: string;
  readonly detail: ExperimentDetail | undefined;
  readonly preview: ExperimentPreview | undefined;
  readonly executions: readonly ExecutionWithScores[];
  readonly failed: readonly ExecutionWithScores[];
  readonly percent: number;
  readonly start: () => void;
  readonly cancel: () => void;
  readonly detailError: boolean;
  readonly comparison: ExperimentComparison | undefined;
  readonly comparisonError: boolean;
}
export function ExperimentRun({
  experimentId,
  detail,
  preview,
  executions,
  failed,
  percent,
  start,
  cancel,
  detailError,
  comparison,
  comparisonError,
}: ExperimentRunProps) {
  const variants = detail?.variants ?? [];
  const [failurePage, setFailurePage] = useState(1);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(failed.length / pageSize));
  const visibleFailures = failed.slice(
    (failurePage - 1) * pageSize,
    failurePage * pageSize,
  );
  const langsmithBase = import.meta.env.VITE_LANGSMITH_PROJECT_URL as
    string | undefined;
  return (
    <div className="grid gap-4">
      <div className="rounded-sm border border-hair bg-s1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Run {experimentId}</h3>
          <span className="rounded-pill bg-s2 px-2 py-1 text-xs">
            {detail?.experiment.status ?? "loading"}
          </span>
        </div>
        {detailError && (
          <p role="alert" className="mt-2 text-xs text-danger">
            Experiment details failed to load; other panels remain available.
          </p>
        )}
        {preview && (
          <>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
              <Metric
                label="Matrix"
                value={`${preview.exampleCount} × ${preview.variantCount} × ${preview.repetitions}`}
              />
              <Metric
                label="Executions"
                value={String(preview.logicalExecutionCount)}
              />
              <Metric
                label="Budget"
                value={`$${preview.maximumBudgetUsd.toFixed(2)}`}
              />
              <Metric
                label="Estimate"
                value={
                  preview.estimatedCostUsd === null
                    ? "Unavailable"
                    : `$${preview.estimatedCostUsd.toFixed(2)}`
                }
              />
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Disclosure: synthetic {preview.disclosure.synthetic}, approved{" "}
              {preview.disclosure["approved-evaluation"]}, masked{" "}
              {preview.disclosure["production-masked"]}, external-disabled{" "}
              {preview.disclosure["external-disabled"]}
            </p>
            {!preview.externallyExportable && (
              <p role="status" className="mt-2 text-xs text-warn">
                This run may proceed internally, but external-disabled examples
                must not be exported to LangSmith.
              </p>
            )}
          </>
        )}
        <div
          className="mt-3 h-2 overflow-hidden rounded-pill bg-s2"
          role="progressbar"
          aria-label="Experiment progress"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          {percent}% · {executions.length} materialized executions
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={start}
            disabled={!preview || detail?.experiment.status !== "draft"}
            className="rounded-xs bg-primary px-3 py-2 text-xs text-white disabled:opacity-40"
          >
            Confirm preview and start
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={
              !detail ||
              ["completed", "cancelled"].includes(detail.experiment.status)
            }
            className="rounded-xs border border-hair px-3 py-2 text-xs disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
      <ComparisonTable
        comparison={comparison}
        comparisonError={comparisonError}
        executions={executions}
      />
      <div className="rounded-sm border border-hair bg-s1 p-4">
        <h3 className="text-sm font-semibold">Failed executions</h3>
        {failed.length === 0 ? (
          <p className="mt-2 text-xs text-ink-muted">No failed executions.</p>
        ) : (
          <>
            <div className="mt-2 grid gap-2">
              {visibleFailures.map((row) => (
                <details
                  key={row.execution.id}
                  className="rounded-xs border border-hair bg-canvas p-2"
                >
                  <summary className="cursor-pointer text-xs font-medium">
                    {row.execution.id} · variant{" "}
                    {variants.find(
                      (variant) => variant.id === row.execution.variantId,
                    )?.name ?? row.execution.variantId}
                  </summary>
                  <dl className="mt-2 grid gap-1 text-xs">
                    <div>Example: {row.execution.exampleId}</div>
                    <div>Attempts: {row.execution.attemptCount}</div>
                    <div>Cost: ${row.execution.costUsd.toFixed(4)}</div>
                    {row.scores.map((score) => (
                      <div key={score.id}>
                        {score.evaluatorId}:{" "}
                        {score.label ?? score.score ?? "unscored"}{" "}
                        {score.reason ?? ""}
                      </div>
                    ))}
                  </dl>
                  {row.execution.traceId && (
                    <TraceReference
                      traceId={row.execution.traceId}
                      langsmithBase={langsmithBase}
                    />
                  )}
                </details>
              ))}
            </div>
            <nav
              aria-label="Failed execution pages"
              className="mt-3 flex items-center justify-between text-xs"
            >
              <button
                type="button"
                disabled={failurePage === 1}
                onClick={() => setFailurePage((page) => Math.max(1, page - 1))}
                className="rounded-xs border border-hair px-2 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {failurePage} of {pageCount} · {failed.length} failures
              </span>
              <button
                type="button"
                disabled={failurePage === pageCount}
                onClick={() =>
                  setFailurePage((page) => Math.min(pageCount, page + 1))
                }
                className="rounded-xs border border-hair px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
function TraceReference({
  traceId,
  langsmithBase,
}: {
  readonly traceId: string;
  readonly langsmithBase: string | undefined;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-xs">
      <code>Trace {traceId}</code>
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(traceId)}
        className="text-primary underline"
      >
        Copy trace ID
      </button>
      {langsmithBase ? (
        <a
          href={langsmithBase}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          Open LangSmith project
        </a>
      ) : (
        <span className="text-ink-tertiary">
          Set VITE_LANGSMITH_PROJECT_URL to enable the project link.
        </span>
      )}
      <span className="text-ink-tertiary">
        Internal trace lookup is unavailable until the server exposes a trace
        route.
      </span>
    </div>
  );
}
