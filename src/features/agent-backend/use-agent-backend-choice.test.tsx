import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as HostEntities from "tracerWeb/entities";
import {
  useAgentBackendChoice,
  type AgentBackendChoice,
} from "~/features/agent-backend/use-agent-backend-choice.js";

vi.mock("tracerWeb/entities", async (importActual) => {
  const actual = await importActual<typeof HostEntities>();
  return {
    ...actual,
    agentUpstream: {
      ...actual.agentUpstream,
      useAgentUpstreamsQuery: () => ({
        data: { upstreams: [{ name: "ts" }, { name: "python" }] },
      }),
    },
  };
});

function Probe({
  threadId,
  report,
}: {
  readonly threadId: string | null;
  readonly report: (choice: AgentBackendChoice) => void;
}) {
  report(useAgentBackendChoice(threadId));
  return null;
}

function mount(threadId: string | null) {
  const ref = { current: undefined as unknown as AgentBackendChoice };
  const view = render(
    <Probe
      threadId={threadId}
      report={(choice) => {
        ref.current = choice;
      }}
    />,
  );
  const open = (next: string | null) => {
    view.rerender(
      <Probe
        threadId={next}
        report={(choice) => {
          ref.current = choice;
        }}
      />,
    );
  };
  return { choice: ref, open };
}

afterEach(cleanup);

describe("useAgentBackendChoice", () => {
  it("아직 고르지 않은 대화는 첫 상류로 시작한다", () => {
    expect(mount("thread-1").choice.current.value).toBe("ts");
  });

  it("대화마다 고른 축을 따로 갖는다", () => {
    const { choice, open } = mount("thread-1");

    act(() => choice.current.select("python"));
    expect(choice.current.value).toBe("python");

    open("thread-2");
    expect(choice.current.value).toBe("ts");
  });

  it("대화를 오간 뒤 돌아와도 아까 고른 축이 그대로다", () => {
    const { choice, open } = mount("thread-1");

    act(() => choice.current.select("python"));
    open("thread-2");
    open("thread-1");

    expect(choice.current.value).toBe("python");
  });

  it("연 대화가 없으면 고르지 못한다", () => {
    const { choice } = mount(null);

    act(() => choice.current.select("python"));

    expect(choice.current.value).toBe("ts");
  });
});
