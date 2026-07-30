import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import {
  parseComparison,
  parseExecutions,
  parseExperimentDetail,
  parseExperimentPreview,
  parseExperiments,
  parseReviewPair,
  parseReviews,
} from "./evaluation.schema.js";

interface OpenApiSchema {
  readonly $ref?: string;
  readonly type?: string;
  readonly enum?: readonly string[];
  readonly required?: readonly string[];
  readonly properties?: Readonly<Record<string, OpenApiSchema>>;
  readonly items?: OpenApiSchema;
}

const schemas = (
  yaml.load(readFileSync("contract/http/agent-api.openapi.yaml", "utf8")) as {
    components: { schemas: Readonly<Record<string, OpenApiSchema>> };
  }
).components.schemas;

function resolve(schema: OpenApiSchema): OpenApiSchema {
  return schema.$ref === undefined ? schema : resolve(schemas[schema.$ref.split("/").pop()!]!);
}

/** 에이전트가 낸 산출물이 실리는 칸이며 서버는 여기에 JSON 묶음을 싣는다. */
const AGENT_OUTPUT_FIELDS = ["output", "correctedOutput"];

/** 계약이 그 칸에 실릴 수 있다고 적은 값 하나를 만든다. */
function sample(schema: OpenApiSchema, field: string): unknown {
  if (AGENT_OUTPUT_FIELDS.includes(field)) return { answer: "값" };
  const resolved = resolve(schema);
  if (resolved.enum !== undefined) return resolved.enum[0];
  if (resolved.type === "integer" || resolved.type === "number") return 1;
  if (resolved.type === "boolean") return true;
  if (resolved.type === "array") return [];
  if (resolved.type === "object") return {};
  return `${field}-값`;
}

/** 계약이 선언한 스키마 하나를 그 칸만으로 채운 응답 조각으로 만든다. */
function fixture(name: string, only?: "required"): Record<string, unknown> {
  const schema = schemas[name]!;
  const fields = Object.entries(schema.properties ?? {}).filter(
    ([field]) => only !== "required" || (schema.required ?? []).includes(field),
  );
  return Object.fromEntries(fields.map(([field, value]) => [field, sample(value, field)]));
}

function declared(name: string): readonly string[] {
  return Object.keys(schemas[name]!.properties ?? {});
}

function required(name: string): readonly string[] {
  return schemas[name]!.required ?? [];
}

describe("평가 화면이 계약이 선언한 칸을 읽는다", () => {
  it("실험 목록이 Experiment 의 칸을 그대로 실어 낸다", () => {
    const [experiment] = parseExperiments({ experiments: [fixture("Experiment")] });
    expect(Object.keys(experiment!).sort()).toEqual([...declared("Experiment")].sort());
  });

  it("필수 칸만 실린 실험도 읽는다", () => {
    expect(() => parseExperiments({ experiments: [fixture("Experiment", "required")] })).not.toThrow();
  });

  it("실험 상세가 Experiment 와 ExperimentVariant 의 칸을 그대로 실어 낸다", () => {
    const detail = parseExperimentDetail({
      experiment: fixture("Experiment"),
      variants: [fixture("ExperimentVariant")],
    });
    expect(Object.keys(detail.variants[0]!).sort()).toEqual([...declared("ExperimentVariant")].sort());
  });

  it("필수 칸만 실린 변형도 읽는다", () => {
    expect(() =>
      parseExperimentDetail({
        experiment: fixture("Experiment", "required"),
        variants: [fixture("ExperimentVariant", "required")],
      }),
    ).not.toThrow();
  });

  it("예고가 ExperimentPreview 의 칸을 그대로 실어 낸다", () => {
    const preview = parseExperimentPreview(fixture("ExperimentPreview"));
    expect(Object.keys(preview).sort()).toEqual([...declared("ExperimentPreview")].sort());
  });

  it("실행과 점수가 계약이 요구하는 칸만으로도 읽힌다", () => {
    expect(() =>
      parseExecutions({
        executions: [{
          execution: fixture("ExperimentExecution", "required"),
          scores: [fixture("EvaluationScore", "required")],
        }],
      }),
    ).not.toThrow();
  });

  it("비교가 VariantComparison 의 칸을 그대로 실어 낸다", () => {
    const comparison = parseComparison({
      experimentId: "experiment-1",
      status: resolve(schemas["ExperimentStatus"]!).enum![0],
      variants: [fixture("VariantComparison")],
    });
    expect(Object.keys(comparison.variants[0]!).sort()).toEqual([...declared("VariantComparison")].sort());
  });

  it("검토 목록이 HumanReview 의 필수 칸만으로도 읽힌다", () => {
    expect(() => parseReviews({ reviews: [fixture("HumanReview", "required")] })).not.toThrow();
  });

  it("뽑은 짝이 ReviewPair 의 칸을 그대로 실어 낸다", () => {
    const pair = parseReviewPair({
      executionA: fixture("ReviewPairSide"),
      executionB: fixture("ReviewPairSide"),
      exampleId: "example-1",
      repetition: 1,
    });
    expect(Object.keys(pair!.executionA).sort()).toEqual([...declared("ReviewPairSide")].sort());
  });

  it("뽑을 짝이 없으면 비운 응답을 읽는다", () => {
    expect(parseReviewPair(null)).toBeNull();
  });

  it("짝의 한쪽에 어느 변형인지 적을 칸이 계약에 없다", () => {
    expect(declared("ReviewPairSide")).not.toContain("variantId");
  });

  it("실험을 시작할 확인이 계약이 요구하는 세 값을 갖는다", () => {
    expect([...required("ExperimentConfirmation")].sort()).toEqual([
      "executionCount",
      "fingerprint",
      "maxBudgetUsd",
    ]);
  });

  it("화면이 아는 검토 선호가 계약이 선언한 것과 같다", () => {
    expect(resolve(schemas["ReviewSubmission"]!.properties!["preference"]!).enum).toEqual(["a", "b", "tie"]);
  });
});
