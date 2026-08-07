import { memo, useEffect, useState } from "react";
import type { ChatExecutionPhase } from "~/entities/chat/model/chat.js";
import { ChatMarkdown } from "~/widgets/chat/ChatMarkdown.js";

const ELAPSED_TICK_MS = 1_000;

/** 도구가 도는 동안에는 서버가 갱신할 신호를 받지 못하므로 경과는 화면이 센다. */
const LIVE_PHASES: readonly ChatExecutionPhase[] = ["starting", "thinking", "tool"];

const PHASE_LABEL: Readonly<Record<ChatExecutionPhase, string>> = {
  starting: "Starting",
  thinking: "Thinking",
  responding: "Working",
  tool: "Running tool",
  done: "Process",
};

export const ChatProcess = memo(function ChatProcess({
  content,
  active = false,
  rewriting = false,
  phase = null,
  since = null,
}: {
  readonly content: string;
  readonly active?: boolean;
  readonly rewriting?: boolean;
  readonly phase?: ChatExecutionPhase | null;
  readonly since?: string | null;
}) {
  const live = active && phase !== null && LIVE_PHASES.includes(phase);
  const elapsedSeconds = useElapsedSeconds(live ? since : null);

  return (
    <details
      open={active || undefined}
      className="self-start max-w-[75%] rounded-md border border-hair bg-s0 px-3 py-2 text-ink-subtle"
    >
      <summary className="cursor-pointer select-none text-[11.5px] font-medium text-ink-subtle">
        {rewriting ? "Rewriting…" : active ? `${activeLabel(phase)}…` : "Process"}
        {elapsedSeconds !== null && (
          <span className="ml-1.5 font-mono opacity-70">{elapsedSeconds}s</span>
        )}
      </summary>
      <div className="mt-2 border-t border-hair pt-2 text-[12px] opacity-80">
        <ChatMarkdown content={content} />
      </div>
    </details>
  );
});

function activeLabel(phase: ChatExecutionPhase | null): string {
  return phase === null ? "Working" : PHASE_LABEL[phase];
}

/** 초안이 자라지 않는 동안에도 실행이 살아 있음을 보이는 유일한 움직임이다. */
function useElapsedSeconds(since: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (since === null) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), ELAPSED_TICK_MS);
    return () => clearInterval(timer);
  }, [since]);

  if (since === null) return null;
  const startedAt = Date.parse(since);
  if (Number.isNaN(startedAt)) return null;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function extractProcessText(transcript: string, answer: string): string {
  const normalizedTranscript = transcript.trim();
  const normalizedAnswer = answer.trim();
  if (normalizedTranscript.length === 0 || normalizedTranscript === normalizedAnswer) return "";
  if (normalizedAnswer.length > 0 && normalizedTranscript.endsWith(normalizedAnswer)) {
    return normalizedTranscript.slice(0, -normalizedAnswer.length).trim();
  }
  return normalizedTranscript;
}
