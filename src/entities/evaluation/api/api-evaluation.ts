import { getJson, patchJson, postJson, deleteRequest } from "tracerWeb/api";
import type { DatasetExportResult, ExampleInput, ExperimentStartConfirmation, PromptBackend, RegisterCandidateFragmentVersionInput, ReviewSubmission, VariantInput } from "../model/evaluation.js";
import { parseComparison, parseCreatedPrompt, parseDatasetDetail, parseDatasets, parseExecutions, parseExperimentDetail, parseExperimentPreview, parseExperiments, parsePrompts, parsePromptVersion, parsePromptVersions, parsePromptFragments, parseExecutionExampleCandidate, parseRegisteredCandidateFragmentVersion, parseReviewPair, parseReviews } from "./evaluation.schema.js";

// 평가는 에이전트 서비스가 소유하므로 게이트웨이의 에이전트 접두사 아래로 부른다.
const EVALUATION = "/api/agent/evaluation";
const EXPERIMENTS = `${EVALUATION}/experiments`;
const PROMPTS = `${EVALUATION}/prompts`;
const PROMPT_FRAGMENTS = `${EVALUATION}/prompt-fragments`;
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
    await postJson<unknown>(`${PROMPT_FRAGMENTS}/candidate`, input),
  );
}
export async function fetchExperiments() {
  return parseExperiments(await getJson<unknown>(EXPERIMENTS));
}
export async function createPrompt(input: {
  name: string;
  agentName: string;
  backend: PromptBackend;
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
  confirmation: ExperimentStartConfirmation,
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

function reviews(experimentId: string) {
  return `${EXPERIMENTS}/${encodeURIComponent(experimentId)}/reviews`;
}
export async function fetchReviews(experimentId: string) {
  return parseReviews(await getJson<unknown>(reviews(experimentId)));
}
export async function drawReviewPair(experimentId: string) {
  return parseReviewPair(await postJson<unknown>(`${reviews(experimentId)}/next`));
}
export async function submitReview(experimentId: string, input: ReviewSubmission) {
  return postJson<unknown>(reviews(experimentId), input);
}
