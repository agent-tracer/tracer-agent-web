import { describe, expect, it } from "vitest";
import { parseCreatedPrompt, parseExecutions, parseExperimentPreview, parseExperimentDetail, parsePromptFragments, parseReviewPair } from "./evaluation.schema.js";

describe("evaluation response schemas", () => {
  it("원장이 아는 실행 종료 상태를 파싱한다", () => {
    const rows = parseExecutions({
      executions: ["succeeded", "failed", "cancelled"].map((status, index) => ({
        execution: {
          id: `e${index}`,
          experimentId: "e",
          variantId: "v",
          exampleId: "x",
          repetition: 1,
          status,
          output: null,
          error: null,
          costUsd: 0,
        },
        scores: [],
      })),
    });
    expect(rows.map((row) => row.execution.status)).toEqual([
      "succeeded",
      "failed",
      "cancelled",
    ]);
  });

  it("실행마다 딸린 점수를 함께 파싱한다", () => {
    const rows = parseExecutions({
      executions: [{
        execution: {
          id: "e0", experimentId: "e", variantId: "v", exampleId: "x", repetition: 1,
          status: "succeeded", output: { answer: "값" }, error: null, costUsd: 0.01,
        },
        scores: [{
          id: "s0", executionId: "e0", evaluatorId: "judge", evaluatorVersion: "1",
          score: 0.5, label: null, reason: null, createdAt: "2026-01-01",
        }],
      }],
    });
    expect(rows[0]?.scores[0]?.score).toBe(0.5);
  });

  it("형태가 잘못된 중첩 API 응답을 거부한다", () => {
    expect(() =>
      parseExperimentPreview({ exampleCount: 1, executionCount: "1" }),
    ).toThrow("Invalid experiment preview response");
  });

  it("실험을 시작할 때 대조할 지문을 예고에서 읽는다", () => {
    const preview = parseExperimentPreview({
      exampleCount: 3, variantCount: 2, repetitions: 1,
      executionCount: 6, maxBudgetUsd: 1, fingerprint: "e:1:x:v",
    });
    expect(preview.fingerprint).toBe("e:1:x:v");
  });

  it("아직 판정할 짝이 없으면 비운 검토 응답을 파싱한다", () => {
    expect(parseReviewPair(null)).toBeNull();
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

  it("배포가 셋째 상류를 선언한 응답도 파싱한다", () => {
    const [fragment] = parsePromptFragments({ fragments: [{
      templateKey: "rust.task-cleanup.investigator.system",
      fragmentSlot: "suggestionRules",
      definitionKey: "rust.task-cleanup.suggestion-rules.en",
      codeName: "RUST_SUGGESTION_RULES",
      agentName: "task-cleanup",
      backend: "rust-agent",
      language: "en",
      fragmentName: "suggestionRules",
      codeDefaultVersion: "v1",
      codeDefaultHash: null,
      versions: [],
    }] });
    expect(fragment?.backend).toBe("rust-agent");
  });

  it("이름이 비어 있는 상류를 거부한다", () => {
    expect(() =>
      parseCreatedPrompt({
        definition: { id: "p", agentName: "title", backend: "", language: "en", name: "title", createdAt: "2026-01-01" },
        version: {
          id: "pv", definitionId: "p", semanticVersion: "1.0.0", content: "prompt",
          contentHash: "hash", toolContractVersion: "1", outputSchemaVersion: "1", createdAt: "2026-01-01",
        },
      }),
    ).toThrow("Invalid created prompt response");
  });

  it("원장이 소유한 프롬프트 판을 비운 변형과 그 조각 선택을 함께 파싱한다", () => {
    const detail = parseExperimentDetail({
      experiment: {
        id: "e", datasetId: "d", datasetRevision: 1, evaluatorSetVersion: "default-v1",
        status: "draft", maxBudgetUsd: 1, repetitions: 1,
        createdAt: "2026-01-01", completedAt: null,
      },
      variants: [{
        id: "v", experimentId: "e", name: "candidate", baseline: false, agentName: "task-cleanup", backend: "claude-sdk",
        promptVersionId: null, toolContractVersion: "1", limits: {},
        fragmentSelections: { "sdk.task-cleanup.investigator.system/suggestionRules": "version-v2" },
      }],
    });
    expect(detail.variants[0]?.promptVersionId).toBeNull();
    expect(detail.variants[0]?.fragmentSelections).toEqual({ "sdk.task-cleanup.investigator.system/suggestionRules": "version-v2" });
  });
});
