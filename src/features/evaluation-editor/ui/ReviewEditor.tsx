import { useState, useEffect } from "react";
import { useExperimentsQuery } from "~/entities/evaluation/api/queries.js";
import { createReview, submitReview } from "~/entities/evaluation/api/api-evaluation.js";
import type { ReviewPreference } from "~/entities/evaluation/model/evaluation.js";

interface ReviewPair {
  executionA: { id: string; output: unknown };
  executionB: { id: string; output: unknown };
  exampleId: string;
  repetition: number;
}

export function ReviewEditor() {
    const experiments = useExperimentsQuery();
    const [experimentId, setExperimentId] = useState("");
    const [pair, setPair] = useState<ReviewPair | null>(null);
    const [loading, setLoading] = useState(false);

    const loadNext = async (forExperimentId: string) => {
        setLoading(true);
        try {
            const data = await createReview({ experimentId: forExperimentId });
            setPair(data as ReviewPair);
        } catch {
            setPair(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (experimentId === "") {
            setPair(null);
            return;
        }
        void loadNext(experimentId);
    }, [experimentId]);

    const handleSelect = async (preference: ReviewPreference) => {
        if (!pair || experimentId === "") return;
        setLoading(true);
        try {
            await submitReview(experimentId, {
                executionAId: pair.executionA.id,
                executionBId: pair.executionB.id,
                preference,
                reason: null,
                correctedOutput: null,
            });
            await loadNext(experimentId);
        } catch {
            setLoading(false);
        }
    };

    return (
        <section className="rounded-sm border border-hair bg-s1 p-5">
            <h2 className="text-sm font-semibold mb-4 text-ink">Human review and promotion gates</h2>
            <label className="grid gap-1 text-xs mb-4 max-w-xs">
                Experiment
                <select
                    aria-label="Experiment"
                    value={experimentId}
                    onChange={(event) => setExperimentId(event.target.value)}
                    className="rounded-xs border border-hair bg-canvas p-2"
                >
                    <option value="">Select an experiment…</option>
                    {experiments.data?.map((row) => (
                        <option key={row.id} value={row.id}>{row.status} · {row.id}</option>
                    ))}
                </select>
            </label>
            {experiments.data?.length === 0 && (
                <p className="text-xs text-ink-muted mb-4">No experiments yet. Create one in the Experiments tab first.</p>
            )}
            {experimentId !== "" && (
                <div className="flex flex-col gap-4">
                    <div className="p-4 border border-hair rounded-sm bg-canvas">
                        <p className="font-semibold text-sm mb-2 text-ink">Review Pending (Blind A/B)</p>
                        {loading ? (
                            <p className="text-xs text-ink-muted">Loading...</p>
                        ) : pair ? (
                            <>
                                <div className="flex gap-4">
                                    <div className="flex-1 p-3 border border-hair rounded-sm bg-s1">
                                        <h3 className="font-medium text-xs mb-2 text-ink">Output A</h3>
                                        <pre className="text-xs text-ink-muted whitespace-pre-wrap">{JSON.stringify(pair.executionA.output, null, 2)}</pre>
                                        <button onClick={() => void handleSelect('a')} className="mt-2 bg-ink text-canvas text-xs px-3 py-1 rounded-xs">Select A</button>
                                    </div>
                                    <div className="flex-1 p-3 border border-hair rounded-sm bg-s1">
                                        <h3 className="font-medium text-xs mb-2 text-ink">Output B</h3>
                                        <pre className="text-xs text-ink-muted whitespace-pre-wrap">{JSON.stringify(pair.executionB.output, null, 2)}</pre>
                                        <button onClick={() => void handleSelect('b')} className="mt-2 bg-ink text-canvas text-xs px-3 py-1 rounded-xs">Select B</button>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button onClick={() => void handleSelect('tie')} className="border border-hair text-ink text-xs px-3 py-1 rounded-xs hover:bg-s1 transition-colors">Tie</button>
                                    <button onClick={() => void handleSelect('reject')} className="border border-danger text-danger bg-s2 text-xs px-3 py-1 rounded-xs hover:bg-s2/80 transition-colors">Reject Both</button>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-ink-muted">No pending reviews for this experiment.</p>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
