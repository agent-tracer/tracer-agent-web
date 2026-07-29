// 호스트가 연합으로 내보내는 표면의 대역이며 시험 실행에서만 쓰인다.

function unstubbed(name: string): never {
  throw new Error(`${name} was called without a stub`);
}

export const job = {
  JOB_KIND: {
    titleSuggestion: "title.suggestion",
    recipeScan: "recipe.scan",
    taskCleanup: "task.cleanup",
    ruleGeneration: "rule.generation",
  },
  JOB_STATUS: {
    pending: "pending",
    running: "running",
    completed: "completed",
    failed: "failed",
    canceled: "canceled",
  },
  JOB_STATUSES: ["pending", "running", "completed", "failed", "canceled"],
  isActiveJobStatus: (status?: string) => status === "pending" || status === "running",
  isCancelableJobStatus: (status?: string) => status === "pending" || status === "running",
  useJobsHistoryQuery: () => unstubbed("useJobsHistoryQuery"),
  useJobQuery: () => unstubbed("useJobQuery"),
  useJobStepsQuery: () => unstubbed("useJobStepsQuery"),
  useCancelJobMutation: () => unstubbed("useCancelJobMutation"),
} as const;

export const task = {
  useUpdateTaskMutation: () => unstubbed("useUpdateTaskMutation"),
} as const;

export const taskCleanup = {
  useTaskCleanupSuggestionsQuery: () => unstubbed("useTaskCleanupSuggestionsQuery"),
  useAcceptCleanupSuggestionMutation: () => unstubbed("useAcceptCleanupSuggestionMutation"),
  useDismissCleanupSuggestionMutation: () => unstubbed("useDismissCleanupSuggestionMutation"),
} as const;
