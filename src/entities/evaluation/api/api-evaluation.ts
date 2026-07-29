import { getJson, patchJson, postJson, deleteRequest } from "tracerWeb/api";
import type { DatasetExportResult, ExampleInput, RegisterCandidateFragmentVersionInput, ReviewSubmission, VariantInput } from "../model/evaluation.js";
import { parseComparison, parseCreatedPrompt, parseDatasetDetail, parseDatasets, parseExecutions, parseExperimentDetail, parseExperimentPreview, parseExperiments, parsePrompts, parsePromptVersion, parsePromptVersions, parsePromptFragments, parseExecutionExampleCandidate, parseRegisteredCandidateFragmentVersion } from "./evaluation.schema.js";

const EVALUATION = "/api/v1/evaluation";
const EXPERIMENTS = "/api/v1/experiments";
const PROMPTS = "/api/v1/prompts";
const PROMPT_FRAGMENTS = "/api/v1/prompt-fragments";
export async function fetchDatasets() {
  return parseDatasets(await getJson<unknown>(`${EVALUATION}/datasets`));
}
export async function fetchExecutionExampleCandidate(jobId: string) {
  return parseExecutionExampleCandidate(await getJson<unknown>(`${EVALUATION}/executions/${encodeURIComponent(jobId)}/candidate`));
}
export async function fetchChatExecutionExampleCandidate(executionId: string) {
  return parseExecutionExampleCandidate(await getJson<unknown>(`${EVALUATION}/chat-executions/${encodeURIComponent(executionId)}/candidate`));
}
export async function fetchDataset(id: string) {
  return parseDatasetDetail(
    await getJson<unknown>(`${EVALUATION}/datasets/${encodeURIComponent(id)}`),
  );
}
export async function createDataset(input: {
  name: string;
  description?: string;
  examples: readonly ExampleInput[];
}) {
  return parseDatasetDetail(
    await postJson<unknown>(`${EVALUATION}/datasets`, input),
  );
}
export async function deleteDataset(id: string) {
  return deleteRequest<void>(`${EVALUATION}/datasets/${encodeURIComponent(id)}`);
}
export async function reviseDataset(
  id: string,
  examples: readonly ExampleInput[],
) {
  return parseDatasetDetail(
    await patchJson<unknown>(
      `${EVALUATION}/datasets/${encodeURIComponent(id)}`,
      { examples },
    ),
  );
}
export async function fetchPrompts() {
  return parsePrompts(await getJson<unknown>(PROMPTS));
}
export async function fetchPromptVersions(id: string) {
  return parsePromptVersions(await getJson<unknown>(`${PROMPTS}/${encodeURIComponent(id)}/versions`));
}
export async function fetchPromptFragments() {
  return parsePromptFragments(await getJson<unknown>(PROMPT_FRAGMENTS));
}
export async function registerCandidateFragmentVersion(
  input: RegisterCandidateFragmentVersionInput,
) {
  return parseRegisteredCandidateFragmentVersion(
    await postJson<unknown>(`${PROMPT_FRAGMENTS}/candidates`, input),
  );
}
export async function fetchExperiments() {
  return parseExperiments(await getJson<unknown>(EXPERIMENTS));
}
export async function createPrompt(input: {
  name: string;
  agentName: string;
  backend: "python" | "claude-sdk";
  language: string;
  version: {
    semanticVersion: string;
    content: string;
    contentHash: string;
    toolContractVersion: string;
    outputSchemaVersion: string;
  };
}) {
  return parseCreatedPrompt(await postJson<unknown>(PROMPTS, input));
}
export async function createPromptVersion(
  id: string,
  input: {
    semanticVersion: string;
    content: string;
    contentHash: string;
    toolContractVersion: string;
    outputSchemaVersion: string;
  },
) {
  return parsePromptVersion(
    await postJson<unknown>(
      `${PROMPTS}/${encodeURIComponent(id)}/versions`,
      input,
    ),
  );
}
export async function createExperiment(input: {
  datasetId: string;
  datasetRevision: number;
  evaluatorSetVersion: string;
  variants: readonly VariantInput[];
  maxBudgetUsd: number;
  repetitions: number;
}) {
  return parseExperimentDetail(await postJson<unknown>(EXPERIMENTS, input));
}
export async function fetchExperiment(id: string) {
  return parseExperimentDetail(
    await getJson<unknown>(`${EXPERIMENTS}/${encodeURIComponent(id)}`),
  );
}
export async function fetchExperimentPreview(id: string) {
  return parseExperimentPreview(
    await getJson<unknown>(`${EXPERIMENTS}/${encodeURIComponent(id)}/preview`),
  );
}
export async function fetchExecutions(id: string) {
  return parseExecutions(
    await getJson<unknown>(
      `${EXPERIMENTS}/${encodeURIComponent(id)}/executions`,
    ),
  );
}
export async function fetchComparison(id: string) {
  return parseComparison(
    await getJson<unknown>(
      `${EXPERIMENTS}/${encodeURIComponent(id)}/comparison`,
    ),
  );
}
export async function startExperiment(
  id: string,
  confirmation: {
    datasetRevision: number;
    logicalExecutionCount: number;
    maximumBudgetUsd: number;
  },
) {
  return postJson<unknown>(`${EXPERIMENTS}/${encodeURIComponent(id)}/start`, {
    confirmation,
  });
}
export async function cancelExperiment(id: string) {
  return postJson<unknown>(`${EXPERIMENTS}/${encodeURIComponent(id)}/cancel`);
}

export async function fetchDatasetQuality(id: string) {
  return getJson<{ totalExamples: number; enabledExamples: number; duplicateRate: number; warnings?: string[] }>(`${EVALUATION}/datasets/${encodeURIComponent(id)}/quality`);
}

export async function exportDataset(id: string, format: string, experimentId?: string, minScore?: number) {
  return postJson<DatasetExportResult>(`${EVALUATION}/datasets/${encodeURIComponent(id)}/export/${format}`, {
    experimentId,
    minScore,
  });
}

export async function listReviews() {
  return getJson<unknown[]>(`${EVALUATION}/reviews`);
}
export async function createReview(input: { experimentId: string }) {
  return postJson<unknown>(`${EXPERIMENTS}/${encodeURIComponent(input.experimentId)}/reviews`);
}
export async function submitReview(experimentId: string, input: ReviewSubmission) {
  return postJson<unknown>(`${EXPERIMENTS}/${encodeURIComponent(experimentId)}/reviews/submit`, input);
}
