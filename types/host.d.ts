// 연합 호스트가 내보내는 다섯 표면의 타입이며 실제로 쓰는 것만 적는다.

declare module "tracerWeb/guidance" {
  export type GuidanceLocale = "en" | "ko";

  /** 카탈로그 메시지는 React 노드가 아니며 GuidanceText만 이것을 렌더링한다. */
  export interface GuidanceMessage {
    readonly __guidanceMessage: unique symbol;
  }

  export interface ChatGuidance {
    readonly workspaceIntroduction: GuidanceMessage;
    readonly loadError: GuidanceMessage;
    readonly threadsEmpty: GuidanceMessage;
    readonly conversationEmpty: GuidanceMessage;
    readonly selectThread: GuidanceMessage;
    readonly streamError: GuidanceMessage;
    readonly confirmDescription: GuidanceMessage;
    readonly deleteConfirm: GuidanceMessage;
    readonly clickToRename: GuidanceMessage;
    readonly stoppedByDeadline: GuidanceMessage;
    readonly stoppedByStall: GuidanceMessage;
    readonly stoppedByBudget: GuidanceMessage;
    readonly stoppedByTurnLimit: GuidanceMessage;
    readonly stoppedByFailure: GuidanceMessage;
    readonly thinking: GuidanceMessage;
    readonly queuedToSend: GuidanceMessage;
  }

  export interface JobsGuidance {
    readonly introduction: GuidanceMessage;
    readonly resetFilters: GuidanceMessage;
    readonly cancel: GuidanceMessage;
    readonly trajectoryIntroduction: GuidanceMessage;
    readonly trajectoryAttempt: GuidanceMessage;
    readonly rawDataIntroduction: GuidanceMessage;
    readonly noTargetTask: GuidanceMessage;
    readonly noTitleSuggestions: GuidanceMessage;
    readonly loadingCleanupSuggestions: GuidanceMessage;
    readonly noCleanupSuggestions: GuidanceMessage;
    readonly trajectoryAfterCompletion: GuidanceMessage;
    readonly loadingTrajectory: GuidanceMessage;
    readonly trajectoryUnavailable: GuidanceMessage;
    readonly noTrajectory: GuidanceMessage;
  }

  export interface GuidanceCatalog {
    readonly chat: ChatGuidance;
    readonly jobs: JobsGuidance;
  }

  export interface GuidanceBundle {
    readonly locale: GuidanceLocale;
    readonly messages: GuidanceCatalog;
  }
}

declare module "tracerWeb/store" {
  import type { ReactNode } from "react";
  import type { GuidanceBundle, GuidanceLocale } from "tracerWeb/guidance";

  /** 화면 상태 스토어 중 이 저장소가 읽고 쓰는 조각이다. */
  export interface GuidanceLocaleSlice {
    readonly guidanceLocale: GuidanceLocale;
    readonly setGuidanceLocale: (locale: GuidanceLocale) => void;
  }

  export interface UiStoreApi {
    getState: () => GuidanceLocaleSlice;
    subscribe: (listener: () => void) => () => void;
  }

  export function createUiStore(options?: { readonly persisted?: boolean }): UiStoreApi;

  export function UiStoreProvider(props: {
    readonly store: UiStoreApi;
    readonly children: ReactNode;
  }): ReactNode;

  export function useGuidance(): GuidanceBundle;
}

declare module "tracerWeb/api" {
  export interface RequestOptions {
    readonly signal?: AbortSignal;
    /** 이 요청만 보낼 상류이며 지목하지 않으면 선언의 첫 상류로 간다. */
    readonly backend?: string;
  }

  export function getJson<T>(pathname: string, options?: RequestOptions): Promise<T>;
  export function postJson<T>(pathname: string, body?: unknown, options?: RequestOptions): Promise<T>;
  export function patchJson<T>(pathname: string, body: unknown, options?: RequestOptions): Promise<T>;
  export function deleteRequest<T>(pathname: string, options?: RequestOptions): Promise<T>;

  export function createResponseError(
    response: Response,
    pathname: string,
    method: string,
  ): Promise<Error>;

  /** 요청 층을 거치지 않고 URL을 직접 만드는 자리가 같은 축을 싣는 통로다. */
  export function routeToAgentBackend(pathname: string, options?: RequestOptions): string;

  /** 상류 목록을 읽어 축이 정해졌는지 알리며 그전의 조회는 축 없이 나간다. */
  export function useAgentBackendSettled(): boolean;

  export function getMonitorApiBaseUrl(): string;
  export function getUserId(): string | null;

  export const monitorQueryKeys: {
    readonly chatThreads: () => readonly unknown[];
    readonly chatThreadsPrefix: () => readonly unknown[];
    readonly chatMessages: (threadId: string) => readonly unknown[];
    readonly chatExecutions: (threadId: string) => readonly unknown[];
  };
}

declare module "tracerWeb/ui" {
  import type { ComponentPropsWithoutRef, ReactNode } from "react";
  import type { GuidanceLocale, GuidanceMessage } from "tracerWeb/guidance";

