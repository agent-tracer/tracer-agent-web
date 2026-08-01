import { useEffect, useRef, useState } from "react";
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { ChatThreadId } from "~/entities/chat/model/chat.js";
import type { ChatExecutionRecord, ChatExecutionsListResponse } from "~/entities/chat/model/chat.js";
import { useChatExecutionsQuery } from "~/entities/chat/api/queries.js";
import { watchChatExecution } from "~/entities/chat/api/watch-chat-execution.js";
import { advanceDraftHighWater, isRewritingDraft, type DraftHighWater } from "~/features/chat-send/turn.view.js";
import { CHAT_STREAM_RECONNECT } from "~/shared/contract/chat-stream.js";
import { monitorQueryKeys } from "tracerWeb/api";

export interface ChatExecutionUpdates {
  readonly query: UseQueryResult<ChatExecutionsListResponse>;
  /** 초안이 되돌아간 뒤 아직 되찾지 못한 실행이며 화면이 다시 쓰는 중임을 알린다. */
  readonly rewritingExecutionId: string | null;
}

export function useChatExecutionUpdates(threadId: ChatThreadId | null): ChatExecutionUpdates {
  const queryClient = useQueryClient();
  const [streamStatus, setStreamStatus] = useState<
    "idle" | "connecting" | "connected" | "failed"
  >("idle");
  const [rewritingExecutionId, setRewritingExecutionId] = useState<string | null>(null);
  const highWaterRef = useRef<DraftHighWater | null>(null);
  const executionsQuery = useChatExecutionsQuery(threadId, streamStatus);
  const active = findActiveExecution(executionsQuery.data?.executions ?? []);

  useEffect(() => {
    if (!threadId || active === null) {
      setStreamStatus("idle");
      return;
    }
    const controller = new AbortController();
    let retryDelayMs = CHAT_STREAM_RECONNECT.initialBackoffMs;
    highWaterRef.current = null;
    setRewritingExecutionId(null);

    const watch = async (): Promise<void> => {
      while (!controller.signal.aborted) {
        setStreamStatus((current) => (current === "failed" ? current : "connecting"));
        try {
          const outcome = await watchChatExecution(
            threadId,
            active.id,
            {
              onOpen: () => {
                retryDelayMs = CHAT_STREAM_RECONNECT.initialBackoffMs;
                setStreamStatus("connected");
              },
              onSnapshot: (snapshot) => {
                const highWater = advanceDraftHighWater(highWaterRef.current, snapshot.execution);
                highWaterRef.current = highWater;
                setRewritingExecutionId(
                  isRewritingDraft(highWater, snapshot.execution) ? snapshot.execution.id : null,
                );
                queryClient.setQueryData<ChatExecutionsListResponse>(
                  monitorQueryKeys.chatExecutions(threadId),
                  (current) => ({
                    executions: mergeExecution(current?.executions ?? [], snapshot.execution),
                    confirmations: snapshot.confirmations,
                  }),
                );
              },
            },
            controller.signal,
          );
          if (outcome === "terminal") return;
        } catch (error) {
          if (isAbortError(error)) return;
        }
        setStreamStatus("failed");
        await abortableDelay(retryDelayMs, controller.signal);
        retryDelayMs = Math.min(retryDelayMs * 2, CHAT_STREAM_RECONNECT.maxBackoffMs);
      }
    };

    void watch();
    return () => controller.abort();
  }, [active?.id, queryClient, threadId]);

  return { query: executionsQuery, rewritingExecutionId };
}

function findActiveExecution(
  executions: readonly ChatExecutionRecord[],
): ChatExecutionRecord | null {
  const running = executions.find((execution) => execution.status === "running");
  if (running !== undefined) return running;
  return (
    executions
      .filter((execution) => execution.status === "queued")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0] ?? null
  );
}

function mergeExecution(
  executions: readonly ChatExecutionRecord[],
  incoming: ChatExecutionRecord,
): readonly ChatExecutionRecord[] {
  const current = executions.find((execution) => execution.id === incoming.id);
  if (current !== undefined && current.updatedAt > incoming.updatedAt) return executions;
  return [incoming, ...executions.filter((execution) => execution.id !== incoming.id)].sort(
    (left, right) => right.createdAt.localeCompare(left.createdAt),
  );
}

function abortableDelay(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, delayMs);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
