import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { task } from "tracerWeb/entities";
import { TaskId } from "~/entities/task/model/task-id.js";

const { fetchTaskDetail } = task;

/** 제목은 화면을 세우는 값이 아니라 식별자에 붙이는 이름이므로 자주 다시 묻지 않는다. */
const TASK_TITLE_STALE_MS = 60_000;

/** 이 조회는 제목 하나만 남기므로 호스트의 태스크 상세 캐시와 자리를 나눠 쓴다. */
export function taskTitleQueryKey(taskId: string): readonly unknown[] {
  return ["tracer-agent-web", "task-title", taskId];
}

/** 원본 식별자 대신 부를 이름이며, 부를 이름이 없으면 null 로 남아 식별자가 그대로 보인다. */
export function useTaskTitleQuery(taskId: string | null): UseQueryResult<string | null> {
  return useQuery({
    queryKey: taskTitleQueryKey(taskId ?? "__disabled__"),
    queryFn: async () => {
      if (taskId === null) throw new Error("useTaskTitleQuery called without a taskId");
      const detail = await fetchTaskDetail(TaskId(taskId));
      return taskDisplayTitle(detail.task);
    },
    enabled: taskId !== null,
    staleTime: TASK_TITLE_STALE_MS,
    // 제목을 못 읽어도 승인 자체는 막히지 않아야 하므로 다시 묻지 않고 식별자로 물러선다.
    retry: false,
  });
}

/** 붙여 보일 이름을 고르며, 비어 있으면 이름이 없는 것으로 본다. */
export function taskDisplayTitle(
  record: { readonly title: string; readonly displayTitle?: string },
): string | null {
  const shown = (record.displayTitle ?? record.title).trim();
  return shown.length === 0 ? null : shown;
}
