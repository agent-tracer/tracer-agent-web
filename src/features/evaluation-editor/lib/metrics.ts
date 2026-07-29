export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function formatMetric(value: number | null): string {
  return value === null ? "—" : value.toFixed(3);
}
