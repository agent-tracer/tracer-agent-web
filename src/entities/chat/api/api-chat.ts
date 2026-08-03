import type { ChatConfirmationStatus, ChatMessagesListResponse, ChatMessageRecord, ChatExecutionRecord, ChatExecutionsListResponse, ChatThreadCreateInput, ChatThreadId, ChatThreadRecord, ChatThreadsListResponse } from "~/entities/chat/model/chat.js";
import { deleteRequest, getJson, patchJson, postJson } from "tracerWeb/api";
import { toChatMessageRecord, toChatThreadRecord, type ChatMessageWireDto, type ChatThreadWireDto } from "~/entities/chat/api/chat.mapper.js";

/** 대화 스레드 창구의 경로이며 계약이 이 아래에 접수와 취소를 연다. */
export const CHAT_THREADS_PATH = "/api/agent/chat/threads";

export async function fetchChatThreads(): Promise<ChatThreadsListResponse> {
  const res = await getJson<{ readonly items: readonly ChatThreadWireDto[] }>(
    CHAT_THREADS_PATH,
  );
  return { threads: res.items.map(toChatThreadRecord) };
}

export interface ChatThreadDetailResponse {
  readonly thread: ChatThreadRecord;
}

export async function fetchChatThread(
  threadId: ChatThreadId,
): Promise<ChatThreadDetailResponse> {
  const res = await getJson<{ readonly thread: ChatThreadWireDto }>(
    `${CHAT_THREADS_PATH}/${threadId}`,
  );
  return { thread: toChatThreadRecord(res.thread) };
}

export async function fetchChatMessages(
  threadId: ChatThreadId,
): Promise<ChatMessagesListResponse> {
  const res = await getJson<{ readonly items: readonly ChatMessageWireDto[] }>(
    `${CHAT_THREADS_PATH}/${threadId}/messages`,
  );
  return { messages: res.items.map(toChatMessageRecord) };
}

export interface StartChatTurnInput {
  readonly clientRequestId: string;
  readonly content: string;
}

export interface StartChatTurnResponse {
  readonly message: ChatMessageRecord;
  readonly execution: ChatExecutionRecord;
}

export async function startChatTurn(
  threadId: ChatThreadId,
  input: StartChatTurnInput,
  backend?: string | null,
): Promise<StartChatTurnResponse> {
  const res = await postJson<{
    readonly message: ChatMessageWireDto;
    readonly execution: ChatExecutionRecord;
  }>(
    `${CHAT_THREADS_PATH}/${threadId}/messages`,
    input,
    backend ? { backend } : undefined,
  );
  return {
    message: toChatMessageRecord(res.message),
    execution: res.execution,
  };
}

export async function fetchChatExecutions(
  threadId: ChatThreadId,
): Promise<ChatExecutionsListResponse> {
  const res = await getJson<{
    readonly items: readonly ChatExecutionRecord[];
    readonly confirmations: readonly {
      readonly id: string;
      readonly toolName: string;
      readonly args: Record<string, unknown>;
    }[];
  }>(`${CHAT_THREADS_PATH}/${threadId}/executions`);
  return {
    executions: res.items,
    confirmations: res.confirmations.map((request) => ({
      ...request,
      summary: summarizeToolRequest(request.toolName, request.args),
    })),
  };
}

export function summarizeToolRequest(
  toolName: string,
  args: Record<string, unknown>,
): string {
  const parts = Object.entries(args).map(
    ([key, value]) => `${key}=${String(value)}`,
  );
  return parts.length === 0 ? toolName : `${toolName}(${parts.join(", ")})`;
}

export async function cancelChatExecution(
  threadId: ChatThreadId,
  executionId: string,
): Promise<{ readonly execution: ChatExecutionRecord }> {
  return postJson(
    `${CHAT_THREADS_PATH}/${threadId}/executions/${executionId}/cancel`,
  );
}

export interface CreateChatThreadResponse {
  readonly thread: ChatThreadRecord;
}

export async function createChatThread(
  body: ChatThreadCreateInput,
): Promise<CreateChatThreadResponse> {
  const res = await postJson<{ readonly thread: ChatThreadWireDto }>(
    CHAT_THREADS_PATH,
    body,
  );
  return { thread: toChatThreadRecord(res.thread) };
}

export interface DeleteChatThreadResponse {
  readonly deleted: true;
}

export function deleteChatThread(
  threadId: ChatThreadId,
): Promise<DeleteChatThreadResponse> {
  return deleteRequest<DeleteChatThreadResponse>(
    `${CHAT_THREADS_PATH}/${threadId}`,
  );
}

export async function renameChatThread(
  threadId: ChatThreadId,
  title: string,
): Promise<ChatThreadDetailResponse> {
  const response = await patchJson<{ readonly thread: ChatThreadWireDto }>(
    `${CHAT_THREADS_PATH}/${threadId}`,
    { title },
  );
  return { thread: toChatThreadRecord(response.thread) };
}

export type ChatConfirmDecision = "approve" | "reject";

export interface ConfirmChatToolInput {
  readonly threadId: ChatThreadId;
  readonly confirmationId: string;
  readonly decision: ChatConfirmDecision;
}

export interface ConfirmChatToolResponse {
  readonly confirmationId: string;
  readonly toolName: string;
  readonly status: ChatConfirmationStatus;
  readonly result: string;
  /** 승인이 세운 후속 턴이며 거절이거나 스레드가 이미 바쁘면 비어 있다. */
  readonly execution: ChatExecutionRecord | null;
}

export function confirmChatTool(
  input: ConfirmChatToolInput,
): Promise<ConfirmChatToolResponse> {
  return postJson<ConfirmChatToolResponse>(
    `${CHAT_THREADS_PATH}/${input.threadId}/confirmations/${input.confirmationId}`,
    { decision: input.decision },
  );
}
