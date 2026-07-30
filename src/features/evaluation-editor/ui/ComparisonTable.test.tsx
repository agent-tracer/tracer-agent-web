import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ExperimentComparison } from "~/entities/evaluation/model/evaluation.js";
import { ComparisonTable } from "./ComparisonTable.js";

const COMPARISON: ExperimentComparison = {
  experimentId: "experiment-1",
  status: "completed",
  variants: [
    { variantId: "baseline", name: "baseline", succeeded: 3, meanScore: 0.75, totalCostUsd: 0.1234 },
    { variantId: "candidate", name: "candidate", succeeded: 2, meanScore: null, totalCostUsd: 0 },
  ],
};

describe("ComparisonTable", () => {
  afterEach(cleanup);

  it("변형마다 성공 횟수와 평균 점수와 누적 비용을 보인다", () => {
    render(<ComparisonTable comparison={COMPARISON} comparisonError={false} />);
    expect(screen.getByText("baseline")).toBeInTheDocument();
    expect(screen.getByText("0.750")).toBeInTheDocument();
    expect(screen.getByText("$0.1234")).toBeInTheDocument();
  });

  it("점수가 아직 없는 변형은 값 자리를 비운 표시로 채운다", () => {
    render(<ComparisonTable comparison={COMPARISON} comparisonError={false} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("비교를 읽지 못하면 그 사실을 알린다", () => {
    render(<ComparisonTable comparison={undefined} comparisonError />);
    expect(screen.getByRole("alert")).toHaveTextContent(/temporarily unavailable/);
  });

  it("비교할 변형이 없으면 언제 채워지는지 알린다", () => {
    render(<ComparisonTable comparison={undefined} comparisonError={false} />);
    expect(screen.getByText(/Comparison appears after/)).toBeInTheDocument();
  });
});
