import { useState } from "react";
import { fetchDatasetQuality, exportDataset } from "~/entities/evaluation/api/api-evaluation.js";
import { useExperimentsQuery } from "~/entities/evaluation/api/queries.js";
import { errorMessage } from "../lib/json.js";

interface Report {
  totalExamples: number;
  enabledExamples: number;
  duplicateRate: number;
  warnings?: string[];
}

interface Manifest {
  contentHash: string;
  entryCount: number;
}

export function ExportPanel({ datasetId }: { datasetId: string }) {
  const experiments = useExperimentsQuery();
  const [experimentId, setExperimentId] = useState("");
  const [format, setFormat] = useState<"sft" | "dpo">("sft");
  const [minScore, setMinScore] = useState<string>("");
  const [report, setReport] = useState<Report | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);

  const fetchQuality = async () => {
    try {
      const res = await fetchDatasetQuality(datasetId);
      setReport(res);
    } catch {
      // 에러 무시
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportDataset(
        datasetId,
        format,
        experimentId === "" ? undefined : experimentId,
        minScore ? parseFloat(minScore) : undefined,
      );
      setManifest(res.manifest);
    } catch (e) {
      alert("Failed to export: " + errorMessage(e));
    }
  };

  return (
    <div className="mt-4 border-t border-hair pt-4">
      <h3 className="text-sm font-semibold">Training Data Export & Quality</h3>
      
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => void fetchQuality()} className="rounded-xs border border-hair px-2 py-1 text-xs hover:bg-s1 transition-colors">
          Load Quality Report
        </button>
      </div>

      {report && (
        <div className="mt-2 text-xs bg-s1 p-2 rounded-sm border border-hair">
          <p>Total: {report.totalExamples} (Enabled: {report.enabledExamples})</p>
          <p>Duplicate Rate: {Math.round(report.duplicateRate * 100)}%</p>
          {report.warnings?.map((w) => <p className="text-danger mt-1" key={w}>{w}</p>)}
        </div>
      )}

      <div className="mt-4 grid gap-2 text-xs">
        <label>Score from experiment (optional):
          <select value={experimentId} onChange={(e) => setExperimentId(e.target.value)} className="ml-2 border border-hair rounded-xs bg-canvas text-ink p-1">
            <option value="">None</option>
            {experiments.data?.map((row) => (
              <option key={row.id} value={row.id}>{row.status} · {row.id}</option>
            ))}
          </select>
        </label>
        <label>Format:
          <select value={format} onChange={(e) => setFormat(e.target.value as "sft" | "dpo")} className="ml-2 border border-hair rounded-xs bg-canvas text-ink p-1">
            <option value="sft">SFT JSONL</option>
            <option value="dpo">DPO JSONL</option>
          </select>
        </label>
        <label>Min Score (requires an experiment):
          <input disabled={experimentId === ""} type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)} className="ml-2 border border-hair w-16 rounded-xs bg-canvas text-ink p-1 disabled:opacity-40" step="0.1" />
        </label>
        <button type="button" onClick={() => void handleExport()} className="rounded-xs bg-ink text-canvas px-3 py-1 w-max">
          Export
        </button>
      </div>

      {manifest && (
        <div className="mt-2 text-[11px] text-ink-muted break-all">
          <p>Manifest Hash: {manifest.contentHash}</p>
          <p>Entries: {manifest.entryCount}</p>
        </div>
      )}
    </div>
  );
}
