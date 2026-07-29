import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EvaluationPage } from "./EvaluationPage.js";
import { createUiStore, UiStoreProvider } from "tracerWeb/store";

vi.mock("~/features/evaluation-editor/ui/DatasetEditor.js", () => ({
  DatasetEditor: () => <div>dataset panel</div>,
}));
vi.mock("~/features/evaluation-editor/ui/PromptEditor.js", () => ({
  PromptEditor: () => <div>prompt panel</div>,
}));
vi.mock("~/features/evaluation-editor/ui/ExperimentEditor.js", () => ({
  ExperimentEditor: () => <div>experiment panel</div>,
}));

describe("EvaluationPage", () => {
  afterEach(cleanup);
  const renderPage = (initialEntry = "/evaluation") =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <UiStoreProvider store={createUiStore({ persisted: false })}>
          <EvaluationPage />
        </UiStoreProvider>
      </MemoryRouter>,
    );
  it("화살표 키로 탭을 이동하고 선택 탭에 초점을 둔다", () => {
    renderPage();
    const datasets = screen.getByRole("tab", { name: "datasets" });
    datasets.focus();
    fireEvent.keyDown(datasets, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "prompts" })).toHaveFocus();
    expect(screen.getByText("prompt panel")).toBeInTheDocument();
  });

  it("잡 실행 가져오기 진입점이 요청한 탭과 상관없이 datasets 탭을 연다", () => {
    renderPage("/evaluation?tab=prompts&importJob=job-1");
    expect(screen.getByText("dataset panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "datasets", selected: true })).toBeInTheDocument();
  });

});
