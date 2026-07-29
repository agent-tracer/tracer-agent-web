import { useState } from "react";
import { usePromptsQuery, usePromptVersionsQuery } from "~/entities/evaluation/api/queries.js";
import { FragmentCandidateEditor } from "./FragmentCandidateEditor.js";

export function PromptEditor() {
  const prompts = usePromptsQuery();
  const [selected, setSelected] = useState<string | null>(null);
  const versions = usePromptVersionsQuery(selected);
  return (
    <div className="grid gap-6">
      <section aria-labelledby="operational-prompts-heading">
        <h2 id="operational-prompts-heading" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Operational — read-only, owned by code files
        </h2>
        <div className="mt-2 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="rounded-sm border border-hair bg-s1 p-3">
            <h3 className="text-sm font-semibold">Prompt registry</h3>
            <p className="mt-1 text-xs text-ink-muted">Prompt content is owned by backend files. This registry is read-only.</p>
            {prompts.isLoading && <p role="status" className="mt-3 text-xs">Loading prompts…</p>}
            {prompts.isError && <p role="alert" className="mt-3 text-xs text-danger">Could not load prompts.</p>}
            <div className="mt-3 grid gap-1">
              {prompts.data?.map((row) => (
                <button key={row.id} type="button" aria-pressed={selected === row.id} onClick={() => setSelected(row.id)} className="rounded-xs border border-hair bg-canvas p-2 text-left">
                  <span className="block text-xs font-medium">{row.name}</span>
                  <span className="text-[11px] text-ink-muted">{row.agentName} · {row.backend} · {row.language}</span>
                </button>
              ))}
            </div>
            {prompts.data?.length === 0 && <p className="mt-3 text-xs text-ink-muted">No registered prompts. Deploy a backend that registers its file-owned prompt.</p>}
          </div>
          <div className="rounded-sm border border-hair bg-s1 p-4">
            <h3 className="text-sm font-semibold">Immutable versions</h3>
            {!selected && <p className="mt-3 text-xs text-ink-muted">Select a prompt definition to inspect its registered versions.</p>}
            {versions.isLoading && <p role="status" className="mt-3 text-xs">Loading versions…</p>}
            {versions.isError && <p role="alert" className="mt-3 text-xs text-danger">Could not load prompt versions.</p>}
            <div className="mt-3 grid gap-2">
              {versions.data?.map((row) => (
                <article key={row.id} className="rounded-xs border border-hair bg-canvas p-3 text-xs">
                  <div className="flex justify-between gap-3"><strong>{row.semanticVersion}</strong><code>{row.id}</code></div>
                  <dl className="mt-2 grid gap-1 text-ink-muted"><div>SHA-256: <code className="break-all">{row.contentHash}</code></div><div>Tool contract: {row.toolContractVersion} · Output schema: {row.outputSchemaVersion}</div></dl>
                </article>
              ))}
            </div>
            {selected && versions.data?.length === 0 && <p className="mt-3 text-xs text-ink-muted">No versions have been registered for this definition.</p>}
          </div>
        </div>
      </section>
      <section aria-labelledby="evaluation-fragments-heading">
        <h2 id="evaluation-fragments-heading" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Evaluation — writable, registers a candidate version
        </h2>
        <div className="mt-2">
          <FragmentCandidateEditor />
        </div>
      </section>
    </div>
  );
}
