import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiStoreProvider, createUiStore } from "tracerWeb/store";
import type * as HostEntities from "tracerWeb/entities";
import type { PromptFragmentBinding, VariantInput } from "~/entities/evaluation/model/evaluation.js";
import { VariantForm } from "./VariantForm.js";

vi.mock("tracerWeb/entities", async (importActual) => {
  const actual = await importActual<typeof HostEntities>();
  return {
    ...actual,
    agentUpstream: {
      ...actual.agentUpstream,
      useAgentUpstreamsQuery: () => ({
        data: { upstreams: [{ name: "claude-sdk" }, { name: "python" }] },
      }),
    },
  };
});

const fragment: PromptFragmentBinding = {
  templateKey: "sdk.task-cleanup.investigator.system",
  fragmentSlot: "suggestionRules",
  definitionKey: "sdk.task-cleanup.suggestion-rules.en",
  codeName: "SDK_SUGGESTION_RULES",
  agentName: "task-cleanup",
  backend: "claude-sdk",
  language: "en",
  fragmentName: "suggestionRules",
  codeDefaultVersion: "v1",
  codeDefaultHash: "a".repeat(64),
  versions: [{
    id: "version-v2",
    semanticVersion: "v2",
    contentHash: "b".repeat(64),
    toolContractVersion: "tools/v1",
    outputSchemaVersion: "output/v1",
    integrity: "matched",
  }],
};
const value: VariantInput = {
  name: "candidate",
  agentName: "task-cleanup",
  backend: "claude-sdk",
  model: "model",
  promptVersionId: "",
  toolContractVersion: "tools/v1",
  baseline: false,
};

function renderForm(input: VariantInput = value, onChange = vi.fn()) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <UiStoreProvider store={createUiStore({ persisted: false })}>
        <VariantForm value={input} onChange={onChange} fragments={[fragment]} fragmentsLoading={false} fragmentsError={false} promptDefinitions={[]} />
      </UiStoreProvider>
    </QueryClientProvider>,
  );
}

describe("VariantForm fragment selectors", () => {
  afterEach(cleanup);
  it("baseline은 선택 없이 코드 기본값을 사용한다", () => {
    renderForm({ ...value, name: "baseline", baseline: true });
    expect(screen.getByRole("option", { name: /Code default · v1/ })).toHaveProperty("selected", true);
    expect(screen.getByRole("combobox", { name: "SDK_SUGGESTION_RULES version" })).toBeDisabled();
  });
  it("fragment 하나의 재정의를 기록하고 해시를 표시한다", () => {
    const onChange = vi.fn();
    renderForm(value, onChange);
    fireEvent.change(screen.getByRole("combobox", { name: "SDK_SUGGESTION_RULES version" }), { target: { value: "version-v2" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fragmentSelections: { "sdk.task-cleanup.investigator.system/suggestionRules": "version-v2" } }));
    expect(screen.getByText(new RegExp(`b{10}`))).toBeInTheDocument();
  });
  it("배포가 선언한 상류 이름을 그대로 고를 이름으로 낸다", () => {
    renderForm();
    const control = screen.getByRole("combobox", { name: "Backend" });
    expect([...control.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "claude-sdk",
      "python",
    ]);
  });
  it("조각이 올라온 상류의 이름을 그대로 표시한다", () => {
    renderForm();
    expect(screen.getByText("claude-sdk · suggestionRules")).toBeInTheDocument();
  });
  it("고른 상류 이름을 그대로 넘긴다", () => {
    const onChange = vi.fn();
    renderForm(value, onChange);
    fireEvent.change(screen.getByRole("combobox", { name: "Backend" }), { target: { value: "python" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ backend: "python" }));
  });
  it("다른 백엔드의 fragment를 표시하지 않는다", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <UiStoreProvider store={createUiStore({ persisted: false })}>
          <VariantForm value={{ ...value, backend: "python" }} onChange={vi.fn()} fragments={[fragment]} fragmentsLoading={false} fragmentsError={false} promptDefinitions={[]} />
        </UiStoreProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText("evaluation.fragmentEmpty")).toBeInTheDocument();
    expect(screen.queryByText("SDK_SUGGESTION_RULES")).not.toBeInTheDocument();
  });
});
