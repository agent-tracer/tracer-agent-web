// 호스트가 연합으로 내보내는 표면의 대역이며 시험 실행에서만 쓰인다.

import type { GuidanceCatalog, GuidanceMessage } from "tracerWeb/guidance";

interface KeyedMessage {
  readonly key: string;
}

/** 대역의 문구 항목은 내용 대신 카탈로그 좌표를 싣는다. */
export function guidanceKey(message: GuidanceMessage): string {
  return (message as unknown as KeyedMessage).key;
}

/** 어떤 항목을 물어도 그 좌표를 돌려주어 화면이 고른 문구를 시험이 확인할 수 있게 한다. */
function section(name: string): Record<string, KeyedMessage> {
  return new Proxy<Record<string, KeyedMessage>>(
    {},
    {
      get: (_target, key: string) => ({ key: `${name}.${key}` }),
      has: () => true,
    },
  );
}

export const GUIDANCE_CATALOG = {
  chat: section("chat"),
  jobs: section("jobs"),
  evaluation: section("evaluation"),
} as unknown as GuidanceCatalog;
