import { Link } from "react-router-dom";
import { useChatExecutionsQuery } from "~/entities/chat/api/queries.js";
import type { ChatThreadId } from "~/entities/chat/model/chat.js";
import { evaluationImportChatExecutionHref } from "../lib/evaluable-jobs.js";

/** 이 스레드의 가장 최근 완료 실행을 평가 워크스페이스로 넘기는 진입점이다. */
export function AddChatExecutionLink({ threadId }: { readonly threadId: ChatThreadId }) {
  const executions = useChatExecutionsQuery(threadId);
  const latestCompleted = executions.data?.executions
    .filter((row) => row.status === "completed")
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

  if (!latestCompleted) return null;

  return (
    <Link
      className="text-[11.5px] text-[var(--primary-hover)] underline whitespace-nowrap"
      to={evaluationImportChatExecutionHref(latestCompleted.id)}
    >
      Add as evaluation example
    </Link>
  );
}
