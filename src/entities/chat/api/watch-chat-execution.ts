import type { ChatConfirmationRecord, ChatExecutionRecord, ChatThreadId } from "~/entities/chat/model/chat.js";
import { CHAT_THREADS_PATH, summarizeToolRequest } from "~/entities/chat/api/api-chat.js";
import { getMonitorApiBaseUrl, getUserId, createResponseError, routeToAgentBackend } from "tracerWeb/api";

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
      const chunk = await reader.read();
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
