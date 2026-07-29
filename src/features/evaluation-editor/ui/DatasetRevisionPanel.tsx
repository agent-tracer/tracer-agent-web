import { useState } from "react";
import { useDatasetQuery } from "~/entities/evaluation/api/queries.js";
import { useEvaluationMutations } from "~/entities/evaluation/api/mutations.js";
import type { DisclosureClass, ExampleInput } from "~/entities/evaluation/model/evaluation.js";
import { errorMessage } from "../lib/json.js";
import { ErrorRow } from "./ErrorRow.js";
import { ExportPanel } from "./ExportPanel.js";

interface DatasetRevisionPanelProps {
  readonly datasetId: string;
  readonly buildExample: () => ExampleInput;
  readonly setError: (message: string | null) => void;
}
export function DatasetRevisionPanel({
  datasetId,
  buildExample,
  setError,
}: DatasetRevisionPanelProps) {
  const detail = useDatasetQuery(datasetId);
  const mutations = useEvaluationMutations();
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const revise = () => {
    if (!detail.data) return;
    setError(null);
    try {
      const retained: ExampleInput[] = detail.data.examples
        .filter((row) => !excluded.has(row.id))
        .map((row) => ({
          input: row.input,
          ...(row.referenceOutput === null
            ? {}
            : { referenceOutput: row.referenceOutput }),
          ...(row.metadata === undefined ? {} : { metadata: row.metadata }),
          ...(row.evidence === undefined ? {} : { evidence: row.evidence }),
          ...(row.sourceExecutionId === null || row.sourceExecutionId === undefined
            ? {}
            : { sourceExecutionId: row.sourceExecutionId }),
          disclosureClass: row.disclosureClass,
        }));
      mutations.reviseDataset.mutate(
        { id: datasetId, examples: [...retained, buildExample()] },
        {
          onSuccess: () => setExcluded(new Set()),
          onError: (e) => setError(errorMessage(e)),
        },
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <div className="rounded-sm border border-hair bg-s1 p-4">
      <h3 className="text-sm font-semibold">Current revision</h3>
      {detail.isLoading && <p role="status">Loading revision…</p>}
      {detail.isError && <ErrorRow retry={() => void detail.refetch()} />}
      {detail.data && (
        <>
          <p className="mt-2 text-xs text-ink-muted">
            Revision {detail.data.dataset.currentRevision} ·{" "}
            {detail.data.examples.length} examples
          </p>
          {detail.data.examples.length === 0 && (
            <p className="mt-2 text-xs text-ink-muted">
              This revision has no examples yet. Build one with the form above —
              or import a completed job or chat execution — then create the next
              revision.
            </p>
          )}
          <DisclosureSummary
            rows={detail.data.examples.map((row) => row.disclosureClass)}
          />
          <ul
            aria-label="Examples included in next revision"
            className="mt-3 grid gap-2"
          >
            {detail.data.examples.map((row) => (
              <li
                key={row.id}
                className="flex items-start gap-2 rounded-xs border border-hair bg-canvas p-2"
              >
                <input
                  aria-label={`Include example ${row.id}`}
                  type="checkbox"
                  checked={!excluded.has(row.id)}
                  onChange={() =>
                    setExcluded((current) => {
                      const next = new Set(current);
                      if (next.has(row.id)) next.delete(row.id);
                      else next.add(row.id);
                      return next;
                    })
                  }
                />
                <div className="min-w-0 text-xs">
                  <span className="font-mono">{row.id}</span>
                  <span className="ml-2 text-ink-muted">
                    {row.disclosureClass}
                  </span>
                  <pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap text-[11px]">
                    {JSON.stringify(row.input, null, 2)}
                  </pre>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">
            The next payload retains{" "}
            {detail.data.examples.length - excluded.size} current examples and
            appends the editor example. Unchecked examples are omitted from
            the next immutable revision; the API has no in-place enable
            toggle.
          </p>
          <button
            type="button"
            onClick={revise}
            disabled={
              mutations.reviseDataset.isPending ||
              excluded.size === detail.data.examples.length
            }
            className="mt-3 rounded-xs border border-hair px-3 py-2 text-xs disabled:opacity-40"
          >
            Review payload and create revision{" "}
            {detail.data.dataset.currentRevision + 1}
          </button>
          <p className="mt-2 text-xs text-ink-tertiary">
            Revisions used by a started experiment are server-locked.
          </p>
          <ExportPanel datasetId={detail.data.dataset.id} />
        </>
      )}
    </div>
  );
}
function DisclosureSummary({ rows }: { rows: readonly DisclosureClass[] }) {
  return (
    <ul aria-label="Disclosure summary" className="mt-3 flex flex-wrap gap-2">
      {(
        [
          "synthetic",
          "approved-evaluation",
          "production-masked",
          "external-disabled",
        ] as const
      ).map((kind) => (
        <li key={kind} className="rounded-pill bg-s2 px-2 py-1 text-[11px]">
          {kind}: {rows.filter((row) => row === kind).length}
        </li>
      ))}
    </ul>
  );
}
