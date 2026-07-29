import { useQuery } from "@tanstack/react-query";
import { fetchComparison, fetchDataset, fetchDatasets, fetchExecutions, fetchExperiment, fetchExperimentPreview, fetchExperiments, fetchPromptVersions, fetchPromptFragments, fetchPrompts } from "./api-evaluation.js";

export const evaluationKeys = {
  all: ["monitor", "evaluation"] as const,
  datasets: () => [...evaluationKeys.all, "datasets"] as const,
  dataset: (id: string) => [...evaluationKeys.datasets(), id] as const,
  prompts: () => [...evaluationKeys.all, "prompts"] as const,
  promptVersions: (id: string) => [...evaluationKeys.prompts(), id, "versions"] as const,
  promptFragments: () => [...evaluationKeys.all, "prompt-fragments"] as const,
  experiments: () => [...evaluationKeys.all, "experiments"] as const,
  experiment: (id: string) =>
    [...evaluationKeys.all, "experiment", id] as const,
};
export function useDatasetsQuery() {
  return useQuery({
    queryKey: evaluationKeys.datasets(),
    queryFn: fetchDatasets,
  });
}
export function useDatasetQuery(id: string | null) {
  return useQuery({
    queryKey: evaluationKeys.dataset(id ?? "disabled"),
    queryFn: () => fetchDataset(id!),
    enabled: id !== null,
  });
}
export function usePromptsQuery() {
  return useQuery({
    queryKey: evaluationKeys.prompts(),
    queryFn: fetchPrompts,
  });
}
export function usePromptVersionsQuery(id: string | null) {
  return useQuery({
    queryKey: evaluationKeys.promptVersions(id ?? "disabled"),
    queryFn: () => fetchPromptVersions(id!),
    enabled: id !== null,
  });
}
export function usePromptFragmentsQuery() {
  return useQuery({
    queryKey: evaluationKeys.promptFragments(),
    queryFn: fetchPromptFragments,
  });
}
export function useExperimentsQuery() {
  return useQuery({ queryKey: evaluationKeys.experiments(), queryFn: fetchExperiments });
}
export function useExperimentWorkspaceQuery(id: string | null) {
  const base = evaluationKeys.experiment(id ?? "disabled");
  const enabled = id !== null;
  return {
    detail: useQuery({
      queryKey: [...base, "detail"],
      queryFn: () => fetchExperiment(id!),
      enabled,
      refetchInterval: 5000,
    }),
    preview: useQuery({
      queryKey: [...base, "preview"],
      queryFn: () => fetchExperimentPreview(id!),
      enabled,
    }),
    executions: useQuery({
      queryKey: [...base, "executions"],
      queryFn: () => fetchExecutions(id!),
      enabled,
      refetchInterval: 5000,
    }),
    comparison: useQuery({
      queryKey: [...base, "comparison"],
      queryFn: () => fetchComparison(id!),
      enabled,
      refetchInterval: 5000,
    }),
  };
}
