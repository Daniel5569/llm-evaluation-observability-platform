import {
  calculatePassRate,
  calculateWeightedScore,
  classifySeverity,
  detectRegressions,
  getDeploymentRecommendation,
  isRegression,
  roundScore
} from "./evaluation-engine";
import type {
  AuditEvent,
  EvalRun,
  EvalTestCase,
  FailureCategory,
  Project,
  ProjectId,
  PromptVersion,
  ReviewStatus,
  RunStatus,
  ScoreMap,
  TraceRecord
} from "./evaluation-types";

export const projects: Project[] = [
  {
    id: "support-copilot",
    name: "Support Copilot",
    useCase: "Generates draft replies for customer support tickets.",
    activePromptVersion: "sup-v3.4",
    baselineVersion: "sup-v3.2",
    datasetSize: 16,
    metrics: ["helpfulness", "policy compliance", "tone", "factuality", "escalation correctness"]
  },
  {
    id: "sales-research",
    name: "Sales Research Assistant",
    useCase: "Produces account briefs and outreach angles for sales teams.",
    activePromptVersion: "sales-v2.7",
    baselineVersion: "sales-v2.3",
    datasetSize: 15,
    metrics: ["relevance", "specificity", "source grounding", "hallucination risk", "actionability"]
  },
  {
    id: "contract-analyzer",
    name: "Contract Clause Analyzer",
    useCase: "Analyzes contract excerpts and flags legal review risks.",
    activePromptVersion: "contract-v1.9",
    baselineVersion: "contract-v1.5",
    datasetSize: 14,
    metrics: [
      "clause extraction accuracy",
      "risk classification",
      "missing obligation detection",
      "concise summary",
      "reviewer confidence"
    ]
  }
];

export const promptVersions: PromptVersion[] = [
  version("support-copilot", "sup-v3.4", "gpt-4.1-mini", "2026-05-28", "AI Product", "Tighter escalation policy and warmer close.", "candidate"),
  version("support-copilot", "sup-v3.2", "gpt-4.1-mini", "2026-05-03", "AI Product", "Production baseline for refund and billing tickets.", "production"),
  version("support-copilot", "sup-v2.8", "claude-sonnet", "2026-04-11", "Support Ops", "Older tone calibration prompt.", "archived"),
  version("sales-research", "sales-v2.7", "claude-sonnet", "2026-05-24", "Growth Ops", "Adds source-grounded buying triggers.", "candidate"),
  version("sales-research", "sales-v2.3", "claude-sonnet", "2026-04-30", "Growth Ops", "Production account brief prompt.", "production"),
  version("sales-research", "sales-v2.0", "gemini-flash", "2026-04-09", "Growth Ops", "Fast low-cost research baseline.", "archived"),
  version("contract-analyzer", "contract-v1.9", "gpt-4.1-mini", "2026-05-20", "Legal Ops", "Adds obligation owner extraction and evidence quote.", "candidate"),
  version("contract-analyzer", "contract-v1.5", "local-eval-baseline", "2026-04-24", "Legal Ops", "Stable baseline for risk labels.", "production"),
  version("contract-analyzer", "contract-v1.2", "gemini-flash", "2026-04-05", "Legal Ops", "Low-latency review prompt.", "archived")
];

const scenarioMap: Record<ProjectId, Array<{ name: string; category: string; failure: FailureCategory }>> = {
  "support-copilot": [
    { name: "Refund exception after 41 days", category: "Refunds", failure: "wrong refund policy" },
    { name: "Escalate billing dispute", category: "Billing", failure: "missed escalation" },
    { name: "Calm angry enterprise admin", category: "Tone", failure: "bad tone" },
    { name: "Explain data export limits", category: "Product limits", failure: "too vague" },
    { name: "Safety complaint handoff", category: "Risk", failure: "policy violation" }
  ],
  "sales-research": [
    { name: "Vertical-specific outreach angle", category: "Outbound", failure: "generic output" },
    { name: "Account signal validation", category: "Research", failure: "invented company signal" },
    { name: "Persona pain mapping", category: "Persona", failure: "weak persona fit" },
    { name: "Next action after funding event", category: "Workflow", failure: "missing next step" },
    { name: "Competitor displacement brief", category: "Strategy", failure: "hallucination risk" }
  ],
  "contract-analyzer": [
    { name: "Termination for convenience", category: "Termination", failure: "missed termination clause" },
    { name: "Indemnity scope summary", category: "Liability", failure: "overstates risk" },
    { name: "Payment obligation owner", category: "Obligations", failure: "wrong party obligation" },
    { name: "Renewal notice evidence", category: "Renewal", failure: "insufficient evidence" },
    { name: "Confidentiality carve-out", category: "Confidentiality", failure: "wrong classification" }
  ]
};

