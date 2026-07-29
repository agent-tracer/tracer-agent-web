import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUiStore, UiStoreProvider } from "tracerWeb/store";
import { TooltipProvider } from "tracerWeb/ui";
import { JobDetailPanel } from "~/widgets/jobs/detail/JobDetailPanel.js";
import { job } from "tracerWeb/entities";
import type * as HostEntities from "tracerWeb/entities";

const { JOB_KIND, JOB_STATUS } = job;

vi.mock("tracerWeb/entities", async (importActual) => {
  const actual = await importActual<typeof HostEntities>();
  return { ...actual, job: { ...actual.job,
  useJobQuery: () => ({
    isPending: false,
    isError: false,
    data: {
      job: {
        id: "job-1",
        userId: "u1",
        kind: JOB_KIND.titleSuggestion,
        executor: "temporal",
        status: JOB_STATUS.completed,
        attempts: 1,
        taskId: "task-1",
        input: { taskId: "task-1" },
        result: { suggestions: [{ title: "제안", rationale: "근거" }] },
        usage: { modelUsed: "claude-haiku-4-5", costUsd: 0.01, numTurns: 3 },
        error: null,
        createdAt: "2026-07-10T09:00:00.000Z",
        updatedAt: "2026-07-10T09:00:06.000Z",
        startedAt: "2026-07-10T09:00:00.000Z",
        completedAt: "2026-07-10T09:00:06.000Z",
      },
    },
  }),
  } };
});

vi.mock("~/widgets/jobs/result/JobResultActions.js", () => ({
  JobResultActions: () => <div>Result actions</div>,
}));

vi.mock("~/widgets/jobs/trajectory/JobTrajectory.js", () => ({
  JobTrajectory: () => <div>Execution steps</div>,
}));

afterEach(() => cleanup());

describe("잡 상세 패널", () => {
  it("요약을 먼저 보여주고 궤적과 원본 데이터를 탭으로 분리한다", () => {
    renderPanel();

    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Trajectory" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Raw data" })).toBeTruthy();
    expect(screen.getByText("Result actions")).toBeTruthy();
    expect(screen.queryByText(/"taskId"/)).toBeNull();

    activateTab("Raw data");
    expect(screen.getByText(/"taskId"/)).toBeTruthy();

    activateTab("Trajectory");
    expect(screen.getByText("Execution steps")).toBeTruthy();
  }, 10_000);

  it("설명 언어를 바꿔도 운영 레이블과 잡 원본은 그대로 보존한다", () => {
    const store = createUiStore({ persisted: false });
    store.getState().setGuidanceLocale("ko");
    renderPanel(store);

    activateTab("Raw data");

    expect(screen.getByRole("tab", { name: "Raw data" })).toBeTruthy();
    expect(screen.getByText("jobs.rawDataIntroduction")).toBeTruthy();
    expect(screen.getByText(/"title": "제안"/)).toBeTruthy();
    expect(screen.getByText(/"rationale": "근거"/)).toBeTruthy();
  });
});

function renderPanel(store = createUiStore({ persisted: false })) {
  return render(
    <UiStoreProvider store={store}>
      <TooltipProvider>
        <JobDetailPanel jobId="job-1" now={Date.parse("2026-07-10T09:00:10.000Z")} />
      </TooltipProvider>
    </UiStoreProvider>,
  );
}

function activateTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
}
