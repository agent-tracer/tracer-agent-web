import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ExecutionWithScores, ExperimentComparison } from "~/entities/evaluation/model/evaluation.js";
import { ComparisonTable } from "./ComparisonTable.js";

function execution(
  variantId: string,
  resolvedPromptHash: string | null,
): ExecutionWithScores {
  return {
    execution: {
      id: `${variantId}-1`,
      variantId,
      exampleId: "example",
      repetition: 1,
      status: "succeeded",
      attemptCount: 1,
      costUsd: 0,
      durationMs: null,
      traceId: null,
      output: null,
      resolvedPromptHash,
    },
    scores: [],
  };
}

function comparisonVariant(variantId: string, name: string, baseline: boolean) {
  return {
    variantId,
    name,
    baseline,
    sampleSize: 1,
    executionCount: 1,
    successRate: 1,
    validationPassRate: null,
    emptyRate: null,
    repairRate: null,
    preferenceRate: null,
    meanScore: null,
    meanCostUsd: 0,
    p95CostUsd: 0,
    meanLatencyMs: null,
    p95LatencyMs: null,
    scoreDeltaFromBaseline: null,
    successRateDeltaFromBaseline: null,
  };
}

function comparison(variantIds: readonly string[]): ExperimentComparison {
  return {
    experimentId: "e",
    status: "completed",
    variants: variantIds.map((id, index) => comparisonVariant(id, id, index === 0)),
    warnings: [],
  };
}

describe("ComparisonTable", () => {
  afterEach(cleanup);

  it("모든 변형이 같은 프롬프트 해시로 돌면 비교가 성립하지 않았다고 알린다", () => {
    render(
      <ComparisonTable
        comparison={comparison(["baseline", "candidate"])}
        comparisonError={false}
        executions={[
          execution("baseline", "hash-a"),
          execution("candidate", "hash-a"),
        ]}
      />,
    );
    expect(
      screen.getByText(/identical resolved prompt hash/),
    ).toBeInTheDocument();
  });

  it("변형마다 다른 프롬프트 해시면 경고를 띄우지 않는다", () => {
    render(
      <ComparisonTable
        comparison={comparison(["baseline", "candidate"])}
        comparisonError={false}
        executions={[
          execution("baseline", "hash-a"),
          execution("candidate", "hash-b"),
        ]}
      />,
    );
    expect(
      screen.queryByText(/identical resolved prompt hash/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("hash-a")).toBeInTheDocument();
    expect(screen.getByText("hash-b")).toBeInTheDocument();
  });
});
