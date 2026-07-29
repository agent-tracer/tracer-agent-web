import { describe, expect, it } from "vitest";
import type * as HostApi from "tracerWeb/api";
import type * as HostEntities from "tracerWeb/entities";
import type * as HostStore from "tracerWeb/store";
import type * as HostUi from "tracerWeb/ui";
import * as api from "./api.js";
import * as entities from "./entities.js";
import * as store from "./store.js";
import * as ui from "./ui.js";

// 대역이 선언한 표면을 벗어나면 여기서 컴파일이 막힌다.
const apiConforms: typeof HostApi = api;
const entitiesConforms: typeof HostEntities = entities;
const storeConforms: typeof HostStore = store;
const uiConforms: typeof HostUi = ui;

describe("연합 표면의 대역", () => {
  it("호스트가 내보내는 이름을 빠짐없이 갖는다", () => {
    expect(Object.keys(apiConforms)).toContain("monitorQueryKeys");
    expect(Object.keys(entitiesConforms)).toEqual(["job", "task", "taskCleanup"]);
    expect(Object.keys(storeConforms)).toContain("useGuidance");
    expect(Object.keys(uiConforms)).toContain("GuidanceText");
  });

  it("문구 카탈로그는 어떤 항목을 물어도 그 좌표를 돌려준다", () => {
    const bundle = { chat: { thinking: { key: "chat.thinking" } } };
    expect(bundle.chat.thinking.key).toBe("chat.thinking");
  });
});
