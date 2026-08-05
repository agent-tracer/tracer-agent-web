import type { ChatExecutionRecord, ChatThreadId } from "~/entities/chat/model/chat.js";
import type { ChatConfirmRequest } from "~/entities/chat/model/chat-turn.js";
import { useConfirmToolMutation } from "~/entities/chat/api/mutations.js";
import { useTaskTitleQuery } from "~/entities/task/api/task-title.js";
import { useGuidance } from "tracerWeb/store";
import { Button, Card, GuidanceText } from "tracerWeb/ui";
import { cn } from "~/widgets/chat/lib/cn.js";
import { describeConfirmRequest, type ConfirmField } from "~/widgets/chat/lib/confirm-view.js";

/** 인자가 태스크를 가리키는 자리이며, 식별자 대신 그 태스크의 이름을 붙여 보인다. */
const TASK_FIELD_KEY = "taskId";

interface ChatConfirmCardProps {
  readonly threadId: ChatThreadId;
  readonly request: ChatConfirmRequest;
  readonly onResolved: (confirmationId: string, execution: ChatExecutionRecord | null) => void;
}

/** 쓰기 도구가 실행 대신 세운 승인 요청 하나이며, 확인 엔드포인트로 결정을 보내고 거절당한 결정을 이 자리에 알린다. */
export function ChatConfirmCard({ threadId, request, onResolved }: ChatConfirmCardProps) {
  const guidance = useGuidance();
  const confirmMutation = useConfirmToolMutation(threadId);
  const view = describeConfirmRequest(request.toolName, request.args);
  const taskTitle = useTaskTitleQuery(readTaskId(request.args));

  const decide = (decision: "approve" | "reject") => {
    confirmMutation.mutate(
      { confirmationId: request.id, decision },
      { onSuccess: (response) => onResolved(request.id, response.execution) },
    );
  };

  return (
    <Card surface="canvas" title={request.toolName} className="self-center w-full max-w-[85%]">
      <p className="m-0 text-[13px] font-semibold text-ink">{view.title}</p>
      {view.fields.length > 0 && (
        <dl className="m-0 flex flex-col gap-1.5">
          {view.fields.map((field) => (
            <FieldRow
              key={field.key}
              field={field}
              name={field.key === TASK_FIELD_KEY ? (taskTitle.data ?? null) : null}
            />
          ))}
        </dl>
      )}
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
      {/* 가공한 줄이 무엇을 줄였는지 물을 자리를 남겨, 모델이 낸 인자 원본을 그대로 둔다. */}
      <details className="mt-0.5">
        <summary className="cursor-pointer select-none text-[11px] text-ink-tertiary">
          Raw request
        </summary>
        <pre className="m-0 mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-ink-subtle">
          {request.summary}
        </pre>
      </details>
    </Card>
  );
}

function FieldRow({
  field,
  name,
}: {
  readonly field: ConfirmField;
  readonly name: string | null;
}) {
  return (
    <div className={cn("gap-2", field.block ? "flex flex-col gap-1" : "flex items-baseline")}>
      <dt className="shrink-0 min-w-[72px] text-[11px] text-ink-tertiary">{field.label}</dt>
      <dd
        className={cn(
          "m-0 min-w-0 break-words text-ink",
          field.block
            ? "max-h-40 overflow-auto whitespace-pre-wrap rounded-xs border border-hair bg-s1 px-2 py-1.5 text-[12px]"
            : "font-mono text-[12px]",
        )}
      >
        {/* 이름을 읽어 왔으면 그것이 사용자가 아는 값이고, 식별자는 그 아래에서 확인용으로 남는다. */}
        {name === null ? (
          field.value
        ) : (
          <>
            <span className="font-sans text-[12.5px]">{name}</span>
            <span className="block text-[11px] text-ink-tertiary">{field.value}</span>
          </>
        )}
      </dd>
    </div>
  );
}

/** 인자가 실은 태스크 식별자이며, 문자열이 아니면 붙일 이름을 묻지 않는다. */
function readTaskId(args: Record<string, unknown>): string | null {
  const value = args[TASK_FIELD_KEY];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toErrorText(error: unknown): string {
  return error instanceof Error ? error.message : "Decision was not applied";
}
