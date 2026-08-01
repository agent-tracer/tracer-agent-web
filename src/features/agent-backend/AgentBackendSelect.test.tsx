import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as HostEntities from "tracerWeb/entities";
import { AgentBackendSelect } from "~/features/agent-backend/AgentBackendSelect.js";

const { catalog } = vi.hoisted(() => ({
  catalog: { current: { upstreams: [] as readonly { readonly name: string }[] } },
}));

vi.mock("tracerWeb/entities", async (importActual) => {
  const actual = await importActual<typeof HostEntities>();
  return {
    ...actual,
    agentUpstream: {
      ...actual.agentUpstream,
      useAgentUpstreamsQuery: () => ({ data: catalog.current }),
    },
  };
});

function declare(...names: readonly string[]) {
  catalog.current = { upstreams: names.map((name) => ({ name })) };
}

afterEach(cleanup);

describe("AgentBackendSelect", () => {
  it("축이 하나뿐인 배포에서는 보이지 않는다", () => {
    declare("ts");

    render(<AgentBackendSelect value={null} onChange={vi.fn()} />);

    expect(screen.queryByLabelText("Agent backend")).not.toBeInTheDocument();
  });

  it("축이 둘인 배포에서는 배포가 선언한 이름 둘을 선택지로 세운다", () => {
    declare("ts", "python");

    render(<AgentBackendSelect value="python" onChange={vi.fn()} />);

    const select = screen.getByLabelText("Agent backend");
    expect(select).toHaveValue("python");
    expect([...select.querySelectorAll("option")].map((option) => option.value)).toEqual([
      "ts",
      "python",
    ]);
  });
});
