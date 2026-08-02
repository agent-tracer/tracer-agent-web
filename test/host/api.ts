// 호스트가 연합으로 내보내는 표면의 대역이며 시험 실행에서만 쓰인다.

function unstubbed(name: string): never {
  throw new Error(`${name} was called without a stub`);
}

export function getJson<T>(_pathname: string, _options?: unknown): Promise<T> {
  return unstubbed("getJson");
}

export function postJson<T>(_pathname: string, _body?: unknown, _options?: unknown): Promise<T> {
  return unstubbed("postJson");
}

export function patchJson<T>(_pathname: string, _body: unknown, _options?: unknown): Promise<T> {
  return unstubbed("patchJson");
}

export function deleteRequest<T>(_pathname: string, _options?: unknown): Promise<T> {
  return unstubbed("deleteRequest");
}

export function createResponseError(
  response: Response,
  pathname: string,
  method: string,
): Promise<Error> {
  return Promise.resolve(new Error(`${method} ${pathname}: ${response.status}`));
}

export function routeToAgentBackend(
  pathname: string,
  options?: { readonly backend?: string },
): string {
  const backend = options?.backend ?? null;
  if (backend === null || !pathname.startsWith("/api/agent/")) return pathname;
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}backend=${encodeURIComponent(backend)}`;
}

export function useAgentBackendSettled(): boolean {
  return true;
}

export function getMonitorApiBaseUrl(): string {
  return "";
}

export function getUserId(): string | null {
  return null;
}

export const monitorQueryKeys = {
  chatThreads: () => ["monitor", "chat", "threads"] as const,
  chatThreadsPrefix: () => ["monitor", "chat", "threads"] as const,
  chatMessages: (threadId: string) => ["monitor", "chat", "threads", threadId, "messages"] as const,
  chatExecutions: (threadId: string) =>
    ["monitor", "chat", "threads", threadId, "executions"] as const,
};
