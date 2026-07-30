import { useState } from "react";
import { agentUpstream } from "tracerWeb/entities";

export interface AgentBackendChoice {
  /** 상류가 하나 이하이면 null 이고 그때는 요청이 축을 지목하지 않는다. */
  readonly value: string | null;
  readonly select: (backend: string) => void;
}

/** 대화마다 자기 선택을 가지므로 대화를 오가도 각자 고른 축이 그대로 보인다. */
export function useAgentBackendChoice(threadId: string | null): AgentBackendChoice {
  const { data } = agentUpstream.useAgentUpstreamsQuery();
  const [chosenByThread, setChosenByThread] = useState<Readonly<Record<string, string>>>({});
  const chosen = threadId === null ? null : chosenByThread[threadId] ?? null;

  return {
    value: agentUpstream.resolveAgentBackend(
      data ?? agentUpstream.EMPTY_AGENT_UPSTREAM_CATALOG,
      chosen,
    ),
    select: (backend) => {
      if (threadId === null) return;
      setChosenByThread((current) => ({ ...current, [threadId]: backend }));
    },
  };
}
