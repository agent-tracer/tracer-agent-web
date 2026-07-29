import type { ChatStopReason } from "~/entities/chat/model/chat.js";
import { useGuidance } from "tracerWeb/store";
import type { GuidanceMessage } from "tracerWeb/guidance";
import { GuidanceText } from "tracerWeb/ui";

/** 스스로 끝내지 않은 턴에만 왜 멈췄는지와 이어서 진행하는 법을 붙인다. */
export function ChatTurnStop({ reason }: { readonly reason: ChatStopReason | null }) {
  const guidance = useGuidance();
  if (reason === null || reason === "completed") return null;
  const message = MESSAGE_BY_REASON(guidance.messages.chat)[reason];
  if (message === undefined) return null;

  return (
    <div
      role="status"
      className="self-start flex items-start gap-2 rounded-md px-3 py-2 border border-hair bg-s1 max-w-[80%]"
    >
      <span aria-hidden className="text-[12.5px] leading-5">⏸</span>
      <GuidanceText
        as="span"
        className="text-[12.5px] text-ink-muted"
        locale={guidance.locale}
        message={message}
      />
    </div>
  );
}

type ChatGuidance = ReturnType<typeof useGuidance>["messages"]["chat"];

function MESSAGE_BY_REASON(chat: ChatGuidance): Partial<Record<ChatStopReason, GuidanceMessage>> {
  return {
    deadline: chat.stoppedByDeadline,
    stalled: chat.stoppedByStall,
    budget_landed: chat.stoppedByBudget,
    turn_limit: chat.stoppedByTurnLimit,
    failed: chat.stoppedByFailure,
  };
}
