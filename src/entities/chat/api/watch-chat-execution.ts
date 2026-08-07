import type { ChatConfirmationRecord, ChatExecutionRecord, ChatThreadId } from "~/entities/chat/model/chat.js";
import { CHAT_THREADS_PATH, summarizeToolRequest } from "~/entities/chat/api/api-chat.js";
import { getMonitorApiBaseUrl, getUserId, createResponseError, routeToAgentBackend } from "tracerWeb/api";
import { CHAT_STREAM_IDLE_TIMEOUT_MS } from "~/shared/contract/chat-stream.js";

interface ChatExecutionSnapshotWire {
  readonly execution: ChatExecutionRecord;
  readonly confirmations: readonly {
    readonly id: string;
    readonly toolName: string;
    readonly args: Record<string, unknown>;
  }[];
}

export interface ChatExecutionSnapshot {
  readonly execution: ChatExecutionRecord;
  readonly confirmations: readonly ChatConfirmationRecord[];
}

export interface ChatExecutionWatchHandlers {
  readonly onOpen: () => void;
  readonly onSnapshot: (snapshot: ChatExecutionSnapshot) => void;
}

export async function watchChatExecution(
  threadId: ChatThreadId,
  executionId: string,
  backend: string | null,
  handlers: ChatExecutionWatchHandlers,
  signal: AbortSignal,
): Promise<"terminal" | "disconnected"> {
  const pathname = `${CHAT_THREADS_PATH}/${threadId}/executions/${executionId}/events`;
  const headers = new Headers({ Accept: "text/event-stream" });
  const userId = getUserId();
  if (userId) headers.set("x-monitor-user", userId);
  const route = routeToAgentBackend(pathname, backend ? { backend } : undefined);
  const response = await fetch(`${getMonitorApiBaseUrl()}${route}`, {
    credentials: "include",
    headers,
    signal,
  });
  if (!response.ok || response.body === null) {
    throw await createResponseError(response, pathname, "GET");
  }
  handlers.onOpen();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminal = false;
  try {
    for (;;) {
      // 소켓이 열린 채 조용히 죽으면 read가 영원히 대기하므로, 계약의 재전송 주기를 넘겨 침묵하면 끊긴 것으로 본다.
      const chunk = await readWithIdleTimeout(reader, CHAT_STREAM_IDLE_TIMEOUT_MS);
      if (chunk === "idle") {
        await reader.cancel();
        return "disconnected";
      }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const consumed = consumeSnapshots(normalizeLineEndings(buffer), handlers.onSnapshot);
      buffer = consumed.buffer;
      terminal ||= consumed.terminal;
      if (terminal) {
        await reader.cancel();
        return "terminal";
      }
    }
    buffer += decoder.decode();
    if (buffer.trim().length > 0) {
      const consumed = consumeSnapshots(`${normalizeLineEndings(buffer)}\n\n`, handlers.onSnapshot);
      terminal ||= consumed.terminal;
    }
  } finally {
    reader.releaseLock();
  }
  return terminal ? "terminal" : "disconnected";
}

/** 다음 청크를 기다리되 침묵이 한도를 넘으면 `"idle"`을 돌려 호출자가 다시 붙게 한다. */
async function readWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  idleTimeoutMs: number,
): Promise<ReadableStreamReadResult<Uint8Array> | "idle"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const idle = new Promise<"idle">((resolve) => {
    timer = setTimeout(() => resolve("idle"), idleTimeoutMs);
  });
  try {
    return await Promise.race([reader.read(), idle]);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r(?!$)/g, "\n");
}

function consumeSnapshots(
  buffer: string,
  onSnapshot: (snapshot: ChatExecutionSnapshot) => void,
): { readonly buffer: string; readonly terminal: boolean } {
  const frames = buffer.split("\n\n");
  const rest = frames.pop() ?? "";
  let terminal = false;
  for (const frame of frames) {
    const parsed = parseSnapshot(frame);
    if (parsed === null) continue;
    onSnapshot(parsed);
    terminal ||= isTerminal(parsed.execution.status);
  }
  return { buffer: rest, terminal };
}

function parseSnapshot(frame: string): ChatExecutionSnapshot | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  const data = dataLines.join("\n");
  if (event !== "snapshot" || data.length === 0) return null;
  let wire: ChatExecutionSnapshotWire;
  try {
    wire = JSON.parse(data) as ChatExecutionSnapshotWire;
  } catch {
    return null;
  }
  return {
    execution: wire.execution,
    confirmations: wire.confirmations.map((request) => ({
      ...request,
      summary: summarizeToolRequest(request.toolName, request.args),
    })),
  };
}

function isTerminal(status: ChatExecutionRecord["status"]): boolean {
  return status === "completed" || status === "failed" || status === "canceled";
}
