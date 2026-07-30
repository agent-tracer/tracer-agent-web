import { z } from "zod";
import type { ExecutionWithScores, ExperimentComparison } from "../model/evaluation.js";
import { parse, record, status } from "./evaluation.primitives.schema.js";

const score = z
  .object({
    id: z.string(),
    executionId: z.string(),
    evaluatorId: z.string(),
    evaluatorVersion: z.string(),
    score: z.number(),
    label: z.string().nullable(),
    reason: z.string().nullable(),
  })
  .passthrough();

const execution = z
  .object({
    id: z.string(),
    experimentId: z.string(),
    variantId: z.string(),
    exampleId: z.string(),
    repetition: z.number().int(),
    status: z.enum(["pending", "running", "succeeded", "failed", "cancelled"]),
    output: record.nullable(),
    error: z.string().nullable(),
    costUsd: z.number(),
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

const comparisonVariant = z.object({
  variantId: z.string(),
  name: z.string(),
  succeeded: z.number().int(),
  meanScore: z.number().nullable(),
  totalCostUsd: z.number(),
});

export const parseComparison = (value: unknown): ExperimentComparison =>
  parse<ExperimentComparison>(
    z.object({
      experimentId: z.string(),
      status,
      variants: z.array(comparisonVariant),
    }),
    value,
    "comparison",
  );