  export type StatusKind = "running" | "waiting" | "done" | "failed" | "idle" | "canceled";

  export function Badge(
    props: ComponentPropsWithoutRef<"span"> & {
      readonly variant?: "neutral" | "viol" | "appr" | "upd" | "runtime";
    },
  ): ReactNode;

  export function Pill(
    props: ComponentPropsWithoutRef<"span"> & {
      readonly tone?: "neutral" | "ok" | "warn" | "err" | "primary";
      readonly dot?: boolean;
      readonly pulse?: boolean;
    },
  ): ReactNode;

  export function StatusDot(
    props: {
      readonly status: StatusKind;
      readonly className?: string;
      readonly pulse?: boolean;
      readonly detail?: string;
    } & (
      | { readonly tooltipContent: ReactNode; readonly tooltip?: true }
      | { readonly tooltip: false; readonly tooltipContent?: never }
    ),
  ): ReactNode;

  export function Button(
    props: ComponentPropsWithoutRef<"button"> & {
      readonly variant?: "primary" | "solid" | "ghost";
    },
  ): ReactNode;

  export function IconButton(
    props: ComponentPropsWithoutRef<"button"> & {
      readonly tone?: "neutral" | "danger";
      readonly armed?: boolean;
    },
  ): ReactNode;

  export function Input(props: ComponentPropsWithoutRef<"input">): ReactNode;

  export function Select(props: ComponentPropsWithoutRef<"select">): ReactNode;

  export function Card(props: {
    readonly title?: string;
    readonly count?: number;
    readonly surface?: "canvas" | "s1";
    readonly className?: string;
    readonly children: ReactNode;
  }): ReactNode;

  export function SectionLabel(props: {
    readonly className?: string;
    readonly children: ReactNode;
  }): ReactNode;

  export function EmptyHint(props: { readonly children: ReactNode }): ReactNode;

  export function EmptyView(props: {
    readonly eyebrow?: string;
    readonly title: string;
    readonly description?: GuidanceMessage;
    readonly locale?: GuidanceLocale;
    readonly action?: ReactNode;
  }): ReactNode;

  export function GuidanceText(props: {
    readonly locale: GuidanceLocale;
    readonly message: GuidanceMessage;
    readonly as?: "div" | "p" | "span";
    readonly className?: string;
  }): ReactNode;

  export function Modal(
    props: {
      readonly open: boolean;
      readonly onClose: () => void;
      readonly title: string;
      readonly children: ReactNode;
      readonly maxWidth?: number;
    } & (
      | { readonly description: GuidanceMessage; readonly descriptionLocale: GuidanceLocale }
      | { readonly description?: never; readonly descriptionLocale?: never }
    ),
  ): ReactNode;

  export function ScrollArea(
    props: ComponentPropsWithoutRef<"div"> & {
      readonly viewportRef?: React.Ref<HTMLDivElement>;
      readonly onViewportScroll?: React.UIEventHandler<HTMLDivElement>;
    },
  ): ReactNode;

  export function Tooltip(props: {
    readonly children: ReactNode;
    readonly content: ReactNode;
    readonly side?: "top" | "right" | "bottom" | "left";
    readonly delayMs?: number;
  }): ReactNode;

  export function TooltipProvider(props: {
    readonly children: ReactNode;
    readonly delayDuration?: number;
  }): ReactNode;

  export function Tabs(
    props: ComponentPropsWithoutRef<"div"> & {
      readonly defaultValue?: string;
      readonly value?: string;
      readonly onValueChange?: (value: string) => void;
    },
  ): ReactNode;

  export function TabsList(props: ComponentPropsWithoutRef<"div">): ReactNode;

  export function TabsTrigger(
    props: ComponentPropsWithoutRef<"button"> & { readonly value: string },
  ): ReactNode;

  export function TabsContent(
    props: ComponentPropsWithoutRef<"div"> & { readonly value: string },
  ): ReactNode;

  /** 글리프는 크기와 색만 받으며 나머지는 부르는 자리의 버튼이 정한다. */
  export interface IconProps {
    readonly size?: number;
    readonly className?: string;
  }

  export function PencilSimpleIcon(): ReactNode;
  export function TrashIcon(): ReactNode;
  export function CopyIcon(props?: IconProps): ReactNode;
  export function CheckIcon(props?: IconProps): ReactNode;
}

declare module "tracerWeb/entities" {
  import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

  export namespace job {
    type JobKind = "title.suggestion" | "recipe.scan" | "task.cleanup" | "rule.generation";
    type JobStatus = "pending" | "running" | "completed" | "failed" | "canceled";
    type JobExecutor = "temporal" | "local";

    interface JobDto {
      readonly id: string;
      readonly userId: string;
      readonly kind: JobKind;
      readonly executor: JobExecutor;
      readonly status: JobStatus;
      readonly attempts: number;
      readonly taskId: string | null;
      readonly input: Record<string, unknown>;
      readonly result: Record<string, unknown>;
      readonly usage: Record<string, unknown>;
      readonly error: string | null;
      readonly createdAt: string;
      readonly updatedAt: string;
      readonly startedAt: string | null;
      readonly completedAt: string | null;
    }

