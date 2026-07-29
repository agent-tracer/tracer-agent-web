export function readRecentExperiments(): readonly string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("agent-tracer:evaluation:recent") ?? "[]",
    );
    return Array.isArray(value)
      ? value
          .filter((row): row is string => typeof row === "string")
          .slice(0, 10)
      : [];
  } catch {
    return [];
  }
}
