import { useDatasetsQuery } from "~/entities/evaluation/api/queries.js";
import { useEvaluationMutations } from "~/entities/evaluation/api/mutations.js";
import { errorMessage } from "../lib/json.js";
import { ErrorRow } from "./ErrorRow.js";

interface DatasetListProps {
  readonly selected: string | null;
  readonly onSelect: (id: string) => void;
  readonly onDeleted: (id: string) => void;
}
export function DatasetList({ selected, onSelect, onDeleted }: DatasetListProps) {
  const datasets = useDatasetsQuery();
  const mutations = useEvaluationMutations();
  return (
    <div className="rounded-sm border border-hair bg-s1 p-3">
      <h2 id="datasets-heading" className="text-sm font-semibold">
        Datasets
      </h2>
      {datasets.isLoading && (
        <p role="status" className="mt-3 text-sm text-ink-muted">
          Loading datasets…
        </p>
      )}
      {datasets.isError && <ErrorRow retry={() => void datasets.refetch()} />}
      {datasets.data?.length === 0 && (
        <p className="mt-3 text-sm text-ink-muted">
          No datasets yet. Create one with the form on the right — importing a
          completed job or chat execution gives you a starting example.
        </p>
      )}
      <div className="mt-2 grid gap-1">
        {datasets.data?.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row.id)}
            aria-pressed={selected === row.id}
            className="flex items-center justify-between rounded-xs border border-hair bg-canvas p-2 text-left text-xs group"
          >
            <div>
              <span className="block font-medium text-ink">{row.name}</span>
              <span className="text-ink-muted">
                Revision {row.currentRevision}
              </span>
            </div>
            <button
              type="button"
              className="hidden text-danger hover:underline group-hover:block px-2"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this dataset?")) {
                  mutations.deleteDataset.mutate(row.id, {
                    onSuccess: () => onDeleted(row.id),
                    onError: (err) => alert(errorMessage(err)),
                  });
                }
              }}
            >
              Delete
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
