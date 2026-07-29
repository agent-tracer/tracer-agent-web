import { z } from "zod";
import type { ExecutionWithScores, ExperimentComparison } from "../model/evaluation.js";
import { parse, record, status } from "./evaluation.primitives.schema.js";

const score = z
  .object({
    id: z.string(),
    evaluatorId: z.string(),
    evaluatorVersion: z.string(),
    score: z.number().nullable(),
    label: z.string().nullable(),
    reason: z.string().nullable(),
  })
  .passthrough();

const execution = z
  .object({
    id: z.string(),
    variantId: z.string(),
    exampleId: z.string(),
    repetition: z.number().int(),
    status: z.enum([
      "pending",
      "running",
      "succeeded",
      "not_evaluable",
      "budget_skipped",
      "failed",
      "cancelled",
    ]),
    attemptCount: z.number().int(),
    costUsd: z.number(),
    durationMs: z.number().int().nullable(),
    traceId: z.string().nullable(),
    output: record.nullable(),
    resolvedPromptHash: z.string().nullable().default(null),
  })
  .passthrough();

export const parseExecutions = (
  value: unknown,
): readonly ExecutionWithScores[] =>
  parse<readonly ExecutionWithScores[]>(
    z
      .object({
        executions: z.array(z.object({ execution, scores: z.array(score) })),
      })
      .transform((row) => row.executions),
    value,
    "executions",
  );

const nullableMetric = z.number().nullable();
const comparisonVariant = z.object({
  variantId: z.string(),
  name: z.string(),
  baseline: z.boolean(),
  sampleSize: z.number().int(),
  executionCount: z.number().int(),
  successRate: z.number(),
  validationPassRate: nullableMetric,
  emptyRate: nullableMetric,
  repairRate: nullableMetric,
  preferenceRate: nullableMetric,
  meanScore: nullableMetric,
  meanCostUsd: z.number(),
  p95CostUsd: z.number(),
  meanLatencyMs: nullableMetric,
  p95LatencyMs: nullableMetric,
  scoreDeltaFromBaseline: nullableMetric,
  successRateDeltaFromBaseline: nullableMetric,
});

export const parseComparison = (value: unknown): ExperimentComparison =>
  parse<ExperimentComparison>(
    z.object({
      experimentId: z.string(),
      status,
      variants: z.array(comparisonVariant),
      warnings: z.array(z.string()),
    }),
    value,
    "comparison",
  );
