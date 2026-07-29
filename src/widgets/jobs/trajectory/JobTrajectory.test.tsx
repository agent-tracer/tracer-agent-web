import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUiStore, UiStoreProvider } from "tracerWeb/store";
import { JobTrajectory } from "~/widgets/jobs/trajectory/JobTrajectory.js";
import { job } from "tracerWeb/entities";
import type * as HostEntities from "tracerWeb/entities";

const { JOB_STATUS } = job;

vi.mock("tracerWeb/entities", async (importActual) => {
  const actual = await importActual<typeof HostEntities>();
  return { ...actual, job: { ...actual.job,
  useJobStepsQuery: () => ({
    isPending: false,
    isError: false,
    data: [
      {
        attempt: 1,
        seq: 0,
        role: "assistant",
        content: "first attempt",
        truncated: false,
        toolCalls: [],
      },
      {
        attempt: 2,
        seq: 0,
        role: "graph",
        content: "증거 충분성 판정을 마쳤다.",
        truncated: false,
        toolCalls: [],
        nodeName: "assess_evidence",
        eventKind: "node.completed",
        durationMs: 0,
      },
    ],
  }),
  } };
});

afterEach(() => cleanup());

describe("잡 실행 궤적", () => {
  it("재시도 회차와 그래프 노드 메타데이터를 함께 표시한다", () => {
    const store = createUiStore({ persisted: false });
    render(
      <UiStoreProvider store={store}>
        <JobTrajectory jobId="job-1" status={JOB_STATUS.completed} />
      </UiStoreProvider>,
    );

    expect(
      screen.getByText((_text, element) => element !== null && element.textContent.trim() === "jobs.trajectoryAttempt 1"),
    ).toBeTruthy();
    expect(
      screen.getByText((_text, element) => element !== null && element.textContent.trim() === "jobs.trajectoryAttempt 2"),
    ).toBeTruthy();
    expect(screen.getByText("assess_evidence")).toBeTruthy();
    expect(screen.getByText("node.completed")).toBeTruthy();
    expect(screen.getByText("0s")).toBeTruthy();
    expect(screen.getByText("증거 충분성 판정을 마쳤다.")).toBeTruthy();
  });
});
