import { useState } from "react";
import { useChatExecutionsQuery, useChatThreadsQuery } from "~/entities/chat/api/queries.js";
import type { ChatThreadId } from "~/entities/chat/model/chat.js";
import type { ExecutionExampleCandidate } from "~/entities/evaluation/model/evaluation.js";
import { fetchChatExecutionExampleCandidate, fetchExecutionExampleCandidate } from "~/entities/evaluation/api/api-evaluation.js";
import { EVALUABLE_JOB_KINDS } from "../lib/evaluable-jobs.js";
import { job } from "tracerWeb/entities";

const { JOB_STATUS, useJobsHistoryQuery } = job;

export function ExecutionImportPanel({ onLoad, onError }: { onLoad: (candidate: ExecutionExampleCandidate) => void; onError: (error: unknown) => void }) {
  const jobs = useJobsHistoryQuery({ status: JOB_STATUS.completed, limit: 50 });
  const threads = useChatThreadsQuery();
  const [threadId, setThreadId] = useState<ChatThreadId | null>(null);
  const chats = useChatExecutionsQuery(threadId);
  const evaluableKinds = EVALUABLE_JOB_KINDS;
  const load = async (kind: "job" | "chat", id: string) => {
    try { onLoad(kind === "job" ? await fetchExecutionExampleCandidate(id) : await fetchChatExecutionExampleCandidate(id)); }
    catch (error) { onError(error); }
  };
  return (
    <div className="rounded-sm border border-hair bg-s1 p-4">
      <h3 className="text-sm font-semibold">Import a completed execution</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div><h4 className="text-xs font-medium">Agent jobs</h4><div className="mt-2 grid max-h-40 gap-1 overflow-auto">{jobs.data?.items.filter((job) => evaluableKinds.has(job.kind)).map((job) => <button key={job.id} type="button" onClick={() => void load("job", job.id)} className="rounded-xs border border-hair bg-canvas p-2 text-left text-xs">{job.kind} · {job.completedAt}</button>)}</div>{jobs.data?.items.filter((job) => evaluableKinds.has(job.kind)).length === 0 && <p className="mt-2 text-xs text-ink-muted">No completed evaluable jobs.</p>}</div>
        <div><h4 className="text-xs font-medium">Chat executions</h4><div className="mt-2 flex flex-wrap gap-1">{threads.data?.threads.map((thread) => <button key={thread.id} type="button" aria-pressed={threadId === thread.id} onClick={() => setThreadId(thread.id)} className="rounded-pill border border-hair px-2 py-1 text-xs">{thread.title}</button>)}</div>{threadId && <div className="mt-2 grid max-h-40 gap-1 overflow-auto">{chats.data?.executions.filter((row) => row.status === "completed").map((row) => <button key={row.id} type="button" onClick={() => void load("chat", row.id)} className="rounded-xs border border-hair bg-canvas p-2 text-left text-xs">{row.modelUsed ?? row.requestedBackend ?? "chat"} · {row.completedAt}</button>)}</div>}{threads.data?.threads.length === 0 && <p className="mt-2 text-xs text-ink-muted">No chat threads.</p>}</div>
      </div>
    </div>
  );
}
