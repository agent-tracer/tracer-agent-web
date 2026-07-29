import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiStoreProvider, createUiStore } from "tracerWeb/store";
import { DatasetEditor } from "./DatasetEditor.js";
import type * as HostEntities from "tracerWeb/entities";

const fetchExecutionExampleCandidate = vi.fn<(id: string) => Promise<unknown>>();
const fetchChatExecutionExampleCandidate = vi.fn<(id: string) => Promise<unknown>>();

vi.mock("~/entities/evaluation/api/api-evaluation.js", () => ({
  fetchExecutionExampleCandidate: (id: string) => fetchExecutionExampleCandidate(id),
  fetchChatExecutionExampleCandidate: (id: string) => fetchChatExecutionExampleCandidate(id),
  createDataset: vi.fn(),
  deleteDataset: vi.fn(),
  createExperiment: vi.fn(),
  createPrompt: vi.fn(),
  createPromptVersion: vi.fn(),
  registerCandidateFragmentVersion: vi.fn(),
  reviseDataset: vi.fn(),
  startExperiment: vi.fn(),
  cancelExperiment: vi.fn(),
}));
vi.mock("~/entities/evaluation/api/queries.js", () => ({
  useDatasetsQuery: () => ({ data: [], isLoading: false, isError: false }),
  useDatasetQuery: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("tracerWeb/entities", async (importActual) => {
  const actual = await importActual<typeof HostEntities>();
  return {
    ...actual,
    job: { ...actual.job, useJobsHistoryQuery: () => ({ data: { items: [] } }) },
  };
});
vi.mock("~/entities/chat/api/queries.js", () => ({
  useChatThreadsQuery: () => ({ data: { threads: [] } }),
  useChatExecutionsQuery: () => ({ data: { executions: [] } }),
}));

function renderEditor(props: Parameters<typeof DatasetEditor>[0] = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <UiStoreProvider store={createUiStore({ persisted: false })}>
        <DatasetEditor {...props} />
      </UiStoreProvider>
    </QueryClientProvider>,
  );
}

describe("DatasetEditor import entry points", () => {
  afterEach(cleanup);

  it("importJobId가 있으면 마운트 시 그 잡의 후보를 불러온다", async () => {
    fetchExecutionExampleCandidate.mockResolvedValue({
      sourceExecutionId: "job-1",
      agentName: "title-suggestion",
      input: { taskId: "t1" },
      evidence: { search_tasks: "result" },
      referenceOutput: null,
      suggestedDisclosureClass: "production-masked",
      excludedTruncatedTools: [],
    });
    renderEditor({ importJobId: "job-1" });
    await waitFor(() => expect(fetchExecutionExampleCandidate).toHaveBeenCalledWith("job-1"));
    expect(await screen.findByText(/Loaded title-suggestion execution\./)).toBeInTheDocument();
  });

  it("importChatExecutionId가 있으면 채팅 후보 API를 부른다", async () => {
    fetchChatExecutionExampleCandidate.mockResolvedValue({
      sourceExecutionId: "exec-1",
      agentName: "chat",
      input: { message: "hi" },
      evidence: {},
      referenceOutput: null,
      suggestedDisclosureClass: "production-masked",
      excludedTruncatedTools: [],
    });
    renderEditor({ importChatExecutionId: "exec-1" });
    await waitFor(() => expect(fetchChatExecutionExampleCandidate).toHaveBeenCalledWith("exec-1"));
  });
});