    interface JobListDto {
      readonly items: readonly JobDto[];
      readonly total: number;
    }

    type AiJobStepRole = "system" | "user" | "assistant" | "tool" | "graph";

    type AiJobStepEventKind =
      | "node.started"
      | "node.completed"
      | "node.failed"
      | "route.selected"
      | "validation.failed";

    interface AiJobStepToolCall {
      readonly id: string;
      readonly name: string;
      readonly args: Record<string, unknown>;
    }

    interface AiJobRecordedStep {
      readonly seq: number;
      readonly attempt: number;
      readonly role: AiJobStepRole;
      readonly content: string;
      readonly truncated: boolean;
      readonly toolCalls: readonly AiJobStepToolCall[];
      readonly toolName?: string | undefined;
      readonly toolCallId?: string | undefined;
      readonly inputTokens?: number | undefined;
      readonly outputTokens?: number | undefined;
      readonly stopReason?: string | undefined;
      readonly nodeName?: string | undefined;
      readonly eventKind?: AiJobStepEventKind | undefined;
      readonly durationMs?: number | undefined;
    }

    type AiJobStepList = readonly AiJobRecordedStep[];

    const JOB_KIND: {
      readonly titleSuggestion: "title.suggestion";
      readonly recipeScan: "recipe.scan";
      readonly taskCleanup: "task.cleanup";
      readonly ruleGeneration: "rule.generation";
    };

    const JOB_STATUS: {
      readonly pending: "pending";
      readonly running: "running";
      readonly completed: "completed";
      readonly failed: "failed";
      readonly canceled: "canceled";
    };

    const JOB_STATUSES: readonly JobStatus[];

    function isActiveJobStatus(status: JobStatus | undefined): boolean;
    function isCancelableJobStatus(status: JobStatus | undefined): boolean;

    interface JobHistoryFilters {
      readonly kind?: JobKind;
      readonly status?: JobStatus;
      readonly limit?: number;
      readonly offset?: number;
    }

    function useJobsHistoryQuery(filters?: JobHistoryFilters): UseQueryResult<JobListDto>;
    function useJobQuery(jobId: string | null): UseQueryResult<{ readonly job: JobDto }>;
    function useJobStepsQuery(jobId: string | null): UseQueryResult<AiJobStepList>;
    function useCancelJobMutation(): UseMutationResult<JobDto, Error, Pick<JobDto, "id">>;
  }

  export namespace agentUpstream {
    interface AgentUpstream {
      readonly name: string;
    }

    interface AgentUpstreamCatalog {
      readonly upstreams: readonly AgentUpstream[];
    }

    const EMPTY_AGENT_UPSTREAM_CATALOG: AgentUpstreamCatalog;

    function requiresAgentBackendChoice(catalog: AgentUpstreamCatalog): boolean;
    function resolveAgentBackend(
      catalog: AgentUpstreamCatalog,
      selected: string | null,
    ): string | null;
    function useAgentUpstreamsQuery(): UseQueryResult<AgentUpstreamCatalog>;
  }

  export namespace task {
    type TaskId = string & { readonly __brand: "TaskId" };

    /** 추적 원장이 소유하는 태스크이며 이 저장소는 부를 이름만 읽는다. */
    interface MonitoringTask {
      readonly id: TaskId;
      readonly title: string;
      readonly displayTitle?: string;
    }

    interface TaskDetailResponse {
      readonly task: MonitoringTask;
    }

    function fetchTaskDetail(taskId: TaskId): Promise<TaskDetailResponse>;

    interface UpdateTaskInput {
      readonly title?: string;
    }

    function useUpdateTaskMutation(): UseMutationResult<
      unknown,
      Error,
      { readonly taskId: TaskId; readonly body: UpdateTaskInput }
    >;
  }

  export namespace taskCleanup {
    type CleanupSuggestionKind = "archive";
    type CleanupSuggestionStatus = "pending" | "accepted" | "dismissed" | "failed";

    interface CleanupSuggestion {
      readonly id: string;
      readonly jobId: string;
      readonly taskId: task.TaskId;
      readonly kind: CleanupSuggestionKind;
      readonly currentValue: unknown;
      readonly proposedValue: unknown;
      readonly rationale: string;
      readonly status: CleanupSuggestionStatus;
      readonly error?: string;
      readonly createdAt: string;
      readonly resolvedAt?: string;
    }

    interface CleanupSuggestionsResponse {
      readonly suggestions: readonly CleanupSuggestion[];
    }

    function useTaskCleanupSuggestionsQuery(
      status?: "pending" | "all",
    ): UseQueryResult<CleanupSuggestionsResponse>;

    function useAcceptCleanupSuggestionMutation(): UseMutationResult<unknown, Error, string>;
    function useDismissCleanupSuggestionMutation(): UseMutationResult<unknown, Error, string>;
  }
}
