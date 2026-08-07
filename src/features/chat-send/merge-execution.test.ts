import { describe, expect, it } from "vitest";
import { ChatThreadId, type ChatExecutionRecord } from "~/entities/chat/model/chat.js";
import { mergeExecution } from "~/features/chat-send/useChatExecutionUpdates.js";

function execution(overrides: Partial<ChatExecutionRecord> = {}): ChatExecutionRecord {
  return {
    id: "execution-1",
    threadId: ChatThreadId("thread-1"),
    replayAnchorMessageId: "message-1",
    status: "running",
    phase: "responding",
    requestedBackend: null,
    draftText: "hello",
    draftSeq: 2,
    assistantMessageId: null,
    modelUsed: null,
    costUsd: null,
    numTurns: null,
    stopReason: null,
    error: null,
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:02.000Z",
    startedAt: "2026-07-22T00:00:01.000Z",
    completedAt: null,
    ...overrides,
  };
}

describe("mergeExecution", () => {
  it("같은 시각에 도착한 낮은 순번의 짧은 초안이 글자를 되감지 못한다", () => {
    const current = execution({ draftText: "hello world", draftSeq: 5 });

    const merged = mergeExecution([current], execution({ draftText: "hel", draftSeq: 3 }));

    expect(merged[0]?.draftText).toBe("hello world");
  });

  it("시각이 앞선 프레임을 낡은 것으로 보고 버린다", () => {
    const current = execution({ updatedAt: "2026-07-22T00:00:09.000Z", draftSeq: 9 });

    const merged = mergeExecution([current], execution({ updatedAt: "2026-07-22T00:00:03.000Z" }));

    expect(merged[0]).toBe(current);
  });

  it("재시도가 초안을 되돌린 새 프레임은 순번이 낮아도 받아들인다", () => {
    const current = execution({ draftText: "hello world", draftSeq: 5 });
    const reset = execution({
      draftText: "",
      draftSeq: 0,
      updatedAt: "2026-07-22T00:00:07.000Z",
    });

    const merged = mergeExecution([current], reset);

    expect(merged[0]).toBe(reset);
  });

  it("달라진 게 없으면 같은 배열을 그대로 돌려 파생 참조를 살려 둔다", () => {
    const executions = [execution()];

    expect(mergeExecution(executions, execution())).toBe(executions);
  });

  it("처음 보는 실행은 목록 앞에 붙인다", () => {
    const older = execution({ id: "execution-0", createdAt: "2026-07-21T00:00:00.000Z" });

    const merged = mergeExecution([older], execution());

    expect(merged.map((row) => row.id)).toEqual(["execution-1", "execution-0"]);
  });
});
