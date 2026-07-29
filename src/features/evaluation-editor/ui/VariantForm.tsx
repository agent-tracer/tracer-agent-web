import { useState } from "react";
import { useGuidance } from "tracerWeb/store";
import { GuidanceText } from "tracerWeb/ui";
import { usePromptVersionsQuery } from "~/entities/evaluation/api/queries.js";
import type { PromptBackend, PromptDefinition, PromptFragmentBinding, VariantInput } from "~/entities/evaluation/model/evaluation.js";

function selectionKey(fragment: PromptFragmentBinding): string {
  return `${fragment.templateKey}/${fragment.fragmentSlot}`;
}

function backendLabel(value: PromptBackend): string {
  return value === "claude-sdk" ? "SDK" : "LAN";
}

export function VariantForm({
  value,
  onChange,
  fragments,
  fragmentsLoading,
  fragmentsError,
  promptDefinitions,
}: {
  value: VariantInput;
  onChange: (value: VariantInput) => void;
  fragments: readonly PromptFragmentBinding[];
  fragmentsLoading: boolean;
  fragmentsError: boolean;
  promptDefinitions: readonly PromptDefinition[];
}) {
  const guidance = useGuidance();
  const [definitionId, setDefinitionId] = useState("");
  const versions = usePromptVersionsQuery(definitionId || null);
  const backendFragments = fragments.filter((fragment) => fragment.backend === value.backend);
  const selections = value.fragmentSelections ?? {};
  const setSelection = (fragment: PromptFragmentBinding, versionId: string) => {
    const key = selectionKey(fragment);
    const next = { ...selections };
    if (versionId === "") delete next[key];
    else next[key] = versionId;
    onChange({ ...value, fragmentSelections: next });
  };
  return (
    <fieldset className="rounded-xs border border-hair bg-canvas p-3">
      <legend className="px-1 text-xs font-semibold">
        {value.baseline ? "Baseline" : "Candidate"}
      </legend>
      <div className="grid gap-2">
        <Field label="Name" value={value.name} set={(name) => onChange({ ...value, name })} />
        <Field label="Agent" value={value.agentName} set={(agentName) => onChange({ ...value, agentName })} />
        <Field label="Model" value={value.model} set={(model) => onChange({ ...value, model })} />
        <label className="grid gap-1 text-xs">
          Prompt definition (legacy)
          <select value={definitionId} onChange={(event) => { setDefinitionId(event.target.value); onChange({ ...value, promptVersionId: "" }); }} className="rounded-xs border border-hair bg-s1 p-2">
            <option value="">Code-owned fragments</option>
            {promptDefinitions.filter((row) => row.backend === value.backend).map((row) => <option key={row.id} value={row.id}>{row.name} · {row.language}</option>)}
          </select>
        </label>
        {definitionId && (
          <select aria-label="Legacy prompt version" value={value.promptVersionId} onChange={(event) => onChange({ ...value, promptVersionId: event.target.value })} className="rounded-xs border border-hair bg-s1 p-2">
            {versions.data?.map((row) => <option key={row.id} value={row.id}>{row.semanticVersion} · {row.contentHash.slice(0, 10)}</option>)}
          </select>
        )}
        <label className="grid gap-1 text-xs">
          Backend
          <select
            value={value.backend}
            onChange={(event) => {
              const backend = event.target.value;
              if (backend !== "python" && backend !== "claude-sdk") return;
              onChange({ ...value, backend, fragmentSelections: {} });
            }}
            className="rounded-xs border border-hair bg-s1 p-2"
          >
            <option value="python">LAN · python</option>
            <option value="claude-sdk">SDK · claude-sdk</option>
          </select>
        </label>
        <section aria-labelledby={`${value.name}-fragments`} className="grid gap-2 border-t border-hair pt-2">
          <div>
            <h4 id={`${value.name}-fragments`} className="text-xs font-semibold">Prompt fragments</h4>
            <GuidanceText locale={guidance.locale} message={guidance.messages.evaluation.fragmentSelectionHint} as="p" className="mt-1 text-[11px] text-ink-muted" />
          </div>
          {fragmentsLoading && <GuidanceText locale={guidance.locale} message={guidance.messages.evaluation.fragmentLoading} as="p" className="text-xs" />}
          {fragmentsError && <GuidanceText locale={guidance.locale} message={guidance.messages.evaluation.fragmentError} as="p" className="text-xs text-danger" />}
          {!fragmentsLoading && !fragmentsError && backendFragments.length === 0 && <GuidanceText locale={guidance.locale} message={guidance.messages.evaluation.fragmentEmpty} as="p" className="text-xs text-ink-muted" />}
          {backendFragments.map((fragment) => {
            const selected = selections[selectionKey(fragment)] ?? "";
            const selectedVersion = fragment.versions.find((version) => version.id === selected);
            return (
              <div key={selectionKey(fragment)} className="grid gap-1 rounded-xs border border-hair bg-s1 p-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <strong>{fragment.codeName}</strong>
                  <span className="font-mono text-[10px] text-ink-muted">{backendLabel(fragment.backend)} · {fragment.fragmentSlot}</span>
                </div>
                <label className="grid gap-1 text-[11px]">
                  Version
                  <select
                    aria-label={`${fragment.codeName} version`}
                    value={value.baseline ? "" : selected}
                    disabled={value.baseline}
                    onChange={(event) => setSelection(fragment, event.target.value)}
                    className="rounded-xs border border-hair bg-canvas p-2"
                  >
                    <option value="">Code default · {fragment.codeDefaultVersion}</option>
                    {fragment.versions.map((version) => (
                      <option key={version.id} value={version.id} disabled={version.integrity === "mismatch"}>
                        DB {version.semanticVersion} · {version.contentHash.slice(0, 10)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-1 text-[10px] text-ink-muted">
                  <span>Code hash: <code className="break-all">{fragment.codeDefaultHash}</code></span>
                  {selectedVersion && <span>Selected hash: <code className="break-all">{selectedVersion.contentHash}</code></span>}
                  <span><GuidanceText locale={guidance.locale} message={guidance.messages.evaluation.fragmentIntegrity} />: {selectedVersion?.integrity ?? "matched"}</span>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </fieldset>
  );
}

export function Field({
  label,
  value,
  set,
  type = "text",
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-xs">
      {label}
      <input required type={type} min={type === "number" ? 1 : undefined} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => set(event.target.value)} className="rounded-xs border border-hair bg-canvas p-2" />
    </label>
  );
}
