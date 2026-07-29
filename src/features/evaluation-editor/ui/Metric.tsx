export function Metric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-xs bg-canvas p-2">
      <span className="block text-ink-muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
