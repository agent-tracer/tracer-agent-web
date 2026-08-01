/** 실행 스트림이 끊긴 뒤 다시 연결하기까지 물러서는 간격이며 에이전트 서비스 계약이 정한다. */
export const CHAT_STREAM_RECONNECT: {
  readonly initialBackoffMs: number;
  readonly maxBackoffMs: number;
} = {
  initialBackoffMs: 1_000,
  maxBackoffMs: 10_000,
};
