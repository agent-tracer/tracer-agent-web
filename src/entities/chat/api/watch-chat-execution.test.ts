import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatThreadId } from "~/entities/chat/model/chat.js";
import { watchChatExecution } from "./watch-chat-execution.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => fetchMock.mockReset());

describe("watchChatExecution", () => {
  it("event와 data 두 줄로 나뉘어 도착한 snapshot을 복원하고 terminal 상태를 끝낸다", async () => {
    const encoder = new TextEncoder();
    const payload = JSON.stringify({
      execution: {
        id: "execution-1",
        threadId: "thread-1",
        userMessageId: "message-1",
        status: "completed",
        requestedBackend: null,
        draftText: "answer",
        draftSeq: 2,
        assistantMessageId: "message-2",
        error: null,
        createdAt: "2026-07-22T00:00:00.000Z",
        updatedAt: "2026-07-22T00:00:02.000Z",
        startedAt: "2026-07-22T00:00:01.000Z",
        completedAt: "2026-07-22T00:00:02.000Z",
      },
      confirmations: [],
    });
    const frame = `event: snapshot\ndata: ${payload}\n\n`;
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(frame.slice(0, 30)));
            controller.enqueue(encoder.encode(frame.slice(30)));
            controller.close();
          },
        }),
        { status: 200 },
      ),
    );
    const onOpen = vi.fn();
    const onSnapshot = vi.fn();

    const outcome = await watchChatExecution(
      ChatThreadId("thread-1"),
      "execution-1",
      { onOpen, onSnapshot },
      new AbortController().signal,
    );

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ execution: expect.objectContaining({ draftText: "answer" }) }),
    );
    expect(outcome).toBe("terminal");
  });

  it.each(["\r\n\r\n", ""])("CRLF 또는 EOF로 끝난 마지막 snapshot을 소비한다", async (ending) => {
    const payload = JSON.stringify({
      execution: { id: "execution-1", threadId: "thread-1", userMessageId: "message-1", status: "completed", requestedBackend: null, draftText: "answer", draftSeq: 2, assistantMessageId: "message-2", error: null, createdAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:02.000Z", startedAt: null, completedAt: "2026-07-22T00:00:02.000Z" },
      confirmations: [],
    });
    const separator = ending ? "\r\n" : "\n";
    const frame = `event: snapshot${separator}data: ${payload}${ending}`;
    fetchMock.mockResolvedValue(new Response(frame, { status: 200 }));
    const onSnapshot = vi.fn();
    const outcome = await watchChatExecution(ChatThreadId("thread-1"), "execution-1", { onOpen: vi.fn(), onSnapshot }, new AbortController().signal);
    expect(onSnapshot).toHaveBeenCalledOnce();
    expect(outcome).toBe("terminal");
  });

  it("다시 연결할 때 Last-Event-ID를 실어 보내지 않는다", async () => {
    fetchMock.mockResolvedValue(new Response("event: ping\n\n", { status: 200 }));

    await watchChatExecution(
      ChatThreadId("thread-1"),
      "execution-1",
      { onOpen: vi.fn(), onSnapshot: vi.fn() },
      new AbortController().signal,
    );

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.has("Last-Event-ID")).toBe(false);
    expect(headers.get("Accept")).toBe("text/event-stream");
  });

  it("잘못된 프레임을 건너뛰고 여러 data 줄의 다음 snapshot을 읽는다", async () => {
    const wire = {
      execution: { id: "execution-1", threadId: "thread-1", userMessageId: "message-1", status: "completed", requestedBackend: null, draftText: "answer", draftSeq: 2, assistantMessageId: "message-2", error: null, createdAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:02.000Z", startedAt: null, completedAt: "2026-07-22T00:00:02.000Z" },
      confirmations: [],
    };
    const pretty = JSON.stringify(wire, null, 2)
      .split("\n")
      .map((line) => `data: ${line}`)
      .join("\n");
    fetchMock.mockResolvedValue(new Response(`event: snapshot\ndata: {bad}\n\nevent: snapshot\n${pretty}\n\n`, { status: 200 }));
    const onSnapshot = vi.fn();

    const outcome = await watchChatExecution(ChatThreadId("thread-1"), "execution-1", { onOpen: vi.fn(), onSnapshot }, new AbortController().signal);

    expect(onSnapshot).toHaveBeenCalledOnce();
    expect(outcome).toBe("terminal");
  });
});
