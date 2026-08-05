import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, IconButton, Tooltip } from "tracerWeb/ui";
import { cn } from "~/widgets/chat/lib/cn.js";

type CopyState = "idle" | "copied" | "failed";

/** 되돌아가기까지의 시간이며, 결과를 알아볼 만큼 두되 다음 복사를 막지 않는다. */
const SETTLE_MS = 1_500;

interface ChatCopyButtonProps {
  readonly text: string;
  readonly label: string;
  readonly className?: string;
}

/** 메시지 본문을 손으로 긁지 않고 그대로 가져가게 하는 버튼이며, 결과를 잠깐 보이고 되돌아간다. */
export function ChatCopyButton({ text, label, className }: ChatCopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const settle = (next: CopyState) => {
    setState(next);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState("idle"), SETTLE_MS);
  };

  const copy = async () => {
    settle((await writeToClipboard(text)) ? "copied" : "failed");
  };

  const title = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label;

  return (
    <Tooltip content={title} side="top">
      <IconButton
        tone={state === "failed" ? "danger" : "neutral"}
        aria-label={label}
        onClick={() => void copy()}
        className={cn("border-transparent hover:border-hair", className)}
      >
        {state === "copied" ? <CheckIcon /> : <CopyIcon />}
        {/* 결과는 글리프로만 바뀌므로 읽어 주는 자리를 따로 두되, 턴 상태를 알리는 자리와 섞지 않는다. */}
        <span className="sr-only" aria-live="polite">
          {state === "idle" ? "" : title}
        </span>
      </IconButton>
    </Tooltip>
  );
}

/** 보안 문맥이 아니면 clipboard 표면 자체가 없으므로, 선택과 복사 명령으로 물러선다. */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyBySelection(text);
  }
}

function copyBySelection(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
