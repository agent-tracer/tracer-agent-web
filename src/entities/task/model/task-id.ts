import type { task } from "tracerWeb/entities";

/** 잡이 가리키는 태스크 식별자를 앞뒤 공백 없는 값으로 읽는다. */
export function TaskId(value: string): task.TaskId {
  return value.trim() as task.TaskId;
}
