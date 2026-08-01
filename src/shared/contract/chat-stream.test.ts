import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHAT_STREAM_RECONNECT } from "~/shared/contract/chat-stream.js";

const CHAT_QUERY_CASE = path.join(process.cwd(), "contract/conformance/cases/chat.query.json");

interface StreamClause {
  readonly reconnect: { readonly initialBackoffMs: number; readonly maxBackoffMs: number };
  readonly replay: { readonly mode: string };
  readonly frameFields: string;
}

function streamClause(): StreamClause {
  const chatQuery = JSON.parse(fs.readFileSync(CHAT_QUERY_CASE, "utf8")) as {
    readonly stream: StreamClause;
  };
  return chatQuery.stream;
}

describe("CHAT_STREAM_RECONNECT", () => {
  it("계약이 정한 물러서는 간격을 그대로 갖는다", () => {
    const { reconnect } = streamClause();

    expect(CHAT_STREAM_RECONNECT).toEqual({
      initialBackoffMs: reconnect.initialBackoffMs,
      maxBackoffMs: reconnect.maxBackoffMs,
    });
  });

  it("계약이 프레임 재생을 요구하지 않는 동안에만 성립한다", () => {
    const stream = streamClause();

    expect(stream.replay.mode).toBe("none");
    expect(stream.frameFields).toContain("event와 data");
  });
});