const runBlueprints = [
  ["support-copilot", "eval-sup-001", "sup-v3.2", "sup-v3.4", "gpt-4.1-mini", "2026-06-07T10:12:00Z"],
  ["support-copilot", "eval-sup-002", "sup-v2.8", "sup-v3.2", "gpt-4.1-mini", "2026-05-31T15:30:00Z"],
  ["support-copilot", "eval-sup-003", "sup-v2.8", "sup-v3.4", "claude-sonnet", "2026-05-18T09:05:00Z"],
  ["sales-research", "eval-sales-001", "sales-v2.3", "sales-v2.7", "claude-sonnet", "2026-06-06T13:45:00Z"],
  ["sales-research", "eval-sales-002", "sales-v2.0", "sales-v2.3", "gemini-flash", "2026-05-27T12:22:00Z"],
  ["sales-research", "eval-sales-003", "sales-v2.0", "sales-v2.7", "claude-sonnet", "2026-05-16T11:08:00Z"],
  ["contract-analyzer", "eval-contract-001", "contract-v1.5", "contract-v1.9", "gpt-4.1-mini", "2026-06-05T17:10:00Z"],
  ["contract-analyzer", "eval-contract-002", "contract-v1.2", "contract-v1.5", "local-eval-baseline", "2026-05-25T14:18:00Z"],
  ["contract-analyzer", "eval-contract-003", "contract-v1.2", "contract-v1.9", "gemini-flash", "2026-05-14T10:50:00Z"]
] as const;

const modelByVersion = new Map(promptVersions.map((item) => [item.id, item.model]));

export const testCases: EvalTestCase[] = runBlueprints.flatMap(
  ([projectId, runId, baselineVersion, candidateVersion], runIndex) => {
    return Array.from({ length: 5 }, (_, caseIndex) =>
      makeTestCase(projectId, runId, baselineVersion, candidateVersion, runIndex, caseIndex)
    );
  }
);

export const evalRuns: EvalRun[] = runBlueprints.map(
  ([projectId, runId, baselineVersion, candidateVersion, model, createdAt]) => {
    const cases = testCases.filter((testCase) => testCase.runId === runId);
    const regressions = detectRegressions(cases);
    const severeRegressionCount = regressions.filter((testCase) =>
      ["high", "critical"].includes(testCase.severity)
    ).length;
    const mediumRegressionCount = regressions.filter((testCase) => testCase.severity === "medium").length;
    const pendingReviews = cases.filter((testCase) => testCase.status === "needs_review").length;
    const passRate = calculatePassRate(cases);
    const recommendation = getDeploymentRecommendation({
      passRate,
      severeRegressionCount,
      mediumRegressionCount,
      pendingReviews
    });

    return {
      id: runId,
      projectId,
      promptVersion: candidateVersion,
      baselineVersion,
      candidateVersion,
      model,
      createdAt,
      passRate,
      weightedScore: roundScore(average(cases.map((testCase) => testCase.candidateScore))),
      regressionCount: regressions.length,
      severeRegressionCount,
      pendingReviews,
      estimatedCostUsd: roundMoney(sum(cases.map((testCase) => testCase.costUsd))),
      avgLatencyMs: Math.round(average(cases.map((testCase) => testCase.latencyMs))),
      status: statusFromRecommendation(recommendation, regressions.length),
      recommendation
    };
  }
);

