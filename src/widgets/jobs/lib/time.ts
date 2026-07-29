/** 조밀한 표에서 쓰는 압축된 상대 시간 문자열을 만든다. */
export function formatRelativeShort(input: Date | string | number, nowMs: number): string {
  const ts = toMs(input);
  const deltaMs = nowMs - ts;
  if (deltaMs < 30_000) return "just now";

  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;

  const months = Math.floor(days / 30);
  return `${months}mo`;
}

/** 로컬 타임존 기준 절대 시각을 년월일과 시분초로 표시한다. */
export function formatAbsoluteHHmmss(input: Date | string | number): string {
  const ms = toMs(input);
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** 경과 시간을 사람이 읽는 단위로 줄여 표시한다. */
export function formatDuration(ms: number): string {
  if (ms < 0) return "0s";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) {
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function toMs(input: Date | string | number): number {
  if (typeof input === "number") return input;
  if (typeof input === "string") return Date.parse(input);
  return input.getTime();
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}
