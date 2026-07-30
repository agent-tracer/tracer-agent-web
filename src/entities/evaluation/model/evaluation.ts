export type DisclosureClass =
  | "synthetic"
  | "approved-evaluation"
  | "production-masked"
  | "external-disabled";
/** 조각을 올린 상류의 이름이며 배포의 상류 선언이 그 값을 정한다. */
export type PromptBackend = string;
export type ExperimentStatus =
  "draft" | "queued" | "running" | "completed" | "failed" | "cancelled";
export type ExecutionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "not_evaluable"
  | "budget_skipped"
  | "failed"
  | "cancelled";

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
  readonly name: string;
  readonly backend: PromptBackend;
  readonly model: string;
  readonly promptVersionId: string | null;
  readonly toolContractVersion: string;
  readonly limits: Record<string, unknown>;
  readonly baseline: boolean;
  readonly fragmentSelections?: Readonly<Record<string, string>>;
}
export interface Experiment {
  readonly id: string;
  readonly datasetId: string;
  readonly datasetRevision: number;
  readonly evaluatorSetVersion: string;
  readonly status: ExperimentStatus;
  readonly maxBudgetUsd: number;
  readonly spentUsd: number;
  readonly repetitions: number;
  readonly createdAt: string;
  readonly completedAt: string | null;
}
export interface ExperimentDetail {
  readonly experiment: Experiment;
  readonly variants: readonly ExperimentVariant[];
}
export interface ExperimentPreview {
  readonly experimentId: string;
  readonly datasetRevision: number;
  readonly variantCount: number;
  readonly exampleCount: number;
  readonly repetitions: number;
  readonly logicalExecutionCount: number;
  readonly maximumBudgetUsd: number;
  readonly estimatedCostUsd: number | null;
  readonly estimation: {
    readonly status: "available" | "unavailable";
    readonly reason: string | null;
  };
  readonly disclosure: Readonly<Record<DisclosureClass, number>>;
  readonly externallyExportable: boolean;
}
export interface EvaluationScore {
  readonly id: string;
  readonly evaluatorId: string;
  readonly evaluatorVersion: string;
  readonly score: number | null;
  readonly label: string | null;
  readonly reason: string | null;
}
export interface ExperimentExecution {
  readonly id: string;
  readonly variantId: string;
  readonly exampleId: string;
  readonly repetition: number;
  readonly status: ExecutionStatus;
  readonly attemptCount: number;
  readonly costUsd: number;
  readonly durationMs: number | null;
  readonly traceId: string | null;
  readonly output: Record<string, unknown> | null;
  /** 워커가 산출해 실행 행에 기록만 하는 해시이며 대조에는 쓰이지 않는다. */
  readonly resolvedPromptHash: string | null;
}
export interface ExecutionWithScores {
  readonly execution: ExperimentExecution;
  readonly scores: readonly EvaluationScore[];
}
export interface VariantComparison {
  readonly variantId: string;
  readonly name: string;
  readonly baseline: boolean;
  readonly sampleSize: number;
  readonly executionCount: number;
  readonly successRate: number;
  readonly validationPassRate: number | null;
  readonly emptyRate: number | null;
  readonly repairRate: number | null;
  readonly preferenceRate: number | null;
  readonly meanScore: number | null;
  readonly meanCostUsd: number;
  readonly p95CostUsd: number;
  readonly meanLatencyMs: number | null;
  readonly p95LatencyMs: number | null;
  readonly scoreDeltaFromBaseline: number | null;
  readonly successRateDeltaFromBaseline: number | null;
}
export interface ExperimentComparison {
  readonly experimentId: string;
  readonly status: ExperimentStatus;
  readonly variants: readonly VariantComparison[];
  readonly warnings: readonly string[];
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
  readonly agentName: string;
  readonly backend: PromptBackend;
  readonly model: string;
  readonly promptVersionId: string;
  readonly toolContractVersion: string;
  readonly limits?: Record<string, unknown>;
  readonly baseline: boolean;
  readonly fragmentSelections?: Readonly<Record<string, string>>;
}

export type ReviewPreference = "a" | "b" | "tie" | "reject";
export interface ReviewSubmission {
  readonly executionAId: string;
  readonly executionBId: string;
  readonly preference: ReviewPreference;
  readonly reason: string | null;
  readonly correctedOutput: Record<string, unknown> | null;
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
