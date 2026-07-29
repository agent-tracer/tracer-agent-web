import type { ReactNode, FormEvent } from "react";
import type { DisclosureClass } from "~/entities/evaluation/model/evaluation.js";
import { GuidanceText } from "tracerWeb/ui";
import type { GuidanceLocale, GuidanceMessage } from "tracerWeb/guidance";

interface DatasetCreateFormProps {
  readonly name: string;
  readonly setName: (value: string) => void;
  readonly description: string;
  readonly setDescription: (value: string) => void;
  readonly input: string;
  readonly setInput: (value: string) => void;
  readonly reference: string;
  readonly setReference: (value: string) => void;
  readonly disclosure: DisclosureClass;
  readonly setDisclosure: (value: DisclosureClass) => void;
  readonly guidanceLocale: GuidanceLocale;
  readonly disclosureGuidance: GuidanceMessage;
  readonly isPending: boolean;
  readonly error: string | null;
  readonly onSubmit: (event: FormEvent) => void;
}
export function DatasetCreateForm({
  name,
  setName,
  description,
  setDescription,
  input,
  setInput,
  reference,
  setReference,
  disclosure,
  setDisclosure,
  guidanceLocale,
  disclosureGuidance,
  isPending,
  error,
  onSubmit,
}: DatasetCreateFormProps) {
  return (
    <form onSubmit={onSubmit} className="rounded-sm border border-hair bg-s1 p-4">
      <h3 className="text-sm font-semibold">Create dataset</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <L label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </L>
        <L label="Description">
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </L>
        <L label="Example input (JSON)">
          <textarea
            required
            rows={5}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </L>
        <L label="Reference output (optional JSON)">
          <textarea
            rows={5}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </L>
        <L label="Disclosure class">
          <select
            value={disclosure}
            onChange={(e) => setDisclosure(e.target.value as DisclosureClass)}
          >
            <option>synthetic</option>
            <option>approved-evaluation</option>
            <option>production-masked</option>
            <option>external-disabled</option>
          </select>
        </L>
      </div>
      <div className="mt-3 flex items-start justify-between">
        <GuidanceText
          className="text-xs text-ink-muted flex-1 pr-4"
          locale={guidanceLocale}
          message={disclosureGuidance}
        />
        <button
          disabled={isPending}
          className="whitespace-nowrap rounded-xs bg-primary px-3 py-2 text-xs text-white"
        >
          Create immutable revision 1
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
function L({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs text-ink-muted">
      {label}
      <span className="[&>*]:w-full [&>*]:rounded-xs [&>*]:border [&>*]:border-hair [&>*]:bg-canvas [&>*]:p-2 [&>*]:text-ink">
        {children}
      </span>
    </label>
  );
}
