import { useState, type FormEvent } from "react";
import { agentUpstream } from "tracerWeb/entities";
import { useDatasetsQuery, useExperimentWorkspaceQuery, useExperimentsQuery, usePromptFragmentsQuery, usePromptsQuery } from "~/entities/evaluation/api/queries.js";
import { useEvaluationMutations } from "~/entities/evaluation/api/mutations.js";
import type { ExperimentDetail, VariantInput } from "~/entities/evaluation/model/evaluation.js";
import { errorMessage } from "../lib/json.js";
import { readRecentExperiments } from "../lib/recent-experiments.js";
import { ExperimentRun } from "./ExperimentRun.js";
import { Field, VariantForm } from "./VariantForm.js";

/** 초안의 두 변형은 배포가 첫째로 선언한 상류에서 출발한다. */
function draftVariants(backend: string): readonly VariantInput[] {
  const shared = {
    agentName: "title-suggestion",
    backend,
    model: "default",
    promptVersionId: "",
    toolContractVersion: "1",
    limits: { maxCostUsd: 0.1 },
  };
  return [
    { ...shared, name: "baseline", baseline: true },
    { ...shared, name: "candidate", baseline: false },
  ];
}

export function ExperimentEditor() {
  const datasets = useDatasetsQuery();
  const fragments = usePromptFragmentsQuery();
  const prompts = usePromptsQuery();
  const mutations = useEvaluationMutations();
  const experiments = useExperimentsQuery();
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [recent, setRecent] = useState<readonly string[]>(
    readRecentExperiments,
  );
  const workspace = useExperimentWorkspaceQuery(experimentId);
  const [datasetId, setDatasetId] = useState("");
  const selectedDataset = datasets.data?.find((row) => row.id === datasetId);
  const [evaluatorSetVersion, setEvaluator] = useState("default-v1");
  const [budget, setBudget] = useState("1");
  const [repetitions, setRepetitions] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const upstreams = agentUpstream.useAgentUpstreamsQuery();
  const [edited, setVariants] = useState<readonly VariantInput[] | null>(null);
  const variants = edited ?? draftVariants(upstreams.data?.upstreams[0]?.name ?? "");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDataset) return;
    setError(null);
    mutations.createExperiment.mutate(
      {
        datasetId,
        datasetRevision: selectedDataset.currentRevision,
        evaluatorSetVersion,
        variants,
        maxBudgetUsd: Number(budget),
        repetitions: Number(repetitions),
      },
      {
        onError: (e) => setError(errorMessage(e)),
        onSuccess: (value: ExperimentDetail) => {
          setExperimentId(value.experiment.id);
          const next = [
            value.experiment.id,
            ...recent.filter((id) => id !== value.experiment.id),
          ].slice(0, 10);
          setRecent(next);
          localStorage.setItem(
            "agent-tracer:evaluation:recent",
            JSON.stringify(next),
          );
        },
      },
    );
  };
  const preview = workspace.preview.data;
  const detail = workspace.detail.data;
  const executions = workspace.executions.data ?? [];
  const done = executions.filter((row) =>
    [
      "succeeded",
      "not_evaluable",
      "budget_skipped",
      "failed",
      "cancelled",
    ].includes(row.execution.status),
  ).length;
  const failed = executions.filter(
    (row) =>
      row.execution.status === "failed" ||
      row.execution.status === "not_evaluable",
  );
  const percent =
    executions.length === 0 ? 0 : Math.round((done / executions.length) * 100);
  const start = () => {
    if (!experimentId || !preview) return;
    mutations.startExperiment.mutate(
      {
        id: experimentId,
        confirmation: {
          datasetRevision: preview.datasetRevision,
          logicalExecutionCount: preview.logicalExecutionCount,
          maximumBudgetUsd: preview.maximumBudgetUsd,
        },
      },
      { onError: (e) => setError(errorMessage(e)) },
    );
  };
  return (
    <section aria-labelledby="experiments-heading" className="grid gap-4">
      <div className="rounded-sm border border-hair bg-s1 p-4">
        <h2 id="experiments-heading" className="text-sm font-semibold">
          Experiment workspace
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          Select an existing experiment or create a draft below.
        </p>
        <select aria-label="Existing experiment" className="mt-3 w-full rounded-xs border border-hair bg-canvas p-2 text-xs" value={experimentId ?? ""} onChange={(event) => setExperimentId(event.target.value || null)}>
          <option value="">Select an experiment…</option>
          {experiments.data?.map((row) => <option key={row.id} value={row.id}>{row.status} · {row.createdAt} · {row.id}</option>)}
        </select>
        {experiments.data?.length === 0 && <p className="mt-2 text-xs text-ink-muted">No experiments yet. Create the first draft below.</p>}
        {recent.length > 0 && (
          <div
            aria-label="Recent experiment IDs"
            className="mt-2 flex flex-wrap gap-2"
          >
            {recent.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setExperimentId(id);
                }}
                className="rounded-pill bg-s2 px-2 py-1 font-mono text-[11px]"
              >
                {id}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        onSubmit={submit}
        className="rounded-sm border border-hair bg-s1 p-4"
      >
        <h3 className="text-sm font-semibold">Create experiment</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-xs">
            Dataset
            <select
              required
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="rounded-xs border border-hair bg-canvas p-2"
            >
              <option value="">Select…</option>
              {datasets.data?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · r{row.currentRevision}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Evaluator set"
            value={evaluatorSetVersion}
            set={setEvaluator}
          />
          <Field
            label="Maximum budget (USD)"
            value={budget}
            set={setBudget}
            type="number"
          />
          <Field
            label="Repetitions"
            value={repetitions}
            set={setRepetitions}
            type="number"
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {variants.map((variant, index) => (
            <VariantForm
              key={variant.name}
              value={variant}
              fragments={fragments.data ?? []}
              fragmentsLoading={fragments.isLoading}
              fragmentsError={fragments.isError}
              promptDefinitions={prompts.data ?? []}
              onChange={(next) =>
                setVariants(
                  variants.map((row, i) => (i === index ? next : row)),
                )
              }
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}
        <button
          disabled={!selectedDataset || mutations.createExperiment.isPending}
          className="mt-3 rounded-xs bg-primary px-3 py-2 text-xs text-white"
        >
          Create draft
        </button>
      </form>
      {experimentId && (
        <ExperimentRun
          experimentId={experimentId}
          detail={detail}
          preview={preview}
          executions={executions}
          failed={failed}
          percent={percent}
          start={start}
          cancel={() => mutations.cancelExperiment.mutate(experimentId)}
          detailError={workspace.detail.isError}
          comparison={workspace.comparison.data}
          comparisonError={workspace.comparison.isError}
        />
      )}
    </section>
  );
}
