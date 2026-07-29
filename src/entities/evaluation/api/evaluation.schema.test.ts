import { describe, expect, it } from "vitest";
import { parseCreatedPrompt, parseExecutions, parseExperimentPreview, parseExperimentDetail, parsePromptFragments } from "./evaluation.schema.js";

describe("evaluation response schemas", () => {
  it("실패가 아닌 워크플로 종료 상태를 파싱한다", () => {
    const rows = parseExecutions({
      executions: ["not_evaluable", "budget_skipped"].map((status, index) => ({
        execution: {
          id: `e${index}`,
          variantId: "v",
          exampleId: "x",
          repetition: 1,
          status,
          attemptCount: 1,
          costUsd: 0,
          durationMs: null,
          traceId: null,
          output: null,
        },
        scores: [],
      })),
    });
    expect(rows.map((row) => row.execution.status)).toEqual([
      "not_evaluable",
      "budget_skipped",
    ]);
  });

  it("형태가 잘못된 중첩 API 응답을 거부한다", () => {
    expect(() =>
      parseExperimentPreview({ experimentId: "e", datasetRevision: "1" }),
    ).toThrow("Invalid experiment preview response");
  });

  it("프롬프트 정의와 최초 버전을 함께 검증한다", () => {
    const created = parseCreatedPrompt({
      definition: {
        id: "p",
        agentName: "title",
        backend: "python",
        language: "en",
        name: "title",
        createdAt: "2026-01-01",
      },
      version: {
        id: "pv",
        definitionId: "p",
        semanticVersion: "1.0.0",
        content: "prompt",
        contentHash: "hash",
        toolContractVersion: "1",
        outputSchemaVersion: "1",
        createdAt: "2026-01-01",
      },
    });
    expect(created.version.id).toBe("pv");
  });
  it("백엔드 접두사와 무결성 상태를 포함한 fragment binding을 검증한다", () => {
    const fragments = parsePromptFragments({ fragments: [{
      templateKey: "sdk.task-cleanup.investigator.system",
      fragmentSlot: "suggestionRules",
      definitionKey: "sdk.task-cleanup.suggestion-rules.en",
      codeName: "SDK_SUGGESTION_RULES",
      agentName: "task-cleanup",
      backend: "claude-sdk",
      language: "en",
      fragmentName: "suggestionRules",
      codeDefaultVersion: "v1",
      codeDefaultHash: "a".repeat(64),
      versions: [{
        id: "v2", semanticVersion: "v2", contentHash: "b".repeat(64),
        toolContractVersion: "tools/v1", outputSchemaVersion: "output/v1", integrity: "matched",
      }],
    }] });
    expect(fragments[0]?.codeName).toBe("SDK_SUGGESTION_RULES");
    expect(fragments[0]?.versions[0]?.integrity).toBe("matched");
  });

  it("기본 fragment hash가 아직 없는 catalog row도 파싱한다", () => {
    const [fragment] = parsePromptFragments({ fragments: [{
      templateKey: "sdk.task-cleanup.investigator.system",
      fragmentSlot: "suggestionRules",
      definitionKey: "sdk.task-cleanup.suggestion-rules.en",
      codeName: "SDK_SUGGESTION_RULES",
      agentName: "task-cleanup",
      backend: "claude-sdk",
      language: "en",
      fragmentName: "suggestionRules",
      codeDefaultVersion: "v1",
      codeDefaultHash: null,
      versions: [],
    }] });
    expect(fragment?.codeDefaultHash).toBeNull();
  });

  it("fragment variant의 null legacy prompt와 selection을 round-trip한다", () => {
    const detail = parseExperimentDetail({
      experiment: {
        id: "e", datasetId: "d", datasetRevision: 1, evaluatorSetVersion: "default-v1",
        status: "draft", maxBudgetUsd: 1, spentUsd: 0, repetitions: 1,
        createdAt: "2026-01-01", completedAt: null,
      },
      variants: [{
        id: "v", name: "candidate", agentName: "task-cleanup", backend: "claude-sdk", model: "m",
        promptVersionId: null, toolContractVersion: "1", limits: {}, baseline: false,
        fragmentSelections: { "sdk.task-cleanup.investigator.system/suggestionRules": "version-v2" },
      }],
    });
    expect(detail.variants[0]?.promptVersionId).toBeNull();
    expect(detail.variants[0]?.fragmentSelections).toEqual({ "sdk.task-cleanup.investigator.system/suggestionRules": "version-v2" });
  });
});
