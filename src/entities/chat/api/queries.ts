import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { ChatExecutionsListResponse, ChatMessagesListResponse, ChatThreadId, ChatThreadsListResponse } from "~/entities/chat/model/chat.js";
import { fetchChatExecutions, fetchChatMessages, fetchChatThreads } from "~/entities/chat/api/api-chat.js";
import { monitorQueryKeys, useAgentBackendSettled } from "tracerWeb/api";

const SSE_FALLBACK_POLL_MS = 10_000;
const PENDING_CONFIRM_POLL_MS = 5_000;

export function useChatThreadsQuery(): UseQueryResult<ChatThreadsListResponse> {
  const backendSettled = useAgentBackendSettled();
  return useQuery<ChatThreadsListResponse>({
    queryKey: monitorQueryKeys.chatThreads(),
    queryFn: fetchChatThreads,
    enabled: backendSettled,
  });
}

export function useChatExecutionsQuery(
  threadId: ChatThreadId | null,
  streamStatus: "idle" | "connecting" | "connected" | "failed" = "idle",
): UseQueryResult<ChatExecutionsListResponse> {
  const queryClient = useQueryClient();
  const backendSettled = useAgentBackendSettled();
  const queryKey = threadId
    ? monitorQueryKeys.chatExecutions(threadId)
    : monitorQueryKeys.chatExecutions("__disabled__");
  return useQuery<ChatExecutionsListResponse>({
    queryKey,
    queryFn: async () => {
      if (!threadId) throw new Error("useChatExecutionsQuery called without a threadId");
      const incoming = await fetchChatExecutions(threadId);
      return mergeExecutionResponses(
        queryClient.getQueryData<ChatExecutionsListResponse>(queryKey),
        incoming,
      );
    },
    enabled: threadId !== null && backendSettled,
    refetchInterval: (query) =>
      chatExecutionPollInterval(query.state.data, streamStatus === "failed"),
  });
}

export function mergeExecutionResponses(
  previous: ChatExecutionsListResponse | undefined,
  incoming: ChatExecutionsListResponse,
): ChatExecutionsListResponse {
  if (previous === undefined) return incoming;
  const newestPrevious = Math.max(...previous.executions.map((row) => Date.parse(row.updatedAt)), 0);
  const newestIncoming = Math.max(...incoming.executions.map((row) => Date.parse(row.updatedAt)), 0);
  return newestPrevious > newestIncoming ? previous : incoming;
}

export function chatExecutionPollInterval(
  data: ChatExecutionsListResponse | undefined,
  fallback = false,
): number | false {
  if (data === undefined) return false;
  const active = data.executions.some(
    (execution) => execution.status === "queued" || execution.status === "running",
  );
  // 활성 실행은 SSE가 정본을 밀어 주므로 스트림이 살아 있는 동안 다시 묻지 않는다.
  if (active) return fallback ? SSE_FALLBACK_POLL_MS : false;
  // 확인 대기는 턴이 끝난 뒤에도 남고 다른 탭이 해소하는데, 그때는 깨울 스트림이 없다.
  return data.confirmations.length > 0 ? PENDING_CONFIRM_POLL_MS : false;
}

export function useChatMessagesQuery(
  threadId: ChatThreadId | null,
): UseQueryResult<ChatMessagesListResponse> {
  const backendSettled = useAgentBackendSettled();
  return useQuery({
    queryKey: threadId
      ? monitorQueryKeys.chatMessages(threadId)
      : monitorQueryKeys.chatMessages("__disabled__"),
    queryFn: () => {
      if (!threadId) {
        throw new Error("useChatMessagesQuery called without a threadId");
      }
      return fetchChatMessages(threadId);
    },
    enabled: threadId !== null && backendSettled,
  });
}
