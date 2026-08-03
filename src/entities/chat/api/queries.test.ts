import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as HostApi from "tracerWeb/api";
import { ChatThreadId, type ChatExecutionRecord, type ChatExecutionsListResponse } from "~/entities/chat/model/chat.js";
import {
  chatExecutionPollInterval,
  mergeExecutionResponses,
  useChatExecutionsQuery,
  useChatMessagesQuery,
  useChatThreadsQuery,
} from "./queries.js";

const { backendSettled, chatApi } = vi.hoisted(() => ({
  backendSettled: { current: false },
  chatApi: {
    fetchChatThreads: vi.fn(),
    fetchChatMessages: vi.fn(),
    fetchChatExecutions: vi.fn(),
  },
}));

vi.mock("tracerWeb/api", async (importActual) => {
  const actual = await importActual<typeof HostApi>();
  return { ...actual, useAgentBackendSettled: () => backendSettled.current };
});

vi.mock("~/entities/chat/api/api-chat.js", () => chatApi);

function execution(
  status: ChatExecutionRecord["status"],
  activeSince: string,
): ChatExecutionRecord {
  return {
    id: "execution-1",
    threadId: ChatThreadId("thread-1"),
    replayAnchorMessageId: "message-1",
    status,
    requestedBackend: null,
    draftText: "",
    draftSeq: 0,
    assistantMessageId: null,
    modelUsed: null,
    costUsd: null,
    numTurns: null,
    stopReason: null,
    error: null,
    createdAt: activeSince,
    updatedAt: activeSince,
    startedAt: status === "running" ? activeSince : null,
    completedAt: null,
  };
}

function response(
  executions: readonly ChatExecutionRecord[],
  confirmations: ChatExecutionsListResponse["confirmations"] = [],
): ChatExecutionsListResponse {
  return { executions, confirmations };
}

const CONFIRMATION = {
  id: "confirmation-1",
  toolName: "propose_task_write",
  args: {},
  summary: "archive_task(taskId=t1)",
};

describe("chatExecutionPollInterval", () => {
  it("활성 실행도 확인 대기도 없으면 polling을 멈춘다", () => {
    expect(
      chatExecutionPollInterval(response([execution("completed", "2026-07-22T00:00:59.000Z")])),
    ).toBe(false);
  });

  it("SSE가 살아 있는 동안에는 활성 실행을 polling하지 않는다", () => {
    expect(
      chatExecutionPollInterval(response([execution("running", "2026-07-22T00:00:59.000Z")])),
    ).toBe(false);
  });

  it("SSE 장애 fallback에서만 활성 실행을 10초마다 확인한다", () => {
    expect(
      chatExecutionPollInterval(response([execution("running", "2026-07-22T00:00:59.000Z")]), true),
    ).toBe(10_000);
  });

  it("턴이 끝난 뒤 남은 확인 대기는 깨울 스트림이 없으므로 계속 다시 확인한다", () => {
    expect(
      chatExecutionPollInterval(
        response([execution("completed", "2026-07-22T00:00:59.000Z")], [CONFIRMATION]),
      ),
    ).toBe(5_000);
  });
});

function wrapper(client: QueryClient) {
  return ({ children }: { readonly children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

function mountChatQueries() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(
    () => {
      useChatThreadsQuery();
      useChatMessagesQuery(ChatThreadId("thread-1"));
      useChatExecutionsQuery(ChatThreadId("thread-1"));
    },
    { wrapper: wrapper(client) },
  );
}

beforeEach(() => {
  backendSettled.current = false;
  chatApi.fetchChatThreads.mockReset().mockResolvedValue({ threads: [] });
  chatApi.fetchChatMessages.mockReset().mockResolvedValue({ messages: [] });
  chatApi.fetchChatExecutions.mockReset().mockResolvedValue(response([]));
});

afterEach(() => cleanup());

describe("대화 조회", () => {
  it("축이 정해지기 전에는 조회를 내보내지 않는다", () => {
    mountChatQueries();

    expect(chatApi.fetchChatThreads).not.toHaveBeenCalled();
    expect(chatApi.fetchChatMessages).not.toHaveBeenCalled();
    expect(chatApi.fetchChatExecutions).not.toHaveBeenCalled();
  });

  it("축이 정해진 뒤에 스레드와 대화와 실행을 읽는다", async () => {
    backendSettled.current = true;
    mountChatQueries();

    await waitFor(() => {
      expect(chatApi.fetchChatThreads).toHaveBeenCalledOnce();
      expect(chatApi.fetchChatMessages).toHaveBeenCalledOnce();
      expect(chatApi.fetchChatExecutions).toHaveBeenCalledOnce();
    });
  });
});

describe("mergeExecutionResponses", () => {
  it("늦게 도착한 polling 결과가 최신 SSE 상태를 되돌리지 않는다", () => {
    const running = execution("running", "2026-07-22T00:00:01.000Z");
    const completed = {
      ...execution("completed", "2026-07-22T00:00:01.000Z"),
      updatedAt: "2026-07-22T00:00:03.000Z",
    };
    const previous = { executions: [completed], confirmations: [] };
    const incoming = { executions: [running], confirmations: [] };

    expect(mergeExecutionResponses(previous, incoming)).toBe(previous);
  });
});
