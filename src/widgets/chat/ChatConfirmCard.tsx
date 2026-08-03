import type { ChatExecutionRecord, ChatThreadId } from "~/entities/chat/model/chat.js";
import type { ChatConfirmRequest } from "~/entities/chat/model/chat-turn.js";
import { useConfirmToolMutation } from "~/entities/chat/api/mutations.js";
import { useGuidance } from "tracerWeb/store";
import { Button, Card, GuidanceText } from "tracerWeb/ui";

interface ChatConfirmCardProps {
  readonly threadId: ChatThreadId;
  readonly request: ChatConfirmRequest;
  readonly onResolved: (confirmationId: string, execution: ChatExecutionRecord | null) => void;
}

/** 쓰기 도구가 실행 대신 세운 승인 요청 하나이며, 확인 엔드포인트로 결정을 보내고 거절당한 결정을 이 자리에 알린다. */
export function ChatConfirmCard({ threadId, request, onResolved }: ChatConfirmCardProps) {
  const guidance = useGuidance();
  const confirmMutation = useConfirmToolMutation(threadId);

  const decide = (decision: "approve" | "reject") => {
    confirmMutation.mutate(
      { confirmationId: request.id, decision },
      { onSuccess: (response) => onResolved(request.id, response.execution) },
    );
  };

  return (
    <Card surface="canvas" className="self-center max-w-[85%]">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-warn">
        {request.toolName}
      </span>
      <p className="m-0 text-[12.5px] text-ink">{request.summary}</p>
      <GuidanceText
        as="p"
        className="m-0 text-[11px] text-ink-subtle"
        locale={guidance.locale}
        message={guidance.messages.chat.confirmDescription}
      />
      {/* 결정이 서지 않으면 대기 행이 그대로 남으므로 사유를 보이고 같은 자리에서 다시 묻는다. */}
      {confirmMutation.isError && (
        <p className="m-0 text-[11.5px] text-err" role="alert">
          {toErrorText(confirmMutation.error)}
        </p>
      )}
      <div className="flex items-center gap-2 mt-1">
        <Button
          variant="primary"
          onClick={() => decide("approve")}
          disabled={confirmMutation.isPending}
        >
          Approve
        </Button>
        <Button
          variant="ghost"
          onClick={() => decide("reject")}
          disabled={confirmMutation.isPending}
        >
          Reject
        </Button>
      </div>
    </Card>
  );
}

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : "Decision was not applied";
}
