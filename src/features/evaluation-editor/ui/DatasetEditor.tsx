import { useEffect, useRef, useState, type FormEvent } from "react";
import { useEvaluationMutations } from "~/entities/evaluation/api/mutations.js";
import type { DisclosureClass, ExampleInput, ExecutionExampleCandidate } from "~/entities/evaluation/model/evaluation.js";
import { useGuidance } from "tracerWeb/store";
import { errorMessage, parseObject } from "../lib/json.js";
import { fetchChatExecutionExampleCandidate, fetchExecutionExampleCandidate } from "~/entities/evaluation/api/api-evaluation.js";
import { ExecutionImportPanel } from "./ExecutionImportPanel.js";
import { DatasetCreateForm } from "./DatasetCreateForm.js";
import { DatasetList } from "./DatasetList.js";
import { DatasetRevisionPanel } from "./DatasetRevisionPanel.js";

interface DatasetEditorProps {
  /** 잡 결과 화면의 "평가 예제로 추가" 진입점이 넘긴 잡 식별자다. */
  readonly importJobId?: string | null;
  /** 대화 화면의 "평가 예제로 추가" 진입점이 넘긴 실행 식별자다. */
  readonly importChatExecutionId?: string | null;
}

export function DatasetEditor({
  importJobId = null,
  importChatExecutionId = null,
}: DatasetEditorProps = {}) {
  const [selected, setSelected] = useState<string | null>(null);
  const mutations = useEvaluationMutations();
  const guidance = useGuidance();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [input, setInput] = useState("{}");
  const [reference, setReference] = useState("");
  const [disclosure, setDisclosure] = useState<DisclosureClass>("synthetic");
  const [error, setError] = useState<string | null>(null);
  const [candidateWarning, setCandidateWarning] = useState<string | null>(null);
  const imported = useRef<{ evidence: Record<string, unknown>; sourceExecutionId: string } | null>(null);
  const example = (): ExampleInput => ({
    input: parseObject(input, "Input"),
    ...(reference.trim()
      ? { referenceOutput: parseObject(reference, "Reference output") }
      : {}),
    disclosureClass: disclosure,
    evidence: imported.current?.evidence ?? {},
    ...(imported.current === null ? {} : { sourceExecutionId: imported.current.sourceExecutionId }),
  });
  const importExecution = (candidate: ExecutionExampleCandidate) => {
    setError(null);
    setInput(JSON.stringify(candidate.input, null, 2));
    setReference(candidate.referenceOutput === null ? "" : JSON.stringify(candidate.referenceOutput, null, 2));
    setDisclosure(candidate.suggestedDisclosureClass);
    setCandidateWarning(candidate.excludedTruncatedTools.length === 0 ? `Loaded ${candidate.agentName} execution.` : `Excluded truncated evidence: ${candidate.excludedTruncatedTools.join(", ")}. Review before saving.`);
    imported.current = { evidence: candidate.evidence, sourceExecutionId: candidate.sourceExecutionId };
  };
  useEffect(() => {
    if (importJobId === null && importChatExecutionId === null) return;
    void (async () => {
      try {
        const candidate = importJobId !== null
          ? await fetchExecutionExampleCandidate(importJobId)
          : await fetchChatExecutionExampleCandidate(importChatExecutionId!);
        importExecution(candidate);
      } catch (e) {
        setError(errorMessage(e));
      }
    })();
  }, [importJobId, importChatExecutionId]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      mutations.createDataset.mutate(
        { name, description, examples: [example()] },
        {
          onSuccess: (value) => {
            setSelected(value.dataset.id);
            setName("");
          },
          onError: (e) => setError(errorMessage(e)),
        },
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  return (
    <section
      aria-labelledby="datasets-heading"
      className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]"
    >
      <DatasetList
        selected={selected}
        onSelect={setSelected}
        onDeleted={(id) => {
          if (selected === id) setSelected(null);
        }}
      />
      <div className="grid gap-4">
        <ExecutionImportPanel onLoad={importExecution} onError={(value) => setError(errorMessage(value))} />
        {candidateWarning && <p role="status" className="text-xs text-ink-muted">{candidateWarning}</p>}
        <DatasetCreateForm
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          input={input}
          setInput={setInput}
          reference={reference}
          setReference={setReference}
          disclosure={disclosure}
          setDisclosure={setDisclosure}
          guidanceLocale={guidance.locale}
          disclosureGuidance={guidance.messages.evaluation.disclosure}
          isPending={mutations.createDataset.isPending}
          error={error}
          onSubmit={submit}
        />
        {selected && (
          <DatasetRevisionPanel
            datasetId={selected}
            buildExample={example}
            setError={setError}
          />
        )}
      </div>
    </section>
  );
}
