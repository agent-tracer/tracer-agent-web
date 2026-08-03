import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatThreadId } from "~/entities/chat/model/chat.js";
import type * as ChatApi from "~/entities/chat/api/api-chat.js";
import { confirmChatTool } from "~/entities/chat/api/api-chat.js";
import { createUiStore, UiStoreProvider } from "tracerWeb/store";
import { ChatConfirmCard } from "~/widgets/chat/ChatConfirmCard.js";

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
});

const REQUEST = {
  id: "confirm-1",
  toolName: "archive_task",
  summary: "archive_task(taskId=task-1)",
  args: { taskId: "task-1" },
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
  it("승인이 세운 턴을 해소한 쪽에 넘긴다", async () => {
    const followUp = { id: "execution-2" };
    confirmChatToolMock.mockResolvedValue({
      confirmationId: "confirm-1",
      toolName: "archive_task",
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
