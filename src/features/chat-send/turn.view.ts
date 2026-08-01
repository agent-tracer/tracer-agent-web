import type { ChatExecutionRecord, ChatStopReason } from "~/entities/chat/model/chat.js";

/** 어시스턴트 메시지 하나에 붙는, 그 턴이 실제로 어떻게 끝났는지다. */
export interface CompletedTurnProcess {
  readonly assistantMessageId: string;
  readonly transcript: string;
  readonly stopReason: ChatStopReason | null;
}

export function isTerminal(execution: ChatExecutionRecord): boolean {
  return (
    execution.status === "completed" ||
    execution.status === "failed" ||
    execution.status === "canceled"
  );
}

/** 실행 하나가 지금까지 내보낸 가장 긴 초안의 길이다. */
export interface DraftHighWater {
  readonly executionId: string;
  readonly longestLength: number;
}

export function advanceDraftHighWater(
  previous: DraftHighWater | null,
  execution: ChatExecutionRecord,
): DraftHighWater {
  const length = execution.draftText.length;
  const continued = previous !== null && previous.executionId === execution.id;
  return {
    executionId: execution.id,
    longestLength: continued ? Math.max(previous.longestLength, length) : length,
  };
}

/** 재시도가 초안을 처음부터 다시 쓰는 동안이며 고점을 되찾을 때까지 이어진다. */
export function isRewritingDraft(
  highWater: DraftHighWater,
  execution: ChatExecutionRecord,
): boolean {
  return (
    highWater.executionId === execution.id &&
    !isTerminal(execution) &&
    execution.draftText.length < highWater.longestLength
  );
}

/** 끝난 실행을 그 턴의 어시스턴트 메시지에 붙일 진행 기록으로 옮긴다. */
export function completedTurnProcesses(
  executions: readonly ChatExecutionRecord[],
): readonly CompletedTurnProcess[] {
  return executions.flatMap((execution) =>
    execution.status === "completed" && execution.assistantMessageId !== null
      ? [{
          assistantMessageId: execution.assistantMessageId,
          transcript: execution.draftText,
          stopReason: execution.stopReason,
        }]
      : [],
  );
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
