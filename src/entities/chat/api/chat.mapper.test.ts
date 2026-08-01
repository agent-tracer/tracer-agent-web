import { describe, expect, it } from "vitest";
import { toChatThreadRecord, type ChatThreadWireDto } from "~/entities/chat/api/chat.mapper.js";
import { AGENT_AXES } from "~/shared/contract/agent-axis.js";

const THREAD_WIRE = {
  id: "thread-1",
  userId: "user-1",
  title: "첫 대화",
  summary: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:01:00.000Z",
} as const;

describe("toChatThreadRecord", () => {
  it("계약이 정한 축 둘을 스레드 모델에 그대로 싣는다", () => {
    for (const axis of AGENT_AXES) {
      expect(toChatThreadRecord({ ...THREAD_WIRE, backend: axis }).backend).toBe(axis);
    }
  });

  it("축이 아직 정해지지 않은 스레드는 축을 비운 채 둔다", () => {
    expect(toChatThreadRecord({ ...THREAD_WIRE, backend: null }).backend).toBeNull();
  });

  it("계약에 없는 낱말을 실은 와이어 응답을 받지 않는다", () => {
    const claudeSdk: ChatThreadWireDto = {
      ...THREAD_WIRE,
      // @ts-expect-error claude-sdk 는 계약의 AgentAxis 에 없다
      backend: "claude-sdk",
    };
    const typescript: ChatThreadWireDto = {
      ...THREAD_WIRE,
      // @ts-expect-error typescript 는 계약의 AgentAxis 에 없다
      backend: "typescript",
    };

    expect(AGENT_AXES).not.toContain(claudeSdk.backend);
    expect(AGENT_AXES).not.toContain(typescript.backend);
  });
});
