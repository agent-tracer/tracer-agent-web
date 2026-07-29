import { useMemo, useState, type FormEvent } from "react";
import { usePromptFragmentsQuery } from "~/entities/evaluation/api/queries.js";
import { useEvaluationMutations } from "~/entities/evaluation/api/mutations.js";
import type { PromptFragmentBinding } from "~/entities/evaluation/model/evaluation.js";
import { useGuidance } from "tracerWeb/store";
import { GuidanceText } from "tracerWeb/ui";
import { errorMessage } from "../lib/json.js";

function bindingKey(binding: PromptFragmentBinding): string {
  return `${binding.backend}/${binding.agentName}/${binding.fragmentName}/${binding.language}`;
}

const PLACEHOLDER_PATTERN = /\$\{([A-Za-z][A-Za-z0-9]*)\}/g;

function placeholdersIn(content: string): readonly string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1];
    if (name !== undefined) found.add(name);
  }
  return [...found];
}

/** 평가 조각을 그 자리에서 쓰면 candidate 채널 버전으로 등록하는 저작 화면이다. */
export function FragmentCandidateEditor() {
  const guidance = useGuidance();
  const fragments = usePromptFragmentsQuery();
  const mutations = useEvaluationMutations();
  const [selectedKey, setSelectedKey] = useState("");
  const [content, setContent] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<{
    semanticVersion: string;
    versionId: string;
  } | null>(null);

  const selected = fragments.data?.find(
    (binding) => bindingKey(binding) === selectedKey,
  );
  const placeholders = useMemo(() => placeholdersIn(content), [content]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    setRegistered(null);
    mutations.registerCandidateFragmentVersion.mutate(
      {
        backend: selected.backend,
        agentName: selected.agentName,
        fragmentName: selected.fragmentName,
        language: selected.language,
        content,
        changeSummary: changeSummary.trim().length === 0 ? null : changeSummary.trim(),
      },
      {
        onSuccess: (value) => {
          setRegistered(value);
          setContent("");
          setChangeSummary("");
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <div className="rounded-sm border border-hair bg-s1 p-4">
      <h3 className="text-sm font-semibold">Evaluation fragment authoring</h3>
      <p className="mt-1 text-xs text-ink-muted">
        Writing content here registers a new immutable `candidate` version. It never
        reaches production; a variant must select it explicitly to use it.
      </p>
      {fragments.isLoading && (
        <GuidanceText locale={guidance.locale} message={guidance.messages.evaluation.fragmentLoading} as="p" className="mt-3 text-xs" />
      )}
      {fragments.isError && (
        <GuidanceText locale={guidance.locale} message={guidance.messages.evaluation.fragmentError} as="p" className="mt-3 text-xs text-danger" />
      )}
      {!fragments.isLoading && !fragments.isError && fragments.data?.length === 0 && (
        <GuidanceText locale={guidance.locale} message={guidance.messages.evaluation.fragmentEmpty} as="p" className="mt-3 text-xs text-ink-muted" />
      )}
      {fragments.data && fragments.data.length > 0 && (
        <form onSubmit={submit} className="mt-3 grid gap-3">
          <label className="grid gap-1 text-xs">
            Fragment
            <select
              required
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="rounded-xs border border-hair bg-canvas p-2"
            >
              <option value="">Select a fragment…</option>
              {fragments.data.map((binding) => (
                <option key={bindingKey(binding)} value={bindingKey(binding)}>
                  {binding.codeName} · {binding.backend} · {binding.language}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <p className="text-[11px] text-ink-muted">
              Fills slot <code>{selected.fragmentSlot}</code> of template{" "}
              <code>{selected.templateKey}</code>. Code default:{" "}
              <code className="break-all">{selected.codeDefaultVersion}</code>
            </p>
          )}
          <label className="grid gap-1 text-xs">
            Content
            <textarea
              required
              rows={8}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Use ${placeholderName} for substitution slots the code fills at render time."
              className="rounded-xs border border-hair bg-canvas p-2 font-mono text-[12px]"
            />
          </label>
          <p className="text-[11px] text-ink-muted">
            {placeholders.length === 0
              ? "No ${…} substitution slots detected."
              : `Substitution slots: ${placeholders.map((name) => `\${${name}}`).join(", ")}`}
          </p>
          <label className="grid gap-1 text-xs">
            Change summary (optional)
            <input
              value={changeSummary}
              onChange={(event) => setChangeSummary(event.target.value)}
              className="rounded-xs border border-hair bg-canvas p-2"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
          {registered && (
            <p role="status" className="text-xs text-ink-muted">
              Registered candidate {registered.semanticVersion} ({registered.versionId}).
              Select it from a variant to run it.
            </p>
          )}
          <button
            disabled={!selected || content.trim().length === 0 || mutations.registerCandidateFragmentVersion.isPending}
            className="w-max rounded-xs bg-primary px-3 py-2 text-xs text-white disabled:opacity-40"
          >
            Register candidate version
          </button>
        </form>
      )}
    </div>
  );
}