export const traceRecords: TraceRecord[] = testCases.flatMap((testCase, index) => {
  return Array.from({ length: index % 2 === 0 ? 2 : 1 }, (_, traceIndex) => ({
    requestId: `req-${testCase.runId}-${String(index + 1).padStart(2, "0")}-${traceIndex + 1}`,
    projectId: testCase.projectId,
    runId: testCase.runId,
    testCaseId: testCase.id,
    model: modelByVersion.get(testCase.runId.includes("sales") ? "sales-v2.7" : testCase.runId.includes("contract") ? "contract-v1.9" : "sup-v3.4") ?? "gpt-4.1-mini",
    latencyMs: testCase.latencyMs + traceIndex * 110,
    costUsd: roundMoney(testCase.costUsd + traceIndex * 0.003),
    score: roundScore(testCase.candidateScore - traceIndex * 0.02),
    status: traceIndex === 0 ? testCase.status : testCase.candidateScore > 0.84 ? "passed" : "needs_review",
    category: testCase.failureCategory,
    createdAt: new Date(Date.parse("2026-06-01T09:00:00Z") + index * 3_600_000 + traceIndex * 900_000).toISOString()
  }));
});

export const auditEvents: AuditEvent[] = Array.from({ length: 32 }, (_, index) => {
  const testCase = testCases[index % testCases.length];
  const afterStatus: ReviewStatus = index % 4 === 0 ? "approved" : index % 4 === 1 ? "needs_fix" : index % 4 === 2 ? "ignored" : "needs_review";

  return {
    id: `audit-seed-${String(index + 1).padStart(2, "0")}`,
    timestamp: new Date(Date.parse("2026-06-03T08:00:00Z") + index * 2_700_000).toISOString(),
    actor: ["AI Product Reviewer", "Support Ops Lead", "Growth Ops Reviewer", "Legal Ops Reviewer"][index % 4],
    action:
      afterStatus === "approved"
        ? "approved candidate output"
        : afterStatus === "needs_fix"
          ? "marked candidate as needs fix"
          : afterStatus === "ignored"
            ? "ignored regression"
            : "requested human review",
    projectId: testCase.projectId,
    target: `${testCase.runId}/${testCase.id}`,
    beforeStatus: testCase.status,
    afterStatus,
    note: [
      "Evidence is sufficient for the release gate.",
      "Candidate needs clearer grounding before deploy.",
      "Regression is accepted for this edge case.",
      "Route to owner before approving the prompt."
    ][index % 4]
  };
});

function version(
  projectId: ProjectId,
  id: string,
  model: string,
  createdDate: string,
  owner: string,
  changeNote: string,
  deploymentStatus: PromptVersion["deploymentStatus"]
): PromptVersion {
  return { projectId, id, model, createdDate, owner, changeNote, deploymentStatus };
}

function makeTestCase(
  projectId: ProjectId,
  runId: string,
  baselineVersion: string,
  candidateVersion: string,
  runIndex: number,
  caseIndex: number
): EvalTestCase {
  const project = projects.find((item) => item.id === projectId)!;
  const scenario = scenarioMap[projectId][caseIndex];
  const baselineScores = scoreMap(project.metrics, 0.78 + ((runIndex + caseIndex) % 4) * 0.04);
  const candidateOffset = candidateOffsetFor(runIndex, caseIndex);
  const candidateScores = scoreMap(project.metrics, 0.8 + ((runIndex + caseIndex + 1) % 4) * 0.035 + candidateOffset);
  const baselineScore = calculateWeightedScore(baselineScores);
  const candidateScore = calculateWeightedScore(candidateScores);
  const delta = roundScore(candidateScore - baselineScore);
  const regression = isRegression({ baselineScore, candidateScore });
  const status = statusForCase(candidateScore, regression, caseIndex);

  return {
    id: `${runId}-tc-${caseIndex + 1}`,
    projectId,
    runId,
    name: scenario.name,
    category: scenario.category,
    expectedBehavior: expectedBehavior(projectId, scenario.failure),
    input: inputFor(projectId, scenario.name),
    context: contextFor(projectId, baselineVersion, candidateVersion),
    expectedAnswer: expectedAnswer(projectId, scenario.failure),
    baselineOutput: baselineOutput(projectId, scenario.failure),
    candidateOutput: candidateOutput(projectId, scenario.failure, regression),
    baselineScores,
    candidateScores,
    baselineScore,
    candidateScore,
    delta,
    failureCategory: scenario.failure,
    severity: classifySeverity(delta),
    status,
    latencyMs: 820 + runIndex * 95 + caseIndex * 140,
    costUsd: roundMoney(0.026 + runIndex * 0.006 + caseIndex * 0.004),
    failureReason: regression
      ? `Candidate dropped ${Math.abs(delta).toFixed(2)} vs baseline on ${scenario.failure}.`
      : "Candidate meets the expected behavior for this scenario."
  };
}

