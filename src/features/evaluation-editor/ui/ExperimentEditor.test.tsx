import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecutionWithScores } from "~/entities/evaluation/model/evaluation.js";
import { ExperimentRun } from "./ExperimentRun.js";

const failures: readonly ExecutionWithScores[] = Array.from(
  { length: 21 },
  (_, index) => ({
    execution: {
      id: `execution-${index + 1}`,
      variantId: "v",
      exampleId: `example-${index + 1}`,
      repetition: 1,
      status: "failed",
      attemptCount: 1,
      costUsd: 0,
      durationMs: null,
      traceId: null,
      output: null,
      resolvedPromptHash: null,
    },
    scores: [],
  }),
);

describe("ExperimentRun", () => {
  afterEach(cleanup);
  it("실패 실행이 많으면 페이지를 나눈다", () => {
    render(
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
      />,
    );
    expect(screen.getByText("Page 1 of 2 · 21 failures")).toBeInTheDocument();
    expect(screen.queryByText(/execution-21 ·/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(/execution-21 ·/)).toBeInTheDocument();
  });

  it("일부 패널 실패에도 진행률과 상세 실행을 유지한다", () => {
    render(
      <ExperimentRun
        experimentId="experiment"
        detail={undefined}
        preview={undefined}
        executions={failures.slice(0, 1)}
        failed={failures.slice(0, 1)}
        percent={100}
        start={vi.fn()}
        cancel={vi.fn()}
        detailError
        comparison={undefined}
        comparisonError
      />,
    );
    expect(screen.getByText(/details failed/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(screen.getByText(/execution-1 ·/)).toBeInTheDocument();
  });
});
