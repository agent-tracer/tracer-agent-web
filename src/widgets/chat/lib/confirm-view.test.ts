import { describe, expect, it } from "vitest";
import { describeConfirmRequest } from "~/widgets/chat/lib/confirm-view.js";

describe("describeConfirmRequest", () => {
  it("action 이 제목의 동사가 되고 대상은 도구 이름에서 온다", () => {
    const view = describeConfirmRequest("propose_memo_write", {
      action: "create",
      taskId: "01KZ7SQT05HCTMN9H91PV52QNJ",
      body: "테스트",
    });

    expect(view.title).toBe("Create memo");
    expect(view.fields.map((field) => field.label)).toEqual(["Task", "Body"]);
    expect(view.fields.map((field) => field.value)).toEqual([
      "01KZ7SQT05HCTMN9H91PV52QNJ",
      "테스트",
    ]);
  });

  it("action 이 없으면 도구 이름이 실은 동사로 제목을 세운다", () => {
    expect(describeConfirmRequest("enqueue_job", { kind: "recipe.scan" }).title).toBe(
      "Enqueue job",
    );
    expect(describeConfirmRequest("remember_fact", { key: "k", content: "c" }).title).toBe(
      "Remember fact",
    );
  });

  it("값이 없는 인자는 줄을 차지하지 않는다", () => {
    const view = describeConfirmRequest("propose_task_write", {
      action: "update",
      taskId: "task-1",
      title: "",
      status: null,
    });

    expect(view.fields.map((field) => field.key)).toEqual(["taskId"]);
  });

  it("한 줄에 담기지 않는 값은 라벨 아래에 펼칠 값으로 표시한다", () => {
    const view = describeConfirmRequest("propose_rule_write", {
      action: "create",
      expectation: "x".repeat(80),
      rationale: "첫 줄\n둘째 줄",
    });

    expect(view.fields.every((field) => field.block)).toBe(true);
  });

  it("객체 인자는 읽을 수 있는 JSON 으로 편다", () => {
    const view = describeConfirmRequest("enqueue_job", {
      kind: "rule.generation",
      input: { taskId: "task-1" },
    });

    expect(view.fields[1]?.value).toBe('{\n  "taskId": "task-1"\n}');
  });

  it("복수 식별자는 대상을 복수로 남기고 꼬리를 지운다", () => {
    const view = describeConfirmRequest("propose_tag_write", {
      action: "assign",
      taskId: "task-1",
      tagIds: ["tag-1", "tag-2"],
    });

    expect(view.fields.map((field) => field.label)).toEqual(["Task", "Tags"]);
  });
});