function scoreMap(metrics: string[], base: number): ScoreMap {
  return Object.fromEntries(
    metrics.map((metric, index) => [metric, roundScore(Math.min(0.98, Math.max(0.42, base + (index % 3) * 0.025 - index * 0.006)))])
  );
}

function candidateOffsetFor(runIndex: number, caseIndex: number): number {
  const pattern = [0.05, -0.14, 0.08, -0.23, 0.02, -0.07, 0.11, -0.3, 0.04];
  return pattern[(runIndex + caseIndex) % pattern.length];
}

function statusForCase(candidateScore: number, regression: boolean, caseIndex: number): ReviewStatus {
  if (regression && caseIndex % 2 === 1) return "needs_review";
  if (regression) return "needs_fix";
  if (candidateScore >= 0.86) return "passed";
  return caseIndex % 3 === 0 ? "approved" : "needs_review";
}

function statusFromRecommendation(recommendation: string, regressionCount: number): RunStatus {
  if (recommendation === "ship") return "passed";
  if (recommendation === "hold") return "failed";
  return regressionCount > 0 ? "regression_detected" : "needs_review";
}

function expectedBehavior(projectId: ProjectId, failure: FailureCategory): string {
  const map: Record<ProjectId, string> = {
    "support-copilot": `Answer accurately, follow policy, and escalate when ${failure} risk appears.`,
    "sales-research": `Ground the brief in supplied account signals and avoid ${failure}.`,
    "contract-analyzer": `Extract the clause, identify the obligated party, and cite evidence for ${failure}.`
  };
  return map[projectId];
}

function inputFor(projectId: ProjectId, scenarioName: string): string {
  if (projectId === "support-copilot") {
    return `Customer ticket: ${scenarioName}. Draft a response that can be reviewed by support ops.`;
  }
  if (projectId === "sales-research") {
    return `Research request: ${scenarioName}. Produce a concise account brief and outreach angle.`;
  }
  return `Contract excerpt review: ${scenarioName}. Flag risk, obligation owner, and evidence.`;
}

function contextFor(projectId: ProjectId, baselineVersion: string, candidateVersion: string): string {
  const project = projects.find((item) => item.id === projectId)!;
  return `${project.name} eval context comparing ${baselineVersion} against ${candidateVersion}. Policy and retrieved snippets are synthetic.`;
}

function expectedAnswer(projectId: ProjectId, failure: FailureCategory): string {
  if (projectId === "support-copilot") {
    return `Use the approved support policy, acknowledge the user, and avoid ${failure}.`;
  }
  if (projectId === "sales-research") {
    return `Return grounded signals, persona-specific pain, and a clear next step without ${failure}.`;
  }
  return `Summarize the clause, classify risk, cite evidence, and avoid ${failure}.`;
}

function baselineOutput(projectId: ProjectId, failure: FailureCategory): string {
  if (projectId === "support-copilot") {
    return `Baseline response references policy, keeps a neutral tone, and routes the case when ${failure} is likely.`;
  }
  if (projectId === "sales-research") {
    return `Baseline brief lists source-grounded signals, a persona hypothesis, and a practical outreach angle.`;
  }
  return `Baseline analysis extracts the clause, identifies the responsible party, and gives a moderate risk label with evidence.`;
}

function candidateOutput(projectId: ProjectId, failure: FailureCategory, regression: boolean): string {
  if (!regression) {
    return projectId === "contract-analyzer"
      ? "Candidate adds a concise evidence quote, risk label, and reviewer confidence score."
      : "Candidate improves specificity, keeps the output grounded, and preserves the required review path.";
  }

  if (projectId === "support-copilot") {
    return `Candidate is usable but shows ${failure}, so the case should be reviewed before release.`;
  }
  if (projectId === "sales-research") {
    return `Candidate contains a promising angle but has ${failure}, lowering launch confidence.`;
  }
  return `Candidate detects part of the clause but has ${failure}, requiring legal ops review.`;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

function roundMoney(value: number): number {
  return Math.round(value * 1000) / 1000;
}
