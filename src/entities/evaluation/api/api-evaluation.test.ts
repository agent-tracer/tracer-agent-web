import { beforeEach, describe, expect, it, vi } from "vitest";
import { getJson, postJson } from "tracerWeb/api";
import {
  cancelExperiment,
  createExperiment,
  drawReviewPair,
  fetchComparison,
  fetchExecutions,
  fetchExperiment,
  fetchExperimentPreview,
  fetchExperiments,
  fetchReviews,
  startExperiment,
  submitReview,
} from "./api-evaluation.js";

vi.mock("tracerWeb/api", () => ({
  deleteRequest: vi.fn(),
  getJson: vi.fn(),
  patchJson: vi.fn(),
  postJson: vi.fn(),
}));

const mockGetJson = vi.mocked(getJson);
const mockPostJson = vi.mocked(postJson);

const EXPERIMENT = {
  id: "experiment-1", datasetId: "dataset-1", datasetRevision: 1,
  evaluatorSetVersion: "default-v1", status: "draft", maxBudgetUsd: 1,
  repetitions: 1, createdAt: "2026-01-01", completedAt: null,
};
const VARIANT = {
  id: "variant-1", experimentId: "experiment-1", name: "baseline", baseline: true, backend: "claude-sdk",
  agentName: "title-suggestion", promptVersionId: null, toolContractVersion: "1",
  limits: {}, fragmentSelections: {},
};
const CONFIRMATION = { executionCount: 6, maxBudgetUsd: 1, fingerprint: "experiment-1:1" };

beforeEach(() => {
  mockGetJson.mockReset();
  mockPostJson.mockReset();
});

describe("평가 실험 창구", () => {
  it("실험 목록을 실험 경로에서 읽는다", async () => {
    mockGetJson.mockResolvedValue({ experiments: [EXPERIMENT] });
    const rows = await fetchExperiments();
    expect(mockGetJson).toHaveBeenCalledWith("/api/agent/evaluation/experiments");
    expect(rows[0]?.id).toBe("experiment-1");
  });

  it("초안을 실험 경로에 올리고 변형과 함께 읽는다", async () => {
    mockPostJson.mockResolvedValue({ experiment: EXPERIMENT, variants: [VARIANT] });
    const detail = await createExperiment({
      datasetId: "dataset-1", datasetRevision: 1, evaluatorSetVersion: "default-v1",
      variants: [], maxBudgetUsd: 1, repetitions: 1,
    });
    expect(mockPostJson.mock.calls[0]?.[0]).toBe("/api/agent/evaluation/experiments");
    expect(detail.variants[0]?.id).toBe("variant-1");
  });

  it("상세와 예고와 실행과 비교를 실험 아래 네 경로에서 읽는다", async () => {
    mockGetJson.mockResolvedValue({ experiment: EXPERIMENT, variants: [] });
    await fetchExperiment("experiment-1");
    mockGetJson.mockResolvedValue({
      exampleCount: 3, variantCount: 2, repetitions: 1,
      executionCount: 6, maxBudgetUsd: 1, fingerprint: "experiment-1:1",
    });
    await fetchExperimentPreview("experiment-1");
    mockGetJson.mockResolvedValue({ executions: [] });
    await fetchExecutions("experiment-1");
    mockGetJson.mockResolvedValue({ experimentId: "experiment-1", status: "draft", variants: [] });
    await fetchComparison("experiment-1");
    expect(mockGetJson.mock.calls.map((call) => call[0])).toEqual([
      "/api/agent/evaluation/experiments/experiment-1",
      "/api/agent/evaluation/experiments/experiment-1/preview",
      "/api/agent/evaluation/experiments/experiment-1/executions",
      "/api/agent/evaluation/experiments/experiment-1/comparison",
    ]);
  });

  it("시작은 확인 값을 싣고 중단은 본문을 싣지 않는다", async () => {
    await startExperiment("experiment-1", CONFIRMATION);
    await cancelExperiment("experiment-1");
    expect(mockPostJson.mock.calls[0]).toEqual([
      "/api/agent/evaluation/experiments/experiment-1/start",
      { confirmation: CONFIRMATION },
    ]);
    expect(mockPostJson.mock.calls[1]).toEqual([
      "/api/agent/evaluation/experiments/experiment-1/cancel",
    ]);
  });
});

describe("사람 검토 창구", () => {
  it("검토 목록을 실험 아래 검토 경로에서 읽는다", async () => {
    mockGetJson.mockResolvedValue({ reviews: [] });
    await fetchReviews("experiment-1");
    expect(mockGetJson).toHaveBeenCalledWith("/api/agent/evaluation/experiments/experiment-1/reviews");
  });

  it("판정할 짝이 없으면 비운 응답을 그대로 낸다", async () => {
    mockPostJson.mockResolvedValue(null);
    expect(await drawReviewPair("experiment-1")).toBeNull();
    expect(mockPostJson).toHaveBeenCalledWith("/api/agent/evaluation/experiments/experiment-1/reviews/next");
  });

  it("판정을 실험 아래 검토 경로에 올린다", async () => {
    const submission = {
      executionAId: "execution-1", executionBId: "execution-2",
      preference: "a" as const, reason: null, correctedOutput: null,
    };
    await submitReview("experiment-1", submission);
    expect(mockPostJson).toHaveBeenCalledWith(
      "/api/agent/evaluation/experiments/experiment-1/reviews",
      submission,
    );
  });
});
