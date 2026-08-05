// 승인 카드가 원본 인자를 함수 호출 문자열로 늘어놓지 않고 읽을 수 있는 줄로 바꾸는 자리다.

/** 승인 카드가 한 줄로 보여 줄 인자 하나다. */
export interface ConfirmField {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  /** 한 줄에 담기지 않아 라벨 아래에 펼쳐야 하는 값이다. */
  readonly block: boolean;
}

/** 확인 요청 하나를 사람이 읽는 제목과 인자 줄로 옮긴 표현이다. */
export interface ConfirmView {
  readonly title: string;
  readonly fields: readonly ConfirmField[];
}

/** 도구 이름이 싣는 동사이며 나머지 토큰이 그 동사가 다루는 대상이다. */
const NAME_VERBS = new Set(["enqueue", "remember", "write", "run", "read", "search"]);

/** 이 길이를 넘거나 줄이 나뉜 값은 라벨 옆이 아니라 아래에 펼친다. */
const INLINE_VALUE_LIMIT = 56;

/** 도구 이름과 원본 인자를 승인 카드가 그릴 제목과 줄로 옮긴다. */
export function describeConfirmRequest(
  toolName: string,
  args: Record<string, unknown>,
): ConfirmView {
  const { verb, subject } = splitToolName(toolName);
  const action = typeof args.action === "string" ? args.action.trim() : "";
  const decided = action.length > 0 ? action : verb;
  const title =
    decided.length > 0 ? `${capitalize(decided)} ${subject}` : capitalize(subject);
  const fields = Object.entries(args)
    // action 은 이미 제목의 동사가 되었으므로 줄로 다시 세우지 않는다.
    .filter(([key, value]) => key !== "action" && !isEmptyValue(value))
    .map(([key, value]) => toField(key, value));
  return { title, fields };
}

/** 도구 이름을 동사 하나와 대상으로 가르며, propose 접두어는 승인 카드 자체가 이미 말한다. */
function splitToolName(toolName: string): { readonly verb: string; readonly subject: string } {
  const tokens = toolName
    .split("_")
    .filter((token) => token.length > 0 && token !== "propose");
  if (tokens.length < 2) return { verb: "", subject: tokens.join(" ") || toolName };
  const head = tokens[0] ?? "";
  const tail = tokens[tokens.length - 1] ?? "";
  if (NAME_VERBS.has(head)) return { verb: head, subject: tokens.slice(1).join(" ") };
  if (NAME_VERBS.has(tail)) return { verb: tail, subject: tokens.slice(0, -1).join(" ") };
  return { verb: "", subject: tokens.join(" ") };
}

function toField(key: string, value: unknown): ConfirmField {
  const text = toValueText(value);
  return {
    key,
    label: humanizeKey(key),
    value: text,
    block: text.length > INLINE_VALUE_LIMIT || text.includes("\n"),
  };
}

function toValueText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

/** 값이 없는 인자는 사용자가 정하지 않은 자리이므로 줄을 차지하지 않는다. */
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return typeof value === "string" && value.trim().length === 0;
}

/** camelCase 와 snake_case 를 낱말로 풀고, 식별자 꼬리는 값이 이미 식별자이므로 지운다. */
function humanizeKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length < 2) return capitalize(key.toLowerCase());
  const tail = words[words.length - 1] ?? "";
  const head = words.slice(0, -1).map((word) => word.toLowerCase());
  if (/^id$/i.test(tail)) return capitalize(head.join(" "));
  // ids 는 값이 여럿임을 뜻하므로 꼬리를 지우면서 대상을 복수로 남긴다.
  if (/^ids$/i.test(tail)) {
    const last = head[head.length - 1] ?? "";
    return capitalize([...head.slice(0, -1), `${last}s`].join(" "));
  }
  return capitalize([...head, tail.toLowerCase()].join(" "));
}

function capitalize(text: string): string {
  return text.length === 0 ? text : `${text[0]?.toUpperCase() ?? ""}${text.slice(1)}`;
}
