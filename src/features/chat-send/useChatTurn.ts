import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatThreadId } from "~/entities/chat/model/chat.js";
import type { ChatExecutionPhase, ChatExecutionRecord, ChatExecutionsListResponse, ChatMessageRecord, ChatMessagesListResponse } from "~/entities/chat/model/chat.js";
import type { ChatConfirmRequest } from "~/entities/chat/model/chat-turn.js";
import { cancelChatExecution, startChatTurn } from "~/entities/chat/api/api-chat.js";
import { monitorQueryKeys } from "tracerWeb/api";
import { useChatExecutionUpdates } from "~/features/chat-send/useChatExecutionUpdates.js";
import { completedTurnProcesses, isTerminal, toErrorMessage, type CompletedTurnProcess } from "~/features/chat-send/turn.view.js";

interface PendingMessage {
  readonly threadId: ChatThreadId;
  readonly clientRequestId: string;
  readonly content: string;
  readonly backend: string | null;
  readonly status: "sending" | "accepted" | "failed";
  readonly error?: string;
  readonly acceptedMessage?: ChatMessageRecord;
}

export interface OptimisticChatMessage {
  readonly clientRequestId: string;
  readonly content: string;
  readonly status: "sending" | "failed";
  readonly error: string | null;
}

export interface UseChatTurnResult {
  readonly isStreaming: boolean;
  /** 재시도가 초안을 되돌려 답변을 처음부터 다시 쓰는 중이다. */
  readonly isRewritingDraft: boolean;
  readonly pendingMessages: readonly OptimisticChatMessage[];
  readonly activeProcess: string;
  /** 진행 중인 실행이 무엇을 하는 중인지이며 초안이 자라지 않는 구간을 화면이 설명하게 한다. */
  readonly activePhase: ChatExecutionPhase | null;
  /** 그 구간이 시작된 시각이며 경과는 화면이 국소적으로 센다. */
  readonly activeSince: string | null;
  /** 어시스턴트 메시지 id로 색인한 진행 기록이다. */
  readonly completedProcesses: ReadonlyMap<string, CompletedTurnProcess>;
  readonly pendingConfirms: readonly ChatConfirmRequest[];
  readonly error: string | null;
  readonly queuedCount: number;
  readonly sendMessage: (content: string, backend?: string | null) => void;
  readonly stop: () => void;
  readonly retryMessage: (clientRequestId: string) => void;
  readonly dismissMessage: (clientRequestId: string) => void;
  readonly resolveConfirm: (confirmationId: string, execution: ChatExecutionRecord | null) => void;
}

