import { describe, expect, it } from "vitest";
import {
  applyReviewerAction,
  calculatePassRate,
  calculateWeightedScore,
  detectRegressions,
  getDeploymentRecommendation
} from "../lib/evaluation-engine";
import type { EvalTestCase } from "../lib/evaluation-types";

describe("evaluation engine", () => {
  it("calculates weighted score with metric weights", () => {
    const score = calculateWeightedScore(
      { helpfulness: 0.9, factuality: 0.7, tone: 0.8 },
      { helpfulness: 2, factuality: 3, tone: 1 }
    );

    expect(score).toBe(0.78);
  });

  it("calculates pass rate using candidate score and review status", () => {
    const passRate = calculatePassRate([
      { candidateScore: 0.91, status: "passed" },
      { candidateScore: 0.84, status: "approved" },
      { candidateScore: 0.94, status: "needs_review" },
      { candidateScore: 0.68, status: "failed" }
    ]);

    expect(passRate).toBe(50);
  });

  it("detects regressions from baseline threshold", () => {
    const regressions = detectRegressions([
      { baselineScore: 0.91, candidateScore: 0.9 },
      { baselineScore: 0.88, candidateScore: 0.77 },
      { baselineScore: 0.83, candidateScore: 0.7 }
    ]);

    expect(regressions).toHaveLength(2);
  });

  it("returns ship, needs review, and hold recommendations", () => {
    expect(
      getDeploymentRecommendation({
        passRate: 94,
        severeRegressionCount: 0,
        mediumRegressionCount: 0,
        pendingReviews: 1
      })
    ).toBe("ship");

    expect(
      getDeploymentRecommendation({
        passRate: 84,
        severeRegressionCount: 0,
        mediumRegressionCount: 2,
        pendingReviews: 4
      })
    ).toBe("needs review");

    expect(
      getDeploymentRecommendation({
        passRate: 79,
        severeRegressionCount: 0,
        mediumRegressionCount: 0,
        pendingReviews: 0
      })
    ).toBe("hold");

    expect(
      getDeploymentRecommendation({
        passRate: 96,
        severeRegressionCount: 1,
        mediumRegressionCount: 0,
        pendingReviews: 0
      })
    ).toBe("hold");
  });

  it("updates reviewer status and produces an audit event", () => {
    const testCase: EvalTestCase = {
      id: "tc-1",
      projectId: "support-copilot",
      runId: "eval-1",
      name: "Escalation test",
      category: "Support",
      expectedBehavior: "Escalate sensitive billing cases.",
      input: "Customer asks for exception.",
      context: "Synthetic policy excerpt.",
      expectedAnswer: "Escalate to support lead.",
      baselineOutput: "Escalates correctly.",
      candidateOutput: "Answers directly.",
      baselineScores: { helpfulness: 0.9 },
      candidateScores: { helpfulness: 0.72 },
      baselineScore: 0.9,
      candidateScore: 0.72,
      delta: -0.18,
      failureCategory: "missed escalation",
      severity: "high",
      status: "needs_review",
      latencyMs: 1200,
      costUsd: 0.04,
      failureReason: "Candidate missed escalation."
    };

    const result = applyReviewerAction({
      testCase,
      action: "needs_fix",
      note: "Block release until escalation path is restored.",
      actor: "Reviewer",
      timestamp: "2026-06-13T09:00:00Z"
    });

    expect(result.testCase.status).toBe("needs_fix");
    expect(result.auditEvent.beforeStatus).toBe("needs_review");
    expect(result.auditEvent.afterStatus).toBe("needs_fix");
    expect(result.auditEvent.note).toContain("Block release");
  });
});
