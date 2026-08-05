import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatThreadId } from "~/entities/chat/model/chat.js";
import type * as ChatApi from "~/entities/chat/api/api-chat.js";
import { confirmChatTool } from "~/entities/chat/api/api-chat.js";
import { createUiStore, UiStoreProvider } from "tracerWeb/store";
import type * as HostEntities from "tracerWeb/entities";
import { TaskId } from "~/entities/task/model/task-id.js";
import { ChatConfirmCard } from "~/widgets/chat/ChatConfirmCard.js";

const { fetchTaskDetail } = vi.hoisted(() => ({ fetchTaskDetail: vi.fn() }));

vi.mock("tracerWeb/entities", async (importActual) => {
  const actual = await importActual<typeof HostEntities>();
  return { ...actual, task: { ...actual.task, fetchTaskDetail } };
});

vi.mock("~/entities/chat/api/api-chat.js", async (importOriginal) => ({
  ...(await importOriginal<typeof ChatApi>()),
  confirmChatTool: vi.fn(),
}));

const confirmChatToolMock = vi.mocked(confirmChatTool);
let queryClient: QueryClient;

afterEach(cleanup);
beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  confirmChatToolMock.mockReset();
  // 이름 조회는 승인과 무관하므로 각 시험이 자기가 세울 이름만 정한다.
  fetchTaskDetail.mockReset();
  fetchTaskDetail.mockRejectedValue(new Error("task detail unavailable"));
});

const REQUEST = {
  id: "confirm-1",
  toolName: "propose_task_write",
  summary: "propose_task_write(action=archive, taskId=task-1)",
  args: { action: "archive", taskId: "task-1" },
};

function renderCard(onResolved = vi.fn()) {
  render(
    <QueryClientProvider client={queryClient}>
      <UiStoreProvider store={createUiStore({ persisted: false })}>
        <ChatConfirmCard
          threadId={ChatThreadId("thread-1")}
          request={REQUEST}
          onResolved={onResolved}
        />
      </UiStoreProvider>
    </QueryClientProvider>,
  );
  return onResolved;
}

describe("ChatConfirmCard", () => {
  it("무엇을 승인하는지 제목과 인자 줄로 먼저 보인다", () => {
    renderCard();

    expect(screen.getByText("Archive task")).toBeTruthy();
    expect(screen.getByText("Task")).toBeTruthy();
    expect(screen.getByText("task-1")).toBeTruthy();
    // 가공한 줄이 무엇을 줄였는지 물을 자리로 원본을 남긴다.
    expect(screen.getByText(REQUEST.summary)).toBeTruthy();
  });

  it("태스크를 가리키는 인자는 그 태스크의 이름을 앞에 세운다", async () => {
    fetchTaskDetail.mockResolvedValue({ task: { id: TaskId("task-1"), title: "메모 정리" } });
    renderCard();

    await waitFor(() => expect(screen.getByText("메모 정리")).toBeTruthy());
    // 이름을 붙여도 승인 대상이 어느 태스크인지 확인할 식별자는 남는다.
    expect(screen.getByText("task-1")).toBeTruthy();
  });

  it("이름을 읽지 못하면 식별자를 그대로 남긴다", async () => {
    renderCard();

    await waitFor(() => expect(screen.getByText("task-1")).toBeTruthy());
    expect(screen.queryByText("메모 정리")).toBeNull();
  });

  it("승인이 세운 턴을 해소한 쪽에 넘긴다", async () => {
    const followUp = { id: "execution-2" };
    confirmChatToolMock.mockResolvedValue({
      confirmationId: "confirm-1",
      toolName: "propose_task_write",
      status: "approved",
      result: "Archived task task-1.",
      execution: followUp,
    } as Awaited<ReturnType<typeof confirmChatTool>>);
    const onResolved = renderCard();

    fireEvent.click(screen.getByText("Approve"));

    await waitFor(() => expect(onResolved).toHaveBeenCalledWith("confirm-1", followUp));
  });

  it("결정이 서지 않으면 사유를 보이고 결정을 넘기지 않는다", async () => {
    confirmChatToolMock.mockRejectedValue(new Error("Approved tool call did not succeed"));
    const onResolved = renderCard();

    fireEvent.click(screen.getByText("Approve"));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("Approved tool call did not succeed"),
    );
    expect(onResolved).not.toHaveBeenCalled();
    expect(screen.getByText("Approve")).toBeTruthy();
  });
});
