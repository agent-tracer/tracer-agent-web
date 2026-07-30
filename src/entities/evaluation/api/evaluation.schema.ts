import { z } from "zod";
import type { DatasetDetail, EvaluationDataset, ExperimentDetail, ExperimentPreview, Experiment, HumanReview, PromptDefinition, PromptVersion, PromptFragmentBinding, ExecutionExampleCandidate, RegisterCandidateFragmentVersionResult, ReviewPair } from "../model/evaluation.js";
import { backend, iso, optional, optionalRecord, parse, record, status } from "./evaluation.primitives.schema.js";

export { parseComparison, parseExecutions } from "./evaluation.result.schema.js";

const dataset = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    currentRevision: z.number().int().positive(),
    createdAt: iso,
  })
  .passthrough();
const disclosure = z.enum([
  "synthetic",
  "approved-evaluation",
  "production-masked",
  "external-disabled",
]);
const example = z
  .object({
    id: z.string(),
    revision: z.number().int().positive(),
    input: record,
    referenceOutput: record.nullable().optional(),
    metadata: record.optional(),
    evidence: record.optional(),
    sourceExecutionId: z.string().nullable().optional(),
    disclosureClass: disclosure,
    enabled: z.boolean(),
  })
  .passthrough();
const prompt = z
  .object({
    id: z.string(),
    agentName: z.string(),
    backend,
    language: z.string(),
    name: z.string(),
    createdAt: iso,
  })
  .passthrough();
const promptVersion = z
  .object({
    id: z.string(),
    definitionId: z.string(),
    semanticVersion: z.string(),
    content: z.string(),
    contentHash: z.string(),
    toolContractVersion: z.string(),
    outputSchemaVersion: z.string(),
    createdAt: iso,
  })
  .passthrough();
const fragmentVersion = z.object({
  id: z.string(), semanticVersion: z.string(), contentHash: z.string(),
  toolContractVersion: z.string(), outputSchemaVersion: z.string(),
  integrity: z.enum(["matched", "mismatch"]),
}).passthrough();
const fragment = z.object({
  templateKey: z.string(), fragmentSlot: z.string(), definitionKey: z.string(),
  codeName: z.string(), agentName: z.string(), backend,
  language: z.string(), fragmentName: z.string(), codeDefaultVersion: z.string(),
  codeDefaultHash: z.string().nullable(), versions: z.array(fragmentVersion),
}).passthrough();
const variant = z
  .object({
    id: z.string(),
    experimentId: z.string(),
    name: z.string(),
    baseline: z.boolean(),
    backend,
    agentName: z.string(),
    promptVersionId: optional(z.string()),
    toolContractVersion: z.string(),
    limits: optionalRecord(record),
    fragmentSelections: optionalRecord(z.record(z.string())),
  })
  .passthrough();
const review = z
  .object({
    id: z.string(),
    experimentId: z.string(),
    userId: z.string(),
    reviewerUserId: z.string(),
    executionAId: z.string(),
    executionBId: z.string(),
    preference: z.enum(["a", "b", "tie"]),
    reason: optional(z.string()),
    correctedOutput: optional(record),
    createdAt: iso,
  })
  .passthrough();
const experiment = z
  .object({
    id: z.string(),
    datasetId: z.string(),
    datasetRevision: z.number().int().positive(),
    evaluatorSetVersion: z.string(),
    status,
    maxBudgetUsd: z.number(),
    repetitions: z.number().int().positive(),
    createdAt: iso,
    completedAt: optional(iso),
  })
  .passthrough();


export const parseDatasets = (value: unknown): readonly EvaluationDataset[] =>
  parse<readonly EvaluationDataset[]>(
    z.object({ datasets: z.array(dataset) }).transform((row) => row.datasets),
    value,
    "datasets",
  );
export const parseDatasetDetail = (value: unknown): DatasetDetail =>
  parse<DatasetDetail>(
    z.object({ dataset, examples: z.array(example) }),
    value,
    "dataset",
  );
export const parseExecutionExampleCandidate = (value: unknown): ExecutionExampleCandidate =>
  parse<ExecutionExampleCandidate>(z.object({
    sourceExecutionId: z.string(), agentName: z.string(), input: record, evidence: record,
    referenceOutput: record.nullable(), suggestedDisclosureClass: z.literal("production-masked"),
    excludedTruncatedTools: z.array(z.string()),
  }), value, "execution example candidate");
export const parsePrompts = (value: unknown): readonly PromptDefinition[] =>
  parse<readonly PromptDefinition[]>(
    z.object({ prompts: z.array(prompt) }).transform((row) => row.prompts),
    value,
    "prompts",
  );
export const parseCreatedPrompt = (
  value: unknown,
): { readonly definition: PromptDefinition; readonly version: PromptVersion } =>
  parse(
    z.object({ definition: prompt, version: promptVersion }),
    value,
    "created prompt",
  );
export const parsePromptVersion = (value: unknown): PromptVersion =>
  parse<PromptVersion>(
    z.object({ version: promptVersion }).transform((row) => row.version),
    value,
    "prompt version",
  );
export const parsePromptVersions = (value: unknown): readonly PromptVersion[] =>
  parse<readonly PromptVersion[]>(
    z.object({ versions: z.array(promptVersion) }).transform((row) => row.versions),
    value,
    "prompt versions",
  );
export const parsePromptFragments = (value: unknown): readonly PromptFragmentBinding[] =>
  parse<readonly PromptFragmentBinding[]>(
    z.object({ fragments: z.array(fragment) }).transform((row) => row.fragments),
    value,
    "prompt fragments",
  );
export const parseRegisteredCandidateFragmentVersion = (
  value: unknown,
): RegisterCandidateFragmentVersionResult =>
  parse<RegisterCandidateFragmentVersionResult>(
    z.object({
      definitionId: z.string(),
      versionId: z.string(),
      semanticVersion: z.string(),
    }),
    value,
    "candidate fragment version",
  );
export const parseExperiments = (value: unknown): readonly Experiment[] =>
  parse<readonly Experiment[]>(
    z.object({ experiments: z.array(experiment) }).transform((row) => row.experiments),
    value,
    "experiments",
  );
export const parseExperimentDetail = (value: unknown): ExperimentDetail =>
  parse<ExperimentDetail>(
    z.object({ experiment, variants: z.array(variant) }),
    value,
    "experiment",
  );
export const parseExperimentPreview = (value: unknown): ExperimentPreview =>
  parse<ExperimentPreview>(
    z.object({
      exampleCount: z.number().int(),
      variantCount: z.number().int(),
      repetitions: z.number().int(),
      executionCount: z.number().int(),
      maxBudgetUsd: z.number(),
      fingerprint: z.string().min(1),
    }),
    value,
    "experiment preview",
  );
export const parseReviewPair = (value: unknown): ReviewPair | null =>
  parse<ReviewPair | null>(
    z
      .object({
        executionA: z.object({ id: z.string(), output: record.nullable() }),
        executionB: z.object({ id: z.string(), output: record.nullable() }),
        exampleId: z.string(),
        repetition: z.number().int(),
      })
      .nullable(),
    value,
    "review pair",
  );
export const parseReviews = (value: unknown): readonly HumanReview[] =>
  parse<readonly HumanReview[]>(
    z.object({ reviews: z.array(review) }).transform((row) => row.reviews),
    value,
    "reviews",
  );
