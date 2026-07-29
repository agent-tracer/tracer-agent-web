import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatThreadId } from "~/entities/chat/model/chat.js";
import { ChatThreadRail } from "~/widgets/chat/ChatThreadRail.js";

vi.mock("~/entities/chat/api/mutations.js", () => ({
  useCreateThreadMutation: () => ({ isPending: false, mutate: vi.fn() }),
  useDeleteThreadMutation: () => ({ mutate: vi.fn() }),
}));
vi.mock("tracerWeb/store", () => ({
  useGuidance: () => ({
    locale: "en",
    messages: { chat: { threadsEmpty: { text: "Empty" }, deleteConfirm: { text: "Delete?" } } },
  }),
}));

describe("ChatThreadRail", () => {
  it("각 대화 행에 항상 보이는 삭제 동작 칸을 확보한다", () => {
    const threadId = ChatThreadId("thread-1");
    render(
      <ChatThreadRail
        threads={[{
          id: threadId,
          userId: "user-1",
          title: "A very long conversation title",
          summary: null,
          backend: null,
          createdAt: "2026-07-27T00:00:00.000Z",
          updatedAt: "2026-07-27T00:00:00.000Z",
        }]}
        selectedThreadId={threadId}
        onSelect={vi.fn()}
        onCreated={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    const row = screen.getByRole("button", { name: "Delete conversation" }).parentElement;
    expect(row).toHaveClass("grid-cols-[minmax(0,1fr)_28px]");
    expect(screen.getByRole("button", { name: "Delete conversation" })).not.toHaveClass("opacity-0");
  });
});
