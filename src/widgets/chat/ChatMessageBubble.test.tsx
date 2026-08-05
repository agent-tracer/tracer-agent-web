import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatThreadId, type ChatMessageRecord } from "~/entities/chat/model/chat.js";
import { ChatMessageBubble } from "~/widgets/chat/ChatMessageBubble.js";

afterEach(cleanup);

function message(overrides: Partial<ChatMessageRecord>): ChatMessageRecord {
  return {
    id: "message-1",
    threadId: ChatThreadId("thread-1"),
    role: "user",
    content: "테스트 메모를 남겨 줘",
    toolCalls: null,
    toolCallId: null,
    createdAt: "",
    ...overrides,
  };
}

/** jsdom 은 clipboard 도 execCommand 도 세우지 않으므로 시험이 두 표면을 직접 놓는다. */
function stubClipboard(writeText: () => Promise<void>, copied = false) {
  const execCommand = vi.fn().mockReturnValue(copied);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });
  return execCommand;
}

describe("ChatMessageBubble", () => {
  it("보낸 메시지의 본문을 클립보드에 그대로 넘긴다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<ChatMessageBubble message={message({})} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("테스트 메모를 남겨 줘"));
  });

  it("클립보드 표면이 막히면 선택과 복사 명령으로 물러선다", async () => {
    const execCommand = stubClipboard(vi.fn().mockRejectedValue(new Error("denied")), true);
    render(<ChatMessageBubble message={message({})} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));

    await waitFor(() => expect(screen.getByText("Copied")).toBeTruthy());
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("두 경로가 모두 막히면 실패를 알리고 버튼을 그 자리에 남긴다", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<ChatMessageBubble message={message({})} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy message" }));

    await waitFor(() => expect(screen.getByText("Copy failed")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Copy message" })).toBeTruthy();
  });

  it("받은 답변은 화면에 그린 서식이 아니라 원본 본문을 넘긴다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(
      <ChatMessageBubble
        message={message({ role: "assistant", content: "**테스트** 메모를 만들었습니다" })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy answer" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("**테스트** 메모를 만들었습니다"),
    );
  });

  it("도구가 남긴 결과 노트에는 복사 버튼을 붙이지 않는다", () => {
    render(<ChatMessageBubble message={message({ role: "tool", content: "Created memo." })} />);

    expect(screen.queryByRole("button", { name: /^Copy/ })).toBeNull();
  });
});
