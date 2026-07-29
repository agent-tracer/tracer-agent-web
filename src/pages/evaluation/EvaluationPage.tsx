import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DatasetEditor } from "~/features/evaluation-editor/ui/DatasetEditor.js";
import { ExperimentEditor } from "~/features/evaluation-editor/ui/ExperimentEditor.js";
import { PromptEditor } from "~/features/evaluation-editor/ui/PromptEditor.js";
import { ReviewEditor } from "~/features/evaluation-editor/ui/ReviewEditor.js";
import { GuidanceText } from "tracerWeb/ui";
import { useGuidance } from "tracerWeb/store";

type Tab = "datasets" | "prompts" | "experiments" | "review";
const TABS = ["datasets", "prompts", "experiments", "review"] as const;
function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}
export function EvaluationPage() {
  const [params] = useSearchParams();
  const importJobId = params.get("importJob");
  const importChatExecutionId = params.get("importChatExecution");
  const hasImportTarget = importJobId !== null || importChatExecutionId !== null;
  const requestedTab = params.get("tab");
  const [tab, setTab] = useState<Tab>(
    hasImportTarget ? "datasets" : isTab(requestedTab) ? requestedTab : "datasets",
  );
  const guidance = useGuidance();
  const tabs = TABS;
  return (
    <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Evaluation platform
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Evaluation workspace
        </h1>
        <GuidanceText
          className="mt-2 max-w-3xl text-sm text-ink-muted"
          locale={guidance.locale}
          message={guidance.messages.evaluation.introduction}
        />
      </header>
      <div
        role="tablist"
        aria-label="Evaluation workspace sections"
        className="mt-5 flex overflow-x-auto border-b border-hair"
      >
        {tabs.map((item, index) => (
          <button
            id={`evaluation-tab-${item}`}
            aria-controls={`evaluation-panel-${item}`}
            tabIndex={tab === item ? 0 : -1}
            key={item}
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            onKeyDown={(event) => {
              if (
                !(["ArrowLeft", "ArrowRight", "Home", "End"] as const).includes(
                  event.key as "ArrowLeft",
                )
              )
                return;
              event.preventDefault();
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        tabs.length) %
                      tabs.length;
              const next = tabs[nextIndex]!;
              setTab(next);
              document.getElementById(`evaluation-tab-${next}`)?.focus();
            }}
            className={`px-4 py-2 text-xs font-medium capitalize ${tab === item ? "border-b-2 border-primary text-ink" : "text-ink-muted"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div
        id={`evaluation-panel-${tab}`}
        aria-labelledby={`evaluation-tab-${tab}`}
        role="tabpanel"
        tabIndex={0}
        className="mt-5"
      >
        {tab === "datasets" && (
          <DatasetEditor
            importJobId={importJobId}
            importChatExecutionId={importChatExecutionId}
          />
        )}
        {tab === "prompts" && <PromptEditor />}
        {tab === "experiments" && <ExperimentEditor />}
        {tab === "review" && <ReviewEditor />}
      </div>
    </div>
  );
}

