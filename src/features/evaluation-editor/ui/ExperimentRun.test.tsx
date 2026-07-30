import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecutionWithScores, ExperimentPreview } from "~/entities/evaluation/model/evaluation.js";
import { ExperimentRun } from "./ExperimentRun.js";

const PREVIEW: ExperimentPreview = {
  exampleCount: 3,
  variantCount: 2,
  repetitions: 1,
  executionCount: 6,
  maxBudgetUsd: 1,
  fingerprint: "experiment:1:example-1:variant-1",
};

const failures: readonly ExecutionWithScores[] = Array.from(
  { length: 21 },
  (_, index) => ({
    execution: {
      id: `execution-${index + 1}`,
      experimentId: "experiment",
      variantId: "v",
      exampleId: `example-${index + 1}`,
      repetition: 1,
      status: "failed",
      output: null,
      error: null,
      costUsd: 0,
    },
    scores: [],
  }),
);

function renderRun(overrides: Partial<Parameters<typeof ExperimentRun>[0]> = {}) {
  return render(
    <ExperimentRun
      experimentId="experiment"
      detail={undefined}
      preview={undefined}
      executions={failures}
      failed={failures}
      percent={100}
      start={vi.fn()}
      cancel={vi.fn()}
      detailError={false}
      comparison={undefined}
      comparisonError={false}
      {...overrides}
    />,
  );
}

describe("ExperimentRun", () => {
  afterEach(cleanup);

  it("실패 실행이 많으면 페이지를 나눈다", () => {
    renderRun();
    expect(screen.getByText("Page 1 of 2 · 21 failures")).toBeInTheDocument();
    expect(screen.queryByText(/execution-21 ·/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(/execution-21 ·/)).toBeInTheDocument();
  });

  it("일부 패널 실패에도 진행률과 상세 실행을 유지한다", () => {
    renderRun({
      executions: failures.slice(0, 1),
      failed: failures.slice(0, 1),
      detailError: true,
      comparisonError: true,
    });
    expect(screen.getByText(/details failed/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText(/execution-1 ·/)).toBeInTheDocument();
  });

  it("예고가 오면 행렬과 실행 수와 예산과 지문을 보인다", () => {
    renderRun({ preview: PREVIEW });
    expect(screen.getByText("3 × 2 × 1")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("$1.00")).toBeInTheDocument();
    expect(screen.getByText(PREVIEW.fingerprint)).toBeInTheDocument();
  });
});
