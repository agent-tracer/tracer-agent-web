import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { AGENT_AXES } from "~/shared/contract/agent-axis.js";

const AGENT_API_SPEC = path.join(process.cwd(), "contract/http/agent-api.openapi.yaml");

function contractAxes(): readonly string[] {
  const spec = yaml.load(fs.readFileSync(AGENT_API_SPEC, "utf8")) as {
    readonly components: { readonly schemas: { readonly AgentAxis: { readonly enum: string[] } } };
  };
  return spec.components.schemas.AgentAxis.enum;
}

describe("AGENT_AXES", () => {
  it("계약이 정한 축의 어휘를 그대로 갖는다", () => {
    expect([...AGENT_AXES]).toEqual([...contractAxes()]);
  });

  it("계약이 축으로 세우지 않은 낱말을 갖지 않는다", () => {
    expect(contractAxes()).not.toContain("claude-sdk");
    expect(contractAxes()).not.toContain("typescript");
  });
});
