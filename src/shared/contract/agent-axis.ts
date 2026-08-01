/** 실행 하나를 태운 구현체를 가리키는 축이며 에이전트 서비스 계약이 그 이름을 정한다. */
export const AGENT_AXES = ["ts", "python"] as const;

export type AgentAxis = (typeof AGENT_AXES)[number];
