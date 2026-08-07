/** 실행 스트림이 끊긴 뒤 다시 연결하기까지 물러서는 간격이며 에이전트 서비스 계약이 정한다. */
export const CHAT_STREAM_RECONNECT: {
  readonly initialBackoffMs: number;
  readonly maxBackoffMs: number;
} = {
  initialBackoffMs: 1_000,
  maxBackoffMs: 10_000,
};

/** 변화가 없어도 서버가 정본을 다시 실어 보내는 주기이며 계약이 정한다. */
export const CHAT_STREAM_RESEND_INTERVAL_MS = 20_000;

/** 재전송 주기의 두 배 동안 아무 프레임도 오지 않으면 소켓이 열린 채 죽은 것으로 보고 다시 붙는다. */
export const CHAT_STREAM_IDLE_TIMEOUT_MS = CHAT_STREAM_RESEND_INTERVAL_MS * 2;
