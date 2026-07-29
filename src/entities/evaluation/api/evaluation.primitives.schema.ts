import { z } from "zod";

export const record = z.record(z.unknown());
export const iso = z.string().min(1);
export const status = z.enum([
  "draft",
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

/** 서버 응답이 계약과 다르면 화면이 부분 렌더링으로 흘러가지 않도록 그 자리에서 던진다. */
export function parse<T>(
  schema: z.ZodTypeAny,
  value: unknown,
  resource: string,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      `Invalid ${resource} response: ${parsed.error.issues[0]?.message ?? "unknown shape"}`,
    );
  return parsed.data as T;
}
