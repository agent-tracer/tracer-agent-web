import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelExperiment, createDataset, deleteDataset, createExperiment, createPrompt, createPromptVersion, registerCandidateFragmentVersion, reviseDataset, startExperiment } from "./api-evaluation.js";
import { evaluationKeys } from "./queries.js";

export function useEvaluationMutations() {
  const client = useQueryClient();
  const refresh = () =>
    void client.invalidateQueries({ queryKey: evaluationKeys.all });
  return {
    createDataset: useMutation({
      mutationFn: createDataset,
      onSuccess: refresh,
    }),
    deleteDataset: useMutation({
      mutationFn: deleteDataset,
      onSuccess: refresh,
    }),
    reviseDataset: useMutation({
      mutationFn: ({
        id,
        examples,
      }: Parameters<typeof reviseDataset> extends [string, infer E]
        ? { id: string; examples: E }
        : never) => reviseDataset(id, examples),
      onSuccess: refresh,
    }),
    createPrompt: useMutation({ mutationFn: createPrompt, onSuccess: refresh }),
    registerCandidateFragmentVersion: useMutation({
      mutationFn: registerCandidateFragmentVersion,
      onSuccess: refresh,
    }),
    createPromptVersion: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: string;
        input: Parameters<typeof createPromptVersion>[1];
      }) => createPromptVersion(id, input),
      onSuccess: refresh,
    }),
    createExperiment: useMutation({
      mutationFn: createExperiment,
      onSuccess: refresh,
    }),
    startExperiment: useMutation({
      mutationFn: ({
        id,
        confirmation,
      }: {
        id: string;
        confirmation: Parameters<typeof startExperiment>[1];
      }) => startExperiment(id, confirmation),
      onSuccess: refresh,
    }),
    cancelExperiment: useMutation({
      mutationFn: cancelExperiment,
      onSuccess: refresh,
    }),
  };
}
