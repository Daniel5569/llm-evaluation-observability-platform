import type {
  AuditEvent,
  EvalTestCase,
  Recommendation,
  ReviewStatus,
  ReviewerActionResult,
  ScoreMap,
  Severity
} from "./evaluation-types";

const DEFAULT_THRESHOLD = 0.08;
const PASSING_SCORE = 0.82;

export function calculateWeightedScore(scores: ScoreMap, weights: ScoreMap = {}): number {
  const entries = Object.entries(scores);
  if (entries.length === 0) return 0;

  const totalWeight = entries.reduce((total, [metric]) => total + (weights[metric] ?? 1), 0);
  const weightedTotal = entries.reduce(
    (total, [metric, score]) => total + score * (weights[metric] ?? 1),
    0
  );

  return roundScore(weightedTotal / totalWeight);
}

export function calculatePassRate(testCases: Pick<EvalTestCase, "candidateScore" | "status">[]): number {
  if (testCases.length === 0) return 0;

  const passing = testCases.filter((testCase) => {
    const statusAllowsPass = testCase.status === "passed" || testCase.status === "approved";
    return testCase.candidateScore >= PASSING_SCORE && statusAllowsPass;
  }).length;

  return Math.round((passing / testCases.length) * 100);
}

export function isRegression(
  testCase: Pick<EvalTestCase, "baselineScore" | "candidateScore">,
  threshold = DEFAULT_THRESHOLD
): boolean {
  return testCase.candidateScore < testCase.baselineScore - threshold;
}

export function detectRegressions<T extends Pick<EvalTestCase, "baselineScore" | "candidateScore">>(
  testCases: T[],
  threshold = DEFAULT_THRESHOLD
): T[] {
  return testCases.filter((testCase) => isRegression(testCase, threshold));
}

export function classifySeverity(delta: number): Severity {
  if (delta <= -0.28) return "critical";
  if (delta <= -0.18) return "high";
  if (delta <= -0.1) return "medium";
  return "low";
}

export function getDeploymentRecommendation(input: {
  passRate: number;
  severeRegressionCount: number;
  mediumRegressionCount: number;
  pendingReviews: number;
}): Recommendation {
  if (input.severeRegressionCount > 0 || input.passRate < 80) {
    return "hold";
  }

  if (input.passRate >= 90 && input.pendingReviews < 3) {
    return "ship";
  }

  if (input.passRate >= 80 && input.mediumRegressionCount > 0) {
    return "needs review";
  }

  return input.pendingReviews > 0 ? "needs review" : "ship";
}

export function applyReviewerAction(params: {
  testCase: EvalTestCase;
  action: "approve" | "needs_fix" | "ignore";
  note: string;
  actor?: string;
  timestamp?: string;
}): ReviewerActionResult {
  const afterStatusByAction: Record<typeof params.action, ReviewStatus> = {
    approve: "approved",
    needs_fix: "needs_fix",
    ignore: "ignored"
  };

  const afterStatus = afterStatusByAction[params.action];
  const updatedTestCase: EvalTestCase = {
    ...params.testCase,
    status: afterStatus
  };

  const auditEvent: AuditEvent = {
    id: `audit-${params.testCase.id}-${params.action}`,
    timestamp: params.timestamp ?? new Date().toISOString(),
    actor: params.actor ?? "AI Product Reviewer",
    action:
      params.action === "approve"
        ? "approved candidate output"
        : params.action === "needs_fix"
          ? "marked candidate as needs fix"
          : "ignored regression",
    projectId: params.testCase.projectId,
    target: `${params.testCase.runId}/${params.testCase.id}`,
    beforeStatus: params.testCase.status,
    afterStatus,
    note: params.note
  };

  return { testCase: updatedTestCase, auditEvent };
}

export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
