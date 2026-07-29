export function parseObject(
  text: string,
  field: string,
): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${field} must contain valid JSON.`);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`${field} must be a JSON object.`);
  return value as Record<string, unknown>;
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The operation failed.";
}
