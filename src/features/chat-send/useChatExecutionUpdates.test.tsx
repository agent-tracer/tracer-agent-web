import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatThreadId } from "~/entities/chat/model/chat.js";
import type { ChatExecutionRecord } from "~/entities/chat/model/chat.js";
import type { ChatExecutionWatchHandlers } from "~/entities/chat/api/watch-chat-execution.js";
import { CHAT_STREAM_RECONNECT } from "~/shared/contract/chat-stream.js";
import { useChatExecutionUpdates } from "~/features/chat-send/useChatExecutionUpdates.js";

const { fetchChatExecutionsMock, watchChatExecutionMock } = vi.hoisted(() => ({
  fetchChatExecutionsMock: vi.fn(),
  watchChatExecutionMock: vi.fn(),
}));

vi.mock("~/entities/chat/api/api-chat.js", () => ({
  cancelChatExecution: vi.fn(),
  fetchChatExecutions: fetchChatExecutionsMock,
  startChatTurn: vi.fn(),
}));
vi.mock("~/entities/chat/api/watch-chat-execution.js", () => ({
  watchChatExecution: watchChatExecutionMock,
}));

let queryClient: QueryClient;

function wrapper({ children }: { readonly children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function execution(overrides: Partial<ChatExecutionRecord> = {}): ChatExecutionRecord {
  return {
    id: "execution-1",
    threadId: ChatThreadId("thread-1"),
    userMessageId: "message-1",
    status: "running",
    requestedBackend: null,
    draftText: "partial answer",
    draftSeq: 3,
    assistantMessageId: null,
    modelUsed: null,
    costUsd: null,
    numTurns: null,
    stopReason: null,
    error: null,
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:01.000Z",
    startedAt: "2026-07-22T00:00:01.000Z",
    completedAt: null,
    ...overrides,
  };
}

async function settle(elapsedMs = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(elapsedMs);
  });
}

function mount() {
  return renderHook(() => useChatExecutionUpdates(ChatThreadId("thread-1")), { wrapper });
}

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  fetchChatExecutionsMock
    .mockReset()
    .mockResolvedValue({ executions: [execution()], confirmations: [] });
  watchChatExecutionMock.mockReset().mockResolvedValue("disconnected");
});

afterEach(() => {
  queryClient.clear();
  vi.useRealTimers();
});

describe("useChatExecutionUpdates", () => {
  it("실행을 받은 축으로 스트림을 연다", async () => {
    fetchChatExecutionsMock.mockResolvedValue({
      executions: [execution({ requestedBackend: "python" })],
      confirmations: [],
    });
    watchChatExecutionMock.mockResolvedValue("terminal");

    mount();
    await settle();

    expect(watchChatExecutionMock).toHaveBeenCalledWith(
      ChatThreadId("thread-1"),
      "execution-1",
      "python",
      expect.anything(),
      expect.anything(),
    );
  });

  it("종결 상태를 실은 프레임을 받으면 다시 연결하지 않는다", async () => {
    watchChatExecutionMock.mockResolvedValue("terminal");

    mount();
    await settle();
    expect(watchChatExecutionMock).toHaveBeenCalledTimes(1);

    await settle(CHAT_STREAM_RECONNECT.maxBackoffMs * 6);
    expect(watchChatExecutionMock).toHaveBeenCalledTimes(1);
  });

  it("연결이 끊기면 계약이 정한 간격만큼 물러섰다가 다시 연결한다", async () => {
    mount();
    await settle();
    expect(watchChatExecutionMock).toHaveBeenCalledTimes(1);

    await settle(CHAT_STREAM_RECONNECT.initialBackoffMs - 1);
    expect(watchChatExecutionMock).toHaveBeenCalledTimes(1);

    await settle(1);
    expect(watchChatExecutionMock).toHaveBeenCalledTimes(2);

    await settle(CHAT_STREAM_RECONNECT.initialBackoffMs * 2 - 1);
    expect(watchChatExecutionMock).toHaveBeenCalledTimes(2);

    await settle(1);
    expect(watchChatExecutionMock).toHaveBeenCalledTimes(3);
  });

  it("초안이 줄어든 프레임을 받으면 고점을 되찾을 때까지 다시 쓰는 중임을 알린다", async () => {
    let watched: ChatExecutionWatchHandlers | null = null;
    watchChatExecutionMock.mockImplementation(
      (
        _threadId: ChatThreadId,
        _executionId: string,
        _backend: string | null,
        handlers: ChatExecutionWatchHandlers,
      ) => {
        watched = handlers;
        return new Promise<never>(() => undefined);
      },
    );

    const { result } = mount();
    await settle();

    const snapshot = (draftText: string, draftSeq: number) => ({
      execution: execution({ draftText, draftSeq }),
      confirmations: [],
    });
    const notify = async (draftText: string, draftSeq: number) => {
      await act(async () => {
        watched?.onSnapshot(snapshot(draftText, draftSeq));
      });
    };

    await notify("답변을 쓰는 중", 3);
    expect(result.current.rewritingExecutionId).toBeNull();

    await notify("", 0);
    expect(result.current.rewritingExecutionId).toBe("execution-1");

    await notify("답변을", 1);
    expect(result.current.rewritingExecutionId).toBe("execution-1");

    await notify("답변을 다시 쓰는 중", 4);
    expect(result.current.rewritingExecutionId).toBeNull();
  });

  it("연결이 열리면 물러선 간격이 처음 값으로 돌아간다", async () => {
    watchChatExecutionMock
      .mockResolvedValueOnce("disconnected")
      .mockImplementationOnce(
        (
          _threadId: ChatThreadId,
          _executionId: string,
          _backend: string | null,
          handlers: ChatExecutionWatchHandlers,
        ) => {
          handlers.onOpen();
          return Promise.resolve("disconnected");
        },
      );

    mount();
    await settle();
    await settle(CHAT_STREAM_RECONNECT.initialBackoffMs);
    expect(watchChatExecutionMock).toHaveBeenCalledTimes(2);

    await settle(CHAT_STREAM_RECONNECT.initialBackoffMs - 1);
    expect(watchChatExecutionMock).toHaveBeenCalledTimes(2);

    await settle(1);
    expect(watchChatExecutionMock).toHaveBeenCalledTimes(3);
  });
});
