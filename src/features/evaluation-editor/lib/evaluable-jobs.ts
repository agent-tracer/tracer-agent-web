import { job } from "tracerWeb/entities";

const { JOB_KIND } = job;
type JobKind = job.JobKind;

/** 완료된 실행을 평가 예제 후보로 미리보기 API가 지원하는 잡 종류다. */
export const EVALUABLE_JOB_KINDS: ReadonlySet<JobKind> = new Set([
  JOB_KIND.titleSuggestion,
  JOB_KIND.recipeScan,
  JOB_KIND.taskCleanup,
]);

/** 잡 결과 화면에서 평가 워크스페이스로 넘어가 해당 실행을 곧바로 불러오는 링크다. */
export function evaluationImportJobHref(jobId: string): string {
  return `/evaluation?tab=datasets&importJob=${encodeURIComponent(jobId)}`;
}

/** 대화 실행 하나를 평가 워크스페이스로 넘겨 곧바로 불러오는 링크다. */
export function evaluationImportChatExecutionHref(executionId: string): string {
  return `/evaluation?tab=datasets&importChatExecution=${encodeURIComponent(executionId)}`;
}