/** 접수된 실행을 서버에서 다시 읽어 화면 이탈과 새로고침 뒤에도 같은 턴을 이어 본다. */
export function useChatTurn(threadId: ChatThreadId | null): UseChatTurnResult {
  const queryClient = useQueryClient();
  const executionUpdates = useChatExecutionUpdates(threadId);
  const executionsQuery = executionUpdates.query;
  const [pendingMessages, setPendingMessages] = useState<readonly PendingMessage[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const seenTerminalRef = useRef(new Set<string>());
  const threadIdRef = useRef(threadId);
  threadIdRef.current = threadId;

  const executions = executionsQuery.data?.executions ?? [];
  const running =
    executions.find((execution) => execution.status === "running") ?? null;
  const queued = executions
    .filter((execution) => execution.status === "queued")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const latest = executions[0] ?? null;

  useEffect(() => {
    setPendingMessages([]);
    setRequestError(null);
    seenTerminalRef.current = new Set();
  }, [threadId]);

  useEffect(() => {
    if (!threadId) return;
    const accepted: ChatMessageRecord[] = [];
    for (const pending of pendingMessages) {
      if (pending.threadId !== threadId) continue;
      if (pending.status === "sending") break;
      if (pending.status === "accepted" && pending.acceptedMessage !== undefined) {
        accepted.push(pending.acceptedMessage);
      }
    }
    if (accepted.length === 0) return;
    const acceptedIds = new Set(accepted.map((message) => message.id));
    queryClient.setQueryData<ChatMessagesListResponse>(
      monitorQueryKeys.chatMessages(threadId),
      (current) => ({
        messages: [
          ...(current?.messages.filter((message) => !acceptedIds.has(message.id)) ?? []),
          ...accepted,
        ],
      }),
    );
    setPendingMessages((current) => current.filter((row) =>
      row.threadId !== threadId || row.status !== "accepted"));
  }, [pendingMessages, queryClient, threadId]);

  useEffect(() => {
    if (!threadId) return;
    const newlyTerminal = executions.filter(
      (execution) =>
        isTerminal(execution) && !seenTerminalRef.current.has(execution.id),
    );
    if (newlyTerminal.length === 0) return;
    for (const execution of newlyTerminal)
      seenTerminalRef.current.add(execution.id);
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: monitorQueryKeys.chatMessages(threadId),
      }),
      queryClient.invalidateQueries({
        queryKey: monitorQueryKeys.chatThreadsPrefix(),
      }),
    ]);
  }, [executions, queryClient, threadId]);

  const submitPending = useCallback(
    (pending: PendingMessage) => {
      if (!threadId) return;
      void startChatTurn(
        threadId,
        { clientRequestId: pending.clientRequestId, content: pending.content },
        pending.backend,
      )
        .then(async ({ message, execution }) => {
          queryClient.setQueryData<ChatExecutionsListResponse>(
            monitorQueryKeys.chatExecutions(threadId),
            (current) => ({
              confirmations: current?.confirmations ?? [],
              executions: [
                execution,
                ...(current?.executions.filter(
                  (row) => row.id !== execution.id,
                ) ?? []),
              ],
            }),
          );
          if (threadIdRef.current !== threadId) {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: monitorQueryKeys.chatMessages(threadId) }),
              queryClient.invalidateQueries({ queryKey: monitorQueryKeys.chatExecutions(threadId) }),
            ]);
            return;
          }
          // 접수 응답의 실행을 바로 위에서 캐시에 심었고 그 뒤는 스트림이 이어 가므로 다시 묻지 않는다.
          setPendingMessages((current) =>
            current.map((row) => {
              if (row.clientRequestId !== pending.clientRequestId) return row;
              const { error: _error, ...withoutError } = row;
              return { ...withoutError, status: "accepted", acceptedMessage: message };
            }),
          );
        })
        .catch((error: unknown) => {
          if (threadIdRef.current !== threadId) return;
          setPendingMessages((current) =>
            current.map((row) => row.clientRequestId === pending.clientRequestId
              ? { ...row, status: "failed", error: toErrorMessage(error) }
              : row),
          );
          setRequestError(toErrorMessage(error));
        });
    },
    [queryClient, threadId],
  );

  const sendMessage = useCallback(
    (content: string, backend: string | null = null) => {
      const trimmed = content.trim();
      if (!threadId || trimmed.length === 0) return;
      const pending: PendingMessage = {
        threadId,
        clientRequestId: globalThis.crypto.randomUUID(),
        content: trimmed,
        backend,
        status: "sending",
      };
      setPendingMessages((current) => [...current, pending]);
      setRequestError(null);
      submitPending(pending);
    },
    [submitPending, threadId],
  );

  const retryMessage = useCallback((clientRequestId: string) => {
    const pending = pendingMessages.find((row) => row.clientRequestId === clientRequestId);
    if (pending?.status !== "failed") return;
    const { error: _error, acceptedMessage: _acceptedMessage, ...retryable } = pending;
    const retrying: PendingMessage = { ...retryable, status: "sending" };
    setPendingMessages((current) => current.map((row) => row.clientRequestId === clientRequestId ? retrying : row));
    setRequestError(null);
    submitPending(retrying);
  }, [pendingMessages, submitPending]);

  const dismissMessage = useCallback((clientRequestId: string) => {
    setPendingMessages((current) => current.filter((row) => row.clientRequestId !== clientRequestId || row.status !== "failed"));
    setRequestError(null);
  }, []);

  const stop = useCallback(() => {
    if (!threadId) return;
    const target = running ?? queued[0];
    if (target === undefined) return;
    void cancelChatExecution(threadId, target.id)
      .then(({ execution }) => {
        queryClient.setQueryData<ChatExecutionsListResponse>(
          monitorQueryKeys.chatExecutions(threadId),
          (current) => ({
            confirmations: current?.confirmations ?? [],
            executions: current?.executions.map((row) =>
              row.id === execution.id ? execution : row,
            ) ?? [execution],
          }),
        );
      })
      .catch((error: unknown) => setRequestError(toErrorMessage(error)));
  }, [queryClient, queued, running, threadId]);

  /** 해소된 확인을 목록에서 지우고, 승인이 세운 턴이 있으면 그 턴을 곧바로 이어 붙인다. */
  const resolveConfirm = useCallback(
    (confirmationId: string, execution: ChatExecutionRecord | null) => {
      if (!threadId) return;
      queryClient.setQueryData<ChatExecutionsListResponse>(
        monitorQueryKeys.chatExecutions(threadId),
        (current) => ({
          confirmations: (current?.confirmations ?? []).filter(
            (request) => request.id !== confirmationId,
          ),
          executions:
            execution === null
              ? (current?.executions ?? [])
              : [
                  execution,
                  ...(current?.executions.filter((row) => row.id !== execution.id) ?? []),
                ],
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: monitorQueryKeys.chatMessages(threadId),
      });
    },
    [queryClient, threadId],
  );

  return useMemo(
    () => ({
      isStreaming:
        running !== null || queued.length > 0 || pendingMessages.some((row) => row.status !== "failed"),
      isRewritingDraft:
        running !== null && running.id === executionUpdates.rewritingExecutionId,
      pendingMessages: pendingMessages.filter((message) => message.threadId === threadId).map((message) => ({
        clientRequestId: message.clientRequestId,
        content: message.content,
        status: message.status === "failed" ? "failed" as const : "sending" as const,
        error: message.error ?? null,
      })),
      activeProcess: running?.draftText ?? "",
      activePhase: running?.phase ?? null,
      activeSince: running?.updatedAt ?? null,
      completedProcesses: completedTurnProcesses(executions),
      pendingConfirms: executionsQuery.data?.confirmations ?? [],
      error:
        requestError ??
        (latest?.status === "failed"
          ? (latest.error ?? "Chat execution failed")
          : null) ??
        (executionUpdates.streamDegraded ? "Chat stream disconnected" : null),
      queuedCount:
        queued.length +
        Math.max(0, pendingMessages.filter((message) => message.status !== "failed").length - 1),
      sendMessage,
      stop,
      retryMessage,
      dismissMessage,
      resolveConfirm,
    }),
    [
      resolveConfirm,
      latest,
      executionsQuery.data?.confirmations,
      executionUpdates.rewritingExecutionId,
      executionUpdates.streamDegraded,
      executions,
      pendingMessages,
      queued.length,
      requestError,
      retryMessage,
      dismissMessage,
      running,
      sendMessage,
      stop,
    ],
  );
}
