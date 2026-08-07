import { useEffect, useRef, useState } from "react";
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { ChatThreadId } from "~/entities/chat/model/chat.js";
import type { ChatExecutionRecord, ChatExecutionsListResponse } from "~/entities/chat/model/chat.js";
import type { ChatConfirmationRecord } from "~/entities/chat/model/chat.js";
import { useChatExecutionsQuery } from "~/entities/chat/api/queries.js";
import { watchChatExecution } from "~/entities/chat/api/watch-chat-execution.js";
import { advanceDraftHighWater, isRewritingDraft, type DraftHighWater } from "~/features/chat-send/turn.view.js";
import { CHAT_STREAM_RECONNECT } from "~/shared/contract/chat-stream.js";
import { monitorQueryKeys } from "tracerWeb/api";

/** 한 번의 실패는 흔한 재접속이므로, 물러섰다가 또 실패했을 때만 화면에 알린다. */
const STREAM_DEGRADED_AFTER_FAILURES = 2;

export interface ChatExecutionUpdates {
  readonly query: UseQueryResult<ChatExecutionsListResponse>;
  /** 초안이 되돌아간 뒤 아직 되찾지 못한 실행이며 화면이 다시 쓰는 중임을 알린다. */
  readonly rewritingExecutionId: string | null;
  /** 스트림이 거듭 끊겨 지금은 폴백 조회로 버티는 중이며 사용자에게 알릴 만하다. */
  readonly streamDegraded: boolean;
}

export function useChatExecutionUpdates(threadId: ChatThreadId | null): ChatExecutionUpdates {
  const queryClient = useQueryClient();
  const [streamStatus, setStreamStatus] = useState<
    "idle" | "connecting" | "connected" | "failed"
  >("idle");
  const [failureCount, setFailureCount] = useState(0);
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
    setFailureCount(0);

    const watch = async (): Promise<void> => {
      while (!controller.signal.aborted) {
        setStreamStatus((current) => (current === "failed" ? current : "connecting"));
        try {
          const outcome = await watchChatExecution(
            threadId,
            active.id,
            active.requestedBackend,
            {
              onOpen: () => {
                retryDelayMs = CHAT_STREAM_RECONNECT.initialBackoffMs;
                setFailureCount(0);
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
                  (current) => {
                    const executions = mergeExecution(
                      current?.executions ?? [],
                      snapshot.execution,
                    );
                    const confirmations = mergeConfirmations(
                      current?.confirmations ?? [],
                      snapshot.confirmations,
                    );
                    // 달라진 게 없으면 같은 응답 객체를 돌려 구독자를 깨우지 않는다.
                    if (
                      current !== undefined &&
                      current.executions === executions &&
                      current.confirmations === confirmations
                    ) {
                      return current;
                    }
                    return { executions, confirmations };
                  },
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
        setFailureCount((current) => current + 1);
        await abortableDelay(retryDelayMs, controller.signal);
        retryDelayMs = Math.min(retryDelayMs * 2, CHAT_STREAM_RECONNECT.maxBackoffMs);
      }
    };

    void watch();
    return () => controller.abort();
  }, [active?.id, queryClient, threadId]);

  return {
    query: executionsQuery,
    rewritingExecutionId,
    streamDegraded: failureCount >= STREAM_DEGRADED_AFTER_FAILURES,
  };
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

/**
 * 늦게 도착한 프레임이 최신 정본을 되돌리지 못하게 하고, 실제로 달라진 게 없으면 같은 배열을
 * 그대로 돌려 아래쪽 파생 참조를 살려 둔다.
 */
export function mergeExecution(
  executions: readonly ChatExecutionRecord[],
  incoming: ChatExecutionRecord,
): readonly ChatExecutionRecord[] {
  const current = executions.find((execution) => execution.id === incoming.id);
  if (current !== undefined) {
    if (isStale(current, incoming)) return executions;
    if (isSameExecution(current, incoming)) return executions;
  }
  return [incoming, ...executions.filter((execution) => execution.id !== incoming.id)].sort(
    (left, right) => right.createdAt.localeCompare(left.createdAt),
  );
}

/** 같은 `updatedAt`에서는 계약이 싣는 `draftSeq`가 순서를 갈라야 늦게 온 짧은 초안이 글자를 되감지 못한다. */
function isStale(current: ChatExecutionRecord, incoming: ChatExecutionRecord): boolean {
  if (current.updatedAt > incoming.updatedAt) return true;
  return current.updatedAt === incoming.updatedAt && current.draftSeq > incoming.draftSeq;
}

/** 대기 도구 목록이 그대로면 이전 배열을 유지해 헛된 리렌더를 만들지 않는다. */
function mergeConfirmations(
  current: readonly ChatConfirmationRecord[],
  incoming: readonly ChatConfirmationRecord[],
): readonly ChatConfirmationRecord[] {
  if (current.length !== incoming.length) return incoming;
  const unchanged = current.every((request, index) => request.id === incoming[index]?.id);
  return unchanged ? current : incoming;
}

function isSameExecution(current: ChatExecutionRecord, incoming: ChatExecutionRecord): boolean {
  return (
    current.updatedAt === incoming.updatedAt &&
    current.draftSeq === incoming.draftSeq &&
    current.status === incoming.status &&
    current.draftText === incoming.draftText &&
    current.assistantMessageId === incoming.assistantMessageId &&
    current.stopReason === incoming.stopReason &&
    current.error === incoming.error
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
