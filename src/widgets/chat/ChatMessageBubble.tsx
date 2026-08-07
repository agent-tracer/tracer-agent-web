import { memo } from "react";
import type { ChatMessageRecord } from "~/entities/chat/model/chat.js";
import { Pill } from "tracerWeb/ui";
import { cn } from "~/widgets/chat/lib/cn.js";
import { ChatCopyButton } from "~/widgets/chat/ChatCopyButton.js";
import { ChatMarkdown } from "~/widgets/chat/ChatMarkdown.js";

interface ChatMessageBubbleProps {
  readonly message: ChatMessageRecord;
}

/** 저장된 대화 메시지 한 건이며, role이 tool이면 쓰기 확인이 남긴 결과 노트다. */
export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
}: ChatMessageBubbleProps) {
  if (message.role === "tool") {
    return (
      <div className="self-center max-w-[80%] text-[11px] text-ink-tertiary font-mono bg-s1 border border-hair rounded-xs px-2.5 py-1.5">
        {message.content}
      </div>
    );
  }

  const isUser = message.role === "user";
  const bubble = (
    <div
      className={cn(
        "min-w-0 rounded-md px-3 py-2",
        isUser
          ? "bg-primary text-on-primary text-[13px] leading-[1.55] whitespace-pre-wrap break-words"
          : "bg-s1 border border-hair text-ink",
      )}
    >
      {isUser ? message.content : <ChatMarkdown content={message.content} />}
    </div>
  );

  return (
    <div
      className={cn(
        "group flex flex-col gap-1.5 max-w-[75%]",
        isUser ? "self-end items-end" : "self-start items-start",
      )}
    >
      {/* 복사 단추는 거품을 밀지 않도록 옆자리에서 손댈 때만 드러나고, 말한 쪽의 반대편에 선다. */}
      <div className={cn("flex max-w-full items-end gap-1.5", isUser ? "" : "flex-row-reverse")}>
        <ChatCopyButton
          text={message.content}
          label={isUser ? "Copy message" : "Copy answer"}
          className="mb-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        />
        {bubble}
      </div>
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {message.toolCalls.map((call) => (
            <Pill key={call.id} tone="neutral">
              {call.name}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
});
