export type DisclosureClass =
  | "synthetic"
  | "approved-evaluation"
  | "production-masked"
  | "external-disabled";
/** 조각을 올린 상류의 이름이며 배포의 상류 선언이 그 값을 정한다. */
export type PromptBackend = string;
export type ExperimentStatus =
  "draft" | "running" | "completed" | "failed" | "cancelled";
export type ExecutionStatus =
  "pending" | "running" | "succeeded" | "failed" | "cancelled";

export interface EvaluationDataset {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly currentRevision: number;
  readonly createdAt: string;
}
export interface EvaluationExample {
  readonly id: string;
  readonly revision: number;
  readonly input: Record<string, unknown>;
  readonly referenceOutput?: Record<string, unknown> | null;
  readonly metadata?: Record<string, unknown>;
  readonly evidence?: Record<string, unknown>;
  readonly sourceExecutionId?: string | null;
  readonly disclosureClass: DisclosureClass;
  readonly enabled: boolean;
}
export interface DatasetDetail {
  readonly dataset: EvaluationDataset;
  readonly examples: readonly EvaluationExample[];
}
export interface PromptDefinition {
  readonly id: string;
  readonly agentName: string;
  readonly backend: PromptBackend;
  readonly language: string;
  readonly name: string;
  readonly createdAt: string;
}
export interface PromptVersion {
  readonly id: string;
  readonly definitionId: string;
  readonly semanticVersion: string;
  readonly content: string;
  readonly contentHash: string;
  readonly toolContractVersion: string;
  readonly outputSchemaVersion: string;
  readonly createdAt: string;
}
export interface PromptFragmentVersion {
  readonly id: string;
  readonly semanticVersion: string;
  readonly contentHash: string;
  readonly toolContractVersion: string;
  readonly outputSchemaVersion: string;
  readonly integrity: "matched" | "mismatch";
}
export interface PromptFragmentBinding {
  readonly templateKey: string;
  readonly fragmentSlot: string;
  readonly definitionKey: string;
  readonly codeName: string;
  readonly agentName: string;
  readonly backend: PromptBackend;
  readonly language: string;
  readonly fragmentName: string;
  readonly codeDefaultVersion: string;
  readonly codeDefaultHash: string;
  readonly versions: readonly PromptFragmentVersion[];
}
export interface ExperimentVariant {
  readonly id: string;
  readonly experimentId: string;
  readonly name: string;
  readonly baseline: boolean;
  readonly backend: PromptBackend;
  readonly agentName: string;
  readonly promptVersionId: string | null;
  readonly toolContractVersion: string;
  readonly limits: Record<string, unknown>;
  readonly fragmentSelections: Readonly<Record<string, string>>;
}
export interface Experiment {
  readonly id: string;
  readonly datasetId: string;
  readonly datasetRevision: number;
  readonly evaluatorSetVersion: string;
  readonly status: ExperimentStatus;
  readonly maxBudgetUsd: number;
  readonly repetitions: number;
  readonly createdAt: string;
  readonly completedAt: string | null;
}
export interface ExperimentDetail {
  readonly experiment: Experiment;
  readonly variants: readonly ExperimentVariant[];
}
export interface ExperimentPreview {
  readonly exampleCount: number;
  readonly variantCount: number;
  readonly repetitions: number;
  readonly executionCount: number;
  readonly maxBudgetUsd: number;
  readonly fingerprint: string;
}
/** 초안을 본 화면이 그대로 시작해도 되는지를 서버가 대조하는 값이다. */
export interface ExperimentStartConfirmation {
  readonly executionCount: number;
  readonly maxBudgetUsd: number;
  readonly fingerprint: string;
}
export interface EvaluationScore {
  readonly id: string;
  readonly executionId: string;
  readonly evaluatorId: string;
  readonly evaluatorVersion: string;
  readonly score: number;
  readonly label: string | null;
  readonly reason: string | null;
  readonly createdAt: string;
}
export interface ExperimentExecution {
  readonly id: string;
  readonly experimentId: string;
  readonly variantId: string;
  readonly exampleId: string;
  readonly repetition: number;
  readonly status: ExecutionStatus;
  readonly output: Record<string, unknown> | null;
  readonly error: string | null;
  readonly costUsd: number | null;
}
export interface ExecutionWithScores {
  readonly execution: ExperimentExecution;
  readonly scores: readonly EvaluationScore[];
}
export interface VariantComparison {
  readonly variantId: string;
  readonly name: string;
  readonly succeeded: number;
  readonly meanScore: number | null;
  readonly totalCostUsd: number;
}
export interface ExperimentComparison {
  readonly experimentId: string;
  readonly status: ExperimentStatus;
  readonly variants: readonly VariantComparison[];
}

export interface ExampleInput {
  readonly input: Record<string, unknown>;
  readonly referenceOutput?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
  readonly evidence?: Record<string, unknown>;
  readonly sourceExecutionId?: string;
  readonly disclosureClass: DisclosureClass;
}
export interface ExecutionExampleCandidate {
  readonly sourceExecutionId: string;
  readonly agentName: string;
  readonly input: Record<string, unknown>;
  readonly evidence: Record<string, unknown>;
  readonly referenceOutput: Record<string, unknown> | null;
  readonly suggestedDisclosureClass: "production-masked";
  readonly excludedTruncatedTools: readonly string[];
}
export interface VariantInput {
  readonly name: string;
  readonly baseline: boolean;
  readonly agentName: string;
  readonly backend: PromptBackend;
  readonly promptVersionId: string;
  readonly toolContractVersion: string;
  readonly limits?: Record<string, unknown>;
  readonly fragmentSelections?: Readonly<Record<string, string>>;
}

export type ReviewPreference = "a" | "b" | "tie";
export interface ReviewSubmission {
  readonly executionAId: string;
  readonly executionBId: string;
  readonly preference: ReviewPreference;
  readonly reason: string | null;
  readonly correctedOutput: Record<string, unknown> | null;
}
export interface HumanReview {
  readonly id: string;
  readonly experimentId: string;
  readonly userId: string;
  readonly reviewerUserId: string;
  readonly executionAId: string;
  readonly executionBId: string;
  readonly preference: ReviewPreference;
  readonly reason: string | null;
  readonly correctedOutput: Record<string, unknown> | null;
  readonly createdAt: string;
}
/** 아직 판정하지 않은 두 실행이며 뽑을 짝이 없으면 서버가 비운다. */
export interface ReviewPair {
  readonly executionA: { readonly id: string; readonly output: Record<string, unknown> | null };
  readonly executionB: { readonly id: string; readonly output: Record<string, unknown> | null };
  readonly exampleId: string;
  readonly repetition: number;
}
export interface DatasetExportManifest {
  readonly contentHash: string;
  readonly entryCount: number;
}
export interface DatasetExportResult {
  readonly manifest: DatasetExportManifest;
  readonly entries: readonly unknown[];
}

export interface RegisterCandidateFragmentVersionInput {
  readonly backend: PromptBackend;
  readonly agentName: string;
  readonly fragmentName: string;
  readonly language: string;
  readonly content: string;
  readonly changeSummary: string | null;
}
export interface RegisterCandidateFragmentVersionResult {
  readonly definitionId: string;
  readonly versionId: string;
  readonly semanticVersion: string;
}
