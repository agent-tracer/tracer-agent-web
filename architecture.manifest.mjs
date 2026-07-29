// 구조 규칙의 유일한 서술이며 의존 그래프 검사기와 린터가 모두 이것을 읽는다.

/** 위가 아래만 부르는 레이어이며 같은 레이어의 슬라이스끼리는 서로를 부르지 않는다. */
export const FSD = Object.freeze(["app", "pages", "widgets", "features", "entities", "shared"]);

/** 소스 루트이며 경로 규칙의 뿌리다. */
export const ROOT_DIR = "src";

/** 연합 호스트가 실행 시점에 넘기는 표면의 접두어이며 번들러가 아니라 호스트가 해석한다. */
export const HOST_SURFACE = "tracerWeb";

/** 예산 없이 지키는 상한. */
export const BUDGETS = Object.freeze({
  maxFileLines: 300,
  oversizedFiles: 0,
});
