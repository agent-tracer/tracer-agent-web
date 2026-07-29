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
